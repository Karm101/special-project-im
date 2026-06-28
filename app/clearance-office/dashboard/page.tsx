"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

type ClearanceRecord = {
  clearance_id:     number;
  clearance_status: 'Pending' | 'Cleared' | 'Not Applicable';
  office_name:      string;
  cleared_at:       string | null;
  cleared_by_name:  string | null;
  remarks:          string | null;
  request: {
    request_id:          number;
    document_request_no: string | null;
    form_type:           string;
    date_submitted:      string;
    current_status:      string;
    purpose:             string;
    student_name:        string;
    student_number:      string;
    program_strand:      string;
    documents:           string;
  };
};

type AuditLog = {
  id:               number;
  action:           string;
  performed_by:     string;
  performed_by_role: string;
  details:          string;
  office_name:      string;
  created_at:       string;
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });
}

function formatRequestId(id: number, no: string | null) {
  return no ?? `REQ-${String(id).padStart(3, '0')}`;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:          { label: 'Confirmed',          color: '#198754' },
  confirmed_by_admin: { label: 'Confirmed by Admin', color: '#114B9F' },
  link_sent:          { label: 'Link Sent',          color: '#FFA323' },
  link_disabled:      { label: 'Link Disabled',      color: '#888'    },
  link_regenerated:   { label: 'Link Regenerated',   color: '#FFA323' },
  office_added:       { label: 'Office Added',       color: '#114B9F' },
  office_removed:     { label: 'Office Removed',     color: '#E50019' },
  account_created:    { label: 'Account Created',    color: '#198754' },
  setup_completed:    { label: 'Setup Completed',    color: '#198754' },
};

export default function ClearanceOfficeDashboard() {
  const router = useRouter();

  // Session
  const [token, setToken]           = useState('');
  const [officeName, setOfficeName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole]             = useState('');
  const [isSetup, setIsSetup]       = useState(false);
  const [sigUrl, setSigUrl]         = useState('');

  // Tab
  const [activeTab, setActiveTab]   = useState<'pending' | 'cleared' | 'audit'>('pending');

  // Data
  const [clearances, setClearances] = useState<ClearanceRecord[]>([]);
  const [auditLogs, setAuditLogs]   = useState<AuditLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError]           = useState('');

  // Selected request
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<ClearanceRecord | null>(null);
  const [remarks, setRemarks]           = useState('');
  const [confirming, setConfirming]     = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const t  = sessionStorage.getItem('co_token') ?? '';
    const on = sessionStorage.getItem('co_office_name') ?? '';
    const dn = sessionStorage.getItem('co_display_name') ?? '';
    const r  = sessionStorage.getItem('co_role') ?? '';
    const s  = sessionStorage.getItem('co_setup') === 'true';
    const sig = sessionStorage.getItem('co_signature') ?? '';

    if (!t) { router.push('/clearance-office/login'); return; }
    if (!s && r !== 'Super Admin') { router.push('/clearance-office/setup'); return; }

    setToken(t);
    setOfficeName(on);
    setDisplayName(dn);
    setRole(r);
    setIsSetup(s);
    setSigUrl(sig);
  }, []);

  const fetchClearances = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const url = role === 'Super Admin' && officeName
        ? `${API_BASE}/clearance-office/my-clearances/?office_name=${encodeURIComponent(officeName)}`
        : `${API_BASE}/clearance-office/my-clearances/`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: ClearanceRecord[] = await res.json();
      setClearances(data);
      // Auto-select first pending
      const firstPending = data.find(c => c.clearance_status === 'Pending');
      if (firstPending && !selectedId) setSelectedId(firstPending.clearance_id);
    } catch {
      setError('Could not load clearances.');
    } finally {
      setLoading(false);
    }
  }, [token, role, officeName]);

  async function fetchAuditLogs() {
    if (!token) return;
    setAuditLoading(true);
    try {
      const url = officeName
        ? `${API_BASE}/clearance-office/audit-log/?office_name=${encodeURIComponent(officeName)}`
        : `${API_BASE}/clearance-office/audit-log/`;
      const res = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
      if (!res.ok) throw new Error();
      setAuditLogs(await res.json());
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchClearances();
  }, [token, fetchClearances]);

  useEffect(() => {
    if (activeTab === 'audit' && token) fetchAuditLogs();
  }, [activeTab, token]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => fetchClearances(), 30000);
    return () => clearInterval(interval);
  }, [token, fetchClearances]);

  async function handleConfirm() {
    if (!confirmModal) return;
    setConfirming(true);
    setConfirmError('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office/confirm/${confirmModal.clearance_id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ remarks: remarks.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setConfirmError(data.error ?? 'Failed to confirm.'); return; }
      setConfirmModal(null);
      setRemarks('');
      setSelectedId(null);
      fetchClearances();
      showToast(`Clearance confirmed for ${confirmModal.request.student_name}.`);
    } catch {
      setConfirmError('Could not connect to server.');
    } finally {
      setConfirming(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem('co_token');
    sessionStorage.removeItem('co_office_name');
    sessionStorage.removeItem('co_display_name');
    sessionStorage.removeItem('co_role');
    sessionStorage.removeItem('co_setup');
    sessionStorage.removeItem('co_signature');
    router.push('/clearance-office/login');
  }

  const pending = clearances.filter(c => c.clearance_status === 'Pending');
  const cleared = clearances.filter(c => c.clearance_status === 'Cleared');
  const selected = clearances.find(c => c.clearance_id === selectedId) ?? null;

  const tabList = clearances.filter(c =>
    activeTab === 'pending' ? c.clearance_status === 'Pending' :
    activeTab === 'cleared' ? c.clearance_status === 'Cleared' : false
  );

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '8px 18px', fontSize: 13, fontWeight: activeTab === t ? 700 : 500,
    border: 'none', borderBottom: activeTab === t ? '2px solid #114B9F' : '2px solid transparent',
    background: 'none', color: activeTab === t ? '#114B9F' : '#888',
    cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", transition: 'all .15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', fontFamily: "'Montserrat', sans-serif" }}>

      {/* Top nav */}
      <div style={{ background: '#001C43', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/mmcm-logo.png" alt="MMCM" style={{ height: 32 }} />
          <div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{officeName}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Clearance Office Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{displayName}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{role}</div>
          </div>
          {sigUrl && (
            <img src={sigUrl} alt="Your signature" style={{ height: 28, maxWidth: 60, objectFit: 'contain', background: 'white', borderRadius: 4, padding: '2px 4px' }} />
          )}
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Setup warning */}
        {!isSetup && role !== 'Super Admin' && (
          <div style={{ background: 'rgba(255,163,35,0.1)', border: '1px solid rgba(255,163,35,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: '#7a4f00', fontWeight: 600 }}>
              ⚠ Complete your setup to start confirming clearances.
            </div>
            <button onClick={() => router.push('/clearance-office/setup')} style={{ background: '#FFA323', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
              Complete Setup
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Pending',       value: pending.length, color: '#FFA323', bg: 'rgba(255,163,35,0.1)' },
            { label: 'Cleared Today', value: cleared.filter(c => c.cleared_at && new Date(c.cleared_at).toDateString() === new Date().toDateString()).length, color: '#198754', bg: 'rgba(25,135,84,0.1)' },
            { label: 'Total Cleared', value: cleared.length, color: '#114B9F', bg: 'rgba(17,75,159,0.1)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '16px 20px', border: '1px solid #eaecf0', borderBottom: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E50019', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #eaecf0', padding: '0 20px' }}>
            <button style={tabStyle('pending')} onClick={() => setActiveTab('pending')}>
              Pending
              {pending.length > 0 && <span style={{ marginLeft: 6, background: '#E50019', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 50 }}>{pending.length}</span>}
            </button>
            <button style={tabStyle('cleared')} onClick={() => setActiveTab('cleared')}>
              Cleared ({cleared.length})
            </button>
            <button style={tabStyle('audit')} onClick={() => setActiveTab('audit')}>
              Audit Log
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={fetchClearances}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '0 8px', display: 'flex', alignItems: 'center' }}
              title="Refresh"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>
          </div>

          {/* Audit log tab */}
          {activeTab === 'audit' && (
            <div style={{ padding: 20 }}>
              {auditLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>Loading audit log...</div>
              ) : auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13, fontStyle: 'italic' }}>No audit entries yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {auditLogs.map(log => {
                    const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: '#888' };
                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: `${meta.color}18`, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {meta.label}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: '#001C43', fontWeight: 600 }}>{log.performed_by}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{log.details}</div>
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(log.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pending / Cleared tabs — split panel */}
          {activeTab !== 'audit' && (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 480 }}>

              {/* Left — list */}
              <div style={{ borderRight: '1px solid #eaecf0', overflowY: 'auto', maxHeight: 600 }}>
                {loading && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 13 }}>Loading...</div>
                )}
                {!loading && tabList.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 13, fontStyle: 'italic' }}>
                    {activeTab === 'pending' ? 'No pending clearances.' : 'No cleared records yet.'}
                  </div>
                )}
                {tabList.map((c, i) => {
                  const isSelected = selectedId === c.clearance_id;
                  return (
                    <div
                      key={c.clearance_id}
                      onClick={() => setSelectedId(c.clearance_id)}
                      style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: isSelected ? 'rgba(17,75,159,0.06)' : 'white', borderLeft: isSelected ? '3px solid #114B9F' : '3px solid transparent', transition: 'all .12s' }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#001C43' }}>
                        {formatRequestId(c.request.request_id, c.request.document_request_no)}
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.request.student_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {c.request.documents}
                      </div>
                      <div style={{ fontSize: 10, color: '#ccc', marginTop: 3 }}>
                        Submitted {new Date(c.request.date_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right — detail panel */}
              {selected ? (
                <div style={{ padding: 24, overflowY: 'auto' }}>

                  {/* Request info */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#001C43', marginBottom: 4 }}>
                      {formatRequestId(selected.request.request_id, selected.request.document_request_no)}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{selected.request.form_type} · {selected.request.current_status}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Student',   value: selected.request.student_name },
                      { label: 'Student No.', value: selected.request.student_number },
                      { label: 'Program',   value: selected.request.program_strand },
                      { label: 'Submitted', value: new Date(selected.request.date_submitted).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                      { label: 'Documents', value: selected.request.documents },
                    ].map(f => (
                      <div key={f.label} style={{ gridColumn: f.label === 'Documents' ? '1 / -1' : undefined }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{f.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#001C43' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Purpose */}
                  {selected.request.purpose && (
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Purpose</div>
                      <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{selected.request.purpose}</div>
                    </div>
                  )}

                  {/* Already cleared info */}
                  {selected.clearance_status === 'Cleared' && (
                    <div style={{ background: 'rgba(25,135,84,0.06)', border: '1px solid rgba(25,135,84,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#198754', marginBottom: 8 }}>✓ Clearance Confirmed</div>
                      <div style={{ fontSize: 12, color: '#444' }}>Confirmed by <strong>{selected.cleared_by_name}</strong> on {formatDate(selected.cleared_at)}</div>
                      {selected.remarks && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Remarks: {selected.remarks}</div>}
                    </div>
                  )}

                  {/* Confirm button */}
                  {selected.clearance_status === 'Pending' && (
                    <div>
                      {/* Signature preview */}
                      {sigUrl && (
                        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f8f9fa', borderRadius: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Your signature (auto-populated)</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={sigUrl} alt="Your signature" style={{ height: 40, maxWidth: 120, objectFit: 'contain', border: '1px solid #eee', borderRadius: 4, padding: 4, background: 'white' }} />
                            <div style={{ fontSize: 12, color: '#001C43', fontWeight: 600 }}>{displayName}</div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => { setConfirmModal(selected); setRemarks(''); setConfirmError(''); }}
                        disabled={!isSetup && role !== 'Super Admin'}
                        style={{ width: '100%', padding: 12, background: isSetup || role === 'Super Admin' ? '#198754' : '#ccc', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: isSetup || role === 'Super Admin' ? 'pointer' : 'not-allowed', fontFamily: "'Montserrat', sans-serif" }}
                      >
                        Confirm Clearance
                      </button>
                      {!isSetup && role !== 'Super Admin' && (
                        <div style={{ fontSize: 11, color: '#E50019', marginTop: 6, textAlign: 'center' }}>
                          Complete your setup to confirm clearances.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13, fontStyle: 'italic' }}>
                  Select a request to view details
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm clearance modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setConfirmModal(null)}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#001C43', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>Confirm Clearance</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20, fontFamily: "'Montserrat', sans-serif" }}>
              You are confirming clearance for <strong>{confirmModal.request.student_name}</strong>
            </div>

            {/* Auto-populate preview */}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>Will be recorded as</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {sigUrl && <img src={sigUrl} alt="Signature" style={{ height: 36, maxWidth: 100, objectFit: 'contain', border: '1px solid #eee', borderRadius: 4, padding: 4, background: 'white' }} />}
                <div style={{ fontSize: 13, fontWeight: 600, color: '#001C43', fontFamily: "'Montserrat', sans-serif" }}>{displayName}</div>
              </div>
              {role === 'Super Admin' && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 6, fontFamily: "'Montserrat', sans-serif" }}>
                  This will be logged as confirmed by Super Admin on behalf of {confirmModal.office_name}.
                </div>
              )}
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 5, fontFamily: "'Montserrat', sans-serif" }}>REMARKS (optional)</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Any notes or remarks..."
                rows={3}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #dde3ed', borderRadius: 8, fontFamily: "'Montserrat', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#001C43' }}
              />
            </div>

            {confirmError && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12, fontFamily: "'Montserrat', sans-serif" }}>{confirmError}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{ flex: 1, padding: 11, background: '#198754', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: confirming ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif" }}
              >
                {confirming ? 'Confirming...' : 'Yes, Confirm'}
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: 11, background: 'none', border: '1.5px solid #dde3ed', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", color: '#001C43' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#001C43', color: 'white', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>
          {toast}
        </div>
      )}
    </div>
  );
}