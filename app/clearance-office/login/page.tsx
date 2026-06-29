"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

export default function ClearanceOfficeLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Login failed.'); return; }

      sessionStorage.setItem('co_token',       data.token);
      sessionStorage.setItem('co_staff_id',    String(data.staff_id));
      sessionStorage.setItem('co_office_name', data.office_name ?? '');
      sessionStorage.setItem('co_display_name', data.display_name ?? '');
      sessionStorage.setItem('co_role',        data.role);
      sessionStorage.setItem('co_signature',   data.signature_image_url ?? '');
      sessionStorage.setItem('co_setup',       String(data.is_setup_complete));

      if (!data.is_setup_complete && data.role !== 'Super Admin') {
        router.push('/clearance-office/setup');
      } else {
        router.push('/clearance-office/dashboard');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', fontSize: 13,
    border: '1.5px solid #dde3ed', borderRadius: 8,
    fontFamily: "'Montserrat', sans-serif",
    outline: 'none', boxSizing: 'border-box',
    background: 'white', color: '#001C43',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo + header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/mmcm-logo-with-name.png" alt="MMCM" style={{ height: 56, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#001C43', fontFamily: "'Montserrat', sans-serif" }}>
            Clearance Office Portal
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>
            Mapúa Malayan Colleges Mindanao — Registrar's Office
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#001C43', marginBottom: 20, fontFamily: "'Montserrat', sans-serif" }}>
            Sign In
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 5, fontFamily: "'Montserrat', sans-serif" }}>USERNAME</label>
              <input style={inp} placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 5, fontFamily: "'Montserrat', sans-serif" }}>PASSWORD</label>
              <input style={inp} type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif", marginTop: 4 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#aaa', fontFamily: "'Montserrat', sans-serif" }}>
          Need an account? Contact the Registrar's Office.
        </div>
      </div>
    </div>
  );
}