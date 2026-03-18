"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { FilterPanel } from '../../components/drms/FilterPanel';

type ClaimStatus = 'claimed' | 'awaiting' | 'expiring' | 'expired';
type ClaimRow = {
  cs: string; reqId: string; requester: string; docs: string;
  issued: string; expiry: string; daysLeft: string; daysColor: string;
  status: ClaimStatus; badgeCls: string; badgeLabel: string; action: string;
  actionCls: string; rowBg?: string; expiryColor?: string;
};

const ALL_ROWS: ClaimRow[] = [
  { cs: 'CS-001', reqId: '#REQ-001', requester: 'Gillo, Ian P.',       docs: 'CoE',    issued: 'Feb 22', expiry: 'May 23',  daysLeft: '70 days', daysColor: '#198754', status: 'claimed',  badgeCls: 'b-done', badgeLabel: 'Claimed',       action: 'View',   actionCls: 'btn-outline btn-sm', rowBg: undefined,                expiryColor: '#B1B1B1' },
  { cs: 'CS-007', reqId: '#REQ-007', requester: 'Buenaventura, Liza',  docs: 'Diploma', issued: 'Mar 10', expiry: 'Jun 08', daysLeft: '86 days', daysColor: '#198754', status: 'awaiting', badgeCls: 'b-rel',  badgeLabel: 'Awaiting Claim', action: 'Remind', actionCls: 'btn-outline btn-sm', rowBg: undefined,                expiryColor: '#B1B1B1' },
  { cs: 'CS-008', reqId: '#REQ-008', requester: 'Reyes, Carlo',         docs: 'SF9',    issued: 'Dec 15', expiry: 'Mar 15', daysLeft: '1 day',   daysColor: '#FFA323', status: 'expiring', badgeCls: 'b-rev',  badgeLabel: 'Expiring Soon',  action: 'Urgent', actionCls: 'btn-red btn-sm',     rowBg: '#FFFBF0',              expiryColor: '#FFA323' },
  { cs: 'CS-005', reqId: '#REQ-005', requester: 'Macaraeg, Ana',        docs: 'HD',     issued: 'Dec 01', expiry: 'Mar 01', daysLeft: 'Expired', daysColor: '#E50019', status: 'expired',  badgeCls: 'b-rej',  badgeLabel: 'Expired',        action: 'Shred',  actionCls: 'btn-outline btn-sm', rowBg: 'rgba(229,0,25,.03)', expiryColor: '#E50019' },
];

const TABS = [
  { label: 'All',            filter: 'all',      count: 22 },
  { label: 'Awaiting Claim', filter: 'awaiting', count: 5  },
  { label: 'Expiring Soon',  filter: 'expiring', count: 2  },
  { label: 'Expired',        filter: 'expired',  count: 1  },
  { label: 'Claimed',        filter: 'claimed',  count: 14 },
];

export default function ClaimSlipsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selStatus, setSelStatus] = useState<Set<string>>(new Set());

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  const visibleRows = useMemo(() => {
    let rows = activeTab === 'all' ? ALL_ROWS : ALL_ROWS.filter(r => r.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.cs.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q) || r.reqId.toLowerCase().includes(q));
    }
    return rows;
  }, [activeTab, search]);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Claim Slip Monitor' }]} showNotifDot />
      <div className="page-body">
        <div className="info-box warn" style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
          <div className="info-text">Per RO policy, documents unclaimed after <strong>90 days</strong> will be shredded and payment forfeited.</div>
        </div>

        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">14</div><div className="stat-label">Claimed</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy">5</div><div className="stat-label">Awaiting Claim</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>🎫</div></div></div>
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">2</div><div className="stat-label">Expiring in 7 days</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏰</div></div></div>
          <div className="stat-card c-red"><div className="stat-top"><div><div className="stat-num c-red">1</div><div className="stat-label">Expired</div></div><div className="stat-icon" style={{ background: '#FEEAEA' }}>🗑️</div></div></div>
        </div>

        <div className="tab-bar">
          {TABS.map(t => (
            <div key={t.filter} className={`tab${activeTab === t.filter ? ' active' : ''}`} onClick={() => setActiveTab(t.filter)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        <div className="toolbar">
          <div className="toolbar-right">
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" onClick={() => setFilterOpen(o => !o)} title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={() => {}} onReset={() => setSelStatus(new Set())}
                selectedStatus={selStatus} onToggleStatus={s => toggleChip(selStatus, s, setSelStatus)}
                statusOptions={['Awaiting Claim', 'Expiring Soon', 'Expired', 'Claimed']}
                showFormType={false} showMode={false} showStaff={false}
              />
            </div>
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search by name, request ID, or claim slip..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="drms-table">
            <thead>
              <tr><th>Claim Slip</th><th>Request ID</th><th>Requester</th><th>Documents</th><th>Issued</th><th>Expiry</th><th>Days Left</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {visibleRows.map(r => (
                <tr key={r.cs} style={{ background: r.rowBg }} onClick={() => router.push(`/staff/request/${r.reqId.replace('#', '')}`)}>
                  <td><span className="req-id">{r.cs}</span></td>
                  <td>{r.reqId}</td>
                  <td>{r.requester}</td>
                  <td>{r.docs}</td>
                  <td style={{ color: '#B1B1B1' }}>{r.issued}</td>
                  <td style={{ color: r.expiryColor, fontWeight: 700 }}>{r.expiry}</td>
                  <td style={{ color: r.daysColor, fontWeight: 700 }}>{r.daysLeft}</td>
                  <td><span className={`badge ${r.badgeCls}`}>{r.badgeLabel}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className={r.actionCls} style={r.badgeLabel === 'Expired' ? { color: '#E50019', borderColor: '#E50019' } : {}}>{r.action}</button>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>No records match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
