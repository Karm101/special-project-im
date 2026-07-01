"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { Pagination } from '../../components/drms/Pagination';
import { FilterPanel } from '../../components/drms/FilterPanel';
import { API_BASE } from '@/lib/lib_api';

// ── API types ─────────────────────────────────────────────────────────────────
type StatusLog = {
  status: string;
  timestamp: string;
  remarks: string | null;
  staff_name: string | null;
};

type ApiRequest = {
  request_id: number;
  document_request_no: string | null;
  form_type: string;
  date_submitted: string;
  expected_claim_date: string | null;
  actual_claim_date: string | null;
  current_status: string;
  requester_info: {
    first_name: string;
    last_name: string;
    program_strand: string;
  } | null;
  requested_documents?: { document_name: string }[];
  status_logs?: StatusLog[];
};

function getToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') ?? '' : '';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(d: string | null): number | null {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatRequestId(requestId: number, documentRequestNo?: string | null): string {
  return documentRequestNo ?? `REQ-${String(requestId).padStart(3, '0')}`;
}

/** Gets the transition log entry for a given status */
function getTransitionLog(r: ApiRequest, status: string): StatusLog | undefined {
  return r.status_logs?.find(l => l.status === status);
}

/** Gets the transition timestamp for Claimed or Shredded — used for year/month bucketing */
function getTransitionDate(r: ApiRequest): string | null {
  const relevantStatus = r.current_status === 'Claimed' ? 'Claimed'
    : r.current_status === 'Shredded' ? 'Shredded'
    : r.current_status === 'Pending Shredding' ? 'Pending Shredding'
    : null;
  if (!relevantStatus) return null;
  const log = getTransitionLog(r, relevantStatus);
  return log?.timestamp ?? null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

export default function ReleaseDisposalMonitorPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [activeTab, setActiveTab] = useState<'release' | 'claimed' | 'shredded' | 'archive'>('release');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch]         = useState('');
  const [selStatus, setSelStatus]   = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [sortMode, setSortMode]     = useState<'newest' | 'oldest'>('newest');
  const [page, setPage]             = useState(1);

  // ── Month filters (Claimed, Shredded, Archive tabs) ───────────────────────
  const [claimedMonth, setClaimedMonth]   = useState<number | null>(null); // 0-indexed
  const [shreddedMonth, setShreddedMonth] = useState<number | null>(null);
  const [archiveYear, setArchiveYear]     = useState<number | null>(null);
  const [archiveMonth, setArchiveMonth]   = useState<number | null>(null);

  // ── API state ─────────────────────────────────────────────────────────────
  const [releaseRows, setReleaseRows]         = useState<ApiRequest[]>([]);
  const [claimedRows, setClaimedRows]         = useState<ApiRequest[]>([]);
  const [pendingShredRows, setPendingShredRows] = useState<ApiRequest[]>([]);
  const [shreddedRows, setShreddedRows]       = useState<ApiRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  // ── Bulk shred selection ─────────────────────────────────────────────────
  const [selectedShredIds, setSelectedShredIds] = useState<Set<number>>(new Set());
  const [confirmingShred, setConfirmingShred]   = useState(false);
  const [shredConfirmModal, setShredConfirmModal] = useState(false);

  // ── Mark Claimed modal ────────────────────────────────────────────────────
  const [modal, setModal] = useState<{ requestId: number } | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalError, setModalError] = useState('');

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [relRes, clmRes, shrRes, pndRes] = await Promise.all([
        fetch(`${API_BASE}/requests/?current_status=For Release&page_size=500`),
        fetch(`${API_BASE}/requests/?current_status=Claimed&page_size=500`),
        fetch(`${API_BASE}/requests/?current_status=Shredded&page_size=500`),
        fetch(`${API_BASE}/requests/?current_status=Pending Shredding&page_size=500`),
      ]);
      if (!relRes.ok || !clmRes.ok || !shrRes.ok || !pndRes.ok) throw new Error('API error');
      const relData = await relRes.json();
      const clmData = await clmRes.json();
      const shrData = await shrRes.json();
      const pndData = await pndRes.json();
      setReleaseRows(relData.results ?? relData);
      setClaimedRows(clmData.results ?? clmData);
      setShreddedRows(shrData.results ?? shrData);
      setPendingShredRows(pndData.results ?? pndData);
    } catch {
      setError('Could not connect to the API. Make sure Django is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // ── Mark as Claimed ───────────────────────────────────────────────────────
  function openMarkClaimed(requestId: number) {
    setModal({ requestId });
    setModalName('');
    setModalError('');
  }

  async function handleModalConfirm() {
    if (!modal) return;
    setUpdating(modal.requestId);
    setModalError('');
    try {
      const res = await fetch(`${API_BASE}/requests/${modal.requestId}/update_status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Claimed',
          remarks: modalName.trim() ? `Claimed by ${modalName.trim()}` : 'Claimed by student',
        }),
      });
      if (!res.ok) throw new Error();
      setModal(null);
      await fetchAll();
    } catch {
      setModalError('Failed to update. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  // ── Bulk confirm shredded ────────────────────────────────────────────────
  async function handleConfirmShredded() {
    if (selectedShredIds.size === 0) return;
    setConfirmingShred(true);
    try {
      const res = await fetch(`${API_BASE}/admin/confirm-shredded/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify({ request_ids: [...selectedShredIds] }),
      });
      if (!res.ok) throw new Error();
      setSelectedShredIds(new Set());
      setShredConfirmModal(false);
      await fetchAll();
    } catch {
      alert('Failed to confirm shredding. Please try again.');
    } finally {
      setConfirmingShred(false);
    }
  }

  function toggleShredSelect(id: number) {
    setSelectedShredIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAllShred(rows: ApiRequest[]) {
    setSelectedShredIds(prev => {
      const allSelected = rows.every(r => prev.has(r.request_id));
      if (allSelected) return new Set();
      return new Set(rows.map(r => r.request_id));
    });
  }

  // ── Archive: split claimed+shredded by current year vs prior years ────────
  const claimedCurrentYear = useMemo(() =>
    claimedRows.filter(r => {
      const log = getTransitionLog(r, 'Claimed');
      if (!log) return true; // fallback: show in current year if no log
      return new Date(log.timestamp).getFullYear() === currentYear;
    }), [claimedRows, currentYear]);

  const shreddedCurrentYear = useMemo(() =>
    shreddedRows.filter(r => {
      const log = getTransitionLog(r, 'Shredded');
      if (!log) return true;
      return new Date(log.timestamp).getFullYear() === currentYear;
    }), [shreddedRows, currentYear]);

  const archiveRows = useMemo(() => {
    const priorClaimed = claimedRows.filter(r => {
      const log = getTransitionLog(r, 'Claimed');
      if (!log) return false;
      return new Date(log.timestamp).getFullYear() < currentYear;
    });
    const priorShredded = shreddedRows.filter(r => {
      const log = getTransitionLog(r, 'Shredded');
      if (!log) return false;
      return new Date(log.timestamp).getFullYear() < currentYear;
    });
    return [...priorClaimed, ...priorShredded];
  }, [claimedRows, shreddedRows, currentYear]);

  // ── Dynamic year list for archive dropdown ────────────────────────────────
  const availableArchiveYears = useMemo(() => {
    const years = new Set<number>();
    archiveRows.forEach(r => {
      const log = getTransitionLog(r, r.current_status === 'Claimed' ? 'Claimed' : 'Shredded');
      if (log) years.add(new Date(log.timestamp).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // newest first
  }, [archiveRows]);

  // ── Stat counts ───────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    release:      releaseRows.length,
    claimed:      claimedCurrentYear.length,
    pendingShred: pendingShredRows.length,
    shredded:     shreddedCurrentYear.length,
    archive:      archiveRows.length,
  }), [releaseRows, claimedCurrentYear, pendingShredRows, shreddedCurrentYear, archiveRows]);

  const TABS = [
    { label: 'For Release', filter: 'release',  count: stats.release,  color: '#114B9F' },
    { label: 'Claimed',     filter: 'claimed',  count: stats.claimed,  color: '#198754' },
    { label: 'Shredded',    filter: 'shredded', count: stats.pendingShred + stats.shredded, color: '#ff7a7a' },
    { label: 'Archive',     filter: 'archive',  count: stats.archive,  color: '#856404' },
  ] as const;

  // ── Apply month filter helper ─────────────────────────────────────────────
  function applyMonthFilter(rows: ApiRequest[], status: string, month: number | null): ApiRequest[] {
    if (month === null) return rows;
    return rows.filter(r => {
      const log = getTransitionLog(r, status);
      if (!log) return false;
      return new Date(log.timestamp).getMonth() === month;
    });
  }

  // ── Base rows per tab ─────────────────────────────────────────────────────
  const baseRows: ApiRequest[] = useMemo(() => {
    if (activeTab === 'release') return releaseRows;
    if (activeTab === 'claimed') {
      return applyMonthFilter(claimedCurrentYear, 'Claimed', claimedMonth);
    }
    if (activeTab === 'shredded') {
      const pendingRows = pendingShredRows;
      const confirmedRows = applyMonthFilter(shreddedCurrentYear, 'Shredded', shreddedMonth);
      return [...pendingRows, ...confirmedRows];
    }
    // Archive tab
    let rows = archiveRows;
    if (archiveYear !== null) {
      rows = rows.filter(r => {
        const log = getTransitionLog(r, r.current_status === 'Claimed' ? 'Claimed' : 'Shredded');
        if (!log) return false;
        return new Date(log.timestamp).getFullYear() === archiveYear;
      });
    }
    if (archiveMonth !== null) {
      rows = rows.filter(r => {
        const log = getTransitionLog(r, r.current_status === 'Claimed' ? 'Claimed' : 'Shredded');
        if (!log) return false;
        return new Date(log.timestamp).getMonth() === archiveMonth;
      });
    }
    return rows;
  }, [activeTab, releaseRows, claimedCurrentYear, claimedMonth, pendingShredRows,
      shreddedCurrentYear, shreddedMonth, archiveRows, archiveYear, archiveMonth]);

  // ── Search + sort ────────────────────────────────────────────────────────
  const visibleRows = useMemo(() => {
    let rows = [...baseRows];

    if (activeFilters?.dateFrom) rows = rows.filter(r => r.date_submitted >= activeFilters.dateFrom);
    if (activeFilters?.dateTo)   rows = rows.filter(r => r.date_submitted <= activeFilters.dateTo);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => {
        const id = formatRequestId(r.request_id, r.document_request_no).toLowerCase();
        const requester = r.requester_info
          ? `${r.requester_info.last_name}, ${r.requester_info.first_name}`.toLowerCase()
          : '';
        const docs = r.requested_documents?.map(d => d.document_name.toLowerCase()).join(' ') ?? '';
        return id.includes(q) || requester.includes(q) || docs.includes(q);
      });
    }

    rows.sort((a, b) => {
      const aDate = new Date(a.date_submitted).getTime();
      const bDate = new Date(b.date_submitted).getTime();
      return sortMode === 'newest' ? bDate - aDate : aDate - bDate;
    });

    return rows;
  }, [baseRows, search, activeFilters, sortMode]);

  const totalRows = visibleRows.length;
  const pagedRows = visibleRows.slice((page - 1) * 10, page * 10);

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  // ── Month filter UI component ─────────────────────────────────────────────
  function MonthFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
    return (
      <select
        value={value ?? ''}
        onChange={e => { onChange(e.target.value === '' ? null : parseInt(e.target.value)); setPage(1); }}
        style={{ fontSize: 12, height: 32, border: '1px solid var(--border-col)', borderRadius: 6, padding: '0 8px', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}
      >
        <option value=''>All Months</option>
        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
    );
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Release & Disposal Monitor' }]} showNotifDot />
      <div className="page-body">

        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 18 }}>
          Track documents awaiting release, confirm claims, and manage disposal of unclaimed documents past the 90-day policy. Claimed and Shredded tabs show the current year. Archive contains prior-year records.
        </div>

        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <div className="info-text">{error}</div>
          </div>
        )}

        <div className="info-box warn" style={{ marginBottom: 18 }}>
          <span className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
          <div className="info-text">
            Per RO policy, documents unclaimed after <strong>90 days</strong> are flagged for shredding and payment is forfeited. Flagged documents remain searchable until shredding is confirmed.
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-grid stat-grid-4">
          <StatCard loading={loading} num={stats.release}      label="For Release"        color="#114B9F" bg="rgba(17,75,159,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M4 3l1.5 1.5L7 3l1.5 1.5L10 3l1.5 1.5L13 3l1.5 1.5L16 3l1.5 1.5L19 3v16l-1.5-1.5L16 19l-1.5 1.5L13 19l-1.5 1.5L10 19l-1.5 1.5L7 19l-1.5 1.5L4 19V3z"/></svg>} />
          <StatCard loading={loading} num={stats.claimed}      label={`Claimed (${currentYear})`}     color="#198754" bg="rgba(25,135,84,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
          <StatCard loading={loading} num={stats.pendingShred} label="Pending Shredding"   color="#FFA323" bg="rgba(255,163,35,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard loading={loading} num={stats.archive}      label="Archived Records"    color="#856404" bg="rgba(133,100,4,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>} />
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
                onClick={() => { setActiveTab(t.filter as any); setPage(1); setSelectedShredIds(new Set()); }}
              >
                {t.label} <span className="tab-count" style={{ color: isActive ? t.color : undefined }}>{t.count}</span>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>

            {/* Claimed tab — month filter */}
            {activeTab === 'claimed' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--mid-gray)', fontWeight: 600 }}>Month:</span>
                <MonthFilter value={claimedMonth} onChange={v => { setClaimedMonth(v); setPage(1); }} />
              </div>
            )}

            {/* Shredded tab — month filter (applies to confirmed Shredded only) */}
            {activeTab === 'shredded' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--mid-gray)', fontWeight: 600 }}>Shredded Month:</span>
                <MonthFilter value={shreddedMonth} onChange={v => { setShreddedMonth(v); setPage(1); }} />
              </div>
            )}

            {/* Archive tab — year + month filter */}
            {activeTab === 'archive' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--mid-gray)', fontWeight: 600 }}>Year:</span>
                <select
                  value={archiveYear ?? ''}
                  onChange={e => { setArchiveYear(e.target.value === '' ? null : parseInt(e.target.value)); setArchiveMonth(null); setPage(1); }}
                  style={{ fontSize: 12, height: 32, border: '1px solid var(--border-col)', borderRadius: 6, padding: '0 8px', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value=''>All Years</option>
                  {availableArchiveYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span style={{ fontSize: 12, color: 'var(--mid-gray)', fontWeight: 600 }}>Month:</span>
                <MonthFilter value={archiveMonth} onChange={v => { setArchiveMonth(v); setPage(1); }} />
              </div>
            )}
          </div>

          <div className="toolbar-right">
            <button
              className="btn-outline btn-sm"
              onClick={() => setSortMode(s => s === 'newest' ? 'oldest' : 'newest')}
              title={sortMode === 'newest' ? 'Sorted: Newest first' : 'Sorted: Oldest first'}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                {sortMode === 'newest'
                  ? <><path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/></>
                  : <><path d="M11 5h4"/><path d="M11 9h7"/><path d="M11 13h10"/><path d="M3 7l3-3 3 3"/><path d="M6 4v14"/></>}
              </svg>
              {sortMode === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" data-filter-btn="true" onClick={() => setFilterOpen(o => !o)} title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={(f) => { setActiveFilters(f); setFilterOpen(false); }}
                onReset={() => { setSelStatus(new Set()); setDateFrom(''); setDateTo(''); setActiveFilters(null); }}
                selectedStatus={selStatus} onToggleStatus={s => toggleChip(selStatus, s, setSelStatus)}
                statusOptions={[]}
                showFormType={false} showMode={false} showStaff={false}
                dateFrom={dateFrom} onDateFromChange={setDateFrom}
                dateTo={dateTo} onDateToChange={setDateTo}
              />
            </div>
            <div className="search-box" style={{ minWidth: 300 }}>
              <input type="text" placeholder="Search by name, request ID, or document..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              <Search size={13} color="var(--mid-gray)" />
            </div>
          </div>
        </div>

        {/* Bulk shred action bar */}
        {activeTab === 'shredded' && selectedShredIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(255,163,35,0.08)', border: '1px solid rgba(255,163,35,0.25)', borderRadius: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
              {selectedShredIds.size} selected
            </span>
            <button className="btn-primary btn-sm" onClick={() => setShredConfirmModal(true)}>
              Confirm Shredded
            </button>
            <button className="btn-outline btn-sm" onClick={() => setSelectedShredIds(new Set())}>
              Clear Selection
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--mid-gray)', fontSize: 14 }}>
            Loading...
          </div>
        )}

        {!loading && (
          <>
            <div className="table-wrap">
              <table className="drms-table">
                <thead>
                  <tr>
                    {activeTab === 'shredded' && (
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="cb"
                          checked={
                            pagedRows.filter(r => r.current_status === 'Pending Shredding').length > 0 &&
                            pagedRows.filter(r => r.current_status === 'Pending Shredding').every(r => selectedShredIds.has(r.request_id))
                          }
                          onChange={() => toggleSelectAllShred(pagedRows.filter(r => r.current_status === 'Pending Shredding'))}
                        />
                      </th>
                    )}
                    <th>Request ID</th>
                    <th>Requester</th>
                    <th>Document(s)</th>
                    <th>Submitted</th>
                    {activeTab === 'release'  && <th>Expected Claim</th>}
                    {activeTab === 'claimed'  && <th>Claimed On</th>}
                    {activeTab === 'shredded' && <th>Status</th>}
                    {activeTab === 'shredded' && <th>Flagged / Shredded</th>}
                    {activeTab === 'archive'  && <th>Status</th>}
                    {activeTab === 'archive'  && <th>Completed On</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(r => {
                    const reqId = formatRequestId(r.request_id, r.document_request_no);
                    const requester = r.requester_info
                      ? `${r.requester_info.last_name}, ${r.requester_info.first_name}`
                      : '—';
                    const docNames = r.requested_documents?.map(d => d.document_name).join(', ') ?? '—';
                    const isPendingShred = r.current_status === 'Pending Shredding';

                    return (
                      <tr
                        key={r.request_id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/staff/request/${r.request_id}`)}
                      >
                        {/* Shredded tab checkbox */}
                        {activeTab === 'shredded' && (
                          <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            {isPendingShred && (
                              <input
                                type="checkbox"
                                className="cb"
                                checked={selectedShredIds.has(r.request_id)}
                                onChange={() => toggleShredSelect(r.request_id)}
                              />
                            )}
                          </td>
                        )}

                        <td><span className="req-id">{reqId}</span></td>
                        <td>{requester}</td>
                        <td style={{ color: 'var(--mid-gray)', fontSize: 12 }}>{docNames}</td>
                        <td style={{ color: 'var(--mid-gray)' }}>{formatDate(r.date_submitted)}</td>

                        {/* For Release — expected claim date */}
                        {activeTab === 'release' && (
                          <td style={{ color: 'var(--mid-gray)' }}>{formatDate(r.expected_claim_date)}</td>
                        )}

                        {/* Claimed — actual claim date from transition log */}
                        {activeTab === 'claimed' && (
                          <td style={{ color: '#198754', fontWeight: 600 }}>
                            {formatDate(getTransitionLog(r, 'Claimed')?.timestamp ?? r.actual_claim_date)}
                          </td>
                        )}

                        {/* Shredded — status badge + flagged/shredded date */}
                        {activeTab === 'shredded' && (
                          <>
                            <td>
                              <span className={`badge ${isPendingShred ? 'b-rev' : 'b-sub'}`}>
                                {isPendingShred ? 'Pending Shredding' : 'Shredded'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--mid-gray)', fontSize: 12 }}>
                              {(() => {
                                const log = getTransitionLog(r, isPendingShred ? 'Pending Shredding' : 'Shredded');
                                if (!log) return '—';
                                const ago = daysAgo(log.timestamp);
                                return (
                                  <>
                                    {formatDate(log.timestamp)}
                                    {isPendingShred && ago !== null && (
                                      <div style={{ fontSize: 11, color: 'var(--mid-gray)' }}>
                                        Flagged {ago} day{ago !== 1 ? 's' : ''} ago
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </td>
                          </>
                        )}

                        {/* Archive — status + completed date */}
                        {activeTab === 'archive' && (
                          <>
                            <td>
                              <span className={`badge ${r.current_status === 'Claimed' ? 'b-done' : 'b-sub'}`}>
                                {r.current_status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--mid-gray)', fontSize: 12 }}>
                              {(() => {
                                const log = getTransitionLog(r, r.current_status === 'Claimed' ? 'Claimed' : 'Shredded');
                                return formatDate(log?.timestamp ?? null);
                              })()}
                            </td>
                          </>
                        )}

                        <td onClick={e => e.stopPropagation()}>
                          {activeTab === 'release' ? (
                            <button
                              className="btn-outline btn-sm"
                              disabled={updating === r.request_id}
                              onClick={() => openMarkClaimed(r.request_id)}
                            >
                              {updating === r.request_id ? 'Updating...' : 'Mark Claimed'}
                            </button>
                          ) : (
                            <button
                              className="btn-outline btn-sm"
                              onClick={() => router.push(`/staff/request/${r.request_id}`)}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {pagedRows.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--mid-gray)', fontSize: 13 }}>
                        {activeTab === 'archive' && archiveRows.length === 0
                          ? 'No archived records yet. Records from prior years will appear here automatically.'
                          : 'No requests found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={totalRows} itemsPerPage={10} onPageChange={p => setPage(p)} />
          </>
        )}
      </div>

      {/* ── Mark Claimed Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Mark as Claimed</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 20 }}>
              Enter the name of the person claiming the documents. Leave blank if the student claimed personally.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>
                Claimed By <span style={{ color: 'var(--mid-gray)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <input
                className="drms-input"
                type="text"
                placeholder="Full name of claimant"
                value={modalName}
                onChange={e => { setModalName(e.target.value); setModalError(''); }}
                autoFocus
              />
            </div>
            {modalError && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12 }}>{modalError}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}
                onClick={handleModalConfirm} disabled={!!updating}>
                {updating ? 'Saving...' : 'Confirm Claim'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center', padding: 10 }}
                onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Shredded Modal ── */}
      {shredConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShredConfirmModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Confirm Shredded</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Confirm physical destruction of <strong>{selectedShredIds.size}</strong> document{selectedShredIds.size !== 1 ? 's' : ''}? Today's date will be recorded as the shred date.
            </div>
            <div style={{ background: 'rgba(255,163,35,0.08)', border: '1px solid rgba(255,163,35,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7a4f00', marginBottom: 20, lineHeight: 1.6 }}>
              This action confirms the documents have been physically shredded. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ flex: 1, padding: 10, background: '#646363', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }}
                disabled={confirmingShred}
                onClick={handleConfirmShredded}
              >
                {confirmingShred ? 'Confirming...' : 'Yes, Confirm Shredded'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShredConfirmModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
