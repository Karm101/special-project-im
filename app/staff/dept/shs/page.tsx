"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';
import { API_BASE } from '@/lib/lib_api';
import { IcoGrad, IcoBook, IcoInfo } from '@/app/components/drms/Icons';

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

function StatCard({ num, label, color, bg, icon, loading }: {
  num: string | number; label: string; color: string; bg: string; icon: React.ReactNode; loading: boolean;
}) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 18, border: '1px solid var(--border-col)', borderBottom: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color }}>{loading ? '—' : num}</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>{label}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case 'Pending':        return { cls: 'b-sub',  label: 'Submitted' };
    case 'For Validation': return { cls: 'b-end',  label: 'For Validation' };
    case 'For Payment':    return { cls: 'b-rev',  label: 'For Payment' };
    case 'Paid':           return { cls: 'b-apr',  label: 'Paid' };
    case 'Processing':     return { cls: 'b-apr',  label: 'Processing' };
    case 'For Release':    return { cls: 'b-rel',  label: 'For Release' };
    case 'Claimed':        return { cls: 'b-done', label: 'Claimed' };
    case 'Rejected':       return { cls: 'b-rej',  label: 'Rejected' };
    default:               return { cls: 'b-sub',  label: status };
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
        const res = await fetch(`${API_BASE}/requests/?academic_level=SHS&page_size=500`);
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
    pending: requests.filter(r => ['Pending','For Validation'].includes(r.current_status)).length,
    claimed: requests.filter(r => r.current_status === 'Claimed').length,
  }), [requests]);

  const TABS = [
    { label: 'All',        filter: 'all',      count: requests.length },
    { label: 'SF9',        filter: 'sf9',      count: stats.sf9       },
    { label: 'SF10',       filter: 'sf10',     count: stats.sf10      },
    { label: 'Pending',    filter: 'pending',    count: requests.filter(r => ['Pending','For Validation'].includes(r.current_status)).length },
    { label: 'Processing', filter: 'processing', count: requests.filter(r => ['For Payment','Paid','Processing'].includes(r.current_status)).length },
    { label: 'Claimed',    filter: 'claimed',    count: requests.filter(r => r.current_status === 'Claimed').length },
  ];

  const visible = useMemo(() => {
    let rows = [...requests];
    if (activeTab === 'sf9' || activeTab === 'sf10') rows = rows; // refine when doc names available
    else if (activeTab === 'pending')    rows = rows.filter(r => ['Pending','For Validation'].includes(r.current_status));
    else if (activeTab === 'processing') rows = rows.filter(r => ['For Payment','Paid','Processing'].includes(r.current_status));
    else if (activeTab === 'claimed')    rows = rows.filter(r => r.current_status === 'Claimed');

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
          <button className="btn-outline" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => router.push('/staff/dept/college')}><IcoGrad /> College</button>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}><IcoBook /> Senior High School</button>
        </div>

        {/* Stat cards */}
        <div className="stat-grid stat-grid-4">
          <StatCard loading={loading} num={stats.sf9}      label="SF9 Requests"        color="#cddaec" bg="rgba(17,75,159,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>} />
          <StatCard loading={loading} num={stats.sf10}     label="SF10 Requests"       color="#6D4DF5" bg="rgba(109,77,245,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>} />
          <StatCard loading={loading} num={stats.pending}  label="Pending Verification" color="#FFA323" bg="rgba(255,163,35,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard loading={loading} num={stats.claimed} label="Claimed"  color="#198754" bg="rgba(25,135,84,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
        </div>

        <div className="info-box" style={{ marginBottom: 16 }}>
          <span className="info-icon"><IcoInfo /></span>
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
              <Search size={13} color="var(--mid-gray)" />
            </div>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mid-gray)' }}>Loading...</div>}

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
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--mid-gray)', fontSize: 13 }}>No requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
