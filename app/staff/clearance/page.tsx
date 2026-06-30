"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Pagination } from '../../components/drms/Pagination';
import { Topbar } from '../../components/drms/Topbar';
import { API_BASE } from '@/lib/lib_api';

// ── API types ─────────────────────────────────────────────────────────────────
type ApiClearance = {
  clearance_id:     number;
  request:          number;
  office_name:      string;
  processed_by:     string | null;
  date_processed:   string | null;
  clearance_status: 'Pending' | 'Cleared' | 'Not Applicable';
  remarks:          string | null;
  cleared_at:       string | null;
  cleared_by_name:  string | null;
  signature_image_url: string | null;
};

type ApiRequest = {
  request_id: number;
  document_request_no: string | null;
  form_type: string;
  date_submitted: string;
  current_status: string;
  requester_info: {
    first_name: string;
    last_name: string;
    program_strand: string;
    academic_level: string;
  } | null;
  requested_documents?: { document_name: string }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}

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

// ── Detail modal (mirrors RO-0004 clearance table) ────────────────────────────
function ClearanceDetailModal({ c, onClose }: { c: ApiClearance; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 640, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: '#001C43', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>CLEARANCE DETAILS</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '28%' }}>Department / Office</th>
                <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '36%' }}>PROCESSED BY: (name &amp; signature)</th>
                <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '18%' }}>Date</th>
                <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '18%' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '10px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 600, color: '#001C43' }}>{c.office_name}</div>
                </td>
                <td style={{ border: '1px solid #ccc', padding: '10px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#001C43', marginBottom: 8 }}>{c.cleared_by_name ?? '—'}</div>
                  {c.signature_image_url ? (
                    <img src={c.signature_image_url} alt="E-signature" style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', border: '1px solid #eee', borderRadius: 4, padding: 4, background: '#fafafa' }} />
                  ) : (
                    <div style={{ fontSize: 11, color: '#B1B1B1', fontStyle: 'italic' }}>No signature on file</div>
                  )}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '10px', verticalAlign: 'top' }}>
                  <div style={{ color: '#001C43' }}>{formatDate(c.cleared_at)}</div>
                </td>
                <td style={{ border: '1px solid #ccc', padding: '10px', verticalAlign: 'top' }}>
                  <div style={{ color: '#001C43' }}>{c.remarks ?? '—'}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 16, fontSize: 11, color: '#B1B1B1', textAlign: 'right' }}>
            Mapúa Malayan Colleges Mindanao — Registrar's Office
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRequestId(requestId: number, documentRequestNo?: string | null): string {
  return documentRequestNo ?? `REQ-${String(requestId).padStart(3, '0')}`;
}

export default function ClearancePage() {
  const router = useRouter();
  const [search, setSearch]             = useState('');
  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [page, setPage]                 = useState(1);
  const [detailModal, setDetailModal]   = useState<ApiClearance | null>(null);
  const [formFilter, setFormFilter]     = useState<'all' | 'RO-0004' | 'RO-0005'>('all');
  const [docFilter, setDocFilter]       = useState<string>('all');
  const [filterOpen, setFilterOpen]     = useState(false);
  const filterBtnRef = useRef<HTMLDivElement>(null);
  const [filterPos, setFilterPos]   = useState({ top: 0, left: 0 });
  const [sortMode, setSortMode]     = useState<'priority' | 'newest'>('newest');

  // Add/Remove office
  const [removeModal, setRemoveModal]         = useState<ApiClearance | null>(null);
  const [removing, setRemoving]               = useState(false);
  const [addOfficeModal, setAddOfficeModal]   = useState<number | null>(null);
  const [configOffices, setConfigOffices]     = useState<string[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<Set<string>>(new Set());
  const [freeTextOffice, setFreeTextOffice]   = useState('');
  const [addOfficeLoading, setAddOfficeLoading] = useState(false);
  const [addOfficeError, setAddOfficeError]     = useState('');

  // API state
  const [ro4Requests, setRo4Requests]   = useState<ApiRequest[]>([]);
  const [clearances, setClearances]     = useState<Record<number, ApiClearance[]>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // ── Fetch data ────────────────────────────────────────────────────────────
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/requests/?page_size=200`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const all: ApiRequest[] = data.results ?? data;
      // Only show requests that are in For Clearance or have clearance records
      const CLEARANCE_RELEVANT = ['For Clearance', 'For Billing', 'For Payment', 'Paid', 'For Processing', 'For Printing', 'For Release', 'Claimed'];
      const filtered = all.filter(r =>
        (r.form_type === 'RO-0004' || r.form_type === 'RO-0005') &&
        CLEARANCE_RELEVANT.includes(r.current_status)
      );
      setRo4Requests(filtered);

      if (filtered.length > 0) {
        const sorted = [...filtered].sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime());
        setSelectedId(prev => prev ?? sorted[0].request_id);
        const clrMap: Record<number, ApiClearance[]> = {};
        await Promise.all(
          filtered.map(async r => {
            const clrRes = await fetch(`${API_BASE}/clearances/?request=${r.request_id}`);
            if (clrRes.ok) {
              const clrData = await clrRes.json();
              clrMap[r.request_id] = clrData.results ?? clrData;
            } else {
              clrMap[r.request_id] = [];
            }
          })
        );
        setClearances(clrMap);
      }
    } catch {
      setError('Could not connect to the API. Make sure Django is running.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-panel]') && !target.closest('[data-filter-btn]')) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Refresh clearances for selected request only ──────────────────────────
  async function refreshSelected(requestId: number) {
    try {
      const clrRes = await fetch(`${API_BASE}/clearances/?request=${requestId}`);
      if (clrRes.ok) {
        const clrData = await clrRes.json();
        setClearances(prev => ({ ...prev, [requestId]: clrData.results ?? clrData }));
      }
    } catch {}
  }

  async function handleRemoveOffice() {
    if (!removeModal) return;
    setRemoving(true);
    try {
      const res = await fetch(`${API_BASE}/clearance/${removeModal.clearance_id}/remove/`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? 'Failed to remove.'); return; }
      setRemoveModal(null);
      if (selectedRequest) await refreshSelected(selectedRequest.request_id);
    } catch { alert('Could not connect to server.'); }
    finally { setRemoving(false); }
  }

  async function openAddOfficeModal(requestId: number) {
    try {
      const res = await fetch(`${API_BASE}/clearance-office/office-names/`);
      if (res.ok) {
        const names: string[] = await res.json();
        setConfigOffices(names);
      }
    } catch {}
    setSelectedOffices(new Set());
    setFreeTextOffice('');
    setAddOfficeError('');
    setAddOfficeModal(requestId);
  }

  async function handleAddOffices() {
    if (!addOfficeModal) return;
    const toAdd = [...Array.from(selectedOffices), ...(freeTextOffice.trim() ? [freeTextOffice.trim()] : [])];
    if (toAdd.length === 0) { setAddOfficeError('Select at least one office or enter a name.'); return; }
    setAddOfficeLoading(true);
    setAddOfficeError('');
    try {
      const results = await Promise.all(
        toAdd.map(office_name =>
          fetch(`${API_BASE}/requests/${addOfficeModal}/add-clearance-office/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ office_name }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        setAddOfficeError(`${failed.length} office(s) could not be added — they may already exist.`);
      } else {
        setAddOfficeModal(null);
        if (selectedRequest) await refreshSelected(selectedRequest.request_id);
      }
    } catch { setAddOfficeError('Could not connect to server.'); }
    finally { setAddOfficeLoading(false); }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedRequest    = ro4Requests.find(r => r.request_id === selectedId) ?? null;
  const selectedClearances = selectedId ? (clearances[selectedId] ?? []) : [];
  const clearedCount       = selectedClearances.filter(c => c.clearance_status === 'Cleared').length;
  const totalCount         = selectedClearances.filter(c => c.clearance_status !== 'Not Applicable').length;
  const progressPct        = totalCount > 0 ? Math.round(clearedCount / totalCount * 100) : 0;

  const stats = useMemo(() => {
    const allClearances = Object.values(clearances).flat();
    return {
      active:  ro4Requests.length,
      pending: allClearances.filter(c => c.clearance_status === 'Pending').length,
      cleared: allClearances.filter(c => c.clearance_status === 'Cleared').length,
      full:    ro4Requests.filter(r => {
        const clrs = clearances[r.request_id] ?? [];
        const total = clrs.filter(c => c.clearance_status !== 'Not Applicable').length;
        const done  = clrs.filter(c => c.clearance_status === 'Cleared').length;
        return total > 0 && done === total;
      }).length,
    };
  }, [ro4Requests, clearances]);

  // Document type options based on form filter
  const docTypeOptions = useMemo(() => {
    const ro4Docs = ['Transcript of Record', 'Honorable Dismissal', 'SF10', 'SF9', 'Diploma', 'Certified True Copy', 'Special Order', 'Certification'];
    const ro5Docs = ['Transcript of Record', 'Honorable Dismissal', 'SF10', 'SF9', 'Diploma', 'Certified True Copy', 'Special Order', 'Certification'];
    if (formFilter === 'RO-0004') return ro4Docs;
    if (formFilter === 'RO-0005') return ro5Docs;
    return [...new Set([...ro4Docs, ...ro5Docs])];
  }, [formFilter]);

  const visibleRequests = useMemo(() => {
    let rows = [...ro4Requests];

    // Sort
    if (sortMode === 'newest') {
      rows.sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime());
    } else {
      rows.sort((a, b) => {
        const aClrs = clearances[a.request_id] ?? [];
        const bClrs = clearances[b.request_id] ?? [];
        const aPending = aClrs.filter(c => c.clearance_status !== 'Cleared').length;
        const bPending = bClrs.filter(c => c.clearance_status !== 'Cleared').length;
        if (bPending !== aPending) return bPending - aPending;
        return new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime();
      });
    }

    // Form type filter
    if (formFilter !== 'all') rows = rows.filter(r => r.form_type === formFilter);

    // Document type filter
    if (docFilter !== 'all') {
      rows = rows.filter(r =>
        r.requested_documents?.some(d =>
          d.document_name.toLowerCase().includes(docFilter.toLowerCase())
        )
      );
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => {
        const name = r.requester_info
          ? `${r.requester_info.last_name}, ${r.requester_info.first_name}`.toLowerCase()
          : '';
        const id = formatRequestId(r.request_id, r.document_request_no).toLowerCase();
        return name.includes(q) || id.includes(q);
      });
    }

    return rows;
  }, [ro4Requests, search, formFilter, docFilter, sortMode, clearances]);

  const pagedRequests = visibleRequests.slice((page - 1) * 9, page * 9);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Clearance Tracking' }]} showNotifDot />
      <div className="page-body">

        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon">⚠️</span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {/* Stat cards */}
        <div className="stat-grid stat-grid-4">
          <StatCard loading={loading} num={stats.active}  label="Total Requests"  color="#114B9F" bg="rgba(17,75,159,0.12)"     icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
          <StatCard loading={loading} num={stats.pending} label="Pending Clearances"  color="#FFA323" bg="rgba(255,163,35,0.12)"    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard loading={loading} num={stats.cleared} label="Cleared Offices"     color="#198754" bg="rgba(25,135,84,0.12)"     icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M12 2l8 4v6c0 4.4-3.3 8.5-8 10-4.7-1.5-8-5.6-8-10V6l8-4z"/><polyline points="9 12 11 14 15 10"/></svg>} />
          <StatCard loading={loading} num={stats.full}    label="Fully Cleared"       color="#198754" bg="rgba(25,135,84,0.08)"     icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polyline points="20 6 9 17 4 12"/></svg>} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>
            Loading clearance data...
          </div>
        )}

        {!loading && ro4Requests.length === 0 && (
          <div className="info-box" style={{ marginTop: 8 }}>
            <span className="info-icon">ℹ️</span>
            <div className="info-text">No document requests found.</div>
          </div>
        )}

        {!loading && ro4Requests.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>

            {/* ── Left: Request list ── */}
            <div className="drms-card">
              <div style={{ padding: '14px 12px 8px', borderBottom: '1px solid var(--border-col)' }}>
                {/* Row 1: dropdown + icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <select
                    value={formFilter}
                    onChange={e => { setFormFilter(e.target.value as 'all' | 'RO-0004' | 'RO-0005'); setDocFilter('all'); setPage(1); }}
                    style={{
                      flex: 1, minWidth: 0, width: 0,
                      fontSize: 12, height: 32,
                      border: '1px solid var(--border-col)',
                      borderRadius: 6, padding: '0 8px',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    <option value="all">All Document Requests</option>
                    <option value="RO-0004">RO-0004</option>
                    <option value="RO-0005">RO-0005</option>
                  </select>

                  {/* Filter button */}
                  <div style={{ position: 'relative' }} ref={filterBtnRef}>
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => {
                        if (filterBtnRef.current) {
                          const rect = filterBtnRef.current.getBoundingClientRect();
                          setFilterPos({ top: rect.bottom + 6, left: rect.left });
                        }
                        setFilterOpen(o => !o);
                      }}
                      title="Filter by document type"
                      data-filter-btn="true"
                      style={{ position: 'relative', padding: '0 10px', height: 32 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                      </svg>
                      {docFilter !== 'all' && (
                        <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: '#114B9F', borderRadius: '50%' }} />
                      )}
                    </button>

                    {filterOpen && (
                      <div style={{ position: 'fixed', top: filterPos.top, left: filterPos.left, background: 'white', border: '1px solid rgba(0,0,0,.1)', borderRadius: 10, padding: 14, width: 220, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}
                        data-filter-panel="true"
                        onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Document Type</div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 12, color: 'var(--navy)' }}>
                          <input type="radio" name="doc_filter" checked={docFilter === 'all'} onChange={() => { setDocFilter('all'); setFilterOpen(false); }} style={{ accentColor: '#114B9F' }} />
                          All types
                        </label>
                        {docTypeOptions.map(opt => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 12, color: 'var(--navy)' }}>
                            <input type="radio" name="doc_filter" checked={docFilter === opt} onChange={() => { setDocFilter(opt); setFilterOpen(false); }} style={{ accentColor: '#114B9F' }} />
                            {opt}
                          </label>
                        ))}
                        {docFilter !== 'all' && (
                          <button className="btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => { setDocFilter('all'); setFilterOpen(false); }}>
                            Clear filter
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sort toggle */}
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => setSortMode(s => s === 'priority' ? 'newest' : 'priority')}
                    title={sortMode === 'priority' ? 'Sorted by priority' : 'Sorted by newest'}
                    style={{ padding: '0 10px', height: 32, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                  >
                    {sortMode === 'priority' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    )}
                  </button>

                  {/* Refresh button */}
                  <button className="btn-outline btn-sm" onClick={fetchData} title="Refresh" style={{ padding: '0 10px', height: 32 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                  </button>
                </div>

                {/* Row 2: active filter chip */}
                {docFilter !== 'all' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span
                      style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 50, background: 'rgba(17,75,159,0.1)', color: '#114B9F', border: '1px solid rgba(17,75,159,0.2)', cursor: 'pointer' }}
                      onClick={() => setDocFilter('all')}
                    >
                      {docFilter} ✕
                    </span>
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 12px 4px' }}>
                <div className="search-box" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <input type="text" placeholder="Search requester..." value={search} onChange={e => setSearch(e.target.value)} />
                  <Search size={13} color="var(--mid-gray)" />
                </div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {pagedRequests.map((r, i) => {
                  const name       = r.requester_info ? `${r.requester_info.last_name}, ${r.requester_info.first_name}` : '—';
                  const clrs       = clearances[r.request_id] ?? [];
                  const clrCount   = clrs.filter(c => c.clearance_status === 'Cleared').length;
                  const totalClr   = clrs.filter(c => c.clearance_status !== 'Not Applicable').length;
                  const isSelected = selectedId === r.request_id;
                  const allDone    = totalClr > 0 && clrCount === totalClr;
                  return (
                    <div key={r.request_id} onClick={() => setSelectedId(r.request_id)} style={{ padding: '12px 16px', borderBottom: i < pagedRequests.length - 1 ? '1px solid var(--border-col)' : 'none', background: isSelected ? 'rgba(125,179,255,0.1)' : 'var(--surface)', borderLeft: isSelected ? '3px solid var(--navy)' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.12s' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatRequestId(r.request_id, r.document_request_no)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 3 }}>
                        {formatDate(r.date_submitted)} · {r.form_type} · {r.requester_info?.program_strand ?? '—'}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span className={`badge ${allDone ? 'b-done' : clrCount > 0 ? 'b-apr' : 'b-rev'}`} style={{ fontSize: 11 }}>
                          {clrCount} of {totalClr} Cleared
                        </span>
                      </div>
                    </div>
                  );
                })}
                {visibleRequests.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13 }}>No requests match your search.</div>
                )}
              </div>
              <div style={{ padding: '4px 12px' }}>
                <Pagination currentPage={page} totalItems={visibleRequests.length} itemsPerPage={9} onPageChange={p => setPage(p)} />
              </div>
            </div>

            {/* ── Right: Clearance detail ── */}
            {selectedRequest && (
              <div className="drms-card">
                <div className="drms-card-header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formatRequestId(selectedRequest.request_id, selectedRequest.document_request_no)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedRequest.requester_info
                          ? `${selectedRequest.requester_info.last_name}, ${selectedRequest.requester_info.first_name}`
                          : '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 2 }}>
                      {selectedRequest.form_type} · {selectedRequest.current_status}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${clearedCount === totalCount && totalCount > 0 ? 'b-done' : clearedCount > 0 ? 'b-apr' : 'b-rev'}`} style={{ fontSize: 11 }}>
                      {clearedCount} / {totalCount} Offices Cleared
                    </span>
                    <button className="btn-outline btn-sm" onClick={() => refreshSelected(selectedRequest.request_id)} title="Refresh">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '14px 20px 0' }}>
                  <div style={{ background: 'var(--light-gray)', height: 8, borderRadius: 4 }}>
                    <div style={{ background: progressPct === 100 ? '#198754' : 'var(--blue)', height: '100%', width: `${progressPct}%`, borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
                    {clearedCount} of {totalCount} offices cleared · {progressPct}%
                  </div>
                </div>

                {/* Office rows */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedClearances.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13 }}>
                      No clearance records found for this request.
                    </div>
                  ) : (
                    selectedClearances.map(c => {
                      const isCleared = c.clearance_status === 'Cleared';
                      return (
                        <div key={c.clearance_id} style={{ border: `1px solid ${isCleared ? 'rgba(25,135,84,0.3)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 10, padding: '12px 16px', background: isCleared ? 'rgba(25,135,84,0.04)' : 'var(--surface)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isCleared ? 6 : 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isCleared ? '#198754' : '#FFA323', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                              {isCleared ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.office_name}</div>
                              {isCleared && (
                                <div style={{ fontSize: 11, color: '#198754', marginTop: 2 }}>
                                  Cleared by {c.cleared_by_name} · {formatDate(c.cleared_at)}
                                </div>
                              )}
                            </div>
                            <span className={`badge ${isCleared ? 'b-done' : 'b-rev'}`} style={{ fontSize: 11 }}>
                              {isCleared ? 'Cleared' : 'Pending'}
                            </span>
                          </div>
                          {isCleared && (
                            <button onClick={() => setDetailModal(c)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 600, color: '#114B9F', cursor: 'pointer', textDecoration: 'underline' }}>
                              View Clearance Details
                            </button>
                          )}
                          {!isCleared && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                className="btn-outline btn-sm"
                                style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: '#E50019', borderColor: '#E50019' }}
                                onClick={() => setRemoveModal(c)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add office */}
                <div style={{ padding: '0 20px 8px' }}>
                  <button
                    className="btn-outline btn-sm"
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => openAddOfficeModal(selectedRequest.request_id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Office
                  </button>
                </div>

                {/* View full request */}
                <div style={{ padding: '0 20px 16px' }}>
                  <button className="btn-outline btn-sm" onClick={() => router.push(`/staff/request/${selectedRequest.request_id}`)}>
                    View Full Request →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove Office Modal */}
      {removeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setRemoveModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Office</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Remove <strong>{removeModal.office_name}</strong> from this request?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              This only affects this request. The office configuration is not changed. You can add it back at any time.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif" }} disabled={removing} onClick={handleRemoveOffice}>
                {removing ? 'Removing...' : 'Yes, Remove'}
              </button>
              <button className="btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRemoveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Office Modal */}
      {addOfficeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setAddOfficeModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Add Clearance Office</div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 16 }}>Select from the configured list or enter a new office name.</div>

            {configOffices.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Configured offices</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-col)', borderRadius: 8, padding: 10 }}>
                  {configOffices.map(name => {
                    const alreadyIn = (selectedClearances ?? []).some(c => c.office_name === name);
                    return (
                      <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadyIn ? 'not-allowed' : 'pointer', opacity: alreadyIn ? 0.4 : 1 }}>
                        <input type="checkbox" checked={selectedOffices.has(name)} disabled={alreadyIn}
                          onChange={e => { const next = new Set(selectedOffices); e.target.checked ? next.add(name) : next.delete(name); setSelectedOffices(next); }}
                          style={{ width: 15, height: 15, accentColor: '#114B9F' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{name}</span>
                        {alreadyIn && <span style={{ fontSize: 11, color: 'var(--mid-gray)', fontStyle: 'italic' }}>already added</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>New office name</div>
              <input type="text" placeholder="e.g. Program Chair" value={freeTextOffice}
                onChange={e => { setFreeTextOffice(e.target.value); setAddOfficeError(''); }}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid var(--border-col)', borderRadius: 8, fontFamily: "'Montserrat',sans-serif", outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
            </div>

            {addOfficeError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12 }}>{addOfficeError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ flex: 1, padding: 10, background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif" }}
                disabled={addOfficeLoading} onClick={handleAddOffices}
              >
                {addOfficeLoading ? 'Adding...' : `Add ${selectedOffices.size + (freeTextOffice.trim() ? 1 : 0) || ''} Office${selectedOffices.size + (freeTextOffice.trim() ? 1 : 0) !== 1 ? 's' : ''}`}
              </button>
              <button className="btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAddOfficeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <ClearanceDetailModal c={detailModal} onClose={() => setDetailModal(null)} />
      )}
    </>
  );
}