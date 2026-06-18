"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { Pagination } from '../../components/drms/Pagination';
import { FilterPanel } from '../../components/drms/FilterPanel';
import { API_BASE } from '@/lib/lib_api';

// ── API response type ─────────────────────────────────────────────────────
type ApiRow = {
  request_id: number;
  document_request_no: string | null;
  requester_name: string;
  form_type: string;
  academic_level: string;
  submission_mode: string;
  date_submitted: string;
  expected_claim_date: string | null;
  assigned_staff_name: string | null;
  current_status: string;
};

// ── Status groups ─────────────────────────────────────────────────────────
const PENDING_STATUSES    = ['Pending', 'For Validation', 'For Clearance', 'Invalid Request'];
const PROCESSING_STATUSES = ['For Billing', 'For Payment', 'Paid', 'For Processing', 'For Printing'];
const FORRELEASE_STATUSES = ['For Release'];
const CLAIMED_STATUSES    = ['Claimed', 'Shredded'];
const REJECTED_STATUSES   = ['Rejected', 'Invalid Request'];

// ── Helpers ───────────────────────────────────────────────────────────────
function statusToBadge(status: string): { cls: string; label: string } {
  switch (status) {
    case 'Pending':         return { cls: 'b-sub',  label: 'Submitted' };
    case 'For Validation':  return { cls: 'b-end',  label: 'For Validation' };
    case 'Invalid Request': return { cls: 'b-rej',  label: 'Invalid Request' };
    case 'For Clearance':   return { cls: 'b-rev',  label: 'For Clearance' };
    case 'For Billing':     return { cls: 'b-rev',  label: 'For Billing' };
    case 'For Payment':     return { cls: 'b-rev',  label: 'For Payment' };
    case 'Paid':            return { cls: 'b-apr',  label: 'Paid' };
    case 'For Processing':  return { cls: 'b-apr',  label: 'For Processing' };
    case 'For Printing':    return { cls: 'b-apr',  label: 'For Printing' };
    case 'For Release':     return { cls: 'b-rel',  label: 'For Release' };
    case 'Claimed':         return { cls: 'b-done', label: 'Claimed' };
    case 'Shredded':        return { cls: 'b-rej',  label: 'Shredded' };
    case 'Rejected':        return { cls: 'b-rej',  label: 'Rejected' };
    default:                return { cls: 'b-sub',  label: status };
  }
}

function formatRequestId(requestId: number, documentRequestNo?: string | null): string {
  return documentRequestNo ?? `REQ-${String(requestId).padStart(3, '0')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Filter panel status options ───────────────────────────────────────────
const STATUS_OPTIONS = [
  'Pending', 'For Validation', 'Invalid Request', 'For Clearance',
  'For Billing', 'For Payment', 'Paid', 'For Processing',
  'For Printing', 'For Release', 'Claimed', 'Shredded', 'Rejected',
];

function getStatusPriority(status: string): number {
  switch (status) {
    case 'Pending':
    case 'For Validation':  return 1;
    case 'For Clearance':
    case 'Invalid Request': return 2;
    case 'For Billing':
    case 'For Payment':     return 3;
    case 'Paid':
    case 'For Processing':
    case 'For Printing':    return 4;
    case 'For Release':     return 5;
    case 'Claimed':
    case 'Shredded':
    case 'Rejected':        return 6;
    default:                return 3;
  }
}

export default function DashboardPage() {
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────────
  const [dept, setDept]               = useState<'college' | 'shs'>('college');
  const [collegeTab, setCollegeTab]   = useState<string>('all');
  const [shsTab, setShsTab]           = useState<string>('all');
  const [sortMode, setSortMode]     = useState<'priority' | 'newest'>('newest');

  // Restore dept + tab when navigating back
  useEffect(() => {
    const savedDept = sessionStorage.getItem('dashboard_dept') as 'college' | 'shs' | null;
    const savedTab  = sessionStorage.getItem('dashboard_tab');
    if (savedDept) { setDept(savedDept); sessionStorage.removeItem('dashboard_dept'); }
    if (savedTab) {
      if (savedDept === 'shs') setShsTab(savedTab);
      else setCollegeTab(savedTab);
      sessionStorage.removeItem('dashboard_tab');
    }
  }, []);

  const [listView, setListView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('drms_view') !== 'card';
  });
  const [filterOpen, setFilterOpen]   = useState(false);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [search, setSearch]           = useState('');
  const [selStatus, setSelStatus]     = useState<Set<string>>(new Set());
  const [selForm, setSelForm]         = useState<Set<string>>(new Set());
  const [selMode, setSelMode]         = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    statuses: Set<string>; formTypes: Set<string>; modes: Set<string>; dateFrom: string; dateTo: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  // ── API data ──────────────────────────────────────────────────────────
  const [collegeRows, setCollegeRows] = useState<ApiRow[]>([]);
  const [shsRows, setShsRows]         = useState<ApiRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setError(null);
      try {
        const [collegeRes, shsRes] = await Promise.all([
          fetch(`${API_BASE}/requests/?academic_level=College`),
          fetch(`${API_BASE}/requests/?academic_level=SHS`),
        ]);
        if (!collegeRes.ok || !shsRes.ok) throw new Error('API error');
        const collegeData = await collegeRes.json();
        const shsData     = await shsRes.json();
        setCollegeRows(collegeData.results ?? collegeData);
        setShsRows(shsData.results ?? shsData);
      } catch {
        setError('Could not connect to the API. Make sure Django is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  // ── Derived values ────────────────────────────────────────────────────
  const isCollege    = dept === 'college';
  const activeTab    = isCollege ? collegeTab : shsTab;
  const setActiveTab = isCollege ? setCollegeTab : setShsTab;
  const allRows      = isCollege ? collegeRows : shsRows;

  // ── Stat counts ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const rows = isCollege ? collegeRows : shsRows;
    return {
      tor:      collegeRows.filter(r => r.form_type === 'RO-0005').length,
      hd:       collegeRows.filter(r => r.form_type === 'RO-0004').length,
      sf9:      shsRows.filter(r => r.form_type === 'RO-0005').length,
      sf10:     shsRows.filter(r => r.form_type === 'RO-0005').length,
      pending:  rows.filter(r => PENDING_STATUSES.includes(r.current_status)).length,
      processing: rows.filter(r => PROCESSING_STATUSES.includes(r.current_status)).length,
      forrelease: rows.filter(r => r.current_status === 'For Release').length,
      claimed:  rows.filter(r => CLAIMED_STATUSES.includes(r.current_status)).length,
    };
  }, [isCollege, collegeRows, shsRows]);

  // ── Tab definitions ───────────────────────────────────────────────────
  const COLLEGE_TABS = [
    { label: 'All',                filter: 'all',         count: collegeRows.length },
    { label: 'TOR',                filter: 'tor',         count: collegeRows.filter(r => r.form_type === 'RO-0005').length },
    { label: 'Honorable Dismissal',filter: 'hd',          count: collegeRows.filter(r => r.form_type === 'RO-0004').length },
    { label: 'Pending',            filter: 'pending',     count: collegeRows.filter(r => PENDING_STATUSES.includes(r.current_status)).length },
    { label: 'Processing',         filter: 'processing',  count: collegeRows.filter(r => PROCESSING_STATUSES.includes(r.current_status)).length },
    { label: 'For Release',        filter: 'forrelease',  count: collegeRows.filter(r => r.current_status === 'For Release').length },
    { label: 'Claimed',            filter: 'claimed',     count: collegeRows.filter(r => CLAIMED_STATUSES.includes(r.current_status)).length },
    { label: 'Rejected',           filter: 'rejected',    count: collegeRows.filter(r => REJECTED_STATUSES.includes(r.current_status)).length },
  ];

  const SHS_TABS = [
    { label: 'All',         filter: 'all',        count: shsRows.length },
    { label: 'SF9',         filter: 'sf9',        count: shsRows.filter(r => r.form_type === 'RO-0005').length },
    { label: 'SF10',        filter: 'sf10',       count: shsRows.filter(r => r.form_type === 'RO-0005').length },
    { label: 'Pending',     filter: 'pending',    count: shsRows.filter(r => PENDING_STATUSES.includes(r.current_status)).length },
    { label: 'Processing',  filter: 'processing', count: shsRows.filter(r => PROCESSING_STATUSES.includes(r.current_status)).length },
    { label: 'For Release', filter: 'forrelease', count: shsRows.filter(r => r.current_status === 'For Release').length },
    { label: 'Claimed',     filter: 'claimed',    count: shsRows.filter(r => CLAIMED_STATUSES.includes(r.current_status)).length },
    { label: 'Rejected',    filter: 'rejected',   count: shsRows.filter(r => REJECTED_STATUSES.includes(r.current_status)).length },
  ];

  const tabs = isCollege ? COLLEGE_TABS : SHS_TABS;

  // ── Filter rows by active tab + search + filter panel ────────────────
  const filteredRows = useMemo(() => {
    let rows = [...allRows];

    // Tab filter
    switch (activeTab) {
      case 'tor':        rows = rows.filter(r => r.form_type === 'RO-0005' && r.academic_level === 'College'); break;
      case 'hd':         rows = rows.filter(r => r.form_type === 'RO-0004'); break;
      case 'sf9':        rows = rows.filter(r => r.form_type === 'RO-0005' && r.academic_level === 'SHS'); break;
      case 'sf10':       rows = rows.filter(r => r.form_type === 'RO-0005' && r.academic_level === 'SHS'); break;
      case 'pending':    rows = rows.filter(r => PENDING_STATUSES.includes(r.current_status)); break;
      case 'processing': rows = rows.filter(r => PROCESSING_STATUSES.includes(r.current_status)); break;
      case 'forrelease': rows = rows.filter(r => r.current_status === 'For Release'); break;
      case 'claimed':    rows = rows.filter(r => CLAIMED_STATUSES.includes(r.current_status)); break;
      case 'rejected':   rows = rows.filter(r => REJECTED_STATUSES.includes(r.current_status)); break;
    }

    // Filter panel
    if (activeFilters) {
      if (activeFilters.statuses.size > 0) {
        rows = rows.filter(r => activeFilters.statuses.has(r.current_status));
      }
      if (activeFilters.formTypes.size > 0) {
        rows = rows.filter(r => activeFilters.formTypes.has(r.form_type));
      }
      if (activeFilters.modes.size > 0) {
        rows = rows.filter(r => activeFilters.modes.has(r.submission_mode));
      }
      if (activeFilters.dateFrom) {
        rows = rows.filter(r => r.date_submitted >= activeFilters.dateFrom);
      }
      if (activeFilters.dateTo) {
        rows = rows.filter(r => r.date_submitted <= activeFilters.dateTo);
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        formatRequestId(r.request_id, r.document_request_no).toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q) ||
        r.form_type.toLowerCase().includes(q) ||
        r.current_status.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortMode === 'newest') {
      rows.sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime());
    } else {
      rows.sort((a, b) => {
        const priorityDiff = getStatusPriority(a.current_status) - getStatusPriority(b.current_status);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime();
      });
    }

    return rows;
  }, [allRows, activeTab, search, activeFilters, sortMode]);

  const totalRows     = filteredRows.length;
  const paginatedRows = filteredRows.slice((page - 1) * 10, page * 10);

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  // ── Stat card ─────────────────────────────────────────────────────────
  const StatCard = ({ borderColor, num, numColor, label, bg, icon }: {
    borderColor: string; num: number; numColor: string; label: string; bg: string; icon: React.ReactNode;
  }) => (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 18, border: '1px solid var(--border-col)', borderBottom: `3px solid ${borderColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: numColor }}>{loading ? '—' : num}</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>{label}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: numColor }}>
          {icon}
        </div>
      </div>
    </div>
  );

  const DocIcon = ({ stroke }: { stroke: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  );
  const ClockIcon = ({ stroke }: { stroke: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  const CheckIcon = ({ stroke }: { stroke: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  const GearIcon = ({ stroke }: { stroke: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests' }]} showNotifDot />
      <div className="page-body">

        {/* Error banner */}
        {error && (
          <div className="info-box warn" style={{ marginBottom: 14 }}>
            <span className="info-icon">⚠️</span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {/* Dept toggle */}
        <div className="dept-toggle">
          <button className={`dt-btn${isCollege ? ' active' : ''}`} onClick={() => setDept('college')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            College
          </button>
          <button className={`dt-btn${!isCollege ? ' active' : ''}`} onClick={() => setDept('shs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Senior High School
          </button>
        </div>

        {/* Stat cards */}
        {isCollege ? (
          <div className="stat-grid stat-grid-4">
            <StatCard borderColor="#114B9F" num={stats.tor}        numColor="#114B9F" label="TOR Requests"        bg="rgba(17,75,159,0.12)"   icon={<DocIcon stroke="#114B9F" />} />
            <StatCard borderColor="#E50019" num={stats.hd}         numColor="#E50019" label="Honorable Dismissal" bg="rgba(229,0,25,0.12)"    icon={<DocIcon stroke="#E50019" />} />
            <StatCard borderColor="#FFA323" num={stats.pending}    numColor="#FFA323" label="Pending / Validation" bg="rgba(255,163,35,0.12)" icon={<ClockIcon stroke="#FFA323" />} />
            <StatCard borderColor="#198754" num={stats.processing} numColor="#198754" label="In Processing"       bg="rgba(25,135,84,0.12)"   icon={<GearIcon stroke="#198754" />} />
          </div>
        ) : (
          <div className="stat-grid stat-grid-4">
            <StatCard borderColor="#114B9F" num={stats.sf9}        numColor="#114B9F" label="SF9 Requests"        bg="rgba(17,75,159,0.12)"   icon={<DocIcon stroke="#114B9F" />} />
            <StatCard borderColor="#E50019" num={stats.sf10}       numColor="#E50019" label="SF10 Requests"       bg="rgba(229,0,25,0.12)"    icon={<DocIcon stroke="#E50019" />} />
            <StatCard borderColor="#FFA323" num={stats.pending}    numColor="#FFA323" label="Pending / Validation" bg="rgba(255,163,35,0.12)" icon={<ClockIcon stroke="#FFA323" />} />
            <StatCard borderColor="#198754" num={stats.processing} numColor="#198754" label="In Processing"       bg="rgba(25,135,84,0.12)"   icon={<GearIcon stroke="#198754" />} />
          </div>
        )}

        {/* Info box */}
        <div className="info-box" style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
          <div className="info-text">
            {isCollege
              ? <><strong>College-level</strong> requests: Transcript of Records and Honorable Dismissal.</>
              : <><strong>SHS-level</strong> requests: SF9 (Report Card) and SF10 (Permanent Record).</>}
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {tabs.map(t => (
            <div key={t.filter} className={`tab${activeTab === t.filter ? ' active' : ''}`}
              onClick={() => { setActiveTab(t.filter); setPage(1); }}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        {/* Bulk select bar */}
        <div className={`bulk-bar${bulkVisible ? ' visible' : ''}`}>
          <button className="bulk-close" onClick={() => setBulkVisible(false)}>✕</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#001C43' }}>Selected</span>
          <button className="btn-primary btn-sm" style={{ marginLeft: 8 }}>✓ Mark as Processing</button>
          <button className="btn-outline btn-sm">Export Selected</button>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="view-toggle">
            <button className={`view-btn${listView ? ' active' : ''}`}
              onClick={() => { setListView(true); localStorage.setItem('drms_view', 'list'); }} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button className={`view-btn${!listView ? ' active' : ''}`}
              onClick={() => { setListView(false); localStorage.setItem('drms_view', 'card'); }} title="Card view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>

          <div className="toolbar-right">
            <button
              className="btn-outline btn-sm"
              onClick={() => setSortMode(s => s === 'priority' ? 'newest' : 'priority')}
              title={sortMode === 'priority' ? 'Sorted by priority' : 'Sorted by newest'}
              style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {sortMode === 'priority' ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Priority
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Newest
                </>
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" data-filter-btn="true"
                onClick={() => setFilterOpen(o => !o)} title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={(f) => { setActiveFilters(f); setFilterOpen(false); setPage(1); }}
                onReset={() => { setSelStatus(new Set()); setSelForm(new Set()); setSelMode(new Set()); setDateFrom(''); setDateTo(''); setActiveFilters(null); }}
                selectedStatus={selStatus}   onToggleStatus={(s: string) => toggleChip(selStatus, s, setSelStatus)}
                statusOptions={STATUS_OPTIONS}
                selectedFormType={selForm}   onToggleFormType={(s: string) => toggleChip(selForm, s, setSelForm)}
                selectedMode={selMode}       onToggleMode={(s: string) => toggleChip(selMode, s, setSelMode)}
                dateFrom={dateFrom}          onDateFromChange={setDateFrom}
                dateTo={dateTo}              onDateToChange={setDateTo}
              />
            </div>
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search by name, request ID, status..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>
            Loading requests...
          </div>
        )}

        {/* List view */}
        {!loading && listView && (
          <>
            <div className="table-wrap">
              <table className="drms-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" className="cb" onChange={e => setBulkVisible(e.target.checked)} /></th>
                    <th>Request ID</th><th>Requester Name</th><th>Form Type</th>
                    <th>Mode</th><th>Date Submitted</th><th>Expected Claim</th>
                    <th>Assigned Staff</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map(r => {
                    const badge = statusToBadge(r.current_status);
                    const reqId = `REQ-${String(r.request_id).padStart(3, '0')}`;
                    return (
                      <tr key={r.request_id} onClick={() => {
                        sessionStorage.setItem('dashboard_dept', dept);
                        sessionStorage.setItem('dashboard_tab', activeTab);
                        router.push(`/staff/request/${reqId}`);
                      }}>
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="cb" />
                        </td>
                        <td><span className="req-id">{formatRequestId(r.request_id, r.document_request_no)}</span></td>
                        <td>{r.requester_name}</td>
                        <td>{r.form_type}</td>
                        <td style={{ color: '#B1B1B1' }}>{r.submission_mode}</td>
                        <td style={{ color: '#B1B1B1' }}>{formatDate(r.date_submitted)}</td>
                        <td style={{ color: '#B1B1B1' }}>{formatDate(r.expected_claim_date)}</td>
                        <td>{r.assigned_staff_name ?? '—'}</td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn-outline btn-sm"
                            onClick={() => router.push(`/staff/request/${reqId}`)}>View</button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedRows.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>
                        No requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalItems={totalRows} itemsPerPage={10} onPageChange={p => setPage(p)} />
          </>
        )}

        {/* Card view */}
        {!loading && !listView && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {paginatedRows.map(r => {
                const badge = statusToBadge(r.current_status);
                const reqId = `REQ-${String(r.request_id).padStart(3, '0')}`;
                return (
                  <div key={r.request_id}
                    onClick={() => {
                      sessionStorage.setItem('dashboard_dept', dept);
                      sessionStorage.setItem('dashboard_tab', activeTab);
                      router.push(`/staff/request/${reqId}`);
                    }}
                    style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-col)', padding: 16, cursor: 'pointer', transition: 'all .18s', display: 'flex', flexDirection: 'column', gap: 10 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,28,67,.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{formatRequestId(r.request_id, r.document_request_no)}</span>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{r.requester_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 2 }}>{r.form_type} · {r.academic_level}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: 'var(--surface-2)', color: 'var(--text-primary)' }}>{r.form_type}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: 'var(--surface-2)', color: 'var(--text-primary)' }}>{r.submission_mode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,.05)', paddingTop: 10, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--mid-gray)' }}>Submitted {formatShortDate(r.date_submitted)}</span>
                      <button className="btn-outline btn-sm"
                        onClick={e => { e.stopPropagation(); router.push(`/staff/request/${reqId}`); }}>View</button>
                    </div>
                  </div>
                );
              })}
              {paginatedRows.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#B1B1B1', fontSize: 13 }}>
                  No requests found.
                </div>
              )}
            </div>
            <Pagination currentPage={page} totalItems={totalRows} itemsPerPage={10} onPageChange={p => setPage(p)} />
          </>
        )}
      </div>
    </>
  );
}
