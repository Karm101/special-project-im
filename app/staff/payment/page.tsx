"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { Pagination } from '../../components/drms/Pagination';
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

function StatCard({ num, label, color, bg, icon, loading }: {
  num: string | number; label: string; color: string; bg: string; icon: React.ReactNode; loading: boolean;
}) {
  return (
    <div className="stat-card" style={{ padding: 16, borderBottom: `3px solid ${color}` }}>
      <div className="stat-top">
        <div>
          <div className="stat-num" style={{ fontSize: 24, color }}>
            {loading ? '—' : num}
          </div>
          <div className="stat-label" style={{ fontSize: 12 }}>{label}</div>
        </div>
        <div className="stat-icon" style={{ background: bg, width: 32, height: 32, fontSize: 14, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
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
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [activeFilters, setActiveFilters] = useState<any>(null);

  // ── API state ────────────────────────────────────────────────────────────
  const [payments, setPayments]   = useState<ApiPayment[]>([]);
  const [requests, setRequests]   = useState<Record<number, any>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [updating, setUpdating]   = useState<number | null>(null);
  const [page, setPage]           = useState(1);

  // ── Fetch payments + request details ────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const rows: ApiPayment[] = data.results ?? data;
        setPayments(rows);

        // Fetch requester names for each unique request_id
        const uniqueIds = [...new Set(rows.map(p => p.request))];
        const reqMap: Record<number, any> = {};
        await Promise.all(
          uniqueIds.map(async id => {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/requests/${id}/`);
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

  // ── Modal state ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<{
    type: 'setAmount' | 'markPaid';
    paymentId: number;
    currentAmount?: number;
  } | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalOR, setModalOR]         = useState('');
  const [modalError, setModalError]   = useState('');
  const [shakeAmount, setShakeAmount] = useState(false);

  // ── Open Set Amount modal ────────────────────────────────────────────────
  function openSetAmount(paymentId: number, currentAmount: number) {
    setModal({ type: 'setAmount', paymentId, currentAmount });
    setModalAmount(currentAmount > 0 ? String(currentAmount) : '');
    setModalError('');
  }

  // ── Open Mark Paid modal ──────────────────────────────────────────────────
  function openMarkPaid(paymentId: number) {
    setModal({ type: 'markPaid', paymentId });
    setModalOR('');
    setModalError('');
  }

  // ── Confirm modal action ──────────────────────────────────────────────────
  async function handleModalConfirm() {
    if (!modal) return;
    setModalError('');

    if (modal.type === 'setAmount') {
      const amt = parseFloat(modalAmount);
      if (!modalAmount || isNaN(amt) || amt <= 0) {
        setModalError('Please enter a valid amount.');
        return;
      }
      setUpdating(modal.paymentId);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/${modal.paymentId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt }),
        });
        if (!res.ok) throw new Error();
        const refreshed = await fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/');
        const data = await refreshed.json();
        setPayments(data.results ?? data);
        setModal(null);
      } catch { setModalError('Failed to update. Please try again.'); }
      finally { setUpdating(null); }

    } else if (modal.type === 'markPaid') {
      setUpdating(modal.paymentId);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/${modal.paymentId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_status: 'Paid',
            official_receipt_no: modalOR || null,
            payment_date: new Date().toISOString().split('T')[0],
          }),
        });
        if (!res.ok) throw new Error();
        const refreshed = await fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/');
        const data = await refreshed.json();
        setPayments(data.results ?? data);
        setModal(null);
      } catch { setModalError('Failed to update. Please try again.'); }
      finally { setUpdating(null); }
    }
  }

  // handleMarkPaid replaced by modal system above

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
    { label: 'All',     filter: 'all',     count: payments.length, color: '#7eb3ff' },
    { label: 'Pending', filter: 'Pending', count: stats.pending,   color: '#FFA323' },
    { label: 'Overdue', filter: 'Overdue', count: stats.overdue,   color: '#ff7a7a' },
    { label: 'Paid',    filter: 'Paid',    count: stats.paid,      color: '#4ade80' },
  ];

  // ── Filter rows ──────────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    let rows = activeTab === 'all' ? payments : payments.filter(p => p.payment_status === activeTab);
    if (activeFilters?.statuses?.size > 0) rows = rows.filter(p => activeFilters.statuses.has(p.payment_status));
    if (activeFilters?.dateFrom) rows = rows.filter(p => p.payment_date && p.payment_date >= activeFilters.dateFrom);
    if (activeFilters?.dateTo)   rows = rows.filter(p => p.payment_date && p.payment_date <= activeFilters.dateTo);
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
  }, [payments, activeTab, search, requests, activeFilters]);

  const totalRows = visibleRows.length;
  const pagedRows  = visibleRows.slice((page - 1) * 10, page * 10);

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
          <StatCard loading={loading} num={stats.pending}                               label="Awaiting Payment" color="#FFA323" bg="rgba(255,163,35,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard loading={loading} num={stats.overdue}                               label="Overdue"          color="#E50019" bg="rgba(240, 97, 116, 0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
          <StatCard loading={loading} num={stats.paid}                                  label="Paid This Month"  color="#198754" bg="rgba(25,135,84,0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polyline points="20 6 9 17 4 12"/></svg>} />
          <StatCard loading={loading} num={`₱${stats.collected.toLocaleString()}`}      label="Total Collected"  color="#114B9F" bg="rgba(59, 124, 216, 0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>} />
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {TABS.map(t => {
            const isActive = activeTab === t.filter;
            return (
              <div
                key={t.filter}
                className={`tab${isActive ? ' active' : ''}`}
                style={{ borderBottomColor: isActive ? t.color : 'transparent', color: isActive ? t.color : undefined }}
                onClick={() => setActiveTab(t.filter)}
              >
                {t.label} <span className="tab-count" style={{ color: isActive ? t.color : undefined }}>{t.count}</span>
              </div>
            );
          })}
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
                statusOptions={['Pending', 'Paid', 'Overdue']}
                showFormType={false} showMode={false} showStaff={false}
                dateFrom={dateFrom} onDateFromChange={setDateFrom}
                dateTo={dateTo} onDateToChange={setDateTo}
              />
            </div>
            <div className="search-box" style={{ minWidth: 340 }}>
              <input type="text" placeholder="Search by requester, request ID, or OR number..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="var(--mid-gray)" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--mid-gray)', fontSize: 14 }}>Loading payments...</div>
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
                {pagedRows.map(p => {
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
                      <td style={{ fontWeight: 700, color: parseFloat(p.amount) === 0 ? 'var(--mid-gray)' : 'var(--text-primary)' }}>{parseFloat(p.amount) === 0 ? 'Not set' : `₱${parseFloat(p.amount).toLocaleString()}`}</td>
                      <td style={{ color: 'var(--mid-gray)' }}>{formatDate(p.payment_date)}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td style={{ color: 'var(--mid-gray)' }}>{p.official_receipt_no ?? '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {p.payment_status === 'Paid' ? (
                          <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${reqId}`)}>View</button>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {parseFloat(p.amount) === 0 && (
                              <button
                                className={`btn-outline btn-sm${shakeAmount ? ' shake' : ''}`}
                                disabled={updating === p.payment_id}
                                style={{ borderColor: shakeAmount ? '#E50019' : undefined, color: shakeAmount ? '#E50019' : undefined }}
                                onClick={() => openSetAmount(p.payment_id, parseFloat(p.amount))}
                              >
                                Set Amount
                              </button>
                            )}
                            <button
                              className={`${isOverdue ? 'btn-red btn-sm' : 'btn-outline btn-sm'}${parseFloat(p.amount) === 0 && shakeAmount ? ' shake' : ''}`}
                              disabled={updating === p.payment_id || parseFloat(p.amount) === 0}
                              title={parseFloat(p.amount) === 0 ? 'Set amount first' : ''}
                              style={{ borderColor: parseFloat(p.amount) === 0 ? '#E50019' : undefined }}
                              onClick={() => {
                                if (parseFloat(p.amount) === 0) {
                                  setShakeAmount(true);
                                  setTimeout(() => setShakeAmount(false), 600);
                                  return;
                                }
                                openMarkPaid(p.payment_id);
                              }}
                            >
                              {updating === p.payment_id ? 'Updating...' : isOverdue ? 'Send Notice' : 'Mark Paid'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pagedRows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--mid-gray)', fontSize: 13 }}>No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ── Payment Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              {modal.type === 'setAmount' ? 'Set Payment Amount' : 'Mark as Paid'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 20 }}>
              {modal.type === 'setAmount'
                ? 'Enter the billing amount set by the Treasury Office.'
                : 'Enter the Official Receipt number to confirm payment.'}
            </div>

            {modal.type === 'setAmount' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
                  Amount (₱) <span style={{ color: '#E50019' }}>*</span>
                </label>
                <input
                  className="drms-input"
                  type="number"
                  placeholder="e.g. 150.00"
                  value={modalAmount}
                  onChange={e => { setModalAmount(e.target.value); setModalError(''); }}
                  autoFocus
                  style={{ borderColor: modalError ? '#E50019' : undefined }}
                />
              </div>
            )}

            {modal.type === 'markPaid' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
                  Official Receipt No. <span style={{ color: '#B1B1B1', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </label>
                <input
                  className="drms-input"
                  type="text"
                  placeholder="e.g. OR-2026-00123"
                  value={modalOR}
                  onChange={e => setModalOR(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {modalError && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12 }}>⚠️ {modalError}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: 10 }}
                onClick={handleModalConfirm}
                disabled={!!updating}
              >
                {updating ? 'Saving...' : 'Confirm'}
              </button>
              <button
                className="btn-outline"
                style={{ flex: 1, justifyContent: 'center', padding: 10 }}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-6px); }
          40%,80% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.5s ease; }
      `}</style>
    </>
  );
}
