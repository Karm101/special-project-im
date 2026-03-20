"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';

type ApiRequest = {
  request_id: number;
  requester_name: string;
  form_type: string;
  academic_level: string;
  submission_mode: string;
  date_submitted: string;
  expected_claim_date: string | null;
  assigned_staff_name: string | null;
  current_status: string;
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: string) {
  switch (status) {
    case 'Pending':           return { cls: 'b-sub',  label: 'Submitted' };
    case 'Verifying':         return { cls: 'b-end',  label: 'For Endorsement' };
    case 'For Payment':       return { cls: 'b-rev',  label: 'For Review' };
    case 'Processing':        return { cls: 'b-apr',  label: 'For Approval' };
    case 'Ready for Release': return { cls: 'b-rel',  label: 'For Release' };
    case 'Released':          return { cls: 'b-done', label: 'Completed' };
    case 'Rejected':          return { cls: 'b-rej',  label: 'Rejected' };
    default:                  return { cls: 'b-sub',  label: status };
  }
}

export default function ShsDeptPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [requests, setRequests]   = useState<ApiRequest[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:8000/api/requests/?academic_level=SHS');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRequests(data.results ?? data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(() => ({
    sf9:      requests.filter(r => r.form_type === 'RO-0005').length,
    sf10:     requests.filter(r => r.form_type === 'RO-0005').length,
    pending:  requests.filter(r => ['Pending','Verifying','For Payment'].includes(r.current_status)).length,
    released: requests.filter(r => r.current_status === 'Released').length,
  }), [requests]);

  const TABS = [
    { label: 'All',        filter: 'all',      count: requests.length },
    { label: 'SF9',        filter: 'sf9',      count: stats.sf9       },
    { label: 'SF10',       filter: 'sf10',     count: stats.sf10      },
    { label: 'Pending',    filter: 'pending',  count: stats.pending   },
    { label: 'Processing', filter: 'processing', count: requests.filter(r => ['Processing','Ready for Release'].includes(r.current_status)).length },
    { label: 'Released',   filter: 'released', count: stats.released  },
  ];

  const visible = useMemo(() => {
    let rows = [...requests];
    if (activeTab === 'pending')     rows = rows.filter(r => ['Pending','Verifying','For Payment'].includes(r.current_status));
    else if (activeTab === 'processing') rows = rows.filter(r => ['Processing','Ready for Release'].includes(r.current_status));
    else if (activeTab === 'released')   rows = rows.filter(r => r.current_status === 'Released');
    // sf9/sf10 tabs show all for now — refine when document names available in list endpoint
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.requester_name.toLowerCase().includes(q) ||
        `REQ-${String(r.request_id).padStart(3,'0')}`.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [requests, activeTab, search]);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests' }]} showNotifDot />
      <div className="page-body">
        {/* Dept toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button className="btn-outline" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => router.push('/staff/dept/college')}>🎓 College</button>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>📚 Senior High School</button>
        </div>

        {/* Stat cards */}
        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy">{loading ? '—' : stats.sf9}</div><div className="stat-label">SF9 Requests</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>📋</div></div></div>
          <div className="stat-card c-blue"><div className="stat-top"><div><div className="stat-num c-blue">{loading ? '—' : stats.sf10}</div><div className="stat-label">SF10 Requests</div></div><div className="stat-icon" style={{ background: '#EBF5FB' }}>📃</div></div></div>
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">{loading ? '—' : stats.pending}</div><div className="stat-label">Pending Verification</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏳</div></div></div>
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">{loading ? '—' : stats.released}</div><div className="stat-label">Released This Month</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
        </div>

        <div className="info-box" style={{ marginBottom: 16 }}>
          <span className="info-icon">ℹ️</span>
          <div className="info-text">Showing <strong>SHS-level</strong> requests: SF9 (Report Card) and SF10 (Permanent Record).</div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.map(t => (
            <div key={t.filter} className={`tab${activeTab === t.filter ? ' active' : ''}`} onClick={() => setActiveTab(t.filter)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-right">
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search SHS requests..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#B1B1B1' }}>Loading...</div>}

        {!loading && (
          <div className="table-wrap">
            <table className="drms-table">
              <thead>
                <tr>
                  <th><input type="checkbox" className="cb" /></th>
                  <th>Request ID</th><th>Requester</th><th>Form Type</th>
                  <th>Date Submitted</th><th>Expected Claim</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const badge = statusBadge(r.current_status);
                  const reqId = `REQ-${String(r.request_id).padStart(3, '0')}`;
                  return (
                    <tr key={r.request_id} onClick={() => router.push(`/staff/request/${reqId}`)}>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}><input type="checkbox" className="cb" /></td>
                      <td><span className="req-id">#{reqId}</span></td>
                      <td>{r.requester_name}</td>
                      <td>{r.form_type}</td>
                      <td style={{ color: 'var(--mid-gray)' }}>{formatDate(r.date_submitted)}</td>
                      <td style={{ color: 'var(--mid-gray)' }}>{formatDate(r.expected_claim_date)}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${reqId}`)}>View</button>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>No requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
