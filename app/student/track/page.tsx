"use client";

import { useRouter } from 'next/navigation';

interface JourneyStep { stage: string; date: string; desc: string; type: 'done' | 'active' | 'pending'; }

const steps: JourneyStep[] = [
  { stage: 'Submission',        date: 'Feb 20, 2026',               desc: 'Your request was successfully submitted online.',          type: 'done'    },
  { stage: 'Verification',      date: 'Feb 20, 2026',               desc: 'Your documents and enrollment have been verified.',        type: 'done'    },
  { stage: 'Billing & Payment', date: 'Feb 21, 2026',               desc: 'Payment of ₱100.00 confirmed (OR-2026-00453).',            type: 'done'    },
  { stage: 'Processing',        date: 'Feb 22, 2026 — In Progress', desc: 'Your SF9 and SF10 are currently being processed.',         type: 'active'  },
  { stage: 'Ready for Release', date: '—',                          desc: 'We will notify you when your documents are ready.',        type: 'pending' },
  { stage: 'Released',          date: '—',                          desc: "Present your claim slip at the Registrar's Office.",       type: 'pending' },
];

export default function StudentTrackPage() {
  const router = useRouter();

  return (
    <div className="public-page drms-root">
      <div className="pub-topbar">
        <div className="pub-logo">M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Document Request Monitoring System</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }} onClick={() => router.push('/student/submit')}>Submit a Request</span>
          <button style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', fontFamily: 'var(--drms-font)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push('/')}>
            Student Login
          </button>
        </div>
      </div>

      <div className="pub-body">
        {/* Search card */}
        <div className="track-card">
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
          <div className="track-title">Track Your Request</div>
          <div className="track-sub">Enter your Tracking ID to check the current status of your document request. Your Tracking ID was sent to your email upon submission.</div>
          <div className="track-input-row">
            <input className="track-input" type="text" defaultValue="REQ-2026-003" placeholder="e.g. REQ-2026-003" />
            <button className="btn-track">Track</button>
          </div>
          <div className="info-box">
            <span className="info-icon">ℹ️</span>
            <div className="info-text">For concerns, contact the Registrar's Office at <strong>registrar@mcm.edu.ph</strong> or visit Room 101, Admin Building.</div>
          </div>
        </div>

        {/* Result card */}
        <div className="track-result">
          <div className="result-header">
            <div>
              <div className="result-id">Tracking ID: REQ-2026-003</div>
              <div className="result-name">Dela Cruz, Maria</div>
              <div className="result-doc">SF9 (Report Card) + SF10 (Permanent Record)</div>
            </div>
            <span className="badge b-apr" style={{ fontSize: 13 }}>For Approval</span>
          </div>

          <div className="drms-card" style={{ padding: 20 }}>
            <div className="section-title" style={{ fontSize: 13 }}>Request Progress</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map(s => (
                <div key={s.stage} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: s.type === 'done' ? 'var(--blue)' : s.type === 'active' ? 'var(--navy)' : 'var(--light-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: s.type === 'pending' ? 'var(--mid-gray)' : 'white' }}>
                    {s.type === 'done' ? '✓' : s.type === 'active' ? '…' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.type === 'pending' ? 'var(--mid-gray)' : 'var(--navy)' }}>{s.stage}</div>
                    <div style={{ fontSize: 11, color: s.type === 'active' ? 'var(--blue)' : 'var(--mid-gray)', marginTop: 2 }}>{s.date}</div>
                    <div style={{ fontSize: 12, color: s.type === 'pending' ? 'var(--mid-gray)' : '#444', marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: 12, background: '#F0F4FF', borderRadius: 'var(--drms-radius-sm)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>📅 Expected Claim Date: February 27, 2026</div>
              <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>Claim slip will be issued once your documents are ready. Please bring a valid ID when claiming.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
