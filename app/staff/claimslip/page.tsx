"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { FilterPanel } from '../../components/drms/FilterPanel';

// ── API type ──────────────────────────────────────────────────────────────────
type ApiClaimSlip = {
  claim_slip_id: number;
  request: number;
  issued_date: string;
  expiry_date: string;
  actual_claim_date: string | null;
  claimed_by: string | null;
  days_remaining: number;
  is_expired: boolean;
  released_by_staff: number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getSlipStatus(slip: ApiClaimSlip): {
  label: string; badgeCls: string;
  daysLabel: string; daysColor: string;
  rowBg: string | undefined; expiryColor: string;
  actionLabel: string; actionCls: string;
} {
  if (slip.actual_claim_date) {
    return {
      label: 'Claimed', badgeCls: 'b-done',
      daysLabel: 'Claimed', daysColor: '#198754',
      rowBg: undefined, expiryColor: '#B1B1B1',
      actionLabel: 'View', actionCls: 'btn-outline btn-sm',
    };
  }
  if (slip.is_expired || slip.days_remaining < 0) {
    return {
      label: 'Expired', badgeCls: 'b-rej',
      daysLabel: 'Expired', daysColor: '#E50019',
      rowBg: 'rgba(229,0,25,.03)', expiryColor: '#E50019',
      actionLabel: 'Shred', actionCls: 'btn-outline btn-sm',
    };
  }
  if (slip.days_remaining <= 7) {
    return {
      label: 'Expiring Soon', badgeCls: 'b-rev',
      daysLabel: `${slip.days_remaining} day${slip.days_remaining !== 1 ? 's' : ''}`, daysColor: '#FFA323',
      rowBg: '#FFFBF0', expiryColor: '#FFA323',
      actionLabel: 'Send Reminder', actionCls: 'btn-red btn-sm',
    };
  }
  return {
    label: 'Awaiting Claim', badgeCls: 'b-rel',
    daysLabel: `${slip.days_remaining} days`, daysColor: '#198754',
    rowBg: undefined, expiryColor: '#B1B1B1',
    actionLabel: 'Mark Claimed', actionCls: 'btn-outline btn-sm',
  };
}

function getFilterKey(slip: ApiClaimSlip): string {
  if (slip.actual_claim_date) return 'claimed';
  if (slip.is_expired || slip.days_remaining < 0) return 'expired';
  if (slip.days_remaining <= 7) return 'expiring';
  return 'awaiting';
}

export default function ClaimSlipsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]   = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch]         = useState('');
  const [selStatus, setSelStatus]   = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [activeFilters, setActiveFilters] = useState<any>(null);

  // ── API state ─────────────────────────────────────────────────────────────
  const [slips, setSlips]       = useState<ApiClaimSlip[]>([]);
  const [requests, setRequests] = useState<Record<number, any>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  // ── Fetch claim slips ─────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:8000/api/claimslips/');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const rows: ApiClaimSlip[] = data.results ?? data;
        setSlips(rows);

        // Fetch requester info for each unique request
        const uniqueIds = [...new Set(rows.map(s => s.request))];
        const reqMap: Record<number, any> = {};
        await Promise.all(
          uniqueIds.map(async id => {
            const r = await fetch(`http://localhost:8000/api/requests/${id}/`);
            if (r.ok) reqMap[id] = await r.json();
          })
        );
        setRequests(reqMap);
      } catch {
        setError('Could not connect to the API. Make sure Django is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Mark as Claimed ───────────────────────────────────────────────────────
  async function handleMarkClaimed(slipId: number, claimedBy: string) {
    setUpdating(slipId);
    try {
      const res = await fetch(`http://localhost:8000/api/claimslips/${slipId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_claim_date: new Date().toISOString().split('T')[0],
          claimed_by: claimedBy || 'Student',
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      // Refresh
      const refreshed = await fetch('http://localhost:8000/api/claimslips/');
      const data = await refreshed.json();
      setSlips(data.results ?? data);
    } catch {
      alert('Failed to update claim slip. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  // ── Stat counts ───────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    claimed:  slips.filter(s => s.actual_claim_date).length,
    awaiting: slips.filter(s => !s.actual_claim_date && !s.is_expired && s.days_remaining > 7).length,
    expiring: slips.filter(s => !s.actual_claim_date && !s.is_expired && s.days_remaining <= 7).length,
    expired:  slips.filter(s => s.is_expired || s.days_remaining < 0).length,
  }), [slips]);

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [
    { label: 'All',            filter: 'all',      count: slips.length   },
    { label: 'Awaiting Claim', filter: 'awaiting', count: stats.awaiting },
    { label: 'Expiring Soon',  filter: 'expiring', count: stats.expiring },
    { label: 'Expired',        filter: 'expired',  count: stats.expired  },
    { label: 'Claimed',        filter: 'claimed',  count: stats.claimed  },
  ];

  // ── Filter rows ───────────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    let rows = activeTab === 'all' ? slips : slips.filter(s => getFilterKey(s) === activeTab);
    if (activeFilters?.statuses?.size > 0) {
      const keyMap: Record<string,string> = {'Claimed':'claimed','Awaiting Claim':'awaiting','Expiring Soon':'expiring','Expired':'expired'};
      rows = rows.filter(s => [...activeFilters.statuses].some(st => keyMap[st] === getFilterKey(s)));
    }
    if (activeFilters?.dateFrom) rows = rows.filter(s => s.issued_date >= activeFilters.dateFrom);
    if (activeFilters?.dateTo)   rows = rows.filter(s => s.issued_date <= activeFilters.dateTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s => {
        const slipId    = `CS-${String(s.claim_slip_id).padStart(3, '0')}`;
        const reqId     = `REQ-${String(s.request).padStart(3, '0')}`;
        const requester = requests[s.request]?.requester_info
          ? `${requests[s.request].requester_info.last_name}, ${requests[s.request].requester_info.first_name}`
          : '';
        return slipId.toLowerCase().includes(q) ||
               reqId.toLowerCase().includes(q) ||
               requester.toLowerCase().includes(q);
      });
    }
    return rows;
  }, [slips, activeTab, search, requests, activeFilters]);

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Claim Slip Monitor' }]} showNotifDot />
      <div className="page-body">

        {/* Error banner */}
        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon">⚠️</span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {/* 90-day policy warning */}
        <div className="info-box warn" style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
          <div className="info-text">
            Per RO policy, documents unclaimed after <strong>90 days</strong> will be shredded and payment forfeited.
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">{loading ? '—' : stats.claimed}</div><div className="stat-label">Claimed</div></div><div className="stat-icon" style={{ background: '#EAFAF1', color: '#198754' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div></div></div>
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy">{loading ? '—' : stats.awaiting}</div><div className="stat-label">Awaiting Claim</div></div><div className="stat-icon" style={{ background: '#EEF4FB', color: '#001C43' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M4 3l1.5 1.5L7 3l1.5 1.5L10 3l1.5 1.5L13 3l1.5 1.5L16 3l1.5 1.5L19 3v16l-1.5-1.5L16 19l-1.5 1.5L13 19l-1.5 1.5L10 19l-1.5 1.5L7 19l-1.5 1.5L4 19V3z"/></svg></div></div></div>
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">{loading ? '—' : stats.expiring}</div><div className="stat-label">Expiring in 7 days</div></div><div className="stat-icon" style={{ background: '#FFF8E1', color: '#FFA323' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></div></div>
          <div className="stat-card c-red"><div className="stat-top"><div><div className="stat-num c-red">{loading ? '—' : stats.expired}</div><div className="stat-label">Expired</div></div><div className="stat-icon" style={{ background: '#FEEAEA', color: '#E50019' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div></div></div>
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
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" data-filter-btn="true" onClick={() => setFilterOpen(o => !o)} title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={(f) => { setActiveFilters(f); setFilterOpen(false); }}
                onReset={() => { setSelStatus(new Set()); setDateFrom(''); setDateTo(''); setActiveFilters(null); }}
                selectedStatus={selStatus} onToggleStatus={s => toggleChip(selStatus, s, setSelStatus)}
                statusOptions={['Awaiting Claim', 'Expiring Soon', 'Expired', 'Claimed']}
                showFormType={false} showMode={false} showStaff={false}
                dateFrom={dateFrom} onDateFromChange={setDateFrom}
                dateTo={dateTo} onDateToChange={setDateTo}
              />
            </div>
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search by name, request ID, or claim slip..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>
            Loading claim slips...
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="table-wrap">
            <table className="drms-table">
              <thead>
                <tr>
                  <th>Claim Slip</th><th>Request ID</th><th>Requester</th>
                  <th>Issued</th><th>Expiry</th><th>Days Left</th>
                  <th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(s => {
                  const slipStatus = getSlipStatus(s);
                  const slipId     = `CS-${String(s.claim_slip_id).padStart(3, '0')}`;
                  const reqId      = `REQ-${String(s.request).padStart(3, '0')}`;
                  const reqData    = requests[s.request];
                  const requester  = reqData?.requester_info
                    ? `${reqData.requester_info.last_name}, ${reqData.requester_info.first_name}`
                    : '—';

                  return (
                    <tr
                      key={s.claim_slip_id}
                      style={{ background: slipStatus.rowBg, cursor: 'pointer' }}
                      onClick={() => router.push(`/staff/request/${reqId}`)}
                    >
                      <td><span className="req-id">{slipId}</span></td>
                      <td>#{reqId}</td>
                      <td>{requester}</td>
                      <td style={{ color: '#B1B1B1' }}>{formatDate(s.issued_date)}</td>
                      <td style={{ color: slipStatus.expiryColor, fontWeight: 700 }}>{formatDate(s.expiry_date)}</td>
                      <td style={{ color: slipStatus.daysColor, fontWeight: 700 }}>{slipStatus.daysLabel}</td>
                      <td><span className={`badge ${slipStatus.badgeCls}`}>{slipStatus.label}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {slipStatus.label === 'Awaiting Claim' ? (
                          <button
                            className={slipStatus.actionCls}
                            disabled={updating === s.claim_slip_id}
                            onClick={() => {
                              const name = prompt('Claimed by (name):');
                              if (name !== null) handleMarkClaimed(s.claim_slip_id, name);
                            }}
                          >
                            {updating === s.claim_slip_id ? 'Updating...' : slipStatus.actionLabel}
                          </button>
                        ) : (
                          <button
                            className={slipStatus.actionCls}
                            style={slipStatus.label === 'Expired' ? { color: '#E50019', borderColor: '#E50019' } : {}}
                            onClick={() => router.push(`/staff/request/${reqId}`)}
                          >
                            {slipStatus.actionLabel}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>
                      No claim slips found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
