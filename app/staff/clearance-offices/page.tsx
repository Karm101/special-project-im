"use client";

import { useState, useEffect } from 'react';
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

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IcoUp      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><polyline points="18 15 12 9 6 15"/></svg>;
const IcoDown    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoTrash   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcoCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><polyline points="20 6 9 17 4 12"/></svg>;
const IcoPlus    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoX       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoInfo    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16,flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>;

const CONDITION_LABELS: Record<string, string> = {
  'none':              'Always applies (no condition)',
  'document_type':     'Document type matches',
  'enrollment_status': 'Enrollment status matches',
  'combined':          'Document type + Enrollment status',
  'manual':            'Manual — staff triggered only',
};

const FORM_TYPE_LABELS: Record<string, string> = {
  'RO-0005': 'RO-0005 — Credential Request',
  'RO-0004': 'RO-0004 — Transfer Credential',
};

function conditionSummary(scenario: Scenario): string {
  const ct = scenario.condition_type;
  const cv = scenario.condition_value;
  if (ct === 'none') return 'Applied to all requests of this form type';
  if (ct === 'manual') return 'Applied manually by staff from the Clearance tab';
  if (ct === 'document_type' && cv) return `Applied when request contains a document matching "${cv}"`;
  if (ct === 'enrollment_status' && cv) return `Applied when student enrollment status is "${cv}"`;
  if (ct === 'combined' && cv) {
    try {
      const p = JSON.parse(cv);
      return `Applied when document matches "${p.document}" AND student is "${p.enrollment}"`;
    } catch { return 'Combined condition'; }
  }
  return CONDITION_LABELS[ct] ?? ct;
}

function CombinedConditionFields({ value, onChange, inp }: {
  value: string;
  onChange: (val: string) => void;
  inp: React.CSSProperties;
}) {
  let parsed: { document?: string; enrollment?: string } = {};
  try { parsed = value.includes('{') ? JSON.parse(value) : {}; } catch {}

  function update(field: 'document' | 'enrollment', val: string) {
    onChange(JSON.stringify({ ...parsed, [field]: val }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document keyword</label>
        <input style={inp} placeholder='e.g. "enrollment"' value={parsed.document ?? ''} onChange={e => update('document', e.target.value)} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Enrollment Status</label>
        <select style={{ ...inp, cursor: 'pointer' }} value={parsed.enrollment ?? ''} onChange={e => update('enrollment', e.target.value)}>
          <option value="">Select...</option>
          <option value="Enrolled">Enrolled</option>
          <option value="Not Enrolled">Not Enrolled</option>
          <option value="Alumni">Alumni</option>
          <option value="Transferee">Transferee</option>
        </select>
      </div>
    </div>
  );
}

export default function ClearanceOfficesPage() {
  const [allConfigs, setAllConfigs]   = useState<OfficeConfig[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  // Edit office name inline
  const [editOffice, setEditOffice]   = useState<OfficeConfig | null>(null);
  const [editSaving, setEditSaving]   = useState(false);

  // Add office to scenario
  const [addingTo, setAddingTo]       = useState<string | null>(null); // "form_type|exception_type"
  const [newOfficeName, setNewOfficeName] = useState('');
  const [addError, setAddError]       = useState('');
  const [addLoading, setAddLoading]   = useState(false);

  // Add new scenario
  const [scenarioModal, setScenarioModal] = useState<{ form_type: string } | null>(null);
  const [newScenario, setNewScenario] = useState({
    exception_type:  '',
    exception_label: '',
    condition_type:  'none',
    condition_value: '',
    first_office:    '',
  });
  const [scenarioError, setScenarioError]   = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Delete office modal
  const [deleteModal, setDeleteModal] = useState<OfficeConfig | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Group configs into scenarios
  function buildScenarios(formType: string): Scenario[] {
    const filtered = allConfigs.filter(c => c.form_type === formType);
    const scenarioMap: Record<string, Scenario> = {};
    for (const c of filtered) {
      const key = c.exception_type;
      if (!scenarioMap[key]) {
        scenarioMap[key] = {
          form_type:       c.form_type,
          exception_type:  c.exception_type,
          exception_label: c.exception_label,
          condition_type:  c.condition_type,
          condition_value: c.condition_value,
          offices:         [],
        };
      }
      scenarioMap[key].offices.push(c);
    }
    // Sort offices within each scenario
    Object.values(scenarioMap).forEach(s => {
      s.offices.sort((a, b) => a.sort_order - b.sort_order);
    });
    // Return standard first, then others
    const sorted = Object.values(scenarioMap).sort((a, b) => {
      if (a.exception_type === 'standard') return -1;
      if (b.exception_type === 'standard') return 1;
      return a.exception_label.localeCompare(b.exception_label);
    });
    return sorted;
  }

  const formTypes = [...new Set(allConfigs.map(c => c.form_type))].sort();

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

  async function handleEditSave() {
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

  async function handleAddOffice(form_type: string, exception_type: string, exception_label: string, condition_type: string, condition_value: string | null) {
    if (!newOfficeName.trim()) { setAddError('Office name is required.'); return; }
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_type, exception_type, exception_label, condition_type, condition_value, office_name: newOfficeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? 'Failed to add.'); return; }
      setNewOfficeName('');
      setAddingTo(null);
      fetchConfig();
      showToast(`"${newOfficeName.trim()}" added.`);
    } catch { setAddError('Could not connect to server.'); }
    finally { setAddLoading(false); }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/${deleteModal.id}/delete/`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDeleteModal(null);
      fetchConfig();
      showToast(`"${deleteModal.office_name}" removed.`);
    } catch { alert('Failed to remove office.'); }
    finally { setDeleteLoading(false); }
  }

  async function handleAddScenario() {
    if (!scenarioModal) return;
    if (!newScenario.exception_type.trim()) { setScenarioError('Scenario ID is required.'); return; }
    if (!newScenario.exception_label.trim()) { setScenarioError('Scenario label is required.'); return; }
    if (!newScenario.first_office.trim()) { setScenarioError('At least one office name is required.'); return; }
    setScenarioLoading(true);
    setScenarioError('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type:       scenarioModal.form_type,
          exception_type:  newScenario.exception_type.trim().toLowerCase().replace(/\s+/g, '_'),
          exception_label: newScenario.exception_label.trim(),
          condition_type:  newScenario.condition_type,
          condition_value: newScenario.condition_value.trim() || null,
          office_name:     newScenario.first_office.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setScenarioError(data.error ?? 'Failed to create scenario.'); return; }
      setScenarioModal(null);
      setNewScenario({ exception_type: '', exception_label: '', condition_type: 'none', condition_value: '', first_office: '' });
      fetchConfig();
      showToast(`Scenario "${newScenario.exception_label}" created.`);
    } catch { setScenarioError('Could not connect to server.'); }
    finally { setScenarioLoading(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 12,
    border: '1.5px solid var(--border-col)', borderRadius: 8,
    fontFamily: 'var(--drms-font)', background: 'var(--surface)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Clearance Offices</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4 }}>
          Manage which offices must clear each type of request. Changes apply to new requests only.
        </div>
      </div>

      {/* Info box */}
      <div className="info-box" style={{ marginBottom: 24 }}>
        <span className="info-icon"><IcoInfo /></span>
        <div className="info-text">
          Each form type has one or more <strong>scenarios</strong>. When a request is submitted, the system automatically selects the matching scenario and creates the corresponding clearance records. You can also add or remove offices on individual requests from the Clearance tab.
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {(['RO-0005', 'RO-0004', ...formTypes.filter(f => f !== 'RO-0005' && f !== 'RO-0004')]).map(formType => {
            const scenarios = buildScenarios(formType);
            return (
              <div key={formType}>
                {/* Form type header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{formType}</div>
                    <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>{FORM_TYPE_LABELS[formType] ?? formType}</div>
                  </div>
                  <button
                    className="btn-outline btn-sm"
                    style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => { setScenarioModal({ form_type: formType }); setScenarioError(''); setNewScenario({ exception_type: '', exception_label: '', condition_type: 'none', condition_value: '', first_office: '' }); }}
                  >
                    <IcoPlus /> New Scenario
                  </button>
                </div>

                {/* Scenarios */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {scenarios.length === 0 && (
                    <div className="drms-card" style={{ padding: 20, color: 'var(--mid-gray)', fontSize: 13, fontStyle: 'italic' }}>
                      No scenarios configured for {formType}.
                    </div>
                  )}
                  {scenarios.map(scenario => {
                    const groupKey = `${scenario.form_type}|${scenario.exception_type}`;
                    const isAdding = addingTo === groupKey;
                    return (
                      <div key={groupKey} className="drms-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Scenario header */}
                        <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-col)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {scenario.exception_label}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2, lineHeight: 1.5 }}>
                                {conditionSummary(scenario)}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(17,75,159,0.1)', color: '#114B9F', padding: '2px 8px', borderRadius: 50, whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {scenario.offices.length} office{scenario.offices.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Office rows */}
                        <div>
                          {scenario.offices.map((office, idx) => (
                            <div key={office.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border-col)' }}>
                              {/* Order number */}
                              <span style={{ fontSize: 11, color: 'var(--mid-gray)', width: 18, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>

                              {/* Office name or inline edit */}
                              {editOffice?.id === office.id ? (
                                <input
                                  style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '1.5px solid var(--navy)', borderRadius: 6, fontFamily: 'var(--drms-font)', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                  value={editOffice.office_name}
                                  onChange={e => setEditOffice({ ...editOffice, office_name: e.target.value })}
                                  onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditOffice(null); }}
                                  autoFocus
                                />
                              ) : (
                                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{office.office_name}</span>
                              )}

                              {/* Action buttons */}
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26 }} disabled={idx === 0} onClick={() => handleReorder(office.id, 'up')} title="Move up"><IcoUp /></button>
                                <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26 }} disabled={idx === scenario.offices.length - 1} onClick={() => handleReorder(office.id, 'down')} title="Move down"><IcoDown /></button>

                                {editOffice?.id === office.id ? (
                                  <>
                                    <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26, color: '#198754', borderColor: '#198754' }} onClick={handleEditSave} disabled={editSaving} title="Save"><IcoCheck /></button>
                                    <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26 }} onClick={() => setEditOffice(null)} title="Cancel"><IcoX /></button>
                                  </>
                                ) : (
                                  <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26 }} onClick={() => setEditOffice({ ...office })} title="Edit name"><IcoEdit /></button>
                                )}

                                <button className="btn-outline btn-sm" style={{ padding: '0 6px', height: 26, color: '#E50019', borderColor: '#E50019' }} onClick={() => setDeleteModal(office)} title="Remove"><IcoTrash /></button>
                              </div>
                            </div>
                          ))}

                          {/* Add office row */}
                          <div style={{ padding: '10px 16px' }}>
                            {isAdding ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <input
                                    style={{ flex: 1, fontSize: 12, padding: '6px 10px', border: '1.5px solid var(--navy)', borderRadius: 6, fontFamily: 'var(--drms-font)', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }}
                                    placeholder="Office name..."
                                    value={newOfficeName}
                                    onChange={e => { setNewOfficeName(e.target.value); setAddError(''); }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddOffice(scenario.form_type, scenario.exception_type, scenario.exception_label, scenario.condition_type, scenario.condition_value); if (e.key === 'Escape') { setAddingTo(null); setNewOfficeName(''); } }}
                                    autoFocus
                                  />
                                  <button className="btn-primary btn-sm" style={{ padding: '0 10px', height: 32 }} disabled={addLoading} onClick={() => handleAddOffice(scenario.form_type, scenario.exception_type, scenario.exception_label, scenario.condition_type, scenario.condition_value)}><IcoCheck /></button>
                                  <button className="btn-outline btn-sm" style={{ padding: '0 10px', height: 32 }} onClick={() => { setAddingTo(null); setNewOfficeName(''); setAddError(''); }}><IcoX /></button>
                                </div>
                                {addError && <div style={{ fontSize: 11, color: '#E50019', fontWeight: 600 }}>{addError}</div>}
                              </div>
                            ) : (
                              <button className="btn-outline btn-sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { setAddingTo(groupKey); setNewOfficeName(''); setAddError(''); }}>
                                <IcoPlus /> Add Office
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── New Scenario Modal ── */}
      {scenarioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setScenarioModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>New Scenario</div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 20 }}>Adding scenario for <strong>{scenarioModal.form_type}</strong></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Scenario Label <span style={{ color: '#E50019' }}>*</span></label>
                <input style={inp} placeholder="e.g. COE (Enrolled Student)" value={newScenario.exception_label} onChange={e => setNewScenario({ ...newScenario, exception_label: e.target.value })} />
                <div style={{ fontSize: 10, color: 'var(--mid-gray)', marginTop: 3 }}>Human-readable name shown in the UI</div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Scenario ID <span style={{ color: '#E50019' }}>*</span></label>
                <input style={inp} placeholder="e.g. coe_enrolled" value={newScenario.exception_type} onChange={e => setNewScenario({ ...newScenario, exception_type: e.target.value })} />
                <div style={{ fontSize: 10, color: 'var(--mid-gray)', marginTop: 3 }}>Lowercase with underscores — used internally</div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Condition Type</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={newScenario.condition_type} onChange={e => setNewScenario({ ...newScenario, condition_type: e.target.value, condition_value: '' })}>
                  <option value="none">Always applies (no condition)</option>
                  <option value="document_type">Document type matches</option>
                  <option value="enrollment_status">Enrollment status matches</option>
                  <option value="combined">Document type + Enrollment status</option>
                  <option value="manual">Manual — staff triggered only</option>
                </select>
              </div>

              {newScenario.condition_type === 'document_type' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document keyword</label>
                  <input style={inp} placeholder='e.g. "enrollment" matches Certificate of Enrollment' value={newScenario.condition_value} onChange={e => setNewScenario({ ...newScenario, condition_value: e.target.value })} />
                </div>
              )}

              {newScenario.condition_type === 'enrollment_status' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Enrollment Status</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={newScenario.condition_value} onChange={e => setNewScenario({ ...newScenario, condition_value: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="Not Enrolled">Not Enrolled</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Transferee">Transferee</option>
                  </select>
                </div>
              )}

              {newScenario.condition_type === 'combined' && (
                <CombinedConditionFields
                  value={newScenario.condition_value}
                  onChange={val => setNewScenario({ ...newScenario, condition_value: val })}
                  inp={inp}
                />
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>First Office <span style={{ color: '#E50019' }}>*</span></label>
                <input style={inp} placeholder="e.g. Registrar's Office" value={newScenario.first_office} onChange={e => setNewScenario({ ...newScenario, first_office: e.target.value })} />
                <div style={{ fontSize: 10, color: 'var(--mid-gray)', marginTop: 3 }}>You can add more offices after creating the scenario</div>
              </div>

              {scenarioError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{scenarioError}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={scenarioLoading} onClick={handleAddScenario}>
                  {scenarioLoading ? 'Creating...' : 'Create Scenario'}
                </button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setScenarioModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Office Modal ── */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Office</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Remove <strong>{deleteModal.office_name}</strong> from this scenario?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              This only affects future requests. Existing clearance records are not changed.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }} disabled={deleteLoading} onClick={handleDelete}>
                {deleteLoading ? 'Removing...' : 'Yes, Remove'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteModal(null)}>Cancel</button>
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
    </div>
  );
}