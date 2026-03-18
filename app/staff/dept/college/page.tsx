"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';

const rows = [
  { id: '#REQ-001', requester: 'Gillo, Ian P.',          doc: 'Certificate of Enrollment',     sub: 'Feb 19, 2026', claim: 'Mar 03, 2026', badgeCls: 'b-done', label: 'Completed'       },
  { id: '#REQ-002', requester: 'Balicaco, Michaelniño',  doc: 'Transfer of Credentials (TOR)', sub: 'Feb 19, 2026', claim: 'Mar 24, 2026', badgeCls: 'b-done', label: 'Completed'       },
  { id: '#REQ-004', requester: 'Santos, Jose Rizal',     doc: 'Transcript of Records',         sub: 'Mar 01, 2026', claim: 'Mar 10, 2026', badgeCls: 'b-rev',  label: 'For Review'      },
  { id: '#REQ-005', requester: 'Macaraeg, Ana Reyes',    doc: 'Honorable Dismissal',           sub: 'Mar 03, 2026', claim: 'Mar 12, 2026', badgeCls: 'b-end',  label: 'For Endorsement' },
  { id: '#REQ-007', requester: 'Buenaventura, Liza Tan', doc: 'Diploma',                       sub: 'Mar 07, 2026', claim: 'Mar 16, 2026', badgeCls: 'b-rel',  label: 'For Release'     },
];

const tabs = [
  { label: 'All',                count: 11 },
  { label: 'TOR',                count: 8  },
  { label: 'Honorable Dismissal', count: 3  },
  { label: 'Pending',            count: 4  },
  { label: 'Processing',         count: 3  },
  { label: 'Released',           count: 4  },
];

export default function CollegeDeptPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const visible = search.trim()
    ? rows.filter(r => r.requester.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests' }]} showNotifDot />
      <div className="page-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>🎓 College</button>
          <button className="btn-outline" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => router.push('/staff/dept/shs')}>📚 Senior High School</button>
        </div>

        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy">8</div><div className="stat-label">TOR Requests</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>📄</div></div></div>
          <div className="stat-card c-red"><div className="stat-top"><div><div className="stat-num c-red">3</div><div className="stat-label">Honorable Dismissal</div></div><div className="stat-icon" style={{ background: '#FEEAEA' }}>📜</div></div></div>
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">4</div><div className="stat-label">Pending Verification</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏳</div></div></div>
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">5</div><div className="stat-label">Released This Month</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
        </div>

        <div className="info-box" style={{ marginBottom: 16 }}>
          <span className="info-icon">ℹ️</span>
          <div className="info-text">This view shows only College-level requests: <strong>Transcript of Records</strong> and <strong>Honorable Dismissal</strong>. Use the SHS tab for SF9 and SF10 requests.</div>
        </div>

        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {tabs.map((t, i) => (
            <div key={t.label} className={`tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        <div className="toolbar">
          <div className="toolbar-right">
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="drms-table">
            <thead>
              <tr>
                <th><input type="checkbox" className="cb" /></th>
                <th>Request ID</th><th>Requester Name</th><th>Document Type</th>
                <th>Date Submitted</th><th>Expected Claim</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id} onClick={() => router.push(`/staff/request/${r.id.replace('#', '')}`)}>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}><input type="checkbox" className="cb" /></td>
                  <td><span className="req-id">{r.id}</span></td>
                  <td>{r.requester}</td>
                  <td>{r.doc}</td>
                  <td style={{ color: 'var(--mid-gray)' }}>{r.sub}</td>
                  <td style={{ color: 'var(--mid-gray)' }}>{r.claim}</td>
                  <td><span className={`badge ${r.badgeCls}`}>{r.label}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${r.id.replace('#', '')}`)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
