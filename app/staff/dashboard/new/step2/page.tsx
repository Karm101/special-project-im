"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../../../components/drms/Topbar';

interface DocItem { id: string; label: string; sub: string; price: number; hasCopies: boolean; }

const docs: DocItem[] = [
  { id: 'tor',  label: 'Transcript of Records (TOR)',   sub: '7 working days · College',       price: 150, hasCopies: true  },
  { id: 'hd',   label: 'Honorable Dismissal',            sub: '7 working days · College',       price: 100, hasCopies: true  },
  { id: 'coe',  label: 'Certificate of Enrollment',      sub: '7 working days · All levels',    price: 75,  hasCopies: true  },
  { id: 'cog',  label: 'Certificate of Grades',          sub: '7 working days · College',       price: 75,  hasCopies: true  },
  { id: 'sf9',  label: 'SF9 — Report Card',              sub: '7 working days · SHS only',      price: 50,  hasCopies: true  },
  { id: 'sf10', label: 'SF10 — Permanent Record',        sub: '7 working days · SHS only',      price: 50,  hasCopies: true  },
  { id: 'cav',  label: 'CAV (via CHED)',                 sub: '3 weeks processing · All levels', price: 0,   hasCopies: false },
  { id: 'ctc',  label: 'Certified True Copy',            sub: '7 working days · All levels',    price: 50,  hasCopies: true  },
];

export default function SubmitRequestStep2Page() {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set(['tor']));
  const [copies, setCopies] = useState<Record<string, number>>({ tor: 1 });

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else { next.add(id); setCopies(c => ({ ...c, [id]: c[id] ?? 1 })); }
      return next;
    });
  };

  const selectedDocs = docs.filter(d => checked.has(d.id));
  const total = selectedDocs.reduce((sum, d) => sum + (d.hasCopies ? (copies[d.id] ?? 1) * d.price : 0), 0);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: 'New Request — Step 2' }]} showNotifDot={false} />
      <div className="page-body">
        <div className="step-bar">
          <div className="step done"><div className="step-circle">✓</div><div className="step-label">Requester Info</div></div>
          <div className="step-line done" />
          <div className="step active"><div className="step-circle">2</div><div className="step-label">Select Documents</div></div>
          <div className="step-line" />
          <div className="step"><div className="step-circle">3</div><div className="step-label">Review &amp; Submit</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
          <div className="drms-card" style={{ padding: 20 }}>
            <div className="section-title">Documents to Request</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(doc => (
                <div key={doc.id} className={`check-item${checked.has(doc.id) ? ' checked' : ''}`} onClick={() => toggle(doc.id)}>
                  <input type="checkbox" checked={checked.has(doc.id)} onChange={() => {}} style={{ width: 15, height: 15, accentColor: 'var(--navy)', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                  <div style={{ flex: 1 }}>
                    <div className="check-item-label">{doc.label}</div>
                    <div className="check-item-sub">{doc.sub}{doc.price > 0 ? ` · ₱${doc.price}.00 per copy` : ''}</div>
                  </div>
                  {doc.hasCopies && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} onClick={e => e.stopPropagation()}>
                      <input type="number" value={copies[doc.id] ?? 1} min={1} max={10}
                        style={{ width: 48, padding: '4px 6px', fontSize: 12, border: '1px solid var(--mid-gray)', borderRadius: 6, fontFamily: 'var(--drms-font)' }}
                        onChange={e => setCopies(c => ({ ...c, [doc.id]: Number(e.target.value) }))}
                        disabled={!checked.has(doc.id)} />
                      <span style={{ color: 'var(--mid-gray)' }}>copies</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="fg" style={{ marginTop: 16 }}>
              <label>Purpose / Reason for Request <span className="req-asterisk">*</span></label>
              <textarea className="drms-textarea" placeholder="State the specific purpose of this request..." />
            </div>
          </div>

          <div style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 24px)', display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
            <div className="drms-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Selected Documents</div>
              <div style={{ fontSize: 12, color: 'var(--navy)' }}>
                {selectedDocs.length === 0 ? (
                  <div style={{ color: 'var(--mid-gray)', fontStyle: 'italic' }}>No documents selected</div>
                ) : (
                  selectedDocs.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                      <span>{d.label} × {copies[d.id] ?? 1}</span>
                      <span style={{ fontWeight: 700 }}>{d.price > 0 ? `₱${(copies[d.id] ?? 1) * d.price}.00` : 'TBD'}</span>
                    </div>
                  ))
                )}
                {selectedDocs.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700 }}>
                    <span>Estimated Total</span><span>₱{total}.00</span>
                  </div>
                )}
              </div>
            </div>
            <div className="info-box warn">
              <span className="info-icon">⚠️</span>
              <div className="info-text" style={{ fontSize: 11 }}>Payment is settled at the Treasury Office after RO verification. Official receipt required.</div>
            </div>
            <button className="btn-primary" style={{ justifyContent: 'center', padding: 11 }} onClick={() => router.push('/staff/dashboard/new/step3')}>Continue to Review →</button>
            <button className="btn-outline" style={{ justifyContent: 'center' }} onClick={() => router.push('/staff/dashboard/new')}>← Back</button>
          </div>
        </div>
      </div>
    </>
  );
}
