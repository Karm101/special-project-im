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
  { id: '#REQ-003', requester: 'Dela Cruz, Maria',      docs: 'SF9 + SF10', amount: '₱100', billed: 'Feb 20', status: 'paid',    badgeCls: 'b-done', label: 'Paid',    or: 'OR-2026-00453', action: 'View',      rowBg: undefined },
  { id: '#REQ-004', requester: 'Santos, Jose Rizal',    docs: 'TOR',        amount: '₱150', billed: 'Mar 01', status: 'pending', badgeCls: 'b-rev',  label: 'Pending', or: '—',             action: 'Follow Up', rowBg: undefined },
  { id: '#REQ-005', requester: 'Macaraeg, Ana Reyes',   docs: 'HD',         amount: '₱100', billed: 'Mar 03', status: 'overdue', badgeCls: 'b-rej',  label: 'Overdue', or: '—',             action: 'Send Notice', rowBg: '#FFF5F5' },
  { id: '#REQ-006', requester: 'Vega, Carlo Mendoza',   docs: 'CoG',        amount: '₱75',  billed: 'Mar 05', status: 'pending', badgeCls: 'b-rev',  label: 'Pending', or: '—',             action: 'Follow Up', rowBg: undefined },
  { id: '#REQ-007', requester: 'Buenaventura, Liza',    docs: 'Diploma',    amount: '₱0',   billed: 'Mar 07', status: 'paid',    badgeCls: 'b-done', label: 'Cleared', or: 'N/A',           action: 'View',      rowBg: undefined },
];

export default function PaymentMonitorPage() { // Added 'default'
  const router = useRouter(); // Changed to Next.js router
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selStatus, setSelStatus] = useState<Set<string>>(new Set());

  const visibleRows = useMemo(() => {
    let rows = ALL_ROWS;
    if (selStatus.size > 0) {
      rows = rows.filter(r => selStatus.has(r.label));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.or.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [search, selStatus]);

  const toggleStatus = (s: string) => {
    const next = new Set(selStatus);
    next.has(s) ? next.delete(s) : next.add(s);
    setSelStatus(next);
  };

  const StatCard = ({ label, num, color }: { label: string; num: number; color: string }) => (
    <div style={{ background: 'white', borderRadius: 10, padding: 18, border: '1px solid rgba(0,0,0,.06)', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#001C43' }}>{num}</div>
      <div style={{ fontSize: 12, color: '#B1B1B1', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Payment Monitor' }]} showNotifDot={false} />
      <div className="page-body">
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Awaiting Payment" num={2} color="#FFA323" />
          <StatCard label="Overdue Notices" num={1} color="#E50019" />
          <StatCard label="Paid This Week" num={14} color="#198754" />
          <StatCard label="Total Collected (Week)" num={3450} color="#114B9F" />
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <span style={{ fontSize: 16, fontWeight: 700, color: '#001C43' }}>Transaction Records</span>
          </div>
          <div className="toolbar-right">
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" onClick={() => setFilterOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={() => {}} onReset={() => setSelStatus(new Set())}
                selectedStatus={selStatus} onToggleStatus={toggleStatus}
                statusOptions={['Paid', 'Pending', 'Overdue', 'Cleared']}
                showFormType={false} showMode={false} showStaff={false} showDateRange={true}
              />
            </div>
            <div className="search-box" style={{ minWidth: 280 }}>
              <input type="text" placeholder="Search ID, name, or OR number..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <tr key={r.id} style={{ background: r.rowBg }} onClick={() => router.push(`/request/${r.id.replace('#', '')}`)}>
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