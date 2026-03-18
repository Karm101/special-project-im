"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';

const rows = [
  { id: '#REQ-003', requester: 'Dela Cruz, Maria',   doc: 'SF9 + SF10', sub: 'Feb 20, 2026', claim: 'Feb 27, 2026', badgeCls: 'b-apr', label: 'For Approval'    },
  { id: '#REQ-008', requester: 'Reyes, Carlo Miguel', doc: 'SF9',        sub: 'Mar 06, 2026', claim: 'Mar 15, 2026', badgeCls: 'b-sub', label: 'Submitted'       },
  { id: '#REQ-010', requester: 'Fernandez, Althea',  doc: 'SF10',        sub: 'Mar 09, 2026', claim: 'Mar 18, 2026', badgeCls: 'b-end', label: 'For Endorsement' },
];

const tabs = [
  { label: 'All',        count: 6 },
  { label: 'SF9',        count: 3 },
  { label: 'SF10',       count: 3 },
  { label: 'SF9 + SF10', count: 2 },
  { label: 'Pending',    count: 3 },
  { label: 'Released',   count: 0 },
];

export default function ShsDeptPage() {
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
          <button className="btn-outline" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => router.push('/staff/dept/college')}>🎓 College</button>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>📚 Senior High School</button>
        </div>

        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy">6</div><div className="stat-label">SF9 Requests</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>📋</div></div></div>
          <div className="stat-card c-blue"><div className="stat-top"><div><div className="stat-num c-blue">6</div><div className="stat-label">SF10 Requests</div></div><div className="stat-icon" style={{ background: '#EBF5FB' }}>📃</div></div></div>
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">2</div><div className="stat-label">Pending Verification</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏳</div></div></div>
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">3</div><div className="stat-label">Released This Month</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
        </div>

        <div className="info-box" style={{ marginBottom: 16 }}>
          <span className="info-icon">ℹ️</span>
          <div className="info-text">This view shows only SHS-level requests: <strong>SF9 (Report Card)</strong> and <strong>SF10 (Permanent Record)</strong>. Use the College tab for TOR and HD requests.</div>
        </div>

        <div className="tab-bar">
          {tabs.map((t, i) => (
            <div key={t.label} className={`tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        <div className="toolbar">
          <div className="toolbar-right">
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search SHS requests..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="drms-table">
            <thead>
              <tr>
                <th><input type="checkbox" className="cb" /></th>
                <th>Request ID</th><th>Requester</th><th>Documents</th>
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
