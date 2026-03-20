"use client";

import { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';

type ApiRequest = {
  request_id: number;
  form_type: string;
  academic_level: string;
  date_submitted: string;
  current_status: string;
  requested_documents?: { document_name: string; copies: number }[];
};

type ApiPayment = {
  payment_id: number;
  amount: string;
  payment_status: string;
  payment_date: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLORS = ['#114B9F','#001C43','#FFA323','#6D4DF5','#808EA1','#198754','#E50019'];

function StatCard({ num, label, color, bg, icon, loading }: {
  num: string | number; label: string; color: string; bg: string; icon: string; loading: boolean;
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
        <div className="stat-icon" style={{ background: bg, width: 32, height: 32, fontSize: 14 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [requests, setRequests]   = useState<ApiRequest[]>([]);
  const [payments, setPayments]   = useState<ApiPayment[]>([]);
  const [period, setPeriod]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // ── Fetch all data ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all requests (paginated — get up to 200)
        const [reqRes, payRes] = await Promise.all([
          fetch('http://localhost:8000/api/requests/?page_size=200'),
          fetch('http://localhost:8000/api/payments/?page_size=200'),
        ]);
        if (!reqRes.ok || !payRes.ok) throw new Error('API error');
        const reqData = await reqRes.json();
        const payData = await payRes.json();
        setRequests(reqData.results ?? reqData);
        setPayments(payData.results ?? payData);
      } catch {
        setError('Could not connect to the API. Make sure Django is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Available months (derived from actual data) ──────────────────────────
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const result: { value: string; label: string }[] = [];
    // Sort requests by date descending so newest months appear first
    const sorted = [...requests].sort((a, b) =>
      new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime()
    );
    sorted.forEach(r => {
      if (!r.date_submitted) return;
      const d = new Date(r.date_submitted);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seen.has(value)) {
        seen.add(value);
        result.push({
          value,
          label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        });
      }
    });
    return result;
  }, [requests]);

  // ── Filter requests/payments by selected period ───────────────────────────
  const filteredRequests = useMemo(() => {
    if (!period) return requests;
    return requests.filter(r => {
      if (!r.date_submitted) return false;
      const d = new Date(r.date_submitted);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return value === period;
    });
  }, [requests, period]);

  const filteredPayments = useMemo(() => {
    if (!period) return payments;
    return payments.filter(p => {
      const dateStr = p.payment_date || '';
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return value === period;
    });
  }, [payments, period]);

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = filteredRequests.length;
    const released  = filteredRequests.filter(r => r.current_status === 'Released').length;
    const inProgress = filteredRequests.filter(r =>
      ['Pending','Verifying','For Payment','Processing','Ready for Release'].includes(r.current_status)
    ).length;
    const college   = filteredRequests.filter(r => r.academic_level === 'College').length;
    const shs       = filteredRequests.filter(r => r.academic_level === 'SHS').length;
    const totalRevenue = filteredPayments
      .filter(p => p.payment_status === 'Paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const expiredSlips = 0; // Would need claimslips endpoint

    return { total, released, inProgress, college, shs, totalRevenue };
  }, [requests, payments]);

  // ── Status breakdown ──────────────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRequests.forEach(r => {
      counts[r.current_status] = (counts[r.current_status] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredRequests]);

  // ── Form type breakdown ───────────────────────────────────────────────────
  const formBreakdown = useMemo(() => ([
    { label: 'RO-0005 (Enrolled)', count: filteredRequests.filter(r => r.form_type === 'RO-0005').length, color: '#114B9F' },
    { label: 'RO-0004 (Transfer)', count: filteredRequests.filter(r => r.form_type === 'RO-0004').length, color: '#E50019' },
  ]), [filteredRequests]);

  // ── Submission mode breakdown ─────────────────────────────────────────────
  const modeBreakdown = useMemo(() => ([
    { label: 'Online',  count: filteredRequests.filter(r => (r as any).submission_mode === 'Online').length,  color: '#198754' },
    { label: 'Onsite',  count: filteredRequests.filter(r => (r as any).submission_mode === 'Onsite').length,  color: '#FFA323' },
  ]), [filteredRequests]);

  // ── Monthly volume (last 6 months) ────────────────────────────────────────
  const monthlyVolume = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    requests.forEach(r => {
      if (!r.date_submitted) return;
      const d = new Date(r.date_submitted);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (key in months) months[key]++;
    });
    return Object.entries(months);
  }, [requests]); // monthly always shows all time for context

  const maxMonthly = Math.max(...monthlyVolume.map(([, c]) => c), 1);

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Reports & Analytics' }]} showNotifDot />
      <div className="page-body">

        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon">⚠️</span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {/* Export row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 20 }}>
          <select className="drms-select" style={{ width: 180 }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="">All Time</option>
            {availableMonths.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button className="btn-outline" style={{ height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export PDF
          </button>
        </div>

        {/* KPI stat cards */}
        <div className="stat-grid stat-grid-5" style={{ marginBottom: 22 }}>
          <StatCard loading={loading} num={stats.total}      label="Total Requests"    color="#001C43" bg="#EEF4FB" icon="📋" />
          <StatCard loading={loading} num={stats.released}   label="Released"          color="#198754" bg="#EAFAF1" icon="✅" />
          <StatCard loading={loading} num={stats.inProgress} label="In Progress"       color="#FFA323" bg="#FFF8E1" icon="⏳" />
          <StatCard loading={loading} num={stats.college}    label="College Requests"  color="#114B9F" bg="#EBF5FB" icon="🎓" />
          <StatCard loading={loading} num={stats.shs}        label="SHS Requests"      color="#6D4DF5" bg="#F0EDFF" icon="📚" />
        </div>

        {/* Revenue + breakdown row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Total Revenue */}
          <div className="drms-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Total Revenue Collected
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#198754' }}>
              {loading ? '—' : `₱${stats.totalRevenue.toLocaleString()}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 4 }}>From paid requests</div>
          </div>

          {/* Form type breakdown */}
          <div className="drms-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              By Form Type
            </div>
            {formBreakdown.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--navy)' }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: f.color, minWidth: 24, textAlign: 'right' }}>
                  {loading ? '—' : f.count}
                </div>
                <div style={{ width: 80, height: 6, background: 'var(--light-gray)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: stats.total > 0 ? `${Math.round(f.count / stats.total * 100)}%` : '0%', background: f.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div className="drms-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              By Status
            </div>
            {loading ? (
              <div style={{ color: '#B1B1B1', fontSize: 13 }}>Loading...</div>
            ) : statusBreakdown.length === 0 ? (
              <div style={{ color: '#B1B1B1', fontSize: 13 }}>No data yet.</div>
            ) : (
              statusBreakdown.map(([status, count], i) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--navy)' }}>{status}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS[i % COLORS.length], minWidth: 24, textAlign: 'right' }}>{count}</div>
                  <div style={{ width: 80, height: 6, background: 'var(--light-gray)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: stats.total > 0 ? `${Math.round(count / stats.total * 100)}%` : '0%', background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly volume chart + Most requested */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Monthly volume — bar chart */}
          <div className="drms-card" style={{ padding: 20 }}>
            <div style={{ paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <span className="drms-card-title">Request Volume (Last 6 Months)</span>
            </div>
            {loading ? (
              <div style={{ color: '#B1B1B1', fontSize: 13, textAlign: 'center', padding: 40 }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingBottom: 24, position: 'relative' }}>
                {monthlyVolume.map(([month, count]) => (
                  <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{count || ''}</div>
                    <div style={{
                      width: '100%',
                      height: count > 0 ? `${Math.round(count / maxMonthly * 120)}px` : '4px',
                      background: count > 0 ? '#114B9F' : '#F5F5F5',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height .3s',
                      minHeight: 4,
                    }} />
                    <div style={{ fontSize: 10, color: 'var(--mid-gray)', textAlign: 'center' }}>{month}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most requested documents */}
          <div className="drms-card">
            <div className="drms-card-header">
              <span className="drms-card-title">Requests by Academic Level</span>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {loading ? (
                <div style={{ color: '#B1B1B1', fontSize: 13 }}>Loading...</div>
              ) : requests.length === 0 ? (
                <div style={{ color: '#B1B1B1', fontSize: 13, padding: '20px 0' }}>
                  No request data available yet.
                </div>
              ) : (
                <>
                  {/* College vs SHS */}
                  {[
                    { label: 'College', count: stats.college, color: '#114B9F' },
                    { label: 'Senior High School', count: stats.shs, color: '#001C43' },
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--navy)' }}>{d.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', minWidth: 30, textAlign: 'right' }}>{d.count}</div>
                      <div style={{ width: 120, height: 8, background: 'var(--light-gray)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: stats.total > 0 ? `${Math.round(d.count / stats.total * 100)}%` : '0%', background: d.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}

                  {/* Status summary */}
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                      Completion Rate
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 12, background: 'var(--light-gray)', borderRadius: 6 }}>
                        <div style={{
                          height: '100%',
                          width: stats.total > 0 ? `${Math.round(stats.released / stats.total * 100)}%` : '0%',
                          background: '#198754',
                          borderRadius: 6,
                          transition: 'width .3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#198754', minWidth: 40, textAlign: 'right' }}>
                        {stats.total > 0 ? `${Math.round(stats.released / stats.total * 100)}%` : '0%'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
                      {stats.released} of {stats.total} requests released
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
