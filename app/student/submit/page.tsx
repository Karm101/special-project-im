"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const docs = [
  { id: 'sf9',  label: 'SF9 — Report Card',        sub: '7 working days · ₱50.00 per copy'  },
  { id: 'sf10', label: 'SF10 — Permanent Record',   sub: '7 working days · ₱50.00 per copy'  },
  { id: 'coe',  label: 'Certificate of Enrollment', sub: '7 working days · ₱75.00 per copy'  },
  { id: 'ctc',  label: 'Certified True Copy',        sub: '7 working days · ₱50.00 per copy'  },
];

export default function StudentSubmitPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hasRep, setHasRep] = useState(false);

  const toggleDoc = (id: string) =>
    setChecked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="public-page drms-root">
      <div className="pub-topbar">
        <div className="pub-logo">M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Online Document Request</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }} onClick={() => router.push('/student/track')}>Track My Request</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>MD</div>
            <span style={{ color: 'white', fontSize: 13, fontFamily: 'var(--drms-font)' }}>Dela Cruz, Maria</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px', width: '100%' }}>
        <div className="step-bar" style={{ marginBottom: 28 }}>
          <div className="step active"><div className="step-circle">1</div><div className="step-label">Request Details</div></div>
          <div className="step-line" />
          <div className="step"><div className="step-circle">2</div><div className="step-label">Review</div></div>
          <div className="step-line" />
          <div className="step"><div className="step-circle">3</div><div className="step-label">Submitted</div></div>
        </div>

        <div className="drms-card" style={{ padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 4, fontFamily: 'var(--drms-font)' }}>Document Request Form</div>
          <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 24, fontFamily: 'var(--drms-font)' }}>Fill in the form below to submit your document request to the Registrar's Office.</div>

          <div className="info-box" style={{ marginBottom: 20 }}>
            <span className="info-icon">👤</span>
            <div className="info-text">Requesting as: <strong>Maria Dela Cruz</strong> · Student No. 2024110012 · SHS · STEM · 2nd Sem 2025-2026</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="section-title">Documents to Request</div>
            <div className="check-group">
              {docs.map(d => (
                <div key={d.id} className={`check-item${checked.has(d.id) ? ' checked' : ''}`} onClick={() => toggleDoc(d.id)}>
                  <input type="checkbox" checked={checked.has(d.id)} onChange={() => {}} />
                  <div><div className="check-item-label">{d.label}</div><div className="check-item-sub">{d.sub}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid cols1" style={{ marginBottom: 20 }}>
            <div className="fg">
              <label>Purpose / Reason for Request <span className="req-asterisk">*</span></label>
              <textarea className="drms-textarea" placeholder="State the specific purpose e.g. 'For college admission application at [school name]'" />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, marginBottom: 12 }}>
              <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--navy)' }} checked={hasRep} onChange={e => setHasRep(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Someone else will claim on my behalf (Authorized Representative)</span>
            </label>
            <div style={{ opacity: hasRep ? 1 : 0.4, pointerEvents: hasRep ? 'auto' : 'none' }}>
              <div className="form-grid">
                <div className="fg"><label>Representative Name</label><input className="drms-input" type="text" placeholder="Full name" /></div>
                <div className="fg"><label>Relationship to You</label><input className="drms-input" type="text" placeholder="e.g. Parent, Sibling, Spouse" /></div>
              </div>
              <div style={{ marginTop: 10 }}>
                <span className="ph-badge">📎 Upload authorization letter + specimen signatures + valid IDs (placeholder)</span>
              </div>
            </div>
          </div>

          <div className="info-box warn" style={{ marginBottom: 20 }}>
            <span className="info-icon">💳</span>
            <div className="info-text">Payment will be made at the <strong>Treasury Office</strong> after your request is verified. You will receive an email notification with the billing amount and payment instructions.</div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn-outline" onClick={() => router.push('/student/landing')}>← Cancel</button>
            <button className="btn-primary" onClick={() => router.push('/student/track')}>Submit Request →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
