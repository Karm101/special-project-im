"use client";

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { FilterPanel } from '../../components/drms/FilterPanel';
import { useRouter } from 'next/navigation'; // Next.js Router

type ClaimStatus = 'claimed' | 'awaiting' | 'expiring' | 'expired';
type ClaimRow = {
  cs: string; reqId: string; requester: string; docs: string;
  issued: string; expiry: string; daysLeft: string; daysColor: string;
  status: ClaimStatus; badgeCls: string; badgeLabel: string; action: string;
  actionCls: string; rowBg?: string; expiryColor?: string;
};

const ALL_ROWS: ClaimRow[] = [
  { cs: 'CS-001', reqId: '#REQ-001', requester: 'Gillo, Ian P.', docs: 'CoE', issued: 'Feb 22', expiry: 'May 23', daysLeft: '70 days', daysColor: '#198754', status: 'claimed', badgeCls: 'b-done', badgeLabel: 'Claimed', action: 'View', actionCls: 'btn-outline btn-sm', rowBg: undefined, expiryColor: '#B1B1B1' },
  { cs: 'CS-007', reqId: '#REQ-007', requester: 'Buenaventura, Liza', docs: 'Diploma', issued: 'Mar 10', expiry: 'Jun 08', daysLeft: '86 days', daysColor: '#198754', status: 'awaiting', badgeCls: 'b-rel', badgeLabel: 'Awaiting Claim', action: 'Mark Claimed', actionCls: 'btn-primary btn-sm', rowBg: undefined, expiryColor: '#B1B1B1' },
  { cs: 'CS-012', reqId: '#REQ-012', requester: 'Del Rosario, Kian', docs: 'SF9', issued: 'Dec 20', expiry: 'Mar 20', daysLeft: '6 days', daysColor: '#FFA323', status: 'expiring', badgeCls: 'b-rev', badgeLabel: 'Expiring Soon', action: 'Send Reminder', actionCls: 'btn-outline btn-sm', rowBg: '#FFF8E1', expiryColor: '#001C43' },
  { cs: 'CS-015', reqId: '#REQ-015', requester: 'Villanueva, Sam', docs: 'TOR', issued: 'Nov 15', expiry: 'Feb 13', daysLeft: 'Expired', daysColor: '#E50019', status: 'expired', badgeCls: 'b-rej', badgeLabel: 'Expired', action: 'Shred Document', actionCls: 'btn-outline btn-sm', rowBg: '#FEEAEA', expiryColor: '#E50019' },
];

export default function ClaimSlipsPage() { // Added 'default'
  const router = useRouter(); // Initialize router
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selStatus, setSelStatus] = useState<Set<string>>(new Set());

  const visibleRows = useMemo(() => {
    let rows = ALL_ROWS;
    if (selStatus.size > 0) {
      rows = rows.filter(r => selStatus.has(r.badgeLabel));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.cs.toLowerCase().includes(q) || r.reqId.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q));
    }
    return rows;
  }, [search, selStatus]);

  const toggleStatus = (s: string) => {
    const next = new Set(selStatus); next.has(s) ? next.delete(s) : next.add(s); setSelStatus(next);
  };

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Claim Slip Monitor' }]} showNotifDot={false} />
      <div className="page-body">
        
        <div className="info-box warn" style={{ marginBottom: 20 }}>
          <span className="info-icon">⚠️</span>
          <div className="info-text">
            <strong>90-Day Policy:</strong> Documents not claimed within 90 days from issuance will be shredded and payments forfeited.
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <span style={{ fontSize: 16, fontWeight: 700, color: '#001C43' }}>Active Claim Slips</span>
          </div>
          <div className="toolbar-right">
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" onClick={() => setFilterOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={() => {}} onReset={() => setSelStatus(new Set())}
                selectedStatus={selStatus} onToggleStatus={toggleStatus}
                statusOptions={['Awaiting Claim', 'Expiring Soon', 'Expired', 'Claimed']}
                showFormType={false} showMode={false} showStaff={false} showDateRange={false}
              />
            </div>
            <div className="search-box" style={{ minWidth: 280 }}>
              <input type="text" placeholder="Search Slip ID, Request ID..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="drms-table">
            <thead>
              <tr>
                <th>Claim Slip</th><th>Request ID</th><th>Requester</th><th>Documents</th>
                <th>Issued</th><th>Expiry</th><th>Days Left</th><th>Status</th><th>Action</th>
              </tr>
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
                    <button className={r.actionCls} style={r.badgeLabel === 'Expired' ? { color: '#E50019', borderColor: '#E50019' } : {}}>
                      {r.action}
                    </button>
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