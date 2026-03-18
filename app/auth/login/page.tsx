"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Next.js router

const CAMPUS_IMG = 'https://images.unsplash.com/photo-1613688365965-8abc666fe1e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

export default function LoginPage() { // Added 'default'
  const router = useRouter();
  const [mode, setMode] = useState<'staff' | 'student'>('staff');

  const isStaff = mode === 'staff';

  return (
    <div className="login-screen drms-root">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-card">
          {/* Staff / Student toggle */}
          <div className="login-mode-toggle">
            <button
              className={`lmt-btn${isStaff ? ' active' : ''}`}
              onClick={() => setMode('staff')}
            >
              🏢 Staff / Admin
            </button>
            <button
              className={`lmt-btn${!isStaff ? ' active' : ''}`}
              onClick={() => setMode('student')}
            >
              🎓 Student
            </button>
          </div>

          <div className="login-header">
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg,#001C43,#114B9F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 32, fontWeight: 800, marginBottom: 16
            }}>M</div>
            <h1>{isStaff ? 'Staff Portal' : 'Student Portal'}</h1>
            <p>Document Request Monitoring System</p>
          </div>

          <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="text" className="drms-input" placeholder={isStaff ? "Email or Username" : "Student Number"} />
              <input type="password" className="drms-input" placeholder="Password" />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" className="cb" /> Remember me
                </label>
                <span style={{ color: '#114B9F', cursor: 'pointer', fontWeight: 600 }}>Forgot Password?</span>
              </div>

              <button
                className="btn-primary"
                style={{ justifyContent: 'center', padding: 12, marginTop: 8 }}
                onClick={() => router.push(isStaff ? '/dashboard' : '/submit')} // Changed to router.push
              >
                Login
              </button>
              <button
                className="btn-login-ms"
                style={{ marginTop: isStaff ? 55 : 12 }}
                onClick={() => router.push(isStaff ? '/reports' : '/student/landing')} // Changed to router.push
              >
                {isStaff ? '🪟 Login with Microsoft Account' : '🪟 Login with Google / SSO'}
              </button>

              {!isStaff && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: '#B1B1B1' }}>Just want to check your request? </span>
                  <span
                    style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => router.push('/track')} // Changed to router.push
                  >
                    Track Request →
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: campus photo */}
      <div className="login-right">
        <div
          className="login-right-bg"
          style={{ backgroundImage: `url('${CAMPUS_IMG}')` }}
        />
        <div className="login-right-text">
          <h2>Mapúa Malayan<br />Colleges Mindanao</h2>
          <p>
            Centralized Document Request Monitoring System for the Registrar's Office —
            track, manage, and process all student requests in one platform.
          </p>
        </div>
      </div>
    </div>
  );
}