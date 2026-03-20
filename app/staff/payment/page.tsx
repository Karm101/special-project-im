"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { FilterPanel } from '../../components/drms/FilterPanel';

// ── API type ──────────────────────────────────────────────────────────────────
type ApiPayment = {
  payment_id: number;
  request: number;
  amount: string;
  official_receipt_no: string | null;
  payment_date: string | null;
  payment_status: 'Pending' | 'Paid' | 'Overdue';
  // joined from request via serializer
  requester_name?: string;
  request_id?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: string) {
  switch (status) {
    case 'Paid':    return { cls: 'b-done', label: 'Paid' };
    case 'Overdue': return { cls: 'b-rej',  label: 'Overdue' };
    default:        return { cls: 'b-rev',  label: 'Pending' };
  }
}

export default function PaymentMonitorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]   = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch]         = useState('');
  const [selStatus, setSelStatus]   = useState<Set<string>>(new Set());

  // ── API state ────────────────────────────────────────────────────────────
  const [payments, setPayments]   = useState<ApiPayment[]>([]);
  const [requests, setRequests]   = useState<Record<number, any>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [updating, setUpdating]   = useState<number | null>(null);

  // ── Fetch payments + request details ────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:8000/api/payments/');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const rows: ApiPayment[] = data.results ?? data;
        setPayments(rows);

        // Fetch requester names for each unique request_id
        const uniqueIds = [...new Set(rows.map(p => p.request))];
        const reqMap: Record<number, any> = {};
        await Promise.all(
          uniqueIds.map(async id => {
            const r = await fetch(`http://localhost:8000/api/requests/${id}/`);
            if (r.ok) {
              const d = await r.json();
              reqMap[id] = d;
            }
          })
        );
        setRequests(reqMap);
      } catch (err) {
        setError('Could not connect to the API. Make sure Django is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Mark payment as Paid ─────────────────────────────────────────────────
  async function handleMarkPaid(paymentId: number, orNumber: string) {
    setUpdating(paymentId);
    try {
      const res = await fetch(`http://localhost:8000/api/payments/${paymentId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'Paid',
          official_receipt_no: orNumber || null,
          payment_date: new Date().toISOString().split('T')[0],
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      // Refresh payments
      const refreshed = await fetch('http://localhost:8000/api/payments/');
      const data = await refreshed.json();
      setPayments(data.results ?? data);
    } catch {
      alert('Failed to update payment. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  // ── Stat counts ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    pending:   payments.filter(p => p.payment_status === 'Pending').length,
    overdue:   payments.filter(p => p.payment_status === 'Overdue').length,
    paid:      payments.filter(p => p.payment_status === 'Paid').length,
    collected: payments
      .filter(p => p.payment_status === 'Paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0),
  }), [payments]);

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS = [
    { label: 'All',     filter: 'all',     count: payments.length },
    { label: 'Pending', filter: 'Pending', count: stats.pending   },
    { label: 'Overdue', filter: 'Overdue', count: stats.overdue   },
    { label: 'Paid',    filter: 'Paid',    count: stats.paid      },
  ];

  // ── Filter rows ──────────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    let rows = activeTab === 'all' ? payments : payments.filter(p => p.payment_status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(p => {
        const reqId = `REQ-${String(p.request).padStart(3, '0')}`;
        const requester = requests[p.request]?.requester_info
          ? `${requests[p.request].requester_info.last_name}, ${requests[p.request].requester_info.first_name}`
          : '';
        return reqId.toLowerCase().includes(q) ||
               requester.toLowerCase().includes(q) ||
               (p.official_receipt_no ?? '').toLowerCase().includes(q);
      });
    }
    return rows;
  }, [payments, activeTab, search, requests]);

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Payment Monitor' }]} showNotifDot />
      <div className="page-body">

        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon">⚠️</span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {/* Stat cards */}
        <div className="stat-grid stat-grid-4">
          <div className="stat-card c-orange"><div className="stat-top"><div><div className="stat-num c-orange">{loading ? '—' : stats.pending}</div><div className="stat-label">Awaiting Payment</div></div><div className="stat-icon" style={{ background: '#FFF8E1' }}>⏳</div></div></div>
          <div className="stat-card c-red"><div className="stat-top"><div><div className="stat-num c-red">{loading ? '—' : stats.overdue}</div><div className="stat-label">Overdue</div></div><div className="stat-icon" style={{ background: '#FEEAEA' }}>🚨</div></div></div>
          <div className="stat-card c-green"><div className="stat-top"><div><div className="stat-num c-green">{loading ? '—' : stats.paid}</div><div className="stat-label">Paid This Month</div></div><div className="stat-icon" style={{ background: '#EAFAF1' }}>✅</div></div></div>
          <div className="stat-card c-navy"><div className="stat-top"><div><div className="stat-num c-navy" style={{ fontSize: 22 }}>{loading ? '—' : `₱${stats.collected.toLocaleString()}`}</div><div className="stat-label">Total Collected</div></div><div className="stat-icon" style={{ background: '#EEF4FB' }}>📊</div></div></div>
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
              <input type="text" placeholder="Search by requester, request ID, or OR number..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>Loading payments...</div>
        )}

        {/* Table */}
        {!loading && (
          <div className="table-wrap">
            <table className="drms-table">
              <thead>
                <tr>
                  <th>Request ID</th><th>Requester</th><th>Amount</th>
                  <th>Date Billed</th><th>Payment Status</th><th>Official Receipt</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(p => {
                  const reqId    = `REQ-${String(p.request).padStart(3, '0')}`;
                  const reqData  = requests[p.request];
                  const requester = reqData?.requester_info
                    ? `${reqData.requester_info.last_name}, ${reqData.requester_info.first_name}`
                    : '—';
                  const badge    = statusBadge(p.payment_status);
                  const isOverdue = p.payment_status === 'Overdue';
                  const rowBg    = isOverdue ? 'rgba(229,0,25,.03)' : undefined;

                  return (
                    <tr
                      key={p.payment_id}
                      style={{ background: rowBg, cursor: 'pointer' }}
                      onClick={() => router.push(`/staff/request/${reqId}`)}
                    >
                      <td><span className="req-id">#{reqId}</span></td>
                      <td>{requester}</td>
                      <td style={{ fontWeight: 700 }}>₱{parseFloat(p.amount).toLocaleString()}</td>
                      <td style={{ color: '#B1B1B1' }}>{formatDate(p.payment_date)}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td style={{ color: '#B1B1B1' }}>{p.official_receipt_no ?? '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {p.payment_status === 'Paid' ? (
                          <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${reqId}`)}>View</button>
                        ) : (
                          <button
                            className={isOverdue ? 'btn-red btn-sm' : 'btn-outline btn-sm'}
                            disabled={updating === p.payment_id}
                            onClick={() => {
                              const or = prompt('Enter Official Receipt number:');
                              if (or !== null) handleMarkPaid(p.payment_id, or);
                            }}
                          >
                            {updating === p.payment_id ? 'Updating...' : isOverdue ? 'Send Notice' : 'Mark Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
