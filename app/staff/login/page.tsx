"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CAMPUS_IMG = 'https://images.unsplash.com/photo-1613688365965-8abc666fe1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) { setError('Please enter your username and password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('https://web-production-5905e.up.railway.app/api/auth/staff-login/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credentials.'); return; }
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('staff_name', data.name);
      sessionStorage.setItem('staff_id',   String(data.staff_id ?? ''));
      sessionStorage.setItem('staff_role', data.role ?? 'Staff');
      sessionStorage.setItem('staff_dept', data.department ?? '');
      router.push('/staff/reports');
    } catch { setError('Could not connect to server. Make sure Django is running.'); }
    finally { setLoading(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 13,
    border: '1.5px solid #E0E0E0', borderRadius: 8,
    fontFamily: 'var(--drms-font)', outline: 'none',
    boxSizing: 'border-box', color: 'var(--text-primary)', background: 'var(--surface)',
  };

  return (
    <div className="force-light-mode" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `url('${CAMPUS_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, padding: '20px 16px', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', padding: 36, boxSizing: 'border-box' }}>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#001C43,#114B9F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', margin: '0 auto 14px', boxShadow: '0 4px 12px rgba(0,28,67,0.25)' }}>M</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 10, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 20 }}>
                <div style={{ background: '#E50019', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>RO</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', letterSpacing: 0.3 }}>Registrar's Office · MMCM</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--drms-font)', marginBottom: 4 }}>Staff Login</div>
              <div style={{ fontSize: 13, color: 'var(--mid-gray)' }}>Sign in to access the Document Request Monitoring System</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Username</div>
                <input style={inp} type="text" placeholder="Your Django username" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              <div>
                <div style={{ marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Password</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input style={inp} type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid-gray)', display: 'flex', padding: 0 }}>
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '10px 12px', background: 'rgba(229,0,25,0.08)', borderRadius: 8, border: '1px solid #ffd0d0' }}>⚠️ {error}</div>
              )}

              <button onClick={handleLogin} disabled={loading}
                style={{ width: '100%', padding: 13, background: '#001C43', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--drms-font)', marginTop: 4 }}>
                {loading ? 'Signing in...' : 'Login'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 13, paddingTop: 10, borderTop: '1px solid var(--border-col)' }}>
                <span style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/')}>Are you a student?</span>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
