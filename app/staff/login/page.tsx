"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CAMPUS_IMG = 'https://images.unsplash.com/photo-1613688365965-8abc666fe1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/staff-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credentials.'); return; }
      sessionStorage.setItem('auth_token',  data.token);
      sessionStorage.setItem('staff_name',  data.name);
      sessionStorage.setItem('staff_id',    String(data.staff_id ?? ''));
      sessionStorage.setItem('staff_role',  data.role ?? 'Staff');
      sessionStorage.setItem('staff_dept',  data.department ?? '');
      // Staff lands on Reports page
      router.push('/staff/reports');
    } catch {
      setError('Could not connect to server. Make sure Django is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen drms-root">
      <div className="login-left">
        <div className="login-card">

          {/* Header */}
          <div className="login-header">
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#001C43,#114B9F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>M</div>
            <div className="login-office-tag">
              <div className="login-office-icon">RO</div>
              <span className="login-office-name">Registrar's Office · MMCM</span>
            </div>
            <div className="login-title">Staff Login</div>
            <div className="login-sub">Sign in to access the Document Request Monitoring System</div>
          </div>

          {/* Form */}
          <div className="login-inputs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="login-field">
                <div className="login-field-header">
                  <span className="login-label">Username</span>
                </div>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Your Django username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="login-field">
                <div className="login-field-header">
                  <span className="login-label">Password</span>
                  <span className="login-forgot">Forgot your password?</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="login-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <span onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#B1B1B1' }}>
                    {showPw ? '🙈' : '👁️'}
                  </span>
                </div>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '8px 12px', background: '#fff0f0', borderRadius: 6, border: '1px solid #ffd0d0' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
            <div className="login-btns">
              <button className="btn-login-primary" onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in...' : 'Login'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee' }}>
                <span style={{ fontSize: 12, color: '#B1B1B1' }}>Are you a student? </span>
                <span style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }} onClick={() => router.push('/')}>
                  Student Portal →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-right-bg" style={{ backgroundImage: `url('${CAMPUS_IMG}')` }} />
        <div className="login-right-text">
          <h2>Mapúa Malayan<br />Colleges Mindanao</h2>
          <p>Centralized Document Request Monitoring System for the Registrar's Office.</p>
        </div>
      </div>
    </div>
  );
}
