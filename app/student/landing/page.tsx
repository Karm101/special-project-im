"use client";

import { useState, useEffect } from 'react';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
import { useRouter } from 'next/navigation';

export default function StudentLandingPage() {
  const router = useRouter();
  useAuthGuard('student');
  const [studentName, setStudentName] = useState('');
  const [studentLevel, setStudentLevel] = useState('');
  const [studentProgram, setStudentProgram] = useState('');
  const [studentNumber, setStudentNumber] = useState('');

  useEffect(() => {
    const name    = sessionStorage.getItem('student_name');
    const level   = sessionStorage.getItem('student_level');
    const program = sessionStorage.getItem('student_program');
    const number  = sessionStorage.getItem('student_number');
    if (name)    setStudentName(name);
    if (level)   setStudentLevel(level);
    if (program) setStudentProgram(program);
    if (number)  setStudentNumber(number);
  }, []);

  // Generate initials from "LastName, FirstName" format
  const initials = studentName
    ? studentName.replace(',', '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  function handleLogout() {
    sessionStorage.clear();
    router.push('/');
  }

  return (
    <div className="public-page drms-root">
      <div className="pub-topbar">
        <div className="pub-logo">M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Document Request Portal</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {studentName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                {initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{studentName}</span>
                {(studentLevel || studentProgram) && (
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                    {[studentLevel, studentProgram].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, color: 'white', fontFamily: 'var(--drms-font)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {studentName ? (
            <>
              <div style={{ fontSize: 14, color: 'var(--mid-gray)', marginBottom: 6, fontFamily: "'Montserrat', sans-serif" }}>
                Welcome back,
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat', sans-serif" }}>
                {studentName}
              </div>
              {studentNumber && (
                <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>
                  Student No. {studentNumber}
                  {studentProgram ? ` · ${studentProgram}` : ''}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat', sans-serif" }}>
              What would you like to do?
            </div>
          )}
          <div style={{ fontSize: 14, color: 'var(--mid-gray)', marginTop: 8, lineHeight: 1.6, fontFamily: "'Montserrat', sans-serif" }}>
            Select an option below to get started.
          </div>
        </div>

        <div className="landing-grid">
          <div className="landing-card" onClick={() => router.push('/student/submit')}>
            <div className="landing-icon" style={{ background: 'rgba(17,75,159,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#001C43" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="landing-title">Request a Document</div>
            <div className="landing-sub">Submit a new request for TOR, Certifications, SF9, SF10, or other academic documents.</div>
            <button className="btn-primary" style={{ padding: '10px 24px', marginTop: 4 }} onClick={e => { e.stopPropagation(); router.push('/student/submit'); }}>
              Get Started →
            </button>
          </div>

          <div className="landing-card" onClick={() => router.push('/student/track')}>
            <div className="landing-icon" style={{ background: 'rgba(25,135,84,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div className="landing-title">Track My Request</div>
            <div className="landing-sub">Check the status of an existing document request using your Tracking ID or student number.</div>
            <button className="btn-outline" style={{ padding: '10px 24px', marginTop: 4 }} onClick={e => { e.stopPropagation(); router.push('/student/track'); }}>
              Track Now →
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)', fontFamily: "'Montserrat', sans-serif" }}>
            Alumni, transferees, or authorized representatives?
          </div>
          <span
            style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}
            onClick={() => router.push('/student/submit')}
          >
            Use the request form — select RO-0004 (Transfer Credential) inside.
          </span>
        </div>
      </div>
    </div>
  );
}
