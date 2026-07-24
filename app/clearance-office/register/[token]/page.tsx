"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

export default function ClearanceOfficeRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const token  = params?.token as string;

  const [invite, setInvite]     = useState<{ office_name: string; invite_id: number } | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [verifying, setVerifying]     = useState(true);

  const [form, setForm]     = useState({ username: '', email: '', password: '', confirm_password: '', first_name: '', last_name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Apply saved theme so the CSS variables render correctly on hard loads
  useEffect(() => {
    const saved = localStorage.getItem('drms_theme') ?? 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);


  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(`${API_BASE}/clearance-office/invite/verify/${token}/`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setInviteError(data.error ?? 'Invalid or expired invite link.');
        } else {
          setInvite({ office_name: data.office_name, invite_id: data.invite_id });
        }
      } catch {
        setInviteError('Could not connect to server.');
      } finally {
        setVerifying(false);
      }
    }
    if (token) verifyToken();
  }, [token]);

  async function handleRegister() {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim())  errs.first_name = 'Required.';
    if (!form.last_name.trim())   errs.last_name  = 'Required.';
    if (!form.username.trim())    errs.username   = 'Required.';
    if (!form.email.trim())       errs.email      = 'Required.';
    if (!form.password.trim())    errs.password   = 'Required.';
    if (form.password.length < 8) errs.password   = 'Must be at least 8 characters.';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE}/clearance-office/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setErrors({ general: data.error ?? 'Registration failed.' });
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/clearance-office/login'), 2500);
    } catch {
      setErrors({ general: 'Could not connect to server.' });
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: '1.5px solid var(--border-col)', borderRadius: 8,
    fontFamily: "'Montserrat', sans-serif", outline: 'none',
    boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text-primary)',
  };

  if (verifying) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif", color: 'var(--mid-gray)' }}>
      Verifying invite link...
    </div>
  );

  if (inviteError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#E50019" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, margin: '0 auto' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>Invalid Invite Link</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', fontFamily: "'Montserrat', sans-serif" }}>{inviteError}</div>
      </div>
    </div>
  );

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, margin: '0 auto 16px' }}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>Account Created!</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', fontFamily: "'Montserrat', sans-serif" }}>Redirecting to login...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: `url('/mmcm-bg.jpeg') center/cover no-repeat fixed`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Single connected card */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
          
          {/* Header section */}
          <div style={{ textAlign: 'center', padding: '28px 28px 20px', borderBottom: '1px solid var(--border-col)' }}>
            <img src="/mmcm-logo-with-name.png" alt="MMCM" style={{ height: 52, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat', sans-serif" }}>
              Clearance Office Portal
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>
              Mapúa Malayan Colleges Mindanao — Registrar's Office
            </div>
          </div>

        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>FIRST NAME *</label>
                <input style={{ ...inp, borderColor: errors.first_name ? '#E50019' : 'var(--border-col)' }} placeholder="First name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                {errors.first_name && <div style={{ fontSize: 11, color: '#E50019', marginTop: 3 }}>{errors.first_name}</div>}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>LAST NAME *</label>
                <input style={{ ...inp, borderColor: errors.last_name ? '#E50019' : 'var(--border-col)' }} placeholder="Last name" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                {errors.last_name && <div style={{ fontSize: 11, color: '#E50019', marginTop: 3 }}>{errors.last_name}</div>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>USERNAME *</label>
              <input style={{ ...inp, borderColor: errors.username ? '#E50019' : 'var(--border-col)' }} placeholder="Choose a username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              {errors.username && <div style={{ fontSize: 11, color: '#E50019', marginTop: 3 }}>{errors.username}</div>}
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>EMAIL *</label>
              <input style={{ ...inp, borderColor: errors.email ? '#E50019' : 'var(--border-col)' }} type="email" placeholder="Your email address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              {errors.email && <div style={{ fontSize: 11, color: '#E50019', marginTop: 3 }}>{errors.email}</div>}
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>PASSWORD *</label>
              <input style={{ ...inp, borderColor: errors.password ? '#E50019' : 'var(--border-col)' }} type="password" placeholder="At least 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              {errors.password && <div style={{ fontSize: 11, color: '#E50019', marginTop: 3 }}>{errors.password}</div>}
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4, fontFamily: "'Montserrat', sans-serif" }}>CONFIRM PASSWORD *</label>
              <input style={{ ...inp, borderColor: errors.confirm_password ? '#E50019' : 'var(--border-col)' }} type="password" placeholder="Repeat your password" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} />
              {errors.confirm_password && <div style={{ fontSize: 11, color: '#E50019', marginTop: 3 }}>{errors.confirm_password}</div>}
            </div>

            {errors.general && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                {errors.general}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              style={{ width: '100%', padding: 11, background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif", marginTop: 4 }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}