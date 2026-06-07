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

function getToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') ?? '' : '';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');

  // ── Edit modal state ────────────────────────────────────────────────────
  const [editModal, setEditModal]   = useState<AdminUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]   = useState('');

  // ── Reset password modal state ──────────────────────────────────────────
  const [resetModal, setResetModal]   = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]   = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // ── Create user modal state ─────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm]   = useState({
    first_name: '', last_name: '', email: '', username: '',
    password: '', position: '', department: 'Both', role: 'RO Staff',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');

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

  const visible = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid var(--border-col)', borderRadius: 8, fontFamily: 'var(--drms-font)', background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box' };
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>User Management</div>
          <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 2 }}>Manage staff accounts and access levels</div>
        </div>
        <button className="btn-primary" onClick={() => setCreateModal(true)}>+ New Staff Account</button>
      </div>

      {/* Search */}
      <div className="search-box" style={{ maxWidth: 360, marginBottom: 16 }}>
        <input type="text" placeholder="Search by name, email, or username..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div className="info-box warn" style={{ marginBottom: 16 }}><span className="info-icon">⚠️</span><div className="info-text">{error}</div></div>}

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
            {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--mid-gray)' }}>Loading...</td></tr>}
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
              {editError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>⚠️ {editError}</div>}
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
            {resetError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 10 }}>⚠️ {resetError}</div>}
            {resetSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600, marginBottom: 10 }}>✅ {resetSuccess}</div>}
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
              {createError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>⚠️ {createError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreateUser} disabled={createLoading}>{createLoading ? 'Creating...' : 'Create Account'}</button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCreateModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}