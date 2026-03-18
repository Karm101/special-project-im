"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../components/drms/Topbar';

const requests = [
  { id: '#REQ-002', name: 'Balicaco, Michaelniño', date: 'Submitted Feb 19, 2026 · TOR + HD', cleared: 3, total: 11 },
  { id: '#REQ-009', name: 'Cruz, Ramon Jr.',        date: 'Submitted Mar 08, 2026 · Full TC',  cleared: 0, total: 11 },
  { id: '#REQ-011', name: 'Lim, Patricia Anne',     date: 'Submitted Mar 10, 2026 · TOR only', cleared: 0, total: 9  },
];

type ClearStatus = 'cleared' | 'pending' | 'na';
interface Office { n: number; name: string; by: string; date: string; status: ClearStatus; }

const offices: Office[] = [
  { n: 1,  name: 'Academic Coordinator (SHS)',                by: 'N/A',             date: '—',            status: 'na'      },
  { n: 2,  name: "Principal / Dean's Office",                 by: 'N/A',             date: '—',            status: 'na'      },
  { n: 3,  name: 'Office of Student Services',                by: 'Melody Abanilla', date: 'Feb 19, 2026', status: 'cleared' },
  { n: 4,  name: 'Center for Student Activities & Discipline', by: 'Melody Abanilla', date: 'Feb 19, 2026', status: 'cleared' },
  { n: 5,  name: 'Center for Guidance and Counseling',        by: 'N/A',             date: '—',            status: 'na'      },
  { n: 6,  name: 'Laboratory Management Office',              by: 'N/A',             date: '—',            status: 'na'      },
  { n: 7,  name: 'Center for Learning & Information Resources', by: 'N/A',           date: '—',            status: 'na'      },
  { n: 8,  name: 'Center for Health Services',                by: 'N/A',             date: '—',            status: 'na'      },
  { n: 9,  name: 'Bookstore',                                 by: '—',               date: '—',            status: 'pending' },
  { n: 10, name: 'Treasury Office',                           by: '—',               date: '—',            status: 'pending' },
  { n: 11, name: "Registrar's Office",                        by: '—',               date: '—',            status: 'pending' },
];

const statusBadge = (s: ClearStatus) => {
  if (s === 'cleared') return <span className="badge badge-cleared" style={{ fontSize: 12 }}>Cleared</span>;
  if (s === 'na')      return <span className="badge badge-na"      style={{ fontSize: 12 }}>Not Applicable</span>;
  return                      <span className="badge badge-pending" style={{ fontSize: 12 }}>Pending</span>;
};

export default function ClearancePage() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Clearance Tracking' }]} showNotifDot />
      <div className="page-body">
        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy">3</div><div className="stat-label">Active TC Requests</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>📋</div></div></div>
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">8</div><div className="stat-label">Pending Clearances</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏳</div></div></div>
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">14</div><div className="stat-label">Cleared This Month</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
          <div className="stat-card c-red"><div className="stat-top"><div><div className="stat-num c-red">1</div><div className="stat-label">Overdue Clearances</div></div><div className="stat-icon" style={{ background: '#FEEAEA' }}>🚨</div></div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
          <div className="drms-card">
            <div className="drms-card-header"><span className="drms-card-title">TC Requests (RO-0004)</span></div>
            <div style={{ padding: '8px 0' }}>
              {requests.map((r, i) => (
                <div key={r.id} onClick={() => setSelected(i)} style={{ padding: '12px 16px', borderBottom: i < requests.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: selected === i ? '#F0F4FF' : 'white', borderLeft: selected === i ? '3px solid var(--navy)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.12s' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{r.id} — {r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 3 }}>{r.date}</div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${r.cleared === 0 ? 'badge-pending' : 'badge-verifying'}`} style={{ fontSize: 12 }}>
                      {r.cleared} of {r.total} Cleared
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="drms-card">
            <div className="drms-card-header">
              <span className="drms-card-title">Clearance Status — {requests[selected].id} {requests[selected].name}</span>
              <span className={`badge ${requests[selected].cleared === 0 ? 'badge-pending' : 'badge-verifying'}`} style={{ fontSize: 12 }}>
                {requests[selected].cleared} / {requests[selected].total} Offices Cleared
              </span>
            </div>
            <div style={{ padding: '14px 20px 0' }}>
              <div style={{ background: 'var(--light-gray)', height: 8, borderRadius: 4 }}>
                <div style={{ background: 'var(--blue)', height: '100%', width: `${Math.round(requests[selected].cleared / requests[selected].total * 100)}%`, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
                {requests[selected].cleared} of {requests[selected].total} offices have cleared this request
              </div>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {offices.map(o => (
                <div key={o.n} className="cl-row">
                  <div className="cl-num">{o.n}</div>
                  <div style={{ flex: 1 }}>
                    <div className="cl-office">{o.name}</div>
                    {o.by !== 'N/A' && o.by !== '—' && <div className="cl-by">By: {o.by} · {o.date}</div>}
                  </div>
                  <div style={{ minWidth: 120, textAlign: 'right' }}>{statusBadge(o.status)}</div>
                  {o.status === 'pending' && (
                    <button className="btn-outline btn-sm" style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>Mark Cleared</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '0 20px 16px' }}>
              <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${requests[selected].id.replace('#', '')}`)}>
                View Full Request →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
