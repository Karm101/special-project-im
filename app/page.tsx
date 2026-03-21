"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Replace with your MMCM campus photo ───────────────────────────────────────
// To use a local photo: put the file in special-project-im/public/campus.jpg
// then change this to: const CAMPUS_IMG = '/campus.jpg';
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

type Mode = 'login' | 'register';

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');

  const [loginNumber, setLoginNumber]     = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError]       = useState('');
  const [loginLoading, setLoginLoading]   = useState(false);
  const [showLoginPw, setShowLoginPw]     = useState(false);

  const [reg, setReg] = useState({
    student_number: '', first_name: '', last_name: '',
    email: '', password: '', confirm_password: '',
    program_strand: '', academic_level: 'College', contact_number: '',
  });
  const [regErrors, setRegErrors]   = useState<Record<string, string>>({});
  const [regError, setRegError]     = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw]   = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const setR = (k: string, v: string) => setReg(p => ({ ...p, [k]: v }));
  const clrE = (k: string) => setRegErrors(p => ({ ...p, [k]: '' }));

  async function handleLogin() {
    if (!loginNumber.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your student number and password.'); return;
    }
    setLoginLoading(true); setLoginError('');
    try {
      const res = await fetch('https://web-production-5905e.up.railway.app/api/auth/student-login/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_number: loginNumber, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Login failed.'); return; }
      sessionStorage.setItem('student_token',   data.token);
      sessionStorage.setItem('student_name',    data.name);
      sessionStorage.setItem('student_number',  data.student_number);
      sessionStorage.setItem('student_id',      String(data.requester_id));
      sessionStorage.setItem('student_level',   data.academic_level);
      sessionStorage.setItem('student_program', data.program_strand);
      router.push('/student/landing');
    } catch { setLoginError('Could not connect to server. Make sure Django is running.'); }
    finally { setLoginLoading(false); }
  }

  async function handleRegister() {
    const e: Record<string, string> = {};
    if (!reg.student_number.trim()) e.student_number = 'Required.';
    if (!reg.first_name.trim())     e.first_name     = 'Required.';
    if (!reg.last_name.trim())      e.last_name      = 'Required.';
    if (!reg.email.trim())          e.email          = 'Required.';
    if (!reg.program_strand.trim()) e.program_strand = 'Required.';
    if (!reg.password)              e.password       = 'Required.';
    else if (reg.password.length < 8) e.password     = 'Min 8 characters.';
    if (reg.password !== reg.confirm_password) e.confirm_password = 'Passwords do not match.';
    setRegErrors(e);
    if (Object.keys(e).length > 0) return;

    setRegLoading(true); setRegError('');
    try {
      const res = await fetch('https://web-production-5905e.up.railway.app/api/auth/student-register/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_number: reg.student_number, first_name: reg.first_name,
          last_name: reg.last_name, email: reg.email, password: reg.password,
          program_strand: reg.program_strand, academic_level: reg.academic_level,
          contact_number: reg.contact_number || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setRegErrors(data.errors);
        else setRegError(data.error || 'Registration failed.');
        return;
      }
      sessionStorage.setItem('student_token',   data.token);
      sessionStorage.setItem('student_name',    data.name);
      sessionStorage.setItem('student_number',  data.student_number);
      sessionStorage.setItem('student_id',      String(data.requester_id));
      sessionStorage.setItem('student_level',   data.academic_level);
      sessionStorage.setItem('student_program', data.program_strand);
      setRegSuccess(true);
      setTimeout(() => router.push('/student/landing'), 1500);
    } catch { setRegError('Could not connect to server. Make sure Django is running.'); }
    finally { setRegLoading(false); }
  }

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

  const PrimaryBtn = ({ onClick, loading, disabled, children }: any) => (
    <button onClick={onClick} disabled={loading || disabled}
      style={{ width: '100%', padding: 13, background: '#001C43', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'var(--drms-font)', marginTop: 4 }}>
      {children}
    </button>
  );

  return (
    <div className="force-light-mode" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Full background image */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `url('${CAMPUS_IMG}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      {/* Subtle dark overlay — natural, not blue */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />

      {/* Centered card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, padding: '20px 16px', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', padding: 36, boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#001C43,#114B9F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', margin: '0 auto 14px', boxShadow: '0 4px 12px rgba(0,28,67,0.25)' }}>M</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 10, background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 20 }}>
                <div style={{ background: '#E50019', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>RO</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', letterSpacing: 0.3 }}>Registrar's Office · MMCM</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--drms-font)', marginBottom: 4 }}>
                {mode === 'login' ? 'Student Portal' : 'Create Account'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--mid-gray)', lineHeight: 1.5 }}>
                {mode === 'login' ? 'Sign in to submit and track your requests' : 'Register to access the student portal'}
              </div>
            </div>

            {/* LOGIN */}
            {mode === 'login' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Label t="Student Number" req />
                  <input style={inp()} type="text" placeholder="e.g. 2024110012" maxLength={12} value={loginNumber}
                    onChange={e => { setLoginNumber(e.target.value.replace(/\D/g, '')); setLoginError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <Label t="Password" req />
                    <span style={{ fontSize: 11, color: '#114B9F', cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input style={inp()} type={showLoginPw ? 'text' : 'password'} placeholder="Enter your password"
                      value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    <PwBtn show={showLoginPw} toggle={() => setShowLoginPw(p => !p)} />
                  </div>
                </div>

                {loginError && (
                  <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '10px 12px', background: 'rgba(229,0,25,0.08)', borderRadius: 8, border: '1px solid #ffd0d0' }}>⚠️ {loginError}</div>
                )}

                <PrimaryBtn onClick={handleLogin} loading={loginLoading}>
                  {loginLoading ? 'Signing in...' : 'Login'}
                </PrimaryBtn>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                  <div style={{ textAlign: 'center', fontSize: 13 }}>
                    <span style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('register')}>Don't have an account?</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13 }}>
                    <span style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/student/track')}>Just want to track?</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, paddingTop: 10, borderTop: '1px solid var(--border-col)' }}>
                    <span style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/staff/login')}>Are you staff?</span>
                  </div>
                </div>
              </div>
            )}

            {/* REGISTER */}
            {mode === 'register' && (
              <>
                {regSuccess ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#198754', marginBottom: 6 }}>Account Created!</div>
                    <div style={{ fontSize: 13, color: 'var(--mid-gray)' }}>Redirecting to your portal...</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <Label t="Student Number" req />
                      <input style={inp(regErrors.student_number)} type="text" placeholder="e.g. 2024110012" maxLength={12}
                        value={reg.student_number} onChange={e => { setR('student_number', e.target.value.replace(/\D/g, '')); clrE('student_number'); }} />
                      <Err m={regErrors.student_number} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <Label t="First Name" req />
                        <input style={inp(regErrors.first_name)} type="text" value={reg.first_name} onChange={e => { setR('first_name', e.target.value); clrE('first_name'); }} />
                        <Err m={regErrors.first_name} />
                      </div>
                      <div>
                        <Label t="Last Name" req />
                        <input style={inp(regErrors.last_name)} type="text" value={reg.last_name} onChange={e => { setR('last_name', e.target.value); clrE('last_name'); }} />
                        <Err m={regErrors.last_name} />
                      </div>
                    </div>
                    <div>
                      <Label t="Email Address" req />
                      <input style={inp(regErrors.email)} type="email" placeholder="student@mcm.edu.ph"
                        value={reg.email} onChange={e => { setR('email', e.target.value); clrE('email'); }} />
                      <Err m={regErrors.email} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <Label t="Level" req />
                        <select style={{ ...inp(), appearance: 'auto' as any }} value={reg.academic_level} onChange={e => setR('academic_level', e.target.value)}>
                          <option value="College">College</option>
                          <option value="SHS">SHS</option>
                        </select>
                      </div>
                      <div>
                        <Label t="Program / Strand" req />
                        <input style={inp(regErrors.program_strand)} type="text" placeholder="e.g. BSCS"
                          value={reg.program_strand} onChange={e => { setR('program_strand', e.target.value); clrE('program_strand'); }} />
                        <Err m={regErrors.program_strand} />
                      </div>
                    </div>
                    <div>
                      <Label t="Password" req />
                      <div style={{ position: 'relative' }}>
                        <input style={inp(regErrors.password)} type={showRegPw ? 'text' : 'password'} placeholder="Min 8 characters"
                          value={reg.password} onChange={e => { setR('password', e.target.value); clrE('password'); }} />
                        <PwBtn show={showRegPw} toggle={() => setShowRegPw(p => !p)} />
                      </div>
                      <Err m={regErrors.password} />
                    </div>
                    <div>
                      <Label t="Confirm Password" req />
                      <div style={{ position: 'relative' }}>
                        <input style={inp(regErrors.confirm_password)} type={showConfPw ? 'text' : 'password'} placeholder="Re-enter password"
                          value={reg.confirm_password} onChange={e => { setR('confirm_password', e.target.value); clrE('confirm_password'); }} />
                        <PwBtn show={showConfPw} toggle={() => setShowConfPw(p => !p)} />
                      </div>
                      <Err m={regErrors.confirm_password} />
                    </div>

                    {regError && (
                      <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '10px 12px', background: 'rgba(229,0,25,0.08)', borderRadius: 8, border: '1px solid #ffd0d0' }}>⚠️ {regError}</div>
                    )}

                    <PrimaryBtn onClick={handleRegister} loading={regLoading}>
                      {regLoading ? 'Creating account...' : 'Create Account'}
                    </PrimaryBtn>

                    <div style={{ textAlign: 'center', fontSize: 13 }}>
                      <span style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('login')}>Already have an account?</span>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}
