"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const docs = [
  { id: 'sf9',  label: 'SF9 — Report Card',        sub: '7 working days · ₱50.00 per copy' },
  { id: 'sf10', label: 'SF10 — Permanent Record',   sub: '7 working days · ₱50.00 per copy' },
  { id: 'coe',  label: 'Certificate of Enrollment', sub: '7 working days · ₱75.00 per copy' },
  { id: 'ctc',  label: 'Certified True Copy',        sub: '7 working days · ₱50.00 per copy' },
];

export default function StudentSubmitPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hasRep, setHasRep] = useState(false);

  const toggleDoc = (id: string) =>
    setChecked(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="public-page drms-root">
      {/* Public topbar */}
      <div className="pub-topbar">
        <div className="pub-logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/student/landing')}>M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Online Document Request</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', background: 'transparent' }} onClick={() => router.push('/student/landing')}>Cancel</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <h2 style={{ color: '#001C43', fontFamily: "'Montserrat', sans-serif", marginBottom: 24 }}>New Document Request</h2>

          {/* Form container */}
          <div className="drms-card" style={{ padding: 24, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 14 }}>1. Student Information</h4>
            <div className="form-grid">
              <div className="fg">
                <label>First Name</label>
                <input className="drms-input" type="text" placeholder="e.g. Juan" />
              </div>
              <div className="fg">
                <label>Last Name</label>
                <input className="drms-input" type="text" placeholder="e.g. Dela Cruz" />
              </div>
              <div className="fg">
                <label>Student Number</label>
                <input className="drms-input" type="text" placeholder="e.g. 2021-100234" />
              </div>
              <div className="fg">
                <label>Program / Strand</label>
                <input className="drms-input" type="text" placeholder="e.g. BSCS or STEM" />
              </div>
              <div className="fg">
                <label>Email Address</label>
                <input className="drms-input" type="email" placeholder="Student or personal email" />
              </div>
              <div className="fg">
                <label>Contact Number</label>
                <input className="drms-input" type="text" placeholder="09XX XXX XXXX" />
              </div>
            </div>
            
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Purpose of Request</label>
              <textarea className="drms-input" style={{ height: 60, resize: 'vertical' }} placeholder="e.g. For employment, scholarship, transfer..." />
            </div>
          </div>

          <div className="drms-card" style={{ padding: 24, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 14 }}>2. Select Documents</h4>
            <div className="doc-grid">
              {docs.map(d => (
                <div key={d.id} className={`doc-card${checked.has(d.id) ? ' selected' : ''}`} onClick={() => toggleDoc(d.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="doc-title">{d.label}</div>
                      <div className="doc-sub">{d.sub}</div>
                    </div>
                    <div className={`cb-custom${checked.has(d.id) ? ' checked' : ''}`}>{checked.has(d.id) && '✓'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="drms-card" style={{ padding: 24, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 14 }}>3. Claiming Options</h4>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="claim" defaultChecked style={{ accentColor: 'var(--blue)' }} /> I will claim it personally
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="claim" onChange={e => setHasRep(e.target.checked)} style={{ accentColor: 'var(--blue)' }} /> An authorized representative will claim it
              </label>
            </div>

            <div style={{ opacity: hasRep ? 1 : 0.4, pointerEvents: hasRep ? 'auto' : 'none' }}>
              <div className="form-grid">
                <div className="fg">
                  <label>Representative Name</label>
                  <input className="drms-input" type="text" placeholder="Full name" />
                </div>
                <div className="fg">
                  <label>Relationship to You</label>
                  <input className="drms-input" type="text" placeholder="e.g. Parent, Sibling, Spouse" />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <span className="ph-badge">📎 Upload authorization letter + specimen signatures + valid IDs (placeholder)</span>
              </div>
            </div>
          </div>

          {/* Payment notice */}
          <div className="info-box warn" style={{ marginBottom: 20 }}>
            <span className="info-icon">💳</span>
            <div className="info-text">
              Payment will be made at the <strong>Treasury Office</strong> after your request is verified. You will receive an email notification with the billing amount and payment instructions.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn-outline" onClick={() => router.push('/student/landing')}>Cancel</button>
            <button className="btn-primary" onClick={() => router.push('/student/track')}>Submit Request →</button>
          </div>
        </div>
      </div>
    </div>
  );
}