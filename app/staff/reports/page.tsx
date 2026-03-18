"use client";

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar'; // Corrected path

const topDocs = [
  { doc: 'Transcript of Records',   cnt: 18, color: '#114B9F' },
  { doc: 'SF9 (Report Card)',        cnt: 12, color: '#001C43' },
  { doc: 'Certificate of Enrollment',cnt: 9,  color: '#FFA323' },
  { doc: 'Honorable Dismissal',      cnt: 5,  color: '#6D4DF5' },
  { doc: 'SF10 (Permanent Record)',   cnt: 3,  color: '#808EA1' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('March 2026');

  return (
    <>
      {/* Custom topbar right with period selector + export */}
      <Topbar
        breadcrumbs={[{ label: 'Reports & Analytics' }]}
        showNotifDot
      />
      <div className="page-body">
        {/* Period / export row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 20 }}>
          <select
            className="drms-select"
            style={{ width: 160 }}
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option>March 2026</option>
            <option>February 2026</option>
            <option>January 2026</option>
            <option>Q1 2026 (Jan-Mar)</option>
          </select>
          <button className="btn-outline" style={{ height: 36, padding: '0 12px' }}>
            <Download size={14} style={{ marginRight: 6 }} /> Export PDF
          </button>
        </div>

        {/* Top KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
          <div className="drms-card" style={{ padding: 16, borderBottom: '3px solid var(--navy)' }}>
            <div style={{ fontSize: 11, color: 'var(--mid-gray)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Requests</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)' }}>142</div>
          </div>
          <div className="drms-card" style={{ padding: 16, borderBottom: '3px solid var(--blue)' }}>
            <div style={{ fontSize: 11, color: 'var(--mid-gray)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Completed</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>105</div>
          </div>
          <div className="drms-card" style={{ padding: 16, borderBottom: '3px solid #FFA323' }}>
            <div style={{ fontSize: 11, color: 'var(--mid-gray)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Pending Action</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#FFA323' }}>28</div>
          </div>
          <div className="drms-card" style={{ padding: 16, borderBottom: '3px solid #198754' }}>
            <div style={{ fontSize: 11, color: 'var(--mid-gray)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Revenue (Est)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#198754' }}>₱12,450</div>
          </div>
          <div className="drms-card" style={{ padding: 16, borderBottom: '3px solid #E50019' }}>
            <div style={{ fontSize: 11, color: 'var(--mid-gray)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Expired Slips</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#E50019' }}>9</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Most requested */}
          <div className="drms-card">
            <div className="drms-card-header"><span className="drms-card-title">Most Requested Documents</span></div>
            <div style={{ padding: '12px 20px' }}>
              {topDocs.map(d => (
                <div key={d.doc} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--navy)' }}>{d.doc}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', minWidth: 30, textAlign: 'right' }}>{d.cnt}</div>
                  <div style={{ width: 120, height: 8, background: 'var(--light-gray)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${Math.round(d.cnt / 18 * 100)}%`, background: d.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Processing time breakdown */}
          <div className="drms-card">
            <div className="drms-card-header"><span className="drms-card-title">Processing Time Breakdown</span></div>
            <div className="chart-ph" style={{ height: 220, padding: 20 }}>
              <div className="chart-icon">🥧</div>
              <div>Pie/donut chart — processing time ranges</div>
              <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>(e.g. 1-3 days, 4-7 days, 7+ days)</div>
            </div>
          </div>

          {/* Request volume over time */}
          <div className="drms-card" style={{ gridColumn: '1 / -1' }}>
            <div className="drms-card-header"><span className="drms-card-title">Request Volume (Daily)</span></div>
            <div className="chart-ph" style={{ height: 260, padding: 20 }}>
              <div className="chart-icon">📈</div>
              <div>Line chart — Requests submitted vs Completed per day</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}