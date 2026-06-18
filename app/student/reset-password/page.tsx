"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

const CAMPUS_IMG = '/mmcm-bg.jpeg';

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

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 52, height: 52, color: '#198754' }}>
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

type Step = 'verify' | 'reset' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('verify');

  // Step 1 — verify identity
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail]                 = useState('');
  const [verifyError, setVerifyError]     = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [requesterId, setRequesterId]     = useState<number | null>(null);

  // Step 2 — set new password
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw]             = useState(false);
  const [showConfPw, setShowConfPw]           = useState(false);
  const [resetError, setResetError]           = useState('');
  const [resetLoading, setResetLoading]       = useState(false);

  // ── Step 1: verify student number + email ──────────────────────────────────
  async function handleVerify() {
    if (!studentNumber.trim() || !email.trim()) {
      setVerifyError('Both fields are required.'); return;
    }
    setVerifyLoading(true); setVerifyError('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-reset/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_number: studentNumber, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setVerifyError('Student number and email do not match our records. Please check your details or contact the Registrar\'s Office.');
        return;
      }
      setRequesterId(data.requester_id);
      setStep('reset');
    } catch {
      setVerifyError('Could not connect to server. Make sure Django is running.');
    } finally { setVerifyLoading(false); }
  }

  // ── Step 2: set new password ───────────────────────────────────────────────
  async function handleReset() {
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.'); return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.'); return;
    }
    setResetLoading(true); setResetError('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: requesterId, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error || 'Password reset failed. Please try again.');
        return;
      }
      setStep('done');
      setTimeout(() => router.push('/'), 2500);
    } catch {
      setResetError('Could not connect to server. Make sure Django is running.');
    } finally { setResetLoading(false); }
  }

  // ── Shared style helpers (identical to login page) ─────────────────────────
  const inp = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '11px 14px', fontSize: 13,
    border: `1.5px solid ${err ? '#E50019' : '#E0E0E0'}`,
    borderRadius: 8, fontFamily: 'var(--drms-font)', outline: 'none',
    boxSizing: 'border-box', color: 'var(--text-primary)', background: 'var(--surface)',
  });

  const Label = ({ t, req }: { t: string; req?: boolean }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
      {t}{req && <span style={{ color: '#E50019', marginLeft: 2 }}>*</span>}
    </div>
  );

  const Err = ({ m }: { m?: string }) =>
    m ? <div style={{ fontSize: 11, color: '#E50019', marginTop: 3, fontWeight: 600 }}>{m}</div> : null;

  const PwBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid-gray)', display: 'flex', padding: 0 }}>
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  const PrimaryBtn = ({ onClick, loading, children }: { onClick: () => void; loading: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={loading}
      style={{ width: '100%', padding: 13, background: '#001C43', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--drms-font)', marginTop: 4 }}>
      {children}
    </button>
  );

  return (
    <div className="force-light-mode" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background — same as login */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `url('${CAMPUS_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, padding: '20px 16px', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', padding: 36, boxSizing: 'border-box' }}>

          {/* Header — identical to login */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/mmcm-logo.png" alt="MMCM Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 10, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 20 }}>
              <div style={{ background: '#E50019', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>RO</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', letterSpacing: 0.3 }}>Registrar's Office · MMCM</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--drms-font)', marginBottom: 4 }}>
              {step === 'verify' && 'Forgot Password'}
              {step === 'reset'  && 'Set New Password'}
              {step === 'done'   && 'Password Updated'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', lineHeight: 1.5 }}>
              {step === 'verify' && 'Enter your student number and registered email to continue'}
              {step === 'reset'  && 'Choose a new password for your account'}
              {step === 'done'   && 'You can now log in with your new password'}
            </div>
          </div>

          {/* ── STEP 1: Verify identity ── */}
          {step === 'verify' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label t="Student Number" req />
                <input
                  style={inp()}
                  type="text"
                  placeholder="e.g. 2024110012"
                  maxLength={12}
                  value={studentNumber}
                  onChange={e => { setStudentNumber(e.target.value.replace(/\D/g, '')); setVerifyError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
              </div>
              <div>
                <Label t="Registered Email Address" req />
                <input
                  style={inp()}
                  type="email"
                  placeholder="student@mcm.edu.ph"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setVerifyError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                />
              </div>

              {verifyError && (
                <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '10px 12px', background: 'rgba(229,0,25,0.08)', borderRadius: 8, border: '1px solid #ffd0d0', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <WarningIcon />{verifyError}
                </div>
              )}

              <PrimaryBtn onClick={handleVerify} loading={verifyLoading}>
                {verifyLoading ? 'Verifying...' : 'Continue'}
              </PrimaryBtn>

              <div style={{ textAlign: 'center', fontSize: 13 }}>
                <span
                  style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => router.push('/')}
                >
                  Back to Login
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 2: Set new password ── */}
          {step === 'reset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Label t="New Password" req />
                <div style={{ position: 'relative' }}>
                  <input
                    style={inp(resetError && newPassword.length < 8 ? resetError : undefined)}
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setResetError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                  />
                  <PwBtn show={showNewPw} toggle={() => setShowNewPw(p => !p)} />
                </div>
              </div>
              <div>
                <Label t="Confirm New Password" req />
                <div style={{ position: 'relative' }}>
                  <input
                    style={inp()}
                    type={showConfPw ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setResetError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                  />
                  <PwBtn show={showConfPw} toggle={() => setShowConfPw(p => !p)} />
                </div>
              </div>

              {resetError && (
                <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '10px 12px', background: 'rgba(229,0,25,0.08)', borderRadius: 8, border: '1px solid #ffd0d0', display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <WarningIcon />{resetError}
                </div>
              )}

              <PrimaryBtn onClick={handleReset} loading={resetLoading}>
                {resetLoading ? 'Saving...' : 'Reset Password'}
              </PrimaryBtn>

              <div style={{ textAlign: 'center', fontSize: 13 }}>
                <span
                  style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => { setStep('verify'); setResetError(''); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <CheckCircleIcon />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#198754', marginBottom: 6 }}>Password Updated!</div>
              <div style={{ fontSize: 13, color: 'var(--mid-gray)' }}>Redirecting to login...</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
