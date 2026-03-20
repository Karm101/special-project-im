"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CAMPUS_IMG = 'https://images.unsplash.com/photo-1613688365965-8abc666fe1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

type Mode = 'login' | 'register';

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');

  // ── Login state ────────────────────────────────────────────────────────────
  const [loginNumber, setLoginNumber]   = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw]   = useState(false);

  // ── Register state ─────────────────────────────────────────────────────────
  const [reg, setReg] = useState({
    student_number: '', first_name: '', last_name: '',
    email: '', password: '', confirm_password: '',
    program_strand: '', academic_level: 'College',
    academic_year: '', term_semester: '', contact_number: '',
  });
  const [regErrors, setRegErrors]     = useState<Record<string, string>>({});
  const [regError, setRegError]       = useState('');
  const [regLoading, setRegLoading]   = useState(false);
  const [showRegPw, setShowRegPw]     = useState(false);
  const [regSuccess, setRegSuccess]   = useState(false);

  const setR = (k: string, v: string) => setReg(p => ({ ...p, [k]: v }));

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!loginNumber.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your student number and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/student-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch {
      setLoginError('Could not connect to server. Make sure Django is running.');
    } finally {
      setLoginLoading(false);
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────
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

    setRegLoading(true);
    setRegError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/student-register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_number:   reg.student_number,
          first_name:       reg.first_name,
          last_name:        reg.last_name,
          email:            reg.email,
          password:         reg.password,
          program_strand:   reg.program_strand,
          academic_level:   reg.academic_level,
          academic_year:    reg.academic_year || null,
          term_semester:    reg.term_semester || null,
          contact_number:   reg.contact_number || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setRegErrors(data.errors);
        else setRegError(data.error || 'Registration failed.');
        return;
      }
      // Auto login after register
      sessionStorage.setItem('student_token',   data.token);
      sessionStorage.setItem('student_name',    data.name);
      sessionStorage.setItem('student_number',  data.student_number);
      sessionStorage.setItem('student_id',      String(data.requester_id));
      sessionStorage.setItem('student_level',   data.academic_level);
      sessionStorage.setItem('student_program', data.program_strand);
      setRegSuccess(true);
      setTimeout(() => router.push('/student/landing'), 1500);
    } catch {
      setRegError('Could not connect to server. Make sure Django is running.');
    } finally {
      setRegLoading(false);
    }
  }

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: `1px solid ${err ? '#E50019' : '#ddd'}`,
    borderRadius: 8, fontFamily: 'var(--drms-font)',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .15s',
  });

  const errStyle: React.CSSProperties = {
    fontSize: 11, color: '#E50019', marginTop: 3, fontWeight: 600,
  };

  return (
    <div className="login-screen drms-root">
      <div className="login-left">
        <div className="login-card" style={{ maxHeight: mode === 'register' ? '90vh' : 'auto', overflowY: mode === 'register' ? 'auto' : 'visible' }}>

          {/* Mode toggle */}
          <div className="login-mode-toggle">
            <button className={`lmt-btn${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setLoginError(''); setRegError(''); }}>
              🎓 Student Login
            </button>
            <button className={`lmt-btn${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setLoginError(''); setRegError(''); }}>
              📝 Register
            </button>
          </div>

          {/* Header */}
          <div className="login-header">
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#001C43,#114B9F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>M</div>
            <div className="login-office-tag">
              <div className="login-office-icon">RO</div>
              <span className="login-office-name">Registrar's Office · MMCM</span>
            </div>
            <div className="login-title">{mode === 'login' ? 'Student Portal' : 'Create Account'}</div>
            <div className="login-sub">
              {mode === 'login'
                ? 'Sign in to submit and track your document requests'
                : 'Register to access the student document request portal'}
            </div>
          </div>

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <div className="login-inputs">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="login-field">
                  <span className="login-label">Student Number</span>
                  <input style={inputStyle()} type="text" placeholder="e.g. 2024110012"
                    maxLength={12} value={loginNumber}
                    onChange={e => { setLoginNumber(e.target.value.replace(/\D/g, '')); setLoginError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="login-field">
                  <div className="login-field-header">
                    <span className="login-label">Password</span>
                    <span className="login-forgot" style={{ cursor: 'pointer', fontSize: 11, color: '#114B9F' }}>
                      Forgot password?
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input style={inputStyle()} type={showLoginPw ? 'text' : 'password'}
                      placeholder="••••••••" value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                    <span onClick={() => setShowLoginPw(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#B1B1B1' }}>
                      {showLoginPw ? '🙈' : '👁️'}
                    </span>
                  </div>
                </div>
                {loginError && (
                  <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '8px 12px', background: '#fff0f0', borderRadius: 6, border: '1px solid #ffd0d0' }}>
                    ⚠️ {loginError}
                  </div>
                )}
              </div>
              <div className="login-btns">
                <button className="btn-login-primary" onClick={handleLogin} disabled={loginLoading}>
                  {loginLoading ? 'Signing in...' : 'Login'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: '#B1B1B1' }}>Don't have an account? </span>
                  <span style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }} onClick={() => setMode('register')}>
                    Register here →
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#B1B1B1' }}>Just want to track? </span>
                  <span style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }} onClick={() => router.push('/student/track')}>
                    Track Request →
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                  <span style={{ fontSize: 12, color: '#B1B1B1' }}>Are you staff? </span>
                  <span style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }} onClick={() => router.push('/staff/login')}>
                    Staff Login →
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <div className="login-inputs">
              {regSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#198754', marginBottom: 6 }}>Account Created!</div>
                  <div style={{ fontSize: 13, color: '#B1B1B1' }}>Redirecting to your portal...</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Student Number */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                        Student Number <span style={{ color: '#E50019' }}>*</span>
                      </label>
                      <input style={inputStyle(regErrors.student_number)} type="text" placeholder="e.g. 2024110012"
                        maxLength={12} value={reg.student_number}
                        onChange={e => { setR('student_number', e.target.value.replace(/\D/g, '')); setRegErrors(p => ({...p, student_number: ''})); }}
                      />
                      {regErrors.student_number && <div style={errStyle}>{regErrors.student_number}</div>}
                    </div>

                    {/* Name row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                          First Name <span style={{ color: '#E50019' }}>*</span>
                        </label>
                        <input style={inputStyle(regErrors.first_name)} type="text" value={reg.first_name}
                          onChange={e => { setR('first_name', e.target.value); setRegErrors(p => ({...p, first_name: ''})); }}
                        />
                        {regErrors.first_name && <div style={errStyle}>{regErrors.first_name}</div>}
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                          Last Name <span style={{ color: '#E50019' }}>*</span>
                        </label>
                        <input style={inputStyle(regErrors.last_name)} type="text" value={reg.last_name}
                          onChange={e => { setR('last_name', e.target.value); setRegErrors(p => ({...p, last_name: ''})); }}
                        />
                        {regErrors.last_name && <div style={errStyle}>{regErrors.last_name}</div>}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                        Email Address <span style={{ color: '#E50019' }}>*</span>
                      </label>
                      <input style={inputStyle(regErrors.email)} type="email" placeholder="student@mcm.edu.ph"
                        value={reg.email}
                        onChange={e => { setR('email', e.target.value); setRegErrors(p => ({...p, email: ''})); }}
                      />
                      {regErrors.email && <div style={errStyle}>{regErrors.email}</div>}
                    </div>

                    {/* Academic level + Program */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                          Academic Level <span style={{ color: '#E50019' }}>*</span>
                        </label>
                        <select style={{ ...inputStyle(), appearance: 'auto' }} value={reg.academic_level}
                          onChange={e => setR('academic_level', e.target.value)}>
                          <option value="College">College</option>
                          <option value="SHS">Senior High School</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                          Program / Strand <span style={{ color: '#E50019' }}>*</span>
                        </label>
                        <input style={inputStyle(regErrors.program_strand)} type="text" placeholder="e.g. BSCS, STEM"
                          value={reg.program_strand}
                          onChange={e => { setR('program_strand', e.target.value); setRegErrors(p => ({...p, program_strand: ''})); }}
                        />
                        {regErrors.program_strand && <div style={errStyle}>{regErrors.program_strand}</div>}
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                        Password <span style={{ color: '#E50019' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input style={inputStyle(regErrors.password)} type={showRegPw ? 'text' : 'password'}
                          placeholder="Min 8 characters" value={reg.password}
                          onChange={e => { setR('password', e.target.value); setRegErrors(p => ({...p, password: ''})); }}
                        />
                        <span onClick={() => setShowRegPw(p => !p)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#B1B1B1' }}>
                          {showRegPw ? '🙈' : '👁️'}
                        </span>
                      </div>
                      {regErrors.password && <div style={errStyle}>{regErrors.password}</div>}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#001C43', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                        Confirm Password <span style={{ color: '#E50019' }}>*</span>
                      </label>
                      <input style={inputStyle(regErrors.confirm_password)} type="password"
                        placeholder="Re-enter password" value={reg.confirm_password}
                        onChange={e => { setR('confirm_password', e.target.value); setRegErrors(p => ({...p, confirm_password: ''})); }}
                      />
                      {regErrors.confirm_password && <div style={errStyle}>{regErrors.confirm_password}</div>}
                    </div>

                    {regError && (
                      <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '8px 12px', background: '#fff0f0', borderRadius: 6, border: '1px solid #ffd0d0' }}>
                        ⚠️ {regError}
                      </div>
                    )}
                  </div>

                  <div className="login-btns">
                    <button className="btn-login-primary" onClick={handleRegister} disabled={regLoading}>
                      {regLoading ? 'Creating account...' : 'Create Account'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <span style={{ fontSize: 12, color: '#B1B1B1' }}>Already have an account? </span>
                      <span style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }} onClick={() => setMode('login')}>
                        Sign in →
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-right-bg" style={{ backgroundImage: `url('${CAMPUS_IMG}')` }} />
        <div className="login-right-text">
          <h2>Mapúa Malayan<br />Colleges Mindanao</h2>
          <p>Submit and track your document requests online — anytime, anywhere.</p>
        </div>
      </div>
    </div>
  );
}
