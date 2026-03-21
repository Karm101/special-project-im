"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';
import { Pagination } from '../../components/drms/Pagination';
import { FilterPanel } from '../../components/drms/FilterPanel';

// ── API response type (matches DocumentRequestListSerializer) ─────────────
type ApiRow = {
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

// ── Helpers ───────────────────────────────────────────────────────────────

function statusToBadge(status: string): { cls: string; label: string } {
  switch (status) {
    case 'Pending':           return { cls: 'b-sub',  label: 'Submitted' };
    case 'Verifying':         return { cls: 'b-end',  label: 'For Endorsement' };
    case 'For Payment':       return { cls: 'b-rev',  label: 'For Review' };
    case 'Processing':        return { cls: 'b-apr',  label: 'For Approval' };
    case 'Ready for Release': return { cls: 'b-rel',  label: 'For Release' };
    case 'Released':          return { cls: 'b-done', label: 'Completed' };
    default:                  return { cls: 'b-sub',  label: status };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDoctype(row: ApiRow): string {
  const name = row.requester_name?.toLowerCase() || '';
  const status = row.current_status;
  // Derive doctype from form_type + academic_level for tab filtering
  if (row.academic_level === 'SHS') {
    // Will be refined when document name is available via detail endpoint
    return 'sf9sf10';
  }
  if (row.form_type === 'RO-0004') return 'hd';
  return 'other';
}

function statusToTabStatus(status: string): string {
  switch (status) {
    case 'Pending':
    case 'Verifying':         return 'pending';
    case 'For Payment':
    case 'Processing':        return 'processing';
    case 'Ready for Release':
    case 'Released':          return 'released';
    default:                  return 'pending';
  }
}

// ── Tab config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Submitted', 'For Endorsement', 'For Review', 'For Approval', 'For Release', 'Completed', 'Rejected'];

export default function DashboardPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────
  const [dept, setDept]             = useState<'college' | 'shs'>('college');
  const [collegeTab, setCollegeTab] = useState<string>('all');
  const [shsTab, setShsTab]         = useState<string>('all');

  // ── Restore dept + tab when navigating back from a request ────────────
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
  const [listView, setListView]     = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('drms_view') !== 'card';
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [search, setSearch]         = useState('');
  const [selStatus, setSelStatus]   = useState<Set<string>>(new Set());
  const [selForm, setSelForm]       = useState<Set<string>>(new Set());
  const [selMode, setSelMode]       = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [activeFilters, setActiveFilters] = useState<{statuses: Set<string>; formTypes: Set<string>; modes: Set<string>; dateFrom: string; dateTo: string} | null>(null);
  const [page, setPage] = useState(1);

  // ── API data ───────────────────────────────────────────────────────────
  const [collegeRows, setCollegeRows] = useState<ApiRow[]>([]);
  const [shsRows, setShsRows]         = useState<ApiRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── Fetch from Django API ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setError(null);
      try {
        const [collegeRes, shsRes] = await Promise.all([
          fetch('http://localhost:8000/api/requests/?academic_level=College'),
          fetch('http://localhost:8000/api/requests/?academic_level=SHS'),
        ]);
        if (!collegeRes.ok || !shsRes.ok) throw new Error('API error');
        const collegeData = await collegeRes.json();
        const shsData     = await shsRes.json();
        setCollegeRows(collegeData.results ?? collegeData);
        setShsRows(shsData.results ?? shsData);
      } catch (err) {
        setError('Could not connect to the API. Make sure Django is running on port 8000.');
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────
  const isCollege  = dept === 'college';
  // Reset page when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeTab  = isCollege ? collegeTab : shsTab;
  const setActiveTab = isCollege ? setCollegeTab : setShsTab;
  const allRows    = isCollege ? collegeRows : shsRows;

  // ── Stat counts (live from API data) ──────────────────────────────────
  const stats = useMemo(() => {
    if (isCollege) {
      return {
        tor:        collegeRows.filter(r => r.form_type === 'RO-0005').length,
        hd:         collegeRows.filter(r => r.form_type === 'RO-0004').length,
        pending:    collegeRows.filter(r => ['Pending', 'Verifying', 'For Payment'].includes(r.current_status)).length,
        released:   collegeRows.filter(r => r.current_status === 'Released').length,
      };
    } else {
      return {
        sf9:        shsRows.filter(r => r.form_type === 'RO-0005').length,
        sf10:       shsRows.filter(r => r.form_type === 'RO-0005').length,
        pending:    shsRows.filter(r => ['Pending', 'Verifying', 'For Payment'].includes(r.current_status)).length,
        released:   shsRows.filter(r => r.current_status === 'Released').length,
      };
    }
  }, [isCollege, collegeRows, shsRows]);

  // ── Tab definitions (counts from live data) ───────────────────────────
  const COLLEGE_TABS = [
    { label: 'All',                 filter: 'all',        count: collegeRows.length },
    { label: 'TOR',                 filter: 'tor',        count: collegeRows.filter(r => r.form_type === 'RO-0005').length },
    { label: 'Honorable Dismissal', filter: 'hd',         count: collegeRows.filter(r => r.form_type === 'RO-0004').length },
    { label: 'Pending',             filter: 'pending',    count: collegeRows.filter(r => ['Pending','Verifying'].includes(r.current_status)).length },
    { label: 'Processing',          filter: 'processing', count: collegeRows.filter(r => ['For Payment','Processing'].includes(r.current_status)).length },
    { label: 'Released',            filter: 'released',   count: collegeRows.filter(r => ['Ready for Release','Released'].includes(r.current_status)).length },
  ];

  const SHS_TABS = [
    { label: 'All',        filter: 'all',      count: shsRows.length },
    { label: 'SF9',        filter: 'sf9',      count: shsRows.filter(r => r.form_type === 'RO-0005').length },
    { label: 'SF10',       filter: 'sf10',     count: shsRows.filter(r => r.form_type === 'RO-0005').length },
    { label: 'SF9 + SF10', filter: 'sf9sf10',  count: shsRows.length },
    { label: 'Pending',    filter: 'pending',  count: shsRows.filter(r => ['Pending','Verifying'].includes(r.current_status)).length },
    { label: 'Released',   filter: 'released', count: shsRows.filter(r => ['Ready for Release','Released'].includes(r.current_status)).length },
  ];

  const tabs = isCollege ? COLLEGE_TABS : SHS_TABS;

  // ── Filter rows by active tab ──────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = [...allRows];

    // Tab filter
    if (activeTab === 'tor')        rows = rows.filter(r => r.form_type === 'RO-0005' && r.academic_level === 'College');
    else if (activeTab === 'hd')    rows = rows.filter(r => r.form_type === 'RO-0004');
    else if (activeTab === 'sf9' || activeTab === 'sf10' || activeTab === 'sf9sf10') rows = rows; // refine when doc names available
    else if (activeTab === 'pending')    rows = rows.filter(r => ['Pending', 'Verifying'].includes(r.current_status));
    else if (activeTab === 'processing') rows = rows.filter(r => ['For Payment', 'Processing'].includes(r.current_status));
    else if (activeTab === 'released')   rows = rows.filter(r => ['Ready for Release', 'Released'].includes(r.current_status));

    // Active filter chips
    if (activeFilters) {
      if (activeFilters.statuses.size > 0) {
        const statusMap: Record<string, string[]> = {
          'Submitted':       ['Pending'],
          'For Endorsement': ['Verifying'],
          'For Review':      ['For Payment'],
          'For Approval':    ['Processing'],
          'For Release':     ['Ready for Release'],
          'Completed':       ['Released'],
          'Rejected':        ['Rejected'],
        };
        rows = rows.filter(r => {
          return [...activeFilters.statuses].some(s => (statusMap[s] ?? [s]).includes(r.current_status));
        });
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

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        `REQ-${String(r.request_id).padStart(3, '0')}`.toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q) ||
        r.form_type.toLowerCase().includes(q) ||
        r.current_status.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [allRows, activeTab, search, activeFilters]);

  const totalRows = filteredRows.length;
  const paginatedRows = filteredRows.slice((page - 1) * 10, page * 10);

  const toggleChip = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  // ── Stat card component ────────────────────────────────────────────────
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
          <button className={`dt-btn${isCollege ? ' active' : ''}`} onClick={() => setDept('college')}>🎓 College</button>
          <button className={`dt-btn${!isCollege ? ' active' : ''}`} onClick={() => setDept('shs')}>📚 Senior High School</button>
        </div>

        {/* Stat cards */}
        {isCollege ? (
          <div className="stat-grid stat-grid-4">
            <StatCard borderColor="#114B9F" num={stats.tor}      numColor="#114B9F" label="TOR Requests"         bg="rgba(200, 206, 214, 0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#114B9F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>} />
            <StatCard borderColor="#E50019" num={stats.hd}       numColor="#E50019" label="Honorable Dismissal"  bg="rgba(240, 97, 116, 0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#E50019" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>} />
            <StatCard borderColor="#FFA323" num={stats.pending}  numColor="#FFA323" label="Pending Verification"  bg="rgba(255,163,35,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#FFA323" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
            <StatCard borderColor="#198754" num={stats.released} numColor="#198754" label="Released This Month"   bg="rgba(25,135,84,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
          </div>
        ) : (
          <div className="stat-grid stat-grid-4">
            <StatCard borderColor="#001C43" num={stats.sf9}      numColor="#114B9F" label="SF9 Requests"          bg="rgba(17,75,159,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#001C43" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>} />
            <StatCard borderColor="#E50019" num={stats.sf10}     numColor="#E50019" label="SF10 Requests"          bg="rgba(240, 97, 116, 0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#E50019" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>} />
            <StatCard borderColor="#FFA323" num={stats.pending}  numColor="#FFA323" label="Pending Verification"   bg="rgba(255,163,35,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#FFA323" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
            <StatCard borderColor="#198754" num={stats.released} numColor="#198754" label="Released This Month"    bg="rgba(25,135,84,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#198754" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
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
            <div key={t.filter} className={`tab${activeTab === t.filter ? ' active' : ''}`} onClick={() => setActiveTab(t.filter)}>
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
            <button className={`view-btn${listView ? ' active' : ''}`} onClick={() => { setListView(true); localStorage.setItem('drms_view', 'list'); }} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button className={`view-btn${!listView ? ' active' : ''}`} onClick={() => { setListView(false); localStorage.setItem('drms_view', 'card'); }} title="Card view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>

          <div className="toolbar-right">
            <div style={{ position: 'relative' }}>
              <button className="btn-filter" data-filter-btn="true" onClick={() => setFilterOpen(o => !o)} title="Filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </button>
              <FilterPanel
                open={filterOpen} onClose={() => setFilterOpen(false)}
                onApply={(f) => { setActiveFilters(f); setFilterOpen(false); }}
                onReset={() => { setSelStatus(new Set()); setSelForm(new Set()); setSelMode(new Set()); setDateFrom(''); setDateTo(''); setActiveFilters(null); }}
                selectedStatus={selStatus}  onToggleStatus={(s: string) => toggleChip(selStatus, s, setSelStatus)}
                statusOptions={STATUS_OPTIONS}
                selectedFormType={selForm}  onToggleFormType={(s: string) => toggleChip(selForm, s, setSelForm)}
                selectedMode={selMode}      onToggleMode={(s: string) => toggleChip(selMode, s, setSelMode)}
                dateFrom={dateFrom} onDateFromChange={setDateFrom}
                dateTo={dateTo}     onDateToChange={setDateTo}
              />
            </div>
            <div className="search-box" style={{ minWidth: 320 }}>
              <input type="text" placeholder="Search by name, request ID, status..." value={search} onChange={e => setSearch(e.target.value)} />
              <Search size={13} color="#B1B1B1" />
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>
            Loading requests...
          </div>
        )}

        {/* ── List view ── */}
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
                      <td><span className="req-id">#{reqId}</span></td>
                      <td>{r.requester_name}</td>
                      <td>{r.form_type}</td>
                      <td style={{ color: '#B1B1B1' }}>{r.submission_mode}</td>
                      <td style={{ color: '#B1B1B1' }}>{formatDate(r.date_submitted)}</td>
                      <td style={{ color: '#B1B1B1' }}>{formatDate(r.expected_claim_date)}</td>
                      <td>{r.assigned_staff_name ?? '—'}</td>
                      <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${reqId}`)}>View</button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedRows.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#B1B1B1', fontSize: 13 }}>No requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalItems={totalRows} itemsPerPage={10} onPageChange={p => setPage(p)} />
          </>
        )}

        {/* ── Card / Grid view ── */}
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>#{reqId}</span>
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
                    <button className="btn-outline btn-sm" onClick={e => { e.stopPropagation(); router.push(`/staff/request/${reqId}`); }}>View</button>
                  </div>
                </div>
              );
            })}
            {paginatedRows.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#B1B1B1', fontSize: 13 }}>No requests found.</div>
            )}
          </div>
          <Pagination currentPage={page} totalItems={totalRows} itemsPerPage={10} onPageChange={p => setPage(p)} />
          </>
        )}
      </div>
    </>
  );
}
