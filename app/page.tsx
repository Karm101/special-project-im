"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CAMPUS_IMG = 'https://images.unsplash.com/photo-1613688365965-8abc666fe1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'staff' | 'student'>('staff');
  const isStaff = mode === 'staff';

  return (
    <div className="login-screen drms-root">
      <div className="login-left">
        <div className="login-card">
          <div className="login-mode-toggle">
            <button className={`lmt-btn${isStaff ? ' active' : ''}`} onClick={() => setMode('staff')}>🏢 Staff / Admin</button>
            <button className={`lmt-btn${!isStaff ? ' active' : ''}`} onClick={() => setMode('student')}>🎓 Student</button>
          </div>

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
                : 'Sign in to submit and track your document requests'}
            </div>
          </div>

          <div className="login-inputs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="login-field">
                <div className="login-field-header">
                  <span className="login-label">Username</span>
                </div>
                <input className="login-input" type="text" placeholder={isStaff ? '@example.mcm.edu.ph' : 'student@mcm.edu.ph'} />
              </div>
              <div className="login-field">
                <div className="login-field-header">
                  <span className="login-label">Password</span>
                  <span className="login-forgot">Forgot your password?</span>
                </div>
                <input className="login-input" type="password" placeholder="" />
              </div>
            </div>

            <div className="login-btns">
              <button className="btn-login-primary" onClick={() => router.push(isStaff ? '/staff/reports' : '/student/landing')}>
                Login
              </button>
              <button className="btn-login-ms" style={{ marginTop: 12 }} onClick={() => router.push(isStaff ? '/staff/reports' : '/student/landing')}>
                {isStaff ? '🪟 Login with Microsoft Account' : '🪟 Login with Google / SSO'}
              </button>
              {!isStaff && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: '#B1B1B1' }}>Just want to check your request? </span>
                  <span style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }} onClick={() => router.push('/student/track')}>
                    Track Request →
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
