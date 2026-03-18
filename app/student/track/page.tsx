"use client";

import { useRouter } from 'next/navigation';

interface JourneyStep {
  ico: string; stage: string; date: string; desc: string;
  type: 'done' | 'active' | 'pending';
}

const steps: JourneyStep[] = [
  { ico: '✓', stage: 'Submission',        date: 'Feb 20, 2026',           desc: 'Your request was successfully submitted online.',                      type: 'done' },
  { ico: '✓', stage: 'Verification',      date: 'Feb 20, 2026',           desc: 'Your documents and enrollment have been verified.',                   type: 'done' },
  { ico: '✓', stage: 'Billing & Payment', date: 'Feb 21, 2026',           desc: 'Payment of ₱100.00 confirmed (OR-2026-00453).',                       type: 'done' },
  { ico: '…', stage: 'Processing',        date: 'Feb 22, 2026 — In Progress', desc: 'Your SF9 and SF10 are currently being processed.',                type: 'active' },
  { ico: '○', stage: 'Ready for Release', date: '—',                      desc: 'We will notify you when your documents are ready.',                   type: 'pending' },
  { ico: '○', stage: 'Released',          date: '—',                      desc: "Present your claim slip at the Registrar's Office.",                  type: 'pending' },
];

export default function StudentTrackPage() {
  const router = useRouter();

  return (
    <div className="public-page drms-root">
      {/* Public topbar */}
      <div className="pub-topbar">
        <div className="pub-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/landing')}>M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Track Request Status</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <button className="btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', background: 'transparent' }} onClick={() => router.push('/landing')}>Cancel</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 700 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ color: '#001C43', fontFamily: "'Montserrat', sans-serif" }}>Track Your Document Request</h2>
            <p style={{ color: '#444', fontSize: 13, fontFamily: "'Montserrat', sans-serif" }}>Enter your Tracking ID and Student Number below.</p>
          </div>

          <div className="drms-card" style={{ padding: 24, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tracking / Request ID</label>
              <input type="text" className="drms-input" placeholder="e.g. REQ-003" defaultValue="REQ-003" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Student Number</label>
              <input type="text" className="drms-input" placeholder="e.g. 2020-12345" defaultValue="2020-100234" />
            </div>
            <button className="btn-primary" style={{ height: 38 }}>Track Status</button>
          </div>

          <div className="drms-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,.06)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>#REQ-003</div>
                <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 4 }}>Dela Cruz, Maria · SF9 + SF10</div>
              </div>
              <span className="badge b-apr">Processing</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 10 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                  {i < steps.length - 1 && (
                    <div style={{ position: 'absolute', left: 11, top: 24, bottom: -20, width: 2, background: s.type === 'done' ? 'var(--blue)' : 'var(--light-gray)' }} />
                  )}
                  <div
                    style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0, position: 'relative', zIndex: 2,
                      background: s.type === 'done' ? 'var(--blue)' : s.type === 'active' ? 'white' : 'var(--light-gray)',
                      border: s.type === 'active' ? '2px solid var(--blue)' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: s.type === 'pending' ? 'var(--mid-gray)' : 'white',
                    }}
                  >
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
              <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
                Claim slip will be generated once the documents are ready for release.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}