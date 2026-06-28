"use client";

import { useState, useEffect, useRef } from 'react';
import { Topbar } from '../../components/drms/Topbar';
import { API_BASE } from '@/lib/lib_api';

// ── Types ─────────────────────────────────────────────────────────────────────
type OfficeConfig = {
  id:              number;
  form_type:       string;
  exception_type:  string;
  exception_label: string;
  condition_type:  string;
  condition_value: string | null;
  office_name:     string;
  sort_order:      number;
  is_active:       boolean;
};

type Scenario = {
  form_type:       string;
  exception_type:  string;
  exception_label: string;
  condition_type:  string;
  condition_value: string | null;
  offices:         OfficeConfig[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PROTECTED_FORMS     = ['RO-0004', 'RO-0005'];
const FORM_LABELS: Record<string, string> = {
  'RO-0005': 'Credential Request',
  'RO-0004': 'Transfer Credential',
};
const CONDITION_OPTIONS = [
  { value: 'none',              label: 'Always applies — no condition needed' },
  { value: 'document_type',     label: 'Document type matches a keyword' },
  { value: 'enrollment_status', label: 'Student enrollment status matches' },
  { value: 'combined',          label: 'Document type AND enrollment status both match' },
  { value: 'manual',            label: 'Manual — staff triggers this from the Clearance tab' },
];
const ENROLLMENT_OPTIONS = ['Enrolled', 'Not Enrolled', 'Alumni', 'Transferee'];

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IcoChevDown  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoChevRight = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="9 18 15 12 9 6"/></svg>;
const IcoEdit      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoTrash     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcoPlus      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoCheck     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="20 6 9 17 4 12"/></svg>;
const IcoX         = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoUp        = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><polyline points="18 15 12 9 6 15"/></svg>;
const IcoDown      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoInfo      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function conditionSummary(s: Scenario): string {
  const { condition_type: ct, condition_value: cv } = s;
  if (ct === 'none')    return 'Applied to all requests of this form type';
  if (ct === 'manual')  return 'Applied manually by staff from the Clearance tab';
  if (ct === 'document_type' && cv) return `Applied when request contains a document matching "${cv}"`;
  if (ct === 'enrollment_status' && cv) return `Applied when student is "${cv}"`;
  if (ct === 'combined' && cv) {
    try {
      const p = JSON.parse(cv);
      return `Applied when document matches "${p.document}" AND student is "${p.enrollment}"`;
    } catch { return 'Combined condition'; }
  }
  return ct;
}

// ── Combined condition helper component ───────────────────────────────────────
function CombinedFields({ value, onChange, inp }: { value: string; onChange: (v: string) => void; inp: React.CSSProperties }) {
  let parsed: { document?: string; enrollment?: string } = {};
  try { parsed = value.includes('{') ? JSON.parse(value) : {}; } catch {}
  function update(field: 'document' | 'enrollment', val: string) {
    onChange(JSON.stringify({ ...parsed, [field]: val }));
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document keyword</label>
        <input style={inp} placeholder='e.g. "enrollment" matches Certificate of Enrollment' value={parsed.document ?? ''} onChange={e => update('document', e.target.value)} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Enrollment Status</label>
        <select style={{ ...inp, cursor: 'pointer' }} value={parsed.enrollment ?? ''} onChange={e => update('enrollment', e.target.value)}>
          <option value="">Select...</option>
          {ENROLLMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClearanceOfficesPage() {
  const [allConfigs, setAllConfigs]     = useState<OfficeConfig[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeForm, setActiveForm]     = useState<string>('RO-0005');
  const [expanded, setExpanded]         = useState<Set<string>>(new Set(['RO-0005|standard']));
  const [toast, setToast]               = useState<string | null>(null);

  // Edit office inline
  const [editOffice, setEditOffice]     = useState<OfficeConfig | null>(null);
  const [editSaving, setEditSaving]     = useState(false);

  // Edit scenario
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);
  const [editScenarioSaving, setEditScenarioSaving] = useState(false);
  const [editScenarioError, setEditScenarioError]   = useState('');

  // Add office modal
  const [addOfficeModal, setAddOfficeModal] = useState<Scenario | null>(null);
  const [existingChecked, setExistingChecked] = useState<Set<string>>(new Set());
  const [freeText, setFreeText]         = useState('');
  const [addOfficeLoading, setAddOfficeLoading] = useState(false);
  const [addOfficeError, setAddOfficeError]     = useState('');

  // New scenario modal
  const [newScenarioModal, setNewScenarioModal] = useState<string | null>(null); // form_type
  const [newScenario, setNewScenario]   = useState({ label: '', condition_type: 'none', condition_value: '' });
  const [newScenarioError, setNewScenarioError]   = useState('');
  const [newScenarioLoading, setNewScenarioLoading] = useState(false);

  // Delete modals
  const [deleteOfficeModal, setDeleteOfficeModal]     = useState<OfficeConfig | null>(null);
  const [deleteOfficeLoading, setDeleteOfficeLoading] = useState(false);
  const [deleteScenarioModal, setDeleteScenarioModal] = useState<Scenario | null>(null);
  const [deleteScenarioLoading, setDeleteScenarioLoading] = useState(false);
  const [deleteFormModal, setDeleteFormModal]         = useState<string | null>(null);
  const [deleteFormLoading, setDeleteFormLoading]     = useState(false);

  // New form type modal
  const [newFormModal, setNewFormModal] = useState(false);
  const [newFormCode, setNewFormCode]   = useState('');
  const [newFormLabel, setNewFormLabel] = useState('');
  const [newFormError, setNewFormError] = useState('');
  const [newFormLoading, setNewFormLoading] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchConfig() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/`);
      if (!res.ok) throw new Error();
      setAllConfigs(await res.json());
    } catch {
      setError('Could not load clearance office configuration.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchConfig(); }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const formTypes = ['RO-0005', 'RO-0004', ...Array.from(new Set(allConfigs.map(c => c.form_type))).filter(f => !['RO-0005', 'RO-0004'].includes(f)).sort()];

  function buildScenarios(formType: string): Scenario[] {
    const filtered = allConfigs.filter(c => c.form_type === formType);
    const map: Record<string, Scenario> = {};
    for (const c of filtered) {
      if (!map[c.exception_type]) {
        map[c.exception_type] = {
          form_type:       c.form_type,
          exception_type:  c.exception_type,
          exception_label: c.exception_label,
          condition_type:  c.condition_type,
          condition_value: c.condition_value,
          offices:         [],
        };
      }
      map[c.exception_type].offices.push(c);
    }
    Object.values(map).forEach(s => s.offices.sort((a, b) => a.sort_order - b.sort_order));
    return Object.values(map).sort((a, b) => {
      if (a.exception_type === 'standard') return -1;
      if (b.exception_type === 'standard') return 1;
      return a.exception_label.localeCompare(b.exception_label);
    });
  }

  // All unique office names across the current form type (for checkbox suggestions)
  function existingOfficeNames(formType: string): string[] {
    return Array.from(new Set(allConfigs.filter(c => c.form_type === formType).map(c => c.office_name))).sort();
  }

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── API actions ───────────────────────────────────────────────────────────
  async function handleReorder(id: number, direction: 'up' | 'down') {
    try {
      await fetch(`${API_BASE}/clearance-office-config/${id}/reorder/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      fetchConfig();
    } catch { alert('Failed to reorder.'); }
  }

  async function handleEditOfficeSave() {
    if (!editOffice) return;
    setEditSaving(true);
    try {
      await fetch(`${API_BASE}/clearance-office-config/${editOffice.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office_name: editOffice.office_name }),
      });
      setEditOffice(null);
      fetchConfig();
      showToast('Office name updated.');
    } catch { alert('Failed to save.'); }
    finally { setEditSaving(false); }
  }

  async function handleEditScenarioSave() {
    if (!editScenario) return;
    setEditScenarioSaving(true);
    setEditScenarioError('');
    try {
      // Update all offices in this scenario with new label/condition
      const offices = allConfigs.filter(
        c => c.form_type === editScenario.form_type && c.exception_type === editScenario.exception_type
      );
      await Promise.all(offices.map(o =>
        fetch(`${API_BASE}/clearance-office-config/${o.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exception_label: editScenario.exception_label,
            condition_type:  editScenario.condition_type,
            condition_value: editScenario.condition_value || null,
          }),
        })
      ));
      setEditScenario(null);
      fetchConfig();
      showToast('Scenario updated.');
    } catch { setEditScenarioError('Failed to save scenario.'); }
    finally { setEditScenarioSaving(false); }
  }

  async function handleAddOffices() {
    if (!addOfficeModal) return;
    const toAdd = [...existingChecked, ...(freeText.trim() ? [freeText.trim()] : [])];
    if (toAdd.length === 0) { setAddOfficeError('Select at least one office or enter a name.'); return; }
    setAddOfficeLoading(true);
    setAddOfficeError('');
    try {
      await Promise.all(toAdd.map(name =>
        fetch(`${API_BASE}/clearance-office-config/create/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_type:       addOfficeModal.form_type,
            exception_type:  addOfficeModal.exception_type,
            exception_label: addOfficeModal.exception_label,
            condition_type:  addOfficeModal.condition_type,
            condition_value: addOfficeModal.condition_value,
            office_name:     name,
          }),
        })
      ));
      setAddOfficeModal(null);
      setExistingChecked(new Set());
      setFreeText('');
      fetchConfig();
      showToast(`${toAdd.length} office${toAdd.length > 1 ? 's' : ''} added.`);
    } catch { setAddOfficeError('Failed to add offices. Some may already exist.'); }
    finally { setAddOfficeLoading(false); }
  }

  async function handleDeleteOffice() {
    if (!deleteOfficeModal) return;
    setDeleteOfficeLoading(true);
    try {
      await fetch(`${API_BASE}/clearance-office-config/${deleteOfficeModal.id}/delete/`, { method: 'DELETE' });
      setDeleteOfficeModal(null);
      fetchConfig();
      showToast(`"${deleteOfficeModal.office_name}" removed.`);
    } catch { alert('Failed to remove office.'); }
    finally { setDeleteOfficeLoading(false); }
  }

  async function handleDeleteScenario() {
    if (!deleteScenarioModal) return;
    setDeleteScenarioLoading(true);
    try {
      const offices = allConfigs.filter(
        c => c.form_type === deleteScenarioModal.form_type && c.exception_type === deleteScenarioModal.exception_type
      );
      await Promise.all(offices.map(o =>
        fetch(`${API_BASE}/clearance-office-config/${o.id}/delete/`, { method: 'DELETE' })
      ));
      setDeleteScenarioModal(null);
      fetchConfig();
      showToast(`Scenario "${deleteScenarioModal.exception_label}" removed.`);
    } catch { alert('Failed to remove scenario.'); }
    finally { setDeleteScenarioLoading(false); }
  }

  async function handleDeleteForm() {
    if (!deleteFormModal) return;
    setDeleteFormLoading(true);
    try {
      const offices = allConfigs.filter(c => c.form_type === deleteFormModal);
      await Promise.all(offices.map(o =>
        fetch(`${API_BASE}/clearance-office-config/${o.id}/delete/`, { method: 'DELETE' })
      ));
      setDeleteFormModal(null);
      if (activeForm === deleteFormModal) setActiveForm('RO-0005');
      fetchConfig();
      showToast(`Form type "${deleteFormModal}" removed.`);
    } catch { alert('Failed to remove form type.'); }
    finally { setDeleteFormLoading(false); }
  }

  async function handleNewScenario() {
    if (!newScenarioModal) return;
    if (!newScenario.label.trim()) { setNewScenarioError('Scenario name is required.'); return; }
    setNewScenarioLoading(true);
    setNewScenarioError('');
    const exception_type = slugify(newScenario.label);
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type:       newScenarioModal,
          exception_type,
          exception_label: newScenario.label.trim(),
          condition_type:  newScenario.condition_type,
          condition_value: newScenario.condition_value.trim() || null,
          office_name:     'Registrar\'s Office', // placeholder first office
        }),
      });
      const data = await res.json();
      if (!res.ok) { setNewScenarioError(data.error ?? 'Failed to create.'); return; }
      setNewScenarioModal(null);
      setNewScenario({ label: '', condition_type: 'none', condition_value: '' });
      fetchConfig();
      showToast(`Scenario "${newScenario.label}" created. Add offices to it now.`);
      // Auto-expand the new scenario
      setExpanded(prev => new Set([...prev, `${newScenarioModal}|${exception_type}`]));
    } catch { setNewScenarioError('Could not connect to server.'); }
    finally { setNewScenarioLoading(false); }
  }

  async function handleNewForm() {
    if (!newFormCode.trim()) { setNewFormError('Form type code is required.'); return; }
    if (!newFormLabel.trim()) { setNewFormError('Form label is required.'); return; }
    setNewFormLoading(true);
    setNewFormError('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type:       newFormCode.trim().toUpperCase(),
          exception_type:  'standard',
          exception_label: 'Standard',
          condition_type:  'none',
          condition_value: null,
          office_name:     'Registrar\'s Office',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setNewFormError(data.error ?? 'Failed to create form type.'); return; }
      setNewFormModal(false);
      setNewFormCode('');
      setNewFormLabel('');
      fetchConfig();
      setActiveForm(newFormCode.trim().toUpperCase());
      showToast(`Form type "${newFormCode.toUpperCase()}" created.`);
    } catch { setNewFormError('Could not connect to server.'); }
    finally { setNewFormLoading(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid var(--border-col)', borderRadius: 8,
    fontFamily: 'var(--drms-font)', background: 'var(--surface)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };

  const scenarios = buildScenarios(activeForm);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Clearance Offices' }]} showNotifDot />
      <div className="page-body">

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Clearance Offices</div>
          <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4 }}>
            Manage which offices must clear each type of request. Changes apply to new requests only — existing requests are not affected.
          </div>
        </div>

        {/* Info box */}
        <div className="info-box" style={{ marginBottom: 24 }}>
          <span className="info-icon"><IcoInfo /></span>
          <div className="info-text">
            Each form type has one or more <strong>scenarios</strong>. When a request is submitted, the system picks the matching scenario and auto-creates clearance records. Staff can still manually add or remove offices on individual requests from the Clearance tab.
          </div>
        </div>

        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon"><IcoInfo /></span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--mid-gray)', fontSize: 14 }}>Loading...</div>
        )}

        {!loading && (
          <>
            {/* Form type tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              {formTypes.map(ft => (
                <button
                  key={ft}
                  onClick={() => setActiveForm(ft)}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: activeForm === ft ? 700 : 500,
                    border: activeForm === ft ? '2px solid #114B9F' : '1.5px solid var(--border-col)',
                    background: activeForm === ft ? 'rgba(17,75,159,0.08)' : 'var(--surface)',
                    color: activeForm === ft ? '#114B9F' : 'var(--text-primary)',
                    cursor: 'pointer', fontFamily: 'var(--drms-font)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {ft}
                  <span style={{ fontSize: 10, color: activeForm === ft ? '#114B9F' : 'var(--mid-gray)' }}>
                    {FORM_LABELS[ft] ?? 'Custom Form'}
                  </span>
                  {!PROTECTED_FORMS.includes(ft) && (
                    <span
                      onClick={e => { e.stopPropagation(); setDeleteFormModal(ft); }}
                      style={{ marginLeft: 4, color: '#E50019', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Remove this form type"
                    >
                      <IcoX />
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => { setNewFormModal(true); setNewFormCode(''); setNewFormLabel(''); setNewFormError(''); }}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px dashed var(--border-col)', background: 'transparent', color: 'var(--mid-gray)', cursor: 'pointer', fontFamily: 'var(--drms-font)', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <IcoPlus /> New Form Type
              </button>
            </div>

            {/* Active form content */}
            <div className="drms-card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Form header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-col)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{activeForm}</div>
                  <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 2 }}>{FORM_LABELS[activeForm] ?? 'Custom Form'} — {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}</div>
                </div>
                <button
                  className="btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                  onClick={() => { setNewScenarioModal(activeForm); setNewScenario({ label: '', condition_type: 'none', condition_value: '' }); setNewScenarioError(''); }}
                >
                  <IcoPlus /> New Scenario
                </button>
              </div>

              {/* Scenarios */}
              {scenarios.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13, fontStyle: 'italic' }}>
                  No scenarios yet. Create one to get started.
                </div>
              )}

              {scenarios.map((scenario, si) => {
                const key = `${scenario.form_type}|${scenario.exception_type}`;
                const isExpanded = expanded.has(key);
                const isStandard = scenario.exception_type === 'standard';
                const isEditing  = editScenario?.form_type === scenario.form_type && editScenario?.exception_type === scenario.exception_type;

                return (
                  <div key={key} style={{ borderBottom: si < scenarios.length - 1 ? '1px solid var(--border-col)' : 'none' }}>

                    {/* Scenario header */}
                    <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'flex-start', gap: 10, background: isExpanded ? 'rgba(17,75,159,0.03)' : 'var(--surface)' }}>

                      {/* Chevron */}
                      <button
                        onClick={() => toggleExpand(key)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid-gray)', padding: 4, marginTop: 1, flexShrink: 0 }}
                      >
                        {isExpanded ? <IcoChevDown /> : <IcoChevRight />}
                      </button>

                      {/* Scenario info */}
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpand(key)}>
                        {isEditing ? (
                          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Scenario Name</label>
                              <input style={inp} value={editScenario.exception_label} onChange={e => setEditScenario({ ...editScenario, exception_label: e.target.value })} />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Condition Type</label>
                              <select style={{ ...inp, cursor: 'pointer' }} value={editScenario.condition_type} onChange={e => setEditScenario({ ...editScenario, condition_type: e.target.value, condition_value: '' })}>
                                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            {editScenario.condition_type === 'document_type' && (
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document keyword</label>
                                <input style={inp} placeholder='e.g. "enrollment"' value={editScenario.condition_value ?? ''} onChange={e => setEditScenario({ ...editScenario, condition_value: e.target.value })} />
                              </div>
                            )}
                            {editScenario.condition_type === 'enrollment_status' && (
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Enrollment Status</label>
                                <select style={{ ...inp, cursor: 'pointer' }} value={editScenario.condition_value ?? ''} onChange={e => setEditScenario({ ...editScenario, condition_value: e.target.value })}>
                                  <option value="">Select...</option>
                                  {ENROLLMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            )}
                            {editScenario.condition_type === 'combined' && (
                              <CombinedFields value={editScenario.condition_value ?? ''} onChange={v => setEditScenario({ ...editScenario, condition_value: v })} inp={inp} />
                            )}
                            {editScenarioError && <div style={{ fontSize: 11, color: '#E50019', fontWeight: 600 }}>{editScenarioError}</div>}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-primary btn-sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} disabled={editScenarioSaving} onClick={handleEditScenarioSave}>
                                <IcoCheck /> {editScenarioSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button className="btn-outline btn-sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setEditScenario(null)}>
                                <IcoX /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{scenario.exception_label}</span>
                              {isStandard && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(25,135,84,0.1)', color: '#198754', padding: '1px 7px', borderRadius: 50 }}>Default</span>
                              )}
                              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(17,75,159,0.1)', color: '#114B9F', padding: '1px 7px', borderRadius: 50 }}>
                                {scenario.offices.length} office{scenario.offices.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--mid-gray)', lineHeight: 1.5 }}>{conditionSummary(scenario)}</div>
                          </>
                        )}
                      </div>

                      {/* Scenario actions */}
                      {!isEditing && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            className="btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={e => { e.stopPropagation(); setEditScenario({ ...scenario }); setEditScenarioError(''); if (!isExpanded) toggleExpand(key); }}
                            title="Edit scenario"
                          >
                            <IcoEdit /> Edit
                          </button>
                          <button
                            className="btn-outline btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: isStandard ? 'var(--mid-gray)' : '#E50019', borderColor: isStandard ? 'var(--border-col)' : '#E50019', cursor: isStandard ? 'not-allowed' : 'pointer', opacity: isStandard ? 0.5 : 1 }}
                            disabled={isStandard}
                            title={isStandard ? 'The Standard scenario cannot be removed — it is the fallback for all requests.' : 'Remove this scenario'}
                            onClick={e => { e.stopPropagation(); if (!isStandard) setDeleteScenarioModal(scenario); }}
                          >
                            <IcoTrash /> Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded office list */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-col)', background: 'var(--surface)' }}>
                        {scenario.offices.length === 0 && (
                          <div style={{ padding: '14px 20px', color: 'var(--mid-gray)', fontSize: 13, fontStyle: 'italic' }}>
                            No offices yet. Add one below.
                          </div>
                        )}
                        {scenario.offices.map((office, idx) => (
                          <div key={office.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: '1px solid var(--border-col)' }}>
                            {/* Order badge */}
                            <span style={{ fontSize: 11, color: 'var(--mid-gray)', width: 20, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>

                            {/* Office name or inline edit */}
                            {editOffice?.id === office.id ? (
                              <input
                                style={{ flex: 1, fontSize: 13, padding: '4px 8px', border: '1.5px solid #114B9F', borderRadius: 6, fontFamily: 'var(--drms-font)', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                value={editOffice.office_name}
                                onChange={e => setEditOffice({ ...editOffice, office_name: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') handleEditOfficeSave(); if (e.key === 'Escape') setEditOffice(null); }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{office.office_name}</span>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26 }} disabled={idx === 0} onClick={() => handleReorder(office.id, 'up')} title="Move up"><IcoUp /></button>
                              <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26 }} disabled={idx === scenario.offices.length - 1} onClick={() => handleReorder(office.id, 'down')} title="Move down"><IcoDown /></button>

                              {editOffice?.id === office.id ? (
                                <>
                                  <button className="btn-outline btn-sm" style={{ padding: '0 7px', height: 26, color: '#198754', borderColor: '#198754' }} onClick={handleEditOfficeSave} disabled={editSaving} title="Save"><IcoCheck /></button>
                                  <button className="btn-outline btn-sm" style={{ padding: '0 7px', height: 26 }} onClick={() => setEditOffice(null)} title="Cancel"><IcoX /></button>
                                </>
                              ) : (
                                <button className="btn-outline btn-sm" style={{ padding: '0 7px', height: 26 }} onClick={() => setEditOffice({ ...office })} title="Edit name"><IcoEdit /></button>
                              )}

                              <button
                                className="btn-outline btn-sm"
                                style={{ padding: '0 7px', height: 26, color: '#E50019', borderColor: '#E50019' }}
                                onClick={() => setDeleteOfficeModal(office)}
                                title="Remove office"
                              >
                                <IcoTrash />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add office button */}
                        <div style={{ padding: '10px 20px' }}>
                          <button
                            className="btn-outline btn-sm"
                            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => { setAddOfficeModal(scenario); setExistingChecked(new Set()); setFreeText(''); setAddOfficeError(''); }}
                          >
                            <IcoPlus /> Add Office
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Add Office Modal ── */}
      {addOfficeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setAddOfficeModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Add Offices</div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 20 }}>
              Adding to <strong>{addOfficeModal.exception_label}</strong> — {addOfficeModal.form_type}
            </div>

            {/* Existing offices checkboxes */}
            {existingOfficeNames(addOfficeModal.form_type).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Existing offices in this form type
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-col)', borderRadius: 8, padding: 12 }}>
                  {existingOfficeNames(addOfficeModal.form_type).map(name => {
                    // Check if already in this scenario
                    const alreadyIn = addOfficeModal.offices.some(o => o.office_name === name);
                    return (
                      <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadyIn ? 'not-allowed' : 'pointer', opacity: alreadyIn ? 0.4 : 1 }}>
                        <input
                          type="checkbox"
                          checked={existingChecked.has(name)}
                          disabled={alreadyIn}
                          onChange={e => {
                            const next = new Set(existingChecked);
                            e.target.checked ? next.add(name) : next.delete(name);
                            setExistingChecked(next);
                          }}
                          style={{ width: 15, height: 15, accentColor: '#114B9F' }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{name}</span>
                        {alreadyIn && <span style={{ fontSize: 11, color: 'var(--mid-gray)', fontStyle: 'italic' }}>already added</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Free text for new office */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Add a new office name
              </div>
              <input
                style={inp}
                placeholder="e.g. Program Chair"
                value={freeText}
                onChange={e => { setFreeText(e.target.value); setAddOfficeError(''); }}
              />
              <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>Leave blank if selecting from the list above</div>
            </div>

            {addOfficeError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12 }}>{addOfficeError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={addOfficeLoading} onClick={handleAddOffices}>
                {addOfficeLoading ? 'Adding...' : `Add ${existingChecked.size + (freeText.trim() ? 1 : 0) || ''} Office${existingChecked.size + (freeText.trim() ? 1 : 0) !== 1 ? 's' : ''}`}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAddOfficeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Scenario Modal ── */}
      {newScenarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setNewScenarioModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>New Scenario</div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 20 }}>Adding scenario for <strong>{newScenarioModal}</strong></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Scenario Name <span style={{ color: '#E50019' }}>*</span></label>
                <input style={inp} placeholder="e.g. COE (Enrolled Student)" value={newScenario.label} onChange={e => setNewScenario({ ...newScenario, label: e.target.value })} />
                {newScenario.label.trim() && (
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 3 }}>
                    Internal ID: <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>{slugify(newScenario.label)}</code>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>When does this apply?</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={newScenario.condition_type} onChange={e => setNewScenario({ ...newScenario, condition_type: e.target.value, condition_value: '' })}>
                  {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {newScenario.condition_type === 'document_type' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document keyword</label>
                  <input style={inp} placeholder='e.g. "enrollment" — matches any document name containing this word' value={newScenario.condition_value} onChange={e => setNewScenario({ ...newScenario, condition_value: e.target.value })} />
                </div>
              )}
              {newScenario.condition_type === 'enrollment_status' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Enrollment Status</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={newScenario.condition_value} onChange={e => setNewScenario({ ...newScenario, condition_value: e.target.value })}>
                    <option value="">Select...</option>
                    {ENROLLMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
              {newScenario.condition_type === 'combined' && (
                <CombinedFields value={newScenario.condition_value} onChange={v => setNewScenario({ ...newScenario, condition_value: v })} inp={inp} />
              )}

              <div className="info-box" style={{ fontSize: 12 }}>
                <span className="info-icon"><IcoInfo /></span>
                <div className="info-text">The scenario will be created with a default "Registrar's Office" entry. You can add, edit, or remove offices after creation.</div>
              </div>

              {newScenarioError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{newScenarioError}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={newScenarioLoading} onClick={handleNewScenario}>
                  {newScenarioLoading ? 'Creating...' : 'Create Scenario'}
                </button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setNewScenarioModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Form Type Modal ── */}
      {newFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setNewFormModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>New Form Type</div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 20 }}>Add a new form type to configure its clearance offices.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Form Type Code <span style={{ color: '#E50019' }}>*</span></label>
                <input style={inp} placeholder="e.g. RO-0006" value={newFormCode} onChange={e => setNewFormCode(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Label <span style={{ color: '#E50019' }}>*</span></label>
                <input style={inp} placeholder="e.g. Special Request" value={newFormLabel} onChange={e => setNewFormLabel(e.target.value)} />
              </div>
              <div className="info-box" style={{ fontSize: 12 }}>
                <span className="info-icon"><IcoInfo /></span>
                <div className="info-text">A default Standard scenario with a "Registrar's Office" placeholder will be created. Configure it after creation.</div>
              </div>
              {newFormError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{newFormError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={newFormLoading} onClick={handleNewForm}>
                  {newFormLoading ? 'Creating...' : 'Create Form Type'}
                </button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setNewFormModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Office Modal ── */}
      {deleteOfficeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDeleteOfficeModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Office</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Remove <strong>{deleteOfficeModal.office_name}</strong> from this scenario?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              This only affects future requests. Existing clearance records are not changed.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }} disabled={deleteOfficeLoading} onClick={handleDeleteOffice}>
                {deleteOfficeLoading ? 'Removing...' : 'Yes, Remove'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteOfficeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Scenario Modal ── */}
      {deleteScenarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDeleteScenarioModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Scenario</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Remove scenario <strong>{deleteScenarioModal.exception_label}</strong> and all its offices from <strong>{deleteScenarioModal.form_type}</strong>?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              All {deleteScenarioModal.offices.length} office{deleteScenarioModal.offices.length !== 1 ? 's' : ''} in this scenario will be deleted. New requests that would have matched this scenario will fall back to the <strong>Standard</strong> scenario instead. Existing requests are not affected.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }} disabled={deleteScenarioLoading} onClick={handleDeleteScenario}>
                {deleteScenarioLoading ? 'Removing...' : 'Yes, Remove Scenario'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteScenarioModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Form Type Modal ── */}
      {deleteFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDeleteFormModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Form Type</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Remove form type <strong>{deleteFormModal}</strong> and all its scenarios?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              All scenarios and offices configured for <strong>{deleteFormModal}</strong> will be permanently deleted. New requests of this type will fall back to the hardcoded default offices. Existing requests are not affected.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }} disabled={deleteFormLoading} onClick={handleDeleteForm}>
                {deleteFormLoading ? 'Removing...' : 'Yes, Remove Form Type'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteFormModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#001C43', color: 'white', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </>
  );
}
