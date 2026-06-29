"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

type AdminUser = {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  staff_id: number | null;
  position: string;
  department: string;
  role: string;
};

const PAGE_SIZE = 10;

function getToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') ?? '' : '';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [createAccountError, setCreateAccountError] = useState('');
  const [showPasswordId, setShowPasswordId]         = useState<number | null>(null);
  const [copiedInviteId, setCopiedInviteId]         = useState<number | null>(null);
  const [resetAccountModal, setResetAccountModal]   = useState<any | null>(null);
  const [deleteAccountModal, setDeleteAccountModal] = useState<any | null>(null);
  const [resetLoading2, setResetLoading2]           = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const [copiedCredentials, setCopiedCredentials] = useState<number | null>(null);

  // ── Edit modal state ────────────────────────────────────────────────────
  const [editModal, setEditModal]     = useState<AdminUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');

  // ── Reset password modal state ──────────────────────────────────────────
  const [resetModal, setResetModal]     = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]     = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // ── Create user modal state ─────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm]   = useState({
    first_name: '', last_name: '', email: '', username: '',
    password: '', position: '', department: 'Both', role: 'RO Staff',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');

  // ── Clearance Offices state ──────────────────────────────────────────
  const [coTab, setCoTab]               = useState<'staff' | 'clearance'>('staff');
  const [invites, setInvites]           = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newInviteOffice, setNewInviteOffice] = useState('');
  const [creatingInvite, setCreatingInvite]   = useState(false);
  const [inviteCreated, setInviteCreated]     = useState<string | null>(null);
  const [configOffices, setConfigOffices]     = useState<string[]>([]);
  const [coStaff, setCoStaff]               = useState<any[]>([]);

  async function fetchInvites() {
    setInviteLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/invite/list/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (res.ok) setInvites(await res.json());
    } catch {} finally { setInviteLoading(false); }
  }

  async function fetchConfigOffices() {
    try {
      const res = await fetch(`${API_BASE}/clearance-office-config/?active_only=true`);
      if (res.ok) {
        const data = await res.json();
        const names = Array.from(new Set(data.map((c: any) => c.office_name as string))).sort() as string[];
        setConfigOffices(names);
      }
    } catch {}
  }

  async function fetchCOStaff() {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/accounts/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (res.ok) setCoStaff(await res.json());
    } catch {}
  }

  async function createAccount() {
    if (!newInviteOffice) return;
    setCreatingInvite(true);
    setCreateAccountError('');
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/accounts/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ office_name: newInviteOffice }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateAccountError(data.error ?? 'Failed to create account.'); return; }
      setNewInviteOffice('');
      fetchCOStaff();
    } catch { setCreateAccountError('Could not connect to server.'); }
    finally { setCreatingInvite(false); }
  }

  async function copyInviteLink(inviteToken: string, staffId: number) {
    const link = `${window.location.origin}/clearance-office/register/${inviteToken}`;
    await navigator.clipboard.writeText(link);
    setCopiedInviteId(staffId);
    setTimeout(() => setCopiedInviteId(null), 2000);
  }

  async function toggleInviteForOffice(inviteId: number, currentActive: boolean) {
    try {
      const token = sessionStorage.getItem('auth_token');
      await fetch(`${API_BASE}/clearance-office/invite/${inviteId}/toggle/`, {
        method: 'PATCH', headers: { 'Authorization': `Token ${token}` },
      });
      fetchCOStaff();
    } catch {}
  }

  async function regenerateInviteForOffice(officeName: string) {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/invite-or-create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ office_name: officeName }),
      });
      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}/clearance-office/register/${data.token}`;
        await navigator.clipboard.writeText(link);
        fetchCOStaff();
        alert(`New invite link copied to clipboard for ${officeName}!`);
      }
    } catch {}
  }

  async function handleResetAccount() {
    if (!resetAccountModal) return;
    setResetLoading2(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/accounts/${resetAccountModal.staff_id}/reset/`, {
        method: 'PATCH', headers: { 'Authorization': `Token ${token}` },
      });
      const data = await res.json();
      if (res.ok) { setResetAccountModal(null); fetchCOStaff(); }
      else alert(data.error ?? 'Reset failed.');
    } catch { alert('Could not connect to server.'); }
    finally { setResetLoading2(false); }
  }

  async function handleDeleteAccount() {
    if (!deleteAccountModal) return;
    setDeleteAccountLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/accounts/${deleteAccountModal.staff_id}/delete/`, {
        method: 'DELETE', headers: { 'Authorization': `Token ${token}` },
      });
      if (res.ok) { setDeleteAccountModal(null); fetchCOStaff(); }
      else { const data = await res.json(); alert(data.error ?? 'Delete failed.'); }
    } catch { alert('Could not connect to server.'); }
    finally { setDeleteAccountLoading(false); }
  }

  async function toggleInvite(id: number) {
    try {
      const token = sessionStorage.getItem('auth_token');
      await fetch(`${API_BASE}/clearance-office/invite/${id}/toggle/`, {
        method: 'PATCH', headers: { 'Authorization': `Token ${token}` },
      });
      fetchInvites();
    } catch {}
  }

  async function regenerateInvite(id: number) {
    if (!confirm('This will invalidate the current invite link. Continue?')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/clearance-office/invite/${id}/regenerate/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}/clearance-office/register/${data.token}`;
        setInviteCreated(link);
        fetchInvites();
      }
    } catch {}
  }

  useEffect(() => {
    if (coTab === 'clearance') {
      fetchConfigOffices();
      fetchCOStaff();
    }
  }, [coTab]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/users/`, {
        headers: { Authorization: `Token ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsers(await res.json());
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1); }, [search]);

  // ── Edit user ─────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editModal) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editModal.user_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify({
          first_name: editModal.first_name,
          last_name:  editModal.last_name,
          position:   editModal.position,
          department: editModal.department,
          role:       editModal.role,
          is_active:  editModal.is_active,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditModal(null);
      fetchUsers();
    } catch {
      setEditError('Failed to update. Please try again.');
    } finally {
      setEditLoading(false);
    }
  }

  // ── Reset password ────────────────────────────────────────────────────
  async function handleResetPassword() {
    if (!resetModal) return;
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${resetModal.user_id}/reset-password/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reset failed');
      setResetSuccess(data.message);
      setNewPassword('');
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  }

  // ── Create user ───────────────────────────────────────────────────────
  async function handleCreateUser() {
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? JSON.stringify(data.errors ?? 'Failed'));
      setCreateModal(false);
      setCreateForm({ first_name: '', last_name: '', email: '', username: '', password: '', position: '', department: 'Both', role: 'RO Staff' });
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function copyCredentials(s: any) {
    // Format as email:password so pasting fills both fields
    const text = `${s.email}\t${s.placeholder_password}`;
    await navigator.clipboard.writeText(text);
    setCopiedCredentials(s.staff_id);
    setTimeout(() => setCopiedCredentials(null), 2000);
  }

  // ── Pagination logic ──────────────────────────────────────────────────
  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const visible    = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid var(--border-col)', borderRadius: 8, fontFamily: 'var(--drms-font)', background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

  // Page number buttons — show at most 5 pages around current
  function getPageNumbers() {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  const btnPage: React.CSSProperties = {
    minWidth: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--border-col)',
    background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    color: 'var(--text-primary)', fontFamily: 'var(--drms-font)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .15s',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>User Management</div>
          <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 2 }}>Manage staff accounts and access levels</div>
        </div>
        {coTab === 'staff' && (
          <button className="btn-primary" onClick={() => setCreateModal(true)}>+ New Staff Account</button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-col)', marginBottom: 20 }}>
        {(['staff', 'clearance'] as const).map(t => (
          <button key={t} onClick={() => setCoTab(t)} style={{ padding: '10px 20px', fontSize: 13, fontWeight: coTab === t ? 700 : 500, border: 'none', borderBottom: coTab === t ? '2px solid #114B9F' : '2px solid transparent', background: 'none', color: coTab === t ? '#114B9F' : 'var(--mid-gray)', cursor: 'pointer', fontFamily: 'var(--drms-font)', marginBottom: -1 }}>
            {t === 'staff' ? 'RO Staff' : 'Clearance Offices'}
          </button>
        ))}
      </div>

      {coTab === 'staff' && (
      <>
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div className="search-box" style={{ maxWidth: 360 }}>
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {!loading && (
          <div style={{ fontSize: 12, color: 'var(--mid-gray)', whiteSpace: 'nowrap' }}>
            {filtered.length === 0
              ? 'No results'
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length} user${filtered.length !== 1 ? 's' : ''}`
            }
          </div>
        )}
      </div>

      {error && <div className="info-box warn" style={{ marginBottom: 16 }}><span className="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span><div className="info-text">{error}</div></div>}

      {/* Table */}
      <div className="table-wrap">
        <table className="drms-table">
          <thead>
            <tr>
              <th>Name</th><th>Username</th><th>Email</th>
              <th>Position</th><th>Department</th><th>Role</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--mid-gray)' }}>Loading...</td></tr>
            )}
            {!loading && visible.map(u => (
              <tr key={u.user_id}>
                <td style={{ fontWeight: 600 }}>{u.last_name}, {u.first_name}</td>
                <td style={{ color: 'var(--mid-gray)', fontSize: 12 }}>{u.username}</td>
                <td style={{ color: 'var(--mid-gray)', fontSize: 12 }}>{u.email}</td>
                <td>{u.position || '—'}</td>
                <td>{u.department || '—'}</td>
                <td>
                  <span className={`badge ${u.role === 'Super Admin' ? 'b-rel' : 'b-sub'}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'b-done' : 'b-rej'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-outline btn-sm" onClick={() => { setEditModal({ ...u }); setEditError(''); }}>Edit</button>
                    <button className="btn-outline btn-sm" onClick={() => { setResetModal(u); setNewPassword(''); setResetError(''); setResetSuccess(''); }}>Reset PW</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--mid-gray)' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {/* Previous */}
          <button
            style={{ ...btnPage, opacity: safePage === 1 ? 0.4 : 1, cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            ‹
          </button>

          {getPageNumbers().map((p, i) =>
            p === '...'
              ? <span key={`ellipsis-${i}`} style={{ fontSize: 13, color: 'var(--mid-gray)', padding: '0 4px' }}>…</span>
              : (
                <button
                  key={p}
                  style={{
                    ...btnPage,
                    background:   safePage === p ? '#114B9F' : 'transparent',
                    color:        safePage === p ? 'white'   : 'var(--text-primary)',
                    borderColor:  safePage === p ? '#114B9F' : 'var(--border-col)',
                  }}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              )
          )}

          {/* Next */}
          <button
            style={{ ...btnPage, opacity: safePage === totalPages ? 0.4 : 1, cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            ›
          </button>
        </div>
      )}
      </>
      )}

      {coTab === 'clearance' && (
        <div>
          {/* Create Office Account */}
          <div className="drms-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Create Clearance Office Account
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 12 }}>
              Creates a placeholder account for the office. Super Admin can access the dashboard immediately. Send the invite link for the office to activate their account.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={newInviteOffice}
                onChange={e => setNewInviteOffice(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1.5px solid var(--border-col)', borderRadius: 8, fontFamily: 'var(--drms-font)', background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Select office...</option>
                {configOffices
                  .filter(o => !coStaff.some(s => s.office_name === o && s.status !== 'no_account'))
                  .map(o => <option key={o} value={o}>{o}</option>)
                }
              </select>
              <button
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: 13, whiteSpace: 'nowrap' }}
                disabled={!newInviteOffice || creatingInvite}
                onClick={createAccount}
              >
                {creatingInvite ? 'Creating...' : 'Create Account'}
              </button>
            </div>
            {createAccountError && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginTop: 8 }}>{createAccountError}</div>
            )}
          </div>

          {/* Office accounts table */}
          <div className="drms-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-col)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Clearance Offices</div>
              <button className="btn-outline btn-sm" style={{ fontSize: 11 }} onClick={fetchCOStaff}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                Refresh
              </button>
            </div>

            {coStaff.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13, fontStyle: 'italic' }}>
                No clearance offices configured yet.
              </div>
            ) : (
              <div>
                {coStaff.map(s => (
                  <div key={s.office_name} style={{ borderBottom: '1px solid var(--border-col)', padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>

                      {/* Office info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.office_name}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50,
                            background: s.status === 'active' ? 'rgba(25,135,84,0.1)' : s.status === 'activated' ? 'rgba(17,75,159,0.1)' : s.status === 'placeholder' ? 'rgba(255,163,35,0.1)' : 'rgba(0,0,0,0.06)',
                            color: s.status === 'active' ? '#198754' : s.status === 'activated' ? '#114B9F' : s.status === 'placeholder' ? '#FFA323' : 'var(--mid-gray)',
                          }}>
                            {s.status === 'active' ? 'Fully Active' : s.status === 'activated' ? 'Activated — Setup Pending' : s.status === 'placeholder' ? 'Placeholder' : 'No Account'}
                          </span>
                        </div>

                        {/* Account details */}
                        {s.status !== 'no_account' && (
                          <div style={{ fontSize: 12, color: 'var(--mid-gray)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>Display: {s.display_name ?? '—'}</div>
                            <div>Email: {s.email ?? '—'}</div>
                            {/* Show username + password only for placeholder accounts */}
                            {s.status === 'placeholder' && (
                              <>
                                <div>Username: <code style={{ fontSize: 11, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border-col)' }}>{s.username ?? '—'}</code></div>
                                {s.placeholder_password && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>Password:</span>
                                    <code style={{ fontSize: 11, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border-col)' }}>
                                      {showPasswordId === s.staff_id ? s.placeholder_password : '••••••••••••'}
                                    </code>
                                    <button
                                      onClick={() => setShowPasswordId(showPasswordId === s.staff_id ? null : s.staff_id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#114B9F', fontSize: 11, fontFamily: 'var(--drms-font)', fontWeight: 600 }}
                                    >
                                      {showPasswordId === s.staff_id ? 'Hide' : 'Show'}
                                    </button>
                                  </div>
                                )}
                                {s.placeholder_password && (
                                  <button
                                    onClick={() => copyCredentials(s)}
                                    style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: copiedCredentials === s.staff_id ? '#198754' : '#114B9F', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--drms-font)', textAlign: 'left', padding: 0 }}
                                  >
                                    {copiedCredentials === s.staff_id ? '✓ Credentials copied!' : '⊕ Copy credentials for login'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Invite link section */}
                        {s.status !== 'no_account' && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {s.has_invite ? (
                              <>
                                <span style={{ fontSize: 11, color: 'var(--mid-gray)' }}>Invite:</span>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 50,
                                  background: s.invite_active ? 'rgba(25,135,84,0.1)' : 'rgba(0,0,0,0.06)',
                                  color: s.invite_active ? '#198754' : 'var(--mid-gray)',
                                }}>
                                  {s.invite_used ? 'Used' : s.invite_active ? 'Active' : 'Disabled'}
                                </span>
                                {!s.invite_used && (
                                  <>
                                    <button className="btn-outline btn-sm" style={{ fontSize: 10 }}
                                      onClick={() => copyInviteLink(s.invite_token, s.staff_id)}>
                                      {copiedInviteId === s.staff_id ? '✓ Copied!' : 'Copy Link'}
                                    </button>
                                    <button className="btn-outline btn-sm" style={{ fontSize: 10 }}
                                      onClick={() => toggleInviteForOffice(s.invite_id, s.invite_active)}>
                                      {s.invite_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button className="btn-outline btn-sm" style={{ fontSize: 10 }}
                                      onClick={() => regenerateInviteForOffice(s.office_name)}>
                                      New Link
                                    </button>
                                  </>
                                )}
                                {s.invite_used && (
                                  <button className="btn-outline btn-sm" style={{ fontSize: 10 }}
                                    onClick={() => regenerateInviteForOffice(s.office_name)}>
                                    New Link
                                  </button>
                                )}
                              </>
                            ) : (
                              <button className="btn-outline btn-sm" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => regenerateInviteForOffice(s.office_name)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Create Invite Link
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {s.status === 'no_account' ? (
                          <button
                            className="btn-primary btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => { setNewInviteOffice(s.office_name); }}
                          >
                            Create Account
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn-outline btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => window.open(`/clearance-office/dashboard?office=${encodeURIComponent(s.office_name)}`, '_blank')}
                            >
                              View Dashboard →
                            </button>
                            <button
                              className="btn-outline btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => setResetAccountModal(s)}
                            >
                              Reset Account
                            </button>
                            <button
                              className="btn-outline btn-sm"
                              style={{ fontSize: 11, color: '#E50019', borderColor: '#E50019' }}
                              onClick={() => setDeleteAccountModal(s)}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Edit Staff Account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>First Name</label><input style={inp} value={editModal.first_name} onChange={e => setEditModal({ ...editModal, first_name: e.target.value })} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Last Name</label><input style={inp} value={editModal.last_name} onChange={e => setEditModal({ ...editModal, last_name: e.target.value })} /></div>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Position</label><input style={inp} value={editModal.position} onChange={e => setEditModal({ ...editModal, position: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Department</label>
                <select style={sel} value={editModal.department} onChange={e => setEditModal({ ...editModal, department: e.target.value })}>
                  <option>College</option><option>SHS</option><option>Both</option><option>{"Registrar's Office"}</option>
                </select>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Role</label>
                <select style={sel} value={editModal.role} onChange={e => setEditModal({ ...editModal, role: e.target.value })}>
                  <option>RO Staff</option><option>Super Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={editModal.is_active} onChange={e => setEditModal({ ...editModal, is_active: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#114B9F' }} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Account is Active</span>
              </div>
              {editError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{editError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleEditSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setResetModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Reset Password</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 20 }}>Resetting password for <strong>{resetModal.last_name}, {resetModal.first_name}</strong></div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>New Password</label>
              <input style={inp} type="password" placeholder="At least 8 characters" value={newPassword} onChange={e => { setNewPassword(e.target.value); setResetError(''); setResetSuccess(''); }} />
            </div>
            {resetError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 10 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{resetError}</div>}
            {resetSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600, marginBottom: 10 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>{resetSuccess}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleResetPassword} disabled={resetLoading}>{resetLoading ? 'Resetting...' : 'Reset Password'}</button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setResetModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCreateModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Create New Staff Account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>First Name *</label><input style={inp} value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Last Name *</label><input style={inp} value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} /></div>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Email *</label><input style={inp} type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Username *</label><input style={inp} value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Password * (min 8 characters)</label><input style={inp} type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Position</label><input style={inp} placeholder="e.g. Registrar Staff" value={createForm.position} onChange={e => setCreateForm({ ...createForm, position: e.target.value })} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Department</label>
                <select style={sel} value={createForm.department} onChange={e => setCreateForm({ ...createForm, department: e.target.value })}>
                  <option>College</option><option>SHS</option><option>Both</option><option>{"Registrar's Office"}</option>
                </select>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Role</label>
                <select style={sel} value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                  <option>RO Staff</option><option>Super Admin</option>
                </select>
              </div>
              {createError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{createError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreateUser} disabled={createLoading}>{createLoading ? 'Creating...' : 'Create Account'}</button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCreateModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Account Modal */}
      {resetAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setResetAccountModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Reset Account</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Reset <strong>{resetAccountModal.office_name}</strong> back to placeholder state?
            </div>
            <div style={{ background: 'rgba(255,163,35,0.08)', border: '1px solid rgba(255,163,35,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7a4f00', marginBottom: 20, lineHeight: 1.6 }}>
              This will clear the account's password, display name, and e-signature. The office will lose login access until they re-activate via a new invite link. Clearance history is preserved.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#FFA323', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }} disabled={resetLoading2} onClick={handleResetAccount}>
                {resetLoading2 ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setResetAccountModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDeleteAccountModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Account</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Remove the account for <strong>{deleteAccountModal.office_name}</strong>?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              The account and invite link will be permanently deleted. Clearance records and history for this office are preserved. This office will still appear in the list if it exists in the office configuration.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }} disabled={deleteAccountLoading} onClick={handleDeleteAccount}>
                {deleteAccountLoading ? 'Removing...' : 'Yes, Remove'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteAccountModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
