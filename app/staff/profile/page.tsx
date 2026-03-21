"use client";

import { useState, useEffect } from 'react';
import { Topbar } from '../../components/drms/Topbar';

export default function ProfilePage() {
  // ── Staff info from sessionStorage ────────────────────────────────────────
  const [name, setName]       = useState('—');
  const [role, setRole]       = useState('—');
  const [dept, setDept]       = useState('—');
  const [initials, setInitials] = useState('??');

  useEffect(() => {
    const storedName = sessionStorage.getItem('staff_name') ?? '—';
    const storedRole = sessionStorage.getItem('staff_role') ?? '—';
    const storedDept = sessionStorage.getItem('staff_dept') ?? '—';
    setName(storedName);
    setRole(storedRole);
    setDept(storedDept);
    const parts = storedName.replace(',', '').split(' ').filter(Boolean);
    setInitials(
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : storedName.substring(0, 2).toUpperCase()
    );
  }, []);

  // ── Change password state ─────────────────────────────────────────────────
  const [oldPw, setOldPw]       = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirm] = useState('');
  const [pwError, setPwError]   = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [showOld, setShowOld]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConf, setShowConf]     = useState(false);

  async function handleChangePassword() {
    setPwError('');
    setPwSuccess('');
    if (!oldPw.trim() || !newPw.trim() || !confirmPw.trim()) {
      setPwError('All fields are required.'); return;
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.'); return;
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirmation do not match.'); return;
    }
    setPwLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('https://web-production-5905e.up.railway.app/api/auth/staff-change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.detail ?? data?.old_password?.[0] ?? 'Failed to change password.');
      }
      setPwSuccess('Password changed successfully!');
      setOldPw(''); setNewPw(''); setConfirm('');
    } catch (err: any) {
      setPwError(err.message ?? 'Something went wrong.');
    } finally {
      setPwLoading(false);
    }
  }

  const EyeIcon = ({ show }: { show: boolean }) => show
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Profile' }]} showNotifDot />
      <div className="page-body" style={{ maxWidth: 720 }}>

        {/* ── Avatar + Identity ── */}
        <div className="drms-card" style={{ padding: 28, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #001C43, #114B9F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 26, fontWeight: 800, flexShrink: 0,
            fontFamily: "'Montserrat', sans-serif",
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat', sans-serif" }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4 }}>{role} · {dept}</div>
            <div style={{ marginTop: 8 }}>
              <span className="badge b-rel" style={{ fontSize: 11 }}>Staff</span>
            </div>
          </div>
        </div>

        {/* ── Staff Details ── */}
        <div className="drms-card" style={{ padding: 24, marginBottom: 18 }}>
          <div className="section-title">Staff Information</div>
          <div className="field-grid">
            <div className="field-group">
              <div className="field-label">Full Name</div>
              <div className="field-value">{name}</div>
            </div>
            <div className="field-group">
              <div className="field-label">Role / Position</div>
              <div className="field-value">{role}</div>
            </div>
            <div className="field-group">
              <div className="field-label">Department</div>
              <div className="field-value">{dept}</div>
            </div>
            <div className="field-group">
              <div className="field-label">Account Type</div>
              <div className="field-value">Staff — Registrar's Office</div>
            </div>
          </div>
          <div className="info-box" style={{ marginTop: 16 }}>
            <span className="info-icon">ℹ️</span>
            <div className="info-text" style={{ fontSize: 12 }}>
              To update your name, role, or department, contact the system administrator via Django Admin.
            </div>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="drms-card" style={{ padding: 24 }}>
          <div className="section-title">Change Password</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
            {/* Current password */}
            <div className="fg">
              <label>Current Password <span className="req-asterisk">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="drms-input"
                  type={showOld ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={oldPw}
                  onChange={e => { setOldPw(e.target.value); setPwError(''); setPwSuccess(''); }}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B1B1B1', padding: 0, display: 'flex' }}
                >
                  <EyeIcon show={showOld} />
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="fg">
              <label>New Password <span className="req-asterisk">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="drms-input"
                  type={showNew ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setPwError(''); setPwSuccess(''); }}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B1B1B1', padding: 0, display: 'flex' }}
                >
                  <EyeIcon show={showNew} />
                </button>
              </div>
              {/* Strength indicator */}
              {newPw.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: newPw.length >= i * 3
                        ? (newPw.length < 6 ? '#E50019' : newPw.length < 10 ? '#FFA323' : '#198754')
                        : 'rgba(0,0,0,0.08)',
                      transition: 'background .2s',
                    }} />
                  ))}
                  <span style={{ fontSize: 10, color: '#B1B1B1', alignSelf: 'center', marginLeft: 4 }}>
                    {newPw.length < 6 ? 'Weak' : newPw.length < 10 ? 'Fair' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="fg">
              <label>Confirm New Password <span className="req-asterisk">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="drms-input"
                  type={showConf ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPw}
                  onChange={e => { setConfirm(e.target.value); setPwError(''); setPwSuccess(''); }}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConf(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B1B1B1', padding: 0, display: 'flex' }}
                >
                  <EyeIcon show={showConf} />
                </button>
              </div>
              {/* Match indicator */}
              {confirmPw.length > 0 && (
                <div style={{ fontSize: 11, marginTop: 5, color: confirmPw === newPw ? '#198754' : '#E50019', fontWeight: 600 }}>
                  {confirmPw === newPw ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
            </div>

            {/* Feedback */}
            {pwError && (
              <div className="info-box warn">
                <span className="info-icon">⚠️</span>
                <div className="info-text">{pwError}</div>
              </div>
            )}
            {pwSuccess && (
              <div className="info-box">
                <span className="info-icon">✅</span>
                <div className="info-text">{pwSuccess}</div>
              </div>
            )}

            <button
              className="btn-primary"
              style={{ justifyContent: 'center', padding: 11, maxWidth: 200 }}
              onClick={handleChangePassword}
              disabled={pwLoading}
            >
              {pwLoading ? 'Saving...' : '🔒 Update Password'}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
