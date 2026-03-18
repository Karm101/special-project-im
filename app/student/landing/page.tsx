"use client";

import { useRouter } from 'next/navigation'; // Changed to Next.js router

export default function StudentLandingPage() { // Added default export
  const router = useRouter();

  return (
    <div className="public-page drms-root">
      {/* Public nav */}
      <div className="pub-topbar">
        <div className="pub-logo">M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Document Request Portal</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            style={{
              padding: '8px 18px', background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6,
              color: 'white', fontFamily: 'var(--drms-font)', fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
            }}
            onClick={() => router.push('/login')} // Changed to router.push
          >
            ← Back to Login
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#001C43', fontFamily: "'Montserrat', sans-serif" }}>Welcome, Student!</div>
          <div style={{ fontSize: 14, color: '#444', marginTop: 8, fontFamily: "'Montserrat', sans-serif" }}>What would you like to do today?</div>
        </div>

        {/* Big Actions */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          
          <div
            className="landing-card"
            onClick={() => router.push('/submit')} // Changed to router.push
          >
            <div className="landing-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#001C43" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="landing-title">Request a Document</div>
            <div className="landing-sub">
              Need a Transcript of Records, Honorable Dismissal, or Certifications? Start a new request here.
            </div>
            <button
              className="btn-primary"
              style={{ padding: '10px 24px', marginTop: 4 }}
              onClick={e => { e.stopPropagation(); router.push('/submit'); }} // Changed to router.push
            >
              Start Request →
            </button>
          </div>

          <div
            className="landing-card"
            onClick={() => router.push('/track')} // Changed to router.push
          >
            <div className="landing-icon" style={{ background: '#EAFAF1' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div className="landing-title">Track My Request</div>
            <div className="landing-sub">
              Check the status of an existing document request using your Tracking ID or student number.
            </div>
            <button
              className="btn-outline"
              style={{ padding: '10px 24px', marginTop: 4 }}
              onClick={e => { e.stopPropagation(); router.push('/track'); }} // Changed to router.push
            >
              Track Now →
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <div style={{ fontSize: 12, color: '#B1B1B1', fontFamily: "'Montserrat', sans-serif" }}>
            Alumni, transferees, or authorized representatives?
          </div>
          <span
            style={{ fontSize: 12, color: '#114B9F', cursor: 'pointer', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}
            onClick={() => router.push('/submit')} // Changed to router.push
          >
            Use the request form as a guest →
          </span>
        </div>
      </div>
    </div>
  );
}