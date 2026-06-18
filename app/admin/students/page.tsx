"use client";

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/lib_api';

// ── Icons ────────────────────────────────────────────────────────────────────
const IcoSearch  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoEye     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoKey     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IcoToggle  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="16" cy="12" r="3"/></svg>;
const IcoTrash   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcoClose   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoChevL   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="15 18 9 12 15 6"/></svg>;
const IcoChevR   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="9 18 15 12 9 6"/></svg>;
const IcoWarning = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoEyeOff  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ── Types ────────────────────────────────────────────────────────────────────
interface Student {
  requester_id:      number;
  student_number:    string;
  first_name:        string;
  last_name:         string;
  email:             string;
  program_strand:    string;
  academic_level:    string;
  enrollment_status: string;
  contact_number:    string | null;
  has_account:       boolean;
  is_active:         boolean | null;
  date_joined:       string | null;
  user_id:           number | null;
}

type ModalType = 'view' | 'reset' | 'delete' | null;

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────
function authHeaders() {
  const token = sessionStorage.getItem('auth_token');
  return { 'Content-Type': 'application/json', Authorization: `Token ${token}` };
}

function StatusBadge({ is_active, has_account }: { is_active: boolean | null; has_account: boolean }) {
  if (!has_account)
    return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--mid-gray)' }}>No Account</span>;
  if (is_active)
    return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(25,135,84,0.12)', color: '#198754' }}>Active</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(229,0,25,0.1)', color: '#E50019' }}>Disabled</span>;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminStudentsPage() {
  const [students, setStudents]       = useState<Student[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);

  const [modal, setModal]             = useState<ModalType>(null);
  const [selected, setSelected]       = useState<Student | null>(null);

  // Reset password modal state
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [pwError, setPwError]         = useState('');
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwSuccess, setPwSuccess]     = useState(false);

  // Toggle / delete state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState('');
  const [toast, setToast]                 = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/students/`, { headers: authHeaders() });
      if (res.ok) setStudents(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── Open modal ─────────────────────────────────────────────────────────────
  function openModal(type: ModalType, student: Student) {
    setSelected(student);
    setModal(type);
    setNewPassword(''); setShowPw(false); setPwError(''); setPwSuccess(false);
    setActionError('');
  }

  function closeModal() {
    setModal(null); setSelected(null);
    setNewPassword(''); setPwError(''); setPwSuccess(false); setActionError('');
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleToggle(student: Student) {
    if (!student.user_id) return;
    setActionLoading(true); setActionError('');
    try {
      const res = await fetch(`${API_BASE}/admin/students/${student.user_id}/toggle/`, {
        method: 'PATCH', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error || 'Action failed.'); return; }
      showToast(`Account ${data.is_active ? 'enabled' : 'disabled'} successfully.`);
      closeModal();
      fetchStudents();
    } catch { setActionError('Could not connect to server.'); }
    finally { setActionLoading(false); }
  }

  async function handleResetPassword() {
    if (!selected?.user_id) return;
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwLoading(true); setPwError('');
    try {
      const res = await fetch(`${API_BASE}/admin/students/${selected.user_id}/reset-password/`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Reset failed.'); return; }
      setPwSuccess(true);
    } catch { setPwError('Could not connect to server.'); }
    finally { setPwLoading(false); }
  }

  async function handleDelete() {
    if (!selected?.user_id) return;
    setActionLoading(true); setActionError('');
    try {
      const res = await fetch(`${API_BASE}/admin/students/${selected.user_id}/delete/`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || 'Delete failed.'); return;
      }
      showToast(`Account for ${selected.first_name} ${selected.last_name} permanently deleted.`);
      closeModal();
      fetchStudents();
    } catch { setActionError('Could not connect to server.'); }
    finally { setActionLoading(false); }
  }

  // ── Filter + paginate ──────────────────────────────────────────────────────
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      s.student_number.includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 on search
  useEffect(() => { setPage(1); }, [search]);

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inp = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '10px 13px', fontSize: 13,
    border: `1.5px solid ${err ? '#E50019' : '#E0E0E0'}`,
    borderRadius: 8, fontFamily: "'Montserrat',sans-serif", outline: 'none',
    boxSizing: 'border-box', color: 'var(--text-primary)', background: 'var(--surface)',
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Student Accounts</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4 }}>
          View and manage registered student accounts
        </div>
      </div>

      {/* Search + count bar */}
      <div className="drms-card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid-gray)' }}>
            <IcoSearch />
          </div>
          <input
            style={{ ...inp(), paddingLeft: 34 }}
            placeholder="Search by name, student number, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--mid-gray)', whiteSpace: 'nowrap' }}>
          {loading ? '—' : `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Table */}
      <div className="drms-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 14 }}>Loading students…</div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 14 }}>
            {search ? 'No students match your search.' : 'No student accounts yet.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Student Number', 'Name', 'Program / Level', 'Email', 'Date Registered', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr key={s.requester_id}
                  style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.student_number}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.last_name}, {s.first_name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--mid-gray)' }}>
                    <div>{s.program_strand}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{s.academic_level}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--mid-gray)' }}>{s.email}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--mid-gray)', whiteSpace: 'nowrap' }}>
                    {s.date_joined ? new Date(s.date_joined).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge is_active={s.is_active} has_account={s.has_account} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* View */}
                      <ActionBtn title="View details" color="#114B9F" onClick={() => openModal('view', s)}>
                        <IcoEye />
                      </ActionBtn>
                      {/* Reset password — only if has account */}
                      {s.has_account && (
                        <ActionBtn title="Reset password" color="#FFA323" onClick={() => openModal('reset', s)}>
                          <IcoKey />
                        </ActionBtn>
                      )}
                      {/* Toggle enable/disable — only if has account */}
                      {s.has_account && (
                        <ActionBtn title={s.is_active ? 'Disable account' : 'Enable account'} color={s.is_active ? '#6c757d' : '#198754'} onClick={() => handleToggle(s)}>
                          {s.is_active ? <IcoToggle /> : <IcoEyeOff />}
                        </ActionBtn>
                      )}
                      {/* Delete — only if has account */}
                      {s.has_account && (
                        <ActionBtn title="Delete account" color="#E50019" onClick={() => openModal('delete', s)}>
                          <IcoTrash />
                        </ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <PageBtn disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}><IcoChevL /></PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <PageBtn key={n} active={n === currentPage} onClick={() => setPage(n)}>{n}</PageBtn>
              ))}
              <PageBtn disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}><IcoChevR /></PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {modal && selected && (
        <Overlay onClose={closeModal}>

          {/* VIEW modal */}
          {modal === 'view' && (
            <ModalCard title="Student Details" onClose={closeModal}>
              <DetailGrid student={selected} />
            </ModalCard>
          )}

          {/* RESET PASSWORD modal */}
          {modal === 'reset' && (
            <ModalCard title="Reset Password" onClose={closeModal}>
              <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
                Setting a temporary password for <strong style={{ color: 'var(--text-primary)' }}>{selected.first_name} {selected.last_name}</strong> ({selected.student_number}).
                Inform the student in person or by phone — no email notification will be sent.
              </div>
              {pwSuccess ? (
                <div style={{ padding: '14px 16px', background: 'rgba(25,135,84,0.1)', borderRadius: 8, border: '1px solid rgba(25,135,84,0.3)', fontSize: 13, fontWeight: 700, color: '#198754', textAlign: 'center' }}>
                  Password updated successfully.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel t="New Temporary Password" />
                    <div style={{ position: 'relative' }}>
                      <input
                        style={inp(pwError)}
                        type={showPw ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPwError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                      />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid-gray)', display: 'flex', padding: 0 }}>
                        {showPw ? <IcoEyeOff /> : <IcoEye />}
                      </button>
                    </div>
                    {pwError && <div style={{ fontSize: 11, color: '#E50019', fontWeight: 600, marginTop: 4 }}>{pwError}</div>}
                  </div>
                  <button onClick={handleResetPassword} disabled={pwLoading}
                    style={{ width: '100%', padding: '11px 0', background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.7 : 1, fontFamily: "'Montserrat',sans-serif" }}>
                    {pwLoading ? 'Saving…' : 'Set Password'}
                  </button>
                </>
              )}
            </ModalCard>
          )}

          {/* DELETE modal */}
          {modal === 'delete' && (
            <ModalCard title="Delete Account" onClose={closeModal}>
              <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 8, lineHeight: 1.6 }}>
                This will permanently delete the account for:
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong>{selected.last_name}, {selected.first_name}</strong> — {selected.student_number}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(229,0,25,0.07)', border: '1px solid #ffd0d0', borderRadius: 8, marginBottom: 16 }}>
                <IcoWarning />
                <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>
                  This action cannot be undone. The student will need to register again.
                </div>
              </div>
              {actionError && (
                <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <IcoWarning />{actionError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeModal}
                  style={{ flex: 1, padding: '10px 0', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif" }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={actionLoading}
                  style={{ flex: 1, padding: '10px 0', background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1, fontFamily: "'Montserrat',sans-serif" }}>
                  {actionLoading ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </ModalCard>
          )}

        </Overlay>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#001C43', color: 'white', padding: '12px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "'Montserrat',sans-serif", boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 9999, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBtn({ children, title, color, onClick }: { children: React.ReactNode; title: string; color: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: `1px solid ${color}20`, background: `${color}12`, color, cursor: 'pointer', transition: 'all .15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}25`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}12`; }}
    >
      {children}
    </button>
  );
}

function PageBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ minWidth: 30, height: 30, padding: '0 6px', borderRadius: 6, border: '1px solid var(--border)', background: active ? '#001C43' : 'var(--surface)', color: active ? 'white' : disabled ? 'var(--mid-gray)' : 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat',sans-serif" }}>
      {children}
    </button>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  );
}

function ModalCard({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat',sans-serif" }}>{title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid-gray)', display: 'flex', padding: 4, borderRadius: 6 }}>
          <IcoClose />
        </button>
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ t }: { t: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{t}</div>
  );
}

function DetailGrid({ student: s }: { student: Student }) {
  const rows: [string, string][] = [
    ['Student Number',    s.student_number],
    ['Full Name',         `${s.last_name}, ${s.first_name}`],
    ['Email Address',     s.email],
    ['Program / Strand',  s.program_strand],
    ['Academic Level',    s.academic_level],
    ['Enrollment Status', s.enrollment_status || '—'],
    ['Contact Number',    s.contact_number || '—'],
    ['Date Registered',   s.date_joined ? new Date(s.date_joined).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
    ['Account Status',    !s.has_account ? 'No account yet' : s.is_active ? 'Active' : 'Disabled'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, fontSize: 13 }}>
          <div style={{ color: 'var(--mid-gray)', fontWeight: 600 }}>{label}</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
