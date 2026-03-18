"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { FilterPanel } from '../../components/drms/FilterPanel';

type PayRow = {
  id: string; requester: string; docs: string; amount: string;
  billed: string; status: 'paid' | 'pending' | 'overdue'; badgeCls: string;
  label: string; or: string; action: string; rowBg?: string;
};

const ALL_ROWS: PayRow[] = [
  { id: '#REQ-003', requester: 'Dela Cruz, Maria',       docs: 'SF9 + SF10', amount: '₱100', billed: 'Feb 20', status: 'paid',    badgeCls: 'b-done', label: 'Paid',    or: 'OR-2026-00453', action: 'View',      rowBg: undefined },
  { id: '#REQ-004', requester: 'Santos, Jose Rizal',     docs: 'TOR',        amount: '₱150', billed: 'Mar 01', status: 'pending', badgeCls: 'b-rev',  label: 'Pending', or: '—',             action: 'Follow Up', rowBg: undefined },
  { id: '#REQ-005', requester: 'Macaraeg, Ana Reyes',    docs: 'HD',         amount: '₱100', billed: 'Mar 03', status: 'overdue', badgeCls: 'b-ov',   label: 'Overdue', or: '—',             action: 'Remind',    rowBg: 'rgba(229,0,25,.03)' },
  { id: '#REQ-007', requester: 'Buenaventura, Liza Tan', docs: 'Diploma',    amount: '₱200', billed: 'Mar 07', status: 'paid',    badgeCls: 'b-done', label: 'Paid',    or: 'OR-2026-00461', action: 'View',      rowBg: undefined },
];

const TABS = [
  { label: 'All',     filter: 'all',     count: 25 },
  { label: 'Pending', filter: 'pending', count: 5  },
  { label: 'Overdue', filter: 'overdue', count: 2  },
  { label: 'Paid',    filter: 'paid',    count: 18 },
];

export default function PaymentMonitorPage() {
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
      rows = rows.filter(r => r.id.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q));
    }
    return rows;
  }, [activeTab, search]);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Payment Monitor' }]} showNotifDot />
      <div className="page-body">
        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">5</div><div className="stat-label">Awaiting Payment</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏳</div></div></div>
          <div className="stat-card c-red"><div className="stat-top"><div><div className="stat-num c-red">2</div><div className="stat-label">Overdue (&gt;3 days)</div></div><div className="stat-icon" style={{ background: '#FEEAEA' }}>🚨</div></div></div>
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">18</div><div className="stat-label">Paid This Month</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy" style={{ fontSize: 22 }}>₱3,850</div><div className="stat-label">Collected (Mar)</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>📊</div></div></div>
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
                statusOptions={['Pending', 'Paid', 'Overdue']}
                showFormType={false} showMode={false} showStaff={false}
              />
            </div>
            <div className="search-box" style={{ minWidth: 340 }}>
              <input type="text" placeholder="Search by requester or request ID..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="drms-table">
            <thead>
              <tr>
                <th>Request ID</th><th>Requester</th><th>Document(s)</th><th>Amount</th>
                <th>Date Billed</th><th>Payment Status</th><th>Official Receipt</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(r => (
                <tr key={r.id} style={{ background: r.rowBg }} onClick={() => router.push(`/staff/request/${r.id.replace('#', '')}`)}>
                  <td><span className="req-id">{r.id}</span></td>
                  <td>{r.requester}</td>
                  <td>{r.docs}</td>
                  <td style={{ fontWeight: 700 }}>{r.amount}</td>
                  <td style={{ color: '#B1B1B1' }}>{r.billed}</td>
                  <td><span className={`badge ${r.badgeCls}`}>{r.label}</span></td>
                  <td style={{ color: '#B1B1B1' }}>{r.or}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {r.status === 'overdue'
                      ? <button className="btn-red btn-sm">{r.action}</button>
                      : <button className="btn-outline btn-sm">{r.action}</button>}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>No records match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
