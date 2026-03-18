"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../../components/drms/Topbar';

const documents = [
  { id: 'tor',  label: 'Transcript of Records (TOR)',  sub: '7 working days · College' },
  { id: 'hd',   label: 'Honorable Dismissal',           sub: '7 working days · College' },
  { id: 'coe',  label: 'Certificate of Enrollment',     sub: '7 working days · College + SHS' },
  { id: 'cog',  label: 'Certificate of Grades',         sub: '7 working days · College' },
  { id: 'ctc',  label: 'Certified True Copy',           sub: '7 working days · All levels' },
  { id: 'sf9',  label: 'SF9 — Report Card',             sub: '7 working days · SHS only' },
  { id: 'sf10', label: 'SF10 — Permanent Record',       sub: '7 working days · SHS only' },
  { id: 'cav',  label: 'CAV (via CHED)',                sub: '3 weeks processing time · All levels' },
];

export default function SubmitRequestPage() {
  const router = useRouter();
  const [formType, setFormType] = useState<'ro5' | 'ro4'>('ro5');
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set(['tor']));
  const [hasRep, setHasRep] = useState(false);

  const toggleDoc = (id: string) => {
    setCheckedDocs(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: 'New Request' }]} showNotifDot />
      <div className="page-body">
        <div className="step-bar">
          <div className="step active"><div className="step-circle">1</div><div className="step-label">Requester Info</div></div>
          <div className="step-line" />
          <div className="step"><div className="step-circle">2</div><div className="step-label">Documents</div></div>
          <div className="step-line" />
          <div className="step"><div className="step-circle">3</div><div className="step-label">Review &amp; Submit</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div>
            <div className="drms-card" style={{ padding: 24, marginBottom: 16 }}>
              <div className="section-title">Form Type</div>
              <div className="radio-group">
                <div className={`radio-card${formType === 'ro5' ? ' selected' : ''}`} onClick={() => setFormType('ro5')}>
                  <input type="radio" name="ftype" readOnly checked={formType === 'ro5'} />
                  <div><div className="radio-label">RO-0005 — Credential Request</div><div className="radio-sub">For currently enrolled students</div></div>
                </div>
                <div className={`radio-card${formType === 'ro4' ? ' selected' : ''}`} onClick={() => setFormType('ro4')}>
                  <input type="radio" name="ftype" readOnly checked={formType === 'ro4'} />
                  <div><div className="radio-label">RO-0004 — Transfer Credential</div><div className="radio-sub">For non-enrolled / alumni / transferees</div></div>
                </div>
              </div>
            </div>

            <div className="drms-card" style={{ padding: 24, marginBottom: 16 }}>
              <div className="section-title">Requester Information</div>
              <div className="form-grid">
                <div className="fg"><label>Student Number <span className="req-asterisk">*</span></label><input className="drms-input" type="text" placeholder="e.g. 2024110012" /></div>
                <div className="fg"><label>Academic Level <span className="req-asterisk">*</span></label><select className="drms-select"><option>College</option><option>Senior High School</option></select></div>
                <div className="fg"><label>First Name <span className="req-asterisk">*</span></label><input className="drms-input" type="text" /></div>
                <div className="fg"><label>Last Name <span className="req-asterisk">*</span></label><input className="drms-input" type="text" /></div>
                <div className="fg"><label>Program / Strand <span className="req-asterisk">*</span></label><input className="drms-input" type="text" placeholder="e.g. BSCS, STEM" /></div>
                <div className="fg"><label>Enrollment Status <span className="req-asterisk">*</span></label><select className="drms-select"><option>Enrolled</option><option>Not Enrolled</option></select></div>
                <div className="fg"><label>Academic Year</label><input className="drms-input" type="text" placeholder="e.g. 2025-2026" /></div>
                <div className="fg"><label>Term / Semester</label><input className="drms-input" type="text" placeholder="e.g. 2nd Semester" /></div>
                <div className="fg"><label>Contact Number</label><input className="drms-input" type="text" placeholder="09XXXXXXXXX" /></div>
                <div className="fg"><label>Email Address <span className="req-asterisk">*</span></label><input className="drms-input" type="email" placeholder="student@mcm.edu.ph" /></div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
                  <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--navy)', flexShrink: 0 }} checked={hasRep} onChange={e => setHasRep(e.target.checked)} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Filed by Authorized Representative</span>
                </label>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, opacity: hasRep ? 1 : 0.4, pointerEvents: hasRep ? 'auto' : 'none' }}>
                  <div className="fg"><label>Representative Name</label><input className="drms-input" type="text" placeholder="Full name" /></div>
                  <div className="fg"><label>Relationship</label><input className="drms-input" type="text" placeholder="e.g. Parent, Sibling" /></div>
                  <div className="fg"><label>Rep. Valid ID</label><input className="drms-input" type="text" placeholder="ID type" /></div>
                </div>
                <div style={{ marginTop: 8, opacity: hasRep ? 1 : 0.4 }}>
                  <span className="ph-badge">📎 Attach authorization letter + IDs (placeholder)</span>
                </div>
              </div>
            </div>

            <div className="drms-card" style={{ padding: 24, marginBottom: 16 }}>
              <div className="section-title">Documents Requested</div>
              <div className="check-group">
                {documents.map(doc => (
                  <div key={doc.id} className={`check-item${checkedDocs.has(doc.id) ? ' checked' : ''}`} onClick={() => toggleDoc(doc.id)}>
                    <input type="checkbox" checked={checkedDocs.has(doc.id)} onChange={() => {}} />
                    <div><div className="check-item-label">{doc.label}</div><div className="check-item-sub">{doc.sub}</div></div>
                  </div>
                ))}
              </div>
              <div className="fg" style={{ marginTop: 16 }}>
                <label>Purpose / Reason <span className="req-asterisk">*</span></label>
                <textarea className="drms-textarea" placeholder="State the purpose of this document request..." />
              </div>
            </div>
          </div>

          <div style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 28px)', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="drms-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Request Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Form Type</span><span style={{ fontWeight: 600 }}>{formType === 'ro5' ? 'RO-0005' : 'RO-0004'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Documents</span><span style={{ fontWeight: 600 }}>{checkedDocs.size} selected</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Processing Time</span><span style={{ fontWeight: 600 }}>7 working days</span></div>
                <div style={{ height: 1, background: 'rgba(0,0,0,.06)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Expected Claim</span><span style={{ fontWeight: 600 }}>~Mar 24, 2026</span></div>
              </div>
            </div>
            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <div className="info-text">Processing time is 7 working days from date of payment. CAV requests take 3 weeks via CHED.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn-primary" style={{ justifyContent: 'center', padding: 12 }} onClick={() => router.push('/staff/dashboard/new/step2')}>Continue to Documents →</button>
              <button className="btn-outline" style={{ justifyContent: 'center' }} onClick={() => router.push('/staff/dashboard')}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
