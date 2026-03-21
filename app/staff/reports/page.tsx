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

export default function ReportsPage() {
  const [requests, setRequests]   = useState<ApiRequest[]>([]);
  const [payments, setPayments]   = useState<ApiPayment[]>([]);
  const [period, setPeriod]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // ── Export modal state ────────────────────────────────────────────────────
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode]           = useState<'all' | 'current' | 'pick'>('current');
  const [pickedMonths, setPickedMonths]       = useState<Set<string>>(new Set());

  function togglePickedMonth(val: string) {
    setPickedMonths(prev => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  }

  // ── Fetch all data ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all requests (paginated — get up to 200)
        const [reqRes, payRes] = await Promise.all([
          fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/requests/?page_size=200'),
          fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/?page_size=200'),
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
    { label: 'RO-0005 · College', count: filteredRequests.filter(r => r.form_type === 'RO-0005' && r.academic_level === 'College').length, color: '#114B9F' },
    { label: 'RO-0005 · SHS',     count: filteredRequests.filter(r => r.form_type === 'RO-0005' && r.academic_level === 'SHS').length,     color: '#6D4DF5' },
    { label: 'RO-0004 · Transfer',count: filteredRequests.filter(r => r.form_type === 'RO-0004').length,                                   color: '#E50019' },
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

  // ── PDF generator — accepts custom dataset + label ────────────────────────
  function generatePDF(exportReqs: ApiRequest[], exportPays: ApiPayment[], periodLabel: string) {
    const total      = exportReqs.length;
    const released   = exportReqs.filter(r => r.current_status === 'Released').length;
    const inProgress = exportReqs.filter(r => ['Pending','Verifying','For Payment','Processing','Ready for Release'].includes(r.current_status)).length;
    const college    = exportReqs.filter(r => r.academic_level === 'College').length;
    const shs        = exportReqs.filter(r => r.academic_level === 'SHS').length;
    const revenue    = exportPays.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + parseFloat(p.amount || '0'), 0);

    const statusCounts: Record<string, number> = {};
    exportReqs.forEach(r => { statusCounts[r.current_status] = (statusCounts[r.current_status] || 0) + 1; });
    const statusRows = Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).map(([s,c]) =>
      `<tr><td>${s}</td><td style="text-align:right;font-weight:700">${c}</td><td style="text-align:right">${total > 0 ? Math.round(c/total*100) : 0}%</td></tr>`
    ).join('');

    const fBreakdown = [
      { label: 'RO-0005 · College', count: exportReqs.filter(r => r.form_type==='RO-0005' && r.academic_level==='College').length, color:'#114B9F' },
      { label: 'RO-0005 · SHS',     count: exportReqs.filter(r => r.form_type==='RO-0005' && r.academic_level==='SHS').length,     color:'#6D4DF5' },
      { label: 'RO-0004 · Transfer',count: exportReqs.filter(r => r.form_type==='RO-0004').length,                                 color:'#E50019' },
    ];
    const formRows = fBreakdown.map(f =>
      `<tr><td>${f.label}</td><td style="text-align:right;font-weight:700;color:${f.color}">${f.count}</td><td style="text-align:right">${total > 0 ? Math.round(f.count/total*100) : 0}%</td></tr>`
    ).join('');

    // Monthly breakdown from the export set
    const monthMap: Record<string, number> = {};
    exportReqs.forEach(r => {
      if (!r.date_submitted) return;
      const d = new Date(r.date_submitted);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthMap[key] = (monthMap[key] || 0) + 1;
    });
    const monthRows = Object.entries(monthMap).sort().map(([m, c]) =>
      `<tr><td>${m}</td><td style="text-align:right;font-weight:700">${c}</td></tr>`
    ).join('');

    const css = `*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:24px;color:#000}.page{max-width:780px;margin:0 auto}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #001C43;padding-bottom:12px;margin-bottom:20px}.school{font-size:16px;font-weight:900;color:#001C43}.sub{font-size:11px;color:#666;margin-top:2px}.report-title{font-size:20px;font-weight:900;color:#001C43;text-align:right}.period{font-size:12px;color:#666;text-align:right}.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}.kpi{border:1px solid #ddd;border-radius:8px;padding:14px}.kpi-num{font-size:24px;font-weight:900;color:#001C43}.kpi-label{font-size:11px;color:#666;margin-top:2px}.revenue{font-size:28px;font-weight:900;color:#198754}.section{margin-bottom:24px}.section-title{font-size:13px;font-weight:700;color:#001C43;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#001C43;color:white;padding:7px 10px;text-align:left}td{padding:7px 10px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f9f9f9}.footer{margin-top:32px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:12px}@media print{body{padding:10px}@page{margin:12mm}}`;

    const html = `<!DOCTYPE html><html><head><title>DRMS Reports — ${periodLabel}</title><style>${css}</style></head><body><div class="page">
<div class="header"><div><div class="school">MAPÚA MALAYAN COLLEGES MINDANAO</div><div class="sub">Registrar's Office — Document Request Monitoring System</div></div><div><div class="report-title">Reports &amp; Analytics</div><div class="period">Period: ${periodLabel}</div><div class="period">Generated: ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div></div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-num">${total}</div><div class="kpi-label">Total Requests</div></div>
  <div class="kpi"><div class="kpi-num" style="color:#198754">${released}</div><div class="kpi-label">Released</div></div>
  <div class="kpi"><div class="kpi-num" style="color:#FFA323">${inProgress}</div><div class="kpi-label">In Progress</div></div>
  <div class="kpi"><div class="kpi-num" style="color:#114B9F">${college}</div><div class="kpi-label">College Requests</div></div>
  <div class="kpi"><div class="kpi-num" style="color:#6D4DF5">${shs}</div><div class="kpi-label">SHS Requests</div></div>
</div>
<div class="section"><div class="kpi" style="display:inline-block;min-width:200px"><div class="kpi-label">Total Revenue Collected</div><div class="revenue">₱${revenue.toLocaleString()}</div></div></div>
<div class="two-col">
  <div class="section"><div class="section-title">By Form Type</div><table><thead><tr><th>Form Type</th><th>Count</th><th>Share</th></tr></thead><tbody>${formRows}</tbody></table></div>
  <div class="section"><div class="section-title">By Status</div><table><thead><tr><th>Status</th><th>Count</th><th>Share</th></tr></thead><tbody>${statusRows || '<tr><td colspan="3" style="color:#999">No data</td></tr>'}</tbody></table></div>
</div>
<div class="section"><div class="section-title">Monthly Breakdown</div><table><thead><tr><th>Month</th><th>Requests</th></tr></thead><tbody>${monthRows || '<tr><td colspan="2" style="color:#999">No data</td></tr>'}</tbody></table></div>
<div class="section"><div class="section-title">Completion Rate</div><div style="font-size:14px;font-weight:700;color:#198754">${total > 0 ? Math.round(released/total*100) : 0}% <span style="font-weight:400;color:#666;font-size:12px">— ${released} of ${total} requests released</span></div></div>
<div class="footer">DRMS — Registrar's Office, MMCM &nbsp;|&nbsp; System-generated report for internal use only.</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
  }

  // ── Confirm export — resolve dataset based on mode ─────────────────────────
  function handleConfirmExport() {
    let exportReqs: ApiRequest[];
    let exportPays: ApiPayment[];
    let label: string;

    if (exportMode === 'all') {
      exportReqs = requests;
      exportPays = payments;
      label = 'All Time';
    } else if (exportMode === 'current') {
      exportReqs = filteredRequests;
      exportPays = filteredPayments;
      label = period ? (availableMonths.find(m => m.value === period)?.label ?? period) : 'All Time';
    } else {
      // 'pick' — combine selected months
      exportReqs = requests.filter(r => {
        if (!r.date_submitted) return false;
        const d = new Date(r.date_submitted);
        const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return pickedMonths.has(val);
      });
      exportPays = payments.filter(p => {
        if (!p.payment_date) return false;
        const d = new Date(p.payment_date);
        const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return pickedMonths.has(val);
      });
      const pickedLabels = [...pickedMonths].sort().map(v =>
        availableMonths.find(m => m.value === v)?.label ?? v
      );
      label = pickedLabels.join(', ') || 'Selected Months';
    }

    setExportModalOpen(false);
    setPickedMonths(new Set());
    generatePDF(exportReqs, exportPays, label);
  }

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
          <button
            className="btn-outline"
            style={{ height: 36, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setExportMode(period ? 'current' : 'all'); setPickedMonths(new Set()); setExportModalOpen(true); }}
          >
            <Download size={14} /> Export PDF
          </button>
        </div>

        {/* KPI stat cards */}
        <div className="stat-grid stat-grid-5" style={{ marginBottom: 22 }}>
          <StatCard loading={loading} num={stats.total}      label="Total Requests"    color="#114B9F" bg="rgba(241, 246, 253, 0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>} />
          <StatCard loading={loading} num={stats.released}   label="Released"          color="#198754" bg="rgba(25,135,84,0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
          <StatCard loading={loading} num={stats.inProgress} label="In Progress"       color="#FFA323" bg="rgba(255,163,35,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard loading={loading} num={stats.college}    label="College Requests"  color="#114B9F" bg="rgba(17,75,159,0.12)"   icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>} />
          <StatCard loading={loading} num={stats.shs}        label="SHS Requests"      color="#6D4DF5" bg="rgba(109,77,245,0.12)"  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>} />
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
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: f.color, minWidth: 24, textAlign: 'right' }}>
                  {loading ? '—' : f.count}
                </div>
                <div style={{ width: 80, height: 6, background: 'var(--surface-2)', borderRadius: 3 }}>
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
              <div style={{ color: 'var(--mid-gray)', fontSize: 13 }}>Loading...</div>
            ) : statusBreakdown.length === 0 ? (
              <div style={{ color: 'var(--mid-gray)', fontSize: 13 }}>No data yet.</div>
            ) : (
              statusBreakdown.map(([status, count], i) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{status}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'right', color: COLORS[i % COLORS.length] }}>{count}</div>
                  <div style={{ width: 80, height: 6, background: 'var(--surface-2)', borderRadius: 3 }}>
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
              <div style={{ color: 'var(--mid-gray)', fontSize: 13, textAlign: 'center', padding: 40 }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingBottom: 24, position: 'relative' }}>
                {monthlyVolume.map(([month, count]) => (
                  <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{count || ''}</div>
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
                <div style={{ color: 'var(--mid-gray)', fontSize: 13 }}>Loading...</div>
              ) : requests.length === 0 ? (
                <div style={{ color: 'var(--mid-gray)', fontSize: 13, padding: '20px 0' }}>
                  No request data available yet.
                </div>
              ) : (
                <>
                  {/* College vs SHS */}
                  {[
                    { label: 'College', count: stats.college, color: '#114B9F' },
                    { label: 'Senior High School', count: stats.shs, color: 'var(--shs-bar-color)' },
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{d.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 30, textAlign: 'right' }}>{d.count}</div>
                      <div style={{ width: 120, height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
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

      {/* ── Export PDF Modal ── */}
      {exportModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setExportModalOpen(false)}
        >
          <div
            style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat',sans-serif" }}>
                Export Report as PDF
              </div>
              <button onClick={() => setExportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid-gray)', fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>

              {/* All Time */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${exportMode === 'all' ? '#114B9F' : 'rgba(0,0,0,0.1)'}`, background: exportMode === 'all' ? 'rgba(17,75,159,0.04)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <input type="radio" name="exportMode" checked={exportMode === 'all'} onChange={() => setExportMode('all')} style={{ accentColor: '#114B9F', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>All Time</div>
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>Export all {requests.length} requests across every month</div>
                </div>
              </label>

              {/* Current period */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${exportMode === 'current' ? '#114B9F' : 'rgba(0,0,0,0.1)'}`, background: exportMode === 'current' ? 'rgba(17,75,159,0.04)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <input type="radio" name="exportMode" checked={exportMode === 'current'} onChange={() => setExportMode('current')} style={{ accentColor: '#114B9F', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Current View — {period ? (availableMonths.find(m => m.value === period)?.label ?? period) : 'All Time'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>
                    Export the {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} currently shown on the dashboard
                  </div>
                </div>
              </label>

              {/* Pick months */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${exportMode === 'pick' ? '#114B9F' : 'rgba(0,0,0,0.1)'}`, background: exportMode === 'pick' ? 'rgba(17,75,159,0.04)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <input type="radio" name="exportMode" checked={exportMode === 'pick'} onChange={() => setExportMode('pick')} style={{ accentColor: '#114B9F', marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Select Specific Months</div>
                  <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>Manually choose which months to include</div>
                </div>
              </label>

              {/* Month checkboxes — only visible when pick is selected */}
              {exportMode === 'pick' && (
                <div style={{ marginLeft: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                  {availableMonths.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--mid-gray)', padding: '8px 0' }}>No months available yet.</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                        <button style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setPickedMonths(new Set(availableMonths.map(m => m.value)))}>
                          Select all
                        </button>
                        <span style={{ color: '#B1B1B1' }}>·</span>
                        <button style={{ fontSize: 11, color: 'var(--mid-gray)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setPickedMonths(new Set())}>
                          Clear
                        </button>
                      </div>
                      {availableMonths.map(m => (
                        <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={pickedMonths.has(m.value)}
                            onChange={() => togglePickedMonth(m.value)}
                            style={{ accentColor: '#114B9F', width: 14, height: 14 }}
                          />
                          {m.label}
                          <span style={{ fontSize: 11, color: 'var(--mid-gray)', marginLeft: 'auto' }}>
                            {requests.filter(r => {
                              if (!r.date_submitted) return false;
                              const d = new Date(r.date_submitted);
                              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === m.value;
                            }).length} requests
                          </span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleConfirmExport}
                disabled={exportMode === 'pick' && pickedMonths.size === 0}
              >
                <Download size={13} />
                {exportMode === 'pick'
                  ? pickedMonths.size === 0 ? 'Select at least one month' : `Export ${pickedMonths.size} month${pickedMonths.size > 1 ? 's' : ''}`
                  : 'Export PDF'}
              </button>
              <button className="btn-outline" style={{ padding: '0 18px' }} onClick={() => setExportModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
