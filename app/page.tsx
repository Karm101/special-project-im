"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CAMPUS_IMG = 'https://images.unsplash.com/photo-1613688365965-8abc666fe1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'staff' | 'student'>('staff');
  const isStaff = mode === 'staff';

  // ── Staff login state ──────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // ── Student login state ────────────────────────────────────────────────────
  const [studentNumber, setStudentNumber] = useState('');
  const [studentError, setStudentError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  // ── Staff login ────────────────────────────────────────────────────────────
  async function handleStaffLogin() {
    if (!username.trim() || !password.trim()) {
      setStaffError('Please enter your username and password.');
      return;
    }
    setStaffLoading(true);
    setStaffError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/staff-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error || 'Invalid credentials. Please try again.');
        return;
      }
      // Save auth info to sessionStorage
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('staff_name', data.name);
      sessionStorage.setItem('staff_id', String(data.staff_id ?? ''));
      sessionStorage.setItem('staff_role', data.role ?? 'Staff');
      sessionStorage.setItem('staff_dept', data.department ?? '');
      router.push('/staff/dashboard');
    } catch {
      setStaffError('Could not connect to the server. Make sure Django is running.');
    } finally {
      setStaffLoading(false);
    }
  }

  // ── Student login (by student number) ─────────────────────────────────────
  async function handleStudentLogin() {
    if (!studentNumber.trim()) {
      setStudentError('Please enter your student number.');
      return;
    }
    setStudentLoading(true);
    setStudentError('');
    try {
      const res = await fetch('http://localhost:8000/api/auth/student-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_number: studentNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStudentError(data.error || 'Student not found. Check your student number.');
        return;
      }
      // Save student info to sessionStorage
      sessionStorage.setItem('student_name', data.name);
      sessionStorage.setItem('student_number', data.student_number);
      sessionStorage.setItem('student_id', String(data.requester_id));
      sessionStorage.setItem('student_level', data.academic_level);
      sessionStorage.setItem('student_program', data.program_strand);
      router.push('/student/landing');
    } catch {
      setStudentError('Could not connect to the server. Make sure Django is running.');
    } finally {
      setStudentLoading(false);
    }
  }

  return (
    <div className="login-screen drms-root">
      <div className="login-left">
        <div className="login-card">

          {/* Mode toggle */}
          <div className="login-mode-toggle">
            <button className={`lmt-btn${isStaff ? ' active' : ''}`} onClick={() => { setMode('staff'); setStaffError(''); setStudentError(''); }}>
              🏢 Staff / Admin
            </button>
            <button className={`lmt-btn${!isStaff ? ' active' : ''}`} onClick={() => { setMode('student'); setStaffError(''); setStudentError(''); }}>
              🎓 Student
            </button>
          </div>

          {/* Header */}
          <div className="login-header">
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#001C43,#114B9F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>M</div>
            <div className="login-office-tag">
              <div className="login-office-icon">RO</div>
              <span className="login-office-name">Registrar's Office · MMCM</span>
            </div>
            <div className="login-title">Welcome Back!</div>
            <div className="login-sub">
              {isStaff
                ? 'Sign in to access the Document Request Monitoring System'
                : 'Enter your student number to access your requests'}
            </div>
          </div>

          {/* ── Staff login form ── */}
          {isStaff && (
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
                    onChange={e => { setUsername(e.target.value); setStaffError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                  />
                </div>
                <div className="login-field">
                  <div className="login-field-header">
                    <span className="login-label">Password</span>
                    <span className="login-forgot">Forgot your password?</span>
                  </div>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setStaffError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                  />
                </div>
                {staffError && (
                  <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '8px 12px', background: '#fff0f0', borderRadius: 6, border: '1px solid #ffd0d0' }}>
                    ⚠️ {staffError}
                  </div>
                )}
              </div>
              <div className="login-btns">
                <button
                  className="btn-login-primary"
                  onClick={handleStaffLogin}
                  disabled={staffLoading}
                >
                  {staffLoading ? 'Signing in...' : 'Login'}
                </button>
              </div>
            </div>
          )}

          {/* ── Student login form ── */}
          {!isStaff && (
            <div className="login-inputs">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="login-field">
                  <div className="login-field-header">
                    <span className="login-label">Student Number</span>
                  </div>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="e.g. 2024110012"
                    maxLength={12}
                    value={studentNumber}
                    onChange={e => { setStudentNumber(e.target.value.replace(/\D/g, '')); setStudentError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleStudentLogin()}
                  />
                </div>
                {studentError && (
                  <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, padding: '8px 12px', background: '#fff0f0', borderRadius: 6, border: '1px solid #ffd0d0' }}>
                    ⚠️ {studentError}
                  </div>
                )}
              </div>
              <div className="login-btns">
                <button
                  className="btn-login-primary"
                  onClick={handleStudentLogin}
                  disabled={studentLoading}
                >
                  {studentLoading ? 'Looking up...' : 'Continue'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: '#B1B1B1' }}>Just want to check your request? </span>
                  <span
                    style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => router.push('/student/track')}
                  >
                    Track Request →
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Right side — campus image */}
      <div className="login-right">
        <div className="login-right-bg" style={{ backgroundImage: `url('${CAMPUS_IMG}')` }} />
        <div className="login-right-text">
          <h2>Mapúa Malayan<br />Colleges Mindanao</h2>
          <p>Centralized Document Request Monitoring System for the Registrar's Office — track, manage, and process all student requests in one platform.</p>
        </div>
      </div>
    </div>
  );
}
