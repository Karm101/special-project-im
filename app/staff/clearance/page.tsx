"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Pagination } from '../../components/drms/Pagination';
import { Topbar } from '../../components/drms/Topbar';

// ── API types ─────────────────────────────────────────────────────────────────
type ApiClearance = {
  clearance_id: number;
  request: number;
  office_name: string;
  processed_by: string | null;
  date_processed: string | null;
  clearance_status: 'Pending' | 'Cleared' | 'Not Applicable';
  remarks: string | null;
};

type ApiRequest = {
  request_id: number;
  form_type: string;
  date_submitted: string;
  current_status: string;
  requester_info: {
    first_name: string;
    last_name: string;
    program_strand: string;
    academic_level: string;
  } | null;
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

function statusBadge(s: string) {
  if (s === 'Cleared')         return <span className="badge badge-cleared"  style={{ fontSize: 12 }}>Cleared</span>;
  if (s === 'Not Applicable')  return <span className="badge badge-na"        style={{ fontSize: 12 }}>Not Applicable</span>;
  return                              <span className="badge badge-pending"   style={{ fontSize: 12 }}>Pending</span>;
}

export default function ClearancePage() {
  const router = useRouter();
  const [search, setSearch]           = useState('');
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [updating, setUpdating]       = useState<number | null>(null);
  const [page, setPage]               = useState(1);

  // ── API state ─────────────────────────────────────────────────────────────
  const [ro4Requests, setRo4Requests] = useState<ApiRequest[]>([]);
  const [clearances, setClearances]   = useState<Record<number, ApiClearance[]>>({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── Fetch all RO-0004 requests + their clearances ─────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Get all requests filtered by RO-0004 form type
        const res = await fetch('http://localhost:8000/api/requests/?search=RO-0004');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const all: ApiRequest[] = data.results ?? data;
        // Filter to only RO-0004
        const filtered = all.filter(r => r.form_type === 'RO-0004');
        setRo4Requests(filtered);

        if (filtered.length > 0) {
          setSelectedId(filtered[0].request_id);
          // Fetch clearances for each RO-0004 request
          const clrMap: Record<number, ApiClearance[]> = {};
          await Promise.all(
            filtered.map(async r => {
              const clrRes = await fetch(`http://localhost:8000/api/clearances/?request=${r.request_id}`);
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
    fetchData();
  }, []);

  // ── Mark a clearance office as Cleared ───────────────────────────────────
  async function handleMarkCleared(clearanceId: number, requestId: number) {
    setUpdating(clearanceId);
    try {
      const processedBy = prompt('Processed by (name):') ?? 'RO Staff';
      const res = await fetch(`http://localhost:8000/api/clearances/${clearanceId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearance_status: 'Cleared',
          processed_by: processedBy,
          date_processed: new Date().toISOString().split('T')[0],
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      // Refresh clearances for this request
      const refreshed = await fetch(`http://localhost:8000/api/clearances/?request=${requestId}`);
      const data = await refreshed.json();
      setClearances(prev => ({ ...prev, [requestId]: data.results ?? data }));
    } catch {
      alert('Failed to update clearance. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedRequest = ro4Requests.find(r => r.request_id === selectedId) ?? null;
  const selectedClearances = selectedId ? (clearances[selectedId] ?? []) : [];

  const clearedCount = selectedClearances.filter(c => c.clearance_status === 'Cleared').length;
  const totalCount   = selectedClearances.filter(c => c.clearance_status !== 'Not Applicable').length;
  const progressPct  = totalCount > 0 ? Math.round(clearedCount / totalCount * 100) : 0;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const allClearances = Object.values(clearances).flat();
    return {
      active:   ro4Requests.length,
      pending:  allClearances.filter(c => c.clearance_status === 'Pending').length,
      cleared:  allClearances.filter(c => c.clearance_status === 'Cleared').length,
      overdue:  ro4Requests.filter(r => r.current_status === 'Pending' || r.current_status === 'Verifying').length,
    };
  }, [ro4Requests, clearances]);

  // ── Filtered request list ─────────────────────────────────────────────────
  const visibleRequests = useMemo(() => {
    if (!search.trim()) return ro4Requests;
    const q = search.toLowerCase();
    return ro4Requests.filter(r => {
      const name = r.requester_info
        ? `${r.requester_info.last_name}, ${r.requester_info.first_name}`.toLowerCase()
        : '';
      const id = `REQ-${String(r.request_id).padStart(3, '0')}`.toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [ro4Requests, search]);

  const pagedRequests = visibleRequests.slice((page - 1) * 10, page * 10);

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
          <StatCard loading={loading} num={stats.active}   label="Active TC Requests"   color="#114B9F" bg="rgba(17,75,159,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
          <StatCard loading={loading} num={stats.pending}  label="Pending Clearances"   color="#FFA323" bg="rgba(255,163,35,0.12)" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard loading={loading} num={stats.cleared}  label="Cleared This Month"   color="#198754" bg="rgba(25,135,84,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M12 2l8 4v6c0 4.4-3.3 8.5-8 10-4.7-1.5-8-5.6-8-10V6l8-4z"/><polyline points="9 12 11 14 15 10"/></svg>} />
          <StatCard loading={loading} num={stats.overdue}  label="Overdue Clearances"   color="#E50019" bg="rgba(240, 97, 116, 0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>
            Loading clearance data...
          </div>
        )}

        {!loading && ro4Requests.length === 0 && (
          <div className="info-box" style={{ marginTop: 8 }}>
            <span className="info-icon">ℹ️</span>
            <div className="info-text">
              No RO-0004 (Transfer Credential) requests found. Clearance tracking only applies to TC requests.
            </div>
          </div>
        )}

        {!loading && ro4Requests.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>

            {/* ── Left: Request list ── */}
            <div className="drms-card">
              <div className="drms-card-header">
                <span className="drms-card-title">TC Requests (RO-0004)</span>
              </div>
              {/* Search */}
              <div style={{ padding: '10px 12px 4px' }}>
                <div className="search-box" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                  <input
                    type="text"
                    placeholder="Search requester..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <Search size={13} color="var(--mid-gray)" />
                </div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {pagedRequests.map((r, i) => {
                  const reqId     = `REQ-${String(r.request_id).padStart(3, '0')}`;
                  const name      = r.requester_info
                    ? `${r.requester_info.last_name}, ${r.requester_info.first_name}`
                    : '—';
                  const clrs      = clearances[r.request_id] ?? [];
                  const clrCount  = clrs.filter(c => c.clearance_status === 'Cleared').length;
                  const totalClr  = clrs.filter(c => c.clearance_status !== 'Not Applicable').length;
                  const isSelected = selectedId === r.request_id;

                  const pagedRequests = visibleRequests.slice((page - 1) * 10, page * 10);

  return (
                    <div
                      key={r.request_id}
                      onClick={() => setSelectedId(r.request_id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: i < pagedRequests.length - 1 ? '1px solid var(--border-col)' : 'none',
                        background: isSelected ? 'rgba(125,179,255,0.1)' : 'var(--surface)',
                        borderLeft: isSelected ? '3px solid var(--navy)' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        #{reqId} — {name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 3 }}>
                        Submitted {formatDate(r.date_submitted)} · {r.requester_info?.program_strand ?? '—'}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span
                          className={`badge ${clrCount === 0 ? 'badge-pending' : clrCount === totalClr ? 'b-done' : 'badge-verifying'}`}
                          style={{ fontSize: 12 }}
                        >
                          {clrCount} of {totalClr} Cleared
                        </span>
                      </div>
                    </div>
                  );
                })}
                {visibleRequests.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13 }}>
                    No requests match your search.
                  </div>
                )}
              </div>
              <div style={{ padding: '4px 12px' }}>
                <Pagination currentPage={page} totalItems={visibleRequests.length} itemsPerPage={10} onPageChange={p => setPage(p)} />
              </div>
            </div>

            {/* ── Right: Clearance detail ── */}
            {selectedRequest && (
              <div className="drms-card">
                <div className="drms-card-header">
                  <span className="drms-card-title">
                    Clearance Status — #REQ-{String(selectedRequest.request_id).padStart(3, '0')} {' '}
                    {selectedRequest.requester_info
                      ? `${selectedRequest.requester_info.last_name}, ${selectedRequest.requester_info.first_name}`
                      : ''}
                  </span>
                  <span
                    className={`badge ${clearedCount === 0 ? 'badge-pending' : clearedCount === totalCount ? 'b-done' : 'badge-verifying'}`}
                    style={{ fontSize: 12 }}
                  >
                    {clearedCount} / {totalCount} Offices Cleared
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '14px 20px 0' }}>
                  <div style={{ background: 'var(--light-gray)', height: 8, borderRadius: 4 }}>
                    <div style={{ background: 'var(--blue)', height: '100%', width: `${progressPct}%`, borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
                    {clearedCount} of {totalCount} offices have cleared this request
                  </div>
                </div>

                {/* Office rows */}
                <div style={{ padding: '12px 20px' }}>
                  {selectedClearances.length === 0 ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13 }}>
                      No clearance records found for this request.
                      <br />
                      <span style={{ fontSize: 12 }}>Clearance records are created when a TC request is submitted.</span>
                    </div>
                  ) : (
                    selectedClearances.map((c, i) => (
                      <div key={c.clearance_id} className="cl-row">
                        <div className="cl-num">{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div className="cl-office">{c.office_name}</div>
                          {c.processed_by && c.processed_by !== 'N/A' && c.processed_by !== '—' && (
                            <div className="cl-by">
                              By: {c.processed_by}
                              {c.date_processed ? ` · ${formatDate(c.date_processed)}` : ''}
                            </div>
                          )}
                          {c.remarks && (
                            <div style={{ fontSize: 11, color: 'var(--mid-gray)', fontStyle: 'italic', marginTop: 2 }}>
                              {c.remarks}
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 130, textAlign: 'right' }}>
                          {statusBadge(c.clearance_status)}
                        </div>
                        {c.clearance_status === 'Pending' && (
                          <button
                            className="btn-outline btn-sm"
                            style={{ marginLeft: 8, whiteSpace: 'nowrap' }}
                            disabled={updating === c.clearance_id}
                            onClick={() => handleMarkCleared(c.clearance_id, selectedRequest.request_id)}
                          >
                            {updating === c.clearance_id ? 'Updating...' : 'Mark Cleared'}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* View full request button */}
                <div style={{ padding: '0 20px 16px' }}>
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => router.push(`/staff/request/REQ-${String(selectedRequest.request_id).padStart(3, '0')}`)}
                  >
                    View Full Request →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
