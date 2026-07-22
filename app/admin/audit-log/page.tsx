"use client";

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/lib_api';

// ── Icons ────────────────────────────────────────────────────────────────────
const IcoSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoChevL  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="15 18 9 12 15 6"/></svg>;
const IcoChevR  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><polyline points="9 18 15 12 9 6"/></svg>;

// ── Types ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  log_id:              number;
  timestamp:           string;
  status:              string;
  remarks:             string | null;
  staff_id:            number | null;
  staff_name:          string | null;
  request_id:          number;
  document_request_no: string | null;
  requester_name:      string | null;
}

interface StaffOption {
  staff_id: number;
  first_name: string;
  last_name: string;
  role: string;
}

const STATUS_OPTIONS = [
  'Pending', 'For Validation', 'Invalid Request', 'For Clearance',
  'For Billing', 'For Payment', 'Paid', 'For Processing',
  'For Printing', 'For Release', 'Claimed', 'Pending Shredding',
  'Shredded', 'Rejected',
];

const PAGE_SIZE = 25;
const PH_TZ = 'Asia/Manila';

// ── Helpers ──────────────────────────────────────────────────────────────────
function authHeaders() {
  const token = sessionStorage.getItem('auth_token');
  return { 'Content-Type': 'application/json', Authorization: `Token ${token}` };
}

function formatRequestId(requestId: number, documentRequestNo?: string | null): string {
  return documentRequestNo ?? `REQ-${String(requestId).padStart(3, '0')}`;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: PH_TZ,
  });
}

function statusBadgeColors(s: string): { bg: string; color: string } {
  if (['Claimed', 'Paid'].includes(s))                       return { bg: 'rgba(25,135,84,0.12)',  color: '#198754' };
  if (['Rejected', 'Invalid Request', 'Shredded'].includes(s)) return { bg: 'rgba(229,0,25,0.1)', color: '#E50019' };
  if (['For Release', 'Pending Shredding'].includes(s))      return { bg: 'rgba(255,163,35,0.14)', color: '#B87400' };
  return { bg: 'rgba(17,75,159,0.1)', color: '#114B9F' };
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminAuditLogPage() {
  const [entries, setEntries]   = useState<AuditEntry[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);

  // Filters
  const [staffList, setStaffList]     = useState<StaffOption[]>([]);
  const [filterStaff, setFilterStaff] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [search, setSearch]           = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  // ── Fetch staff list once (for the filter dropdown) ────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/staff/?page_size=200`);
        if (!res.ok) return;
        const data = await res.json();
        setStaffList((data.results ?? data).filter((s: StaffOption) => s.role !== 'Clearance Office'));
      } catch { /* dropdown just stays empty */ }
    })();
  }, []);

  // ── Fetch log entries (server-side filtered + paginated) ───────────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (filterStaff)  params.set('staff_id', filterStaff);
      if (filterStatus) params.set('status', filterStatus);
      if (dateFrom)     params.set('date_from', dateFrom);
      if (dateTo)       params.set('date_to', dateTo);
      if (search)       params.set('search', search);
      const res = await fetch(`${API_BASE}/admin/audit-log/?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      setError('Could not load the audit log. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [page, filterStaff, filterStatus, dateFrom, dateTo, search]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetToFirstPage() { setPage(1); }

  const selStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 12.5, borderRadius: 8,
    border: '1px solid var(--border-col)', background: 'var(--surface)',
    color: 'var(--text-primary)', cursor: 'pointer',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Audit Log</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 2 }}>
          Every status change across all requests, with the responsible staff member. Cron-driven changes appear as <strong>System</strong>.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select style={selStyle} value={filterStaff}
          onChange={e => { setFilterStaff(e.target.value); resetToFirstPage(); }}>
          <option value="">All staff</option>
          <option value="system">System (automated)</option>
          {staffList.map(s => (
            <option key={s.staff_id} value={s.staff_id}>{s.last_name}, {s.first_name}</option>
          ))}
        </select>
        <select style={selStyle} value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); resetToFirstPage(); }}>
          <option value="">All actions</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" style={selStyle} value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); resetToFirstPage(); }} title="From date" />
        <span style={{ fontSize: 12, color: 'var(--mid-gray)' }}>to</span>
        <input type="date" style={selStyle} value={dateTo}
          onChange={e => { setDateTo(e.target.value); resetToFirstPage(); }} title="To date" />
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <input
            type="text" placeholder="Search request no, student, remarks…"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchDraft.trim()); resetToFirstPage(); } }}
            style={{ ...selStyle, cursor: 'text', minWidth: 260, paddingRight: 32 }}
          />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid-gray)', display: 'flex', cursor: 'pointer' }}
            onClick={() => { setSearch(searchDraft.trim()); resetToFirstPage(); }}>
            <IcoSearch />
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="info-box warn" style={{ marginBottom: 12 }}>
          <div className="info-text">{error}</div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-col)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="drms-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Staff</th>
                <th>Action</th>
                <th>Request</th>
                <th>Requester</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--mid-gray)', fontSize: 13 }}>Loading audit entries…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--mid-gray)', fontSize: 13 }}>No audit entries match the current filters.</td></tr>
              ) : entries.map(e => {
                const colors = statusBadgeColors(e.status);
                return (
                  <tr key={e.log_id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatTimestamp(e.timestamp)}</td>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                      {e.staff_name ?? <span style={{ color: 'var(--mid-gray)', fontStyle: 'italic' }}>System</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: colors.bg, color: colors.color, whiteSpace: 'nowrap' }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatRequestId(e.request_id, e.document_request_no)}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{e.requester_name ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--mid-gray)', maxWidth: 320 }}>{e.remarks || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--border-col)' }}>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>
            {total} entr{total === 1 ? 'y' : 'ies'} · page {page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-outline btn-sm" disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IcoChevL /> Prev
            </button>
            <button className="btn-outline btn-sm" disabled={page >= totalPages || loading}
              onClick={() => setPage(p => p + 1)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Next <IcoChevR />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
