"use client";

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Topbar } from '../../components/drms/Topbar';

const topDocs = [
  { doc: 'Transcript of Records',    cnt: 18, color: '#114B9F' },
  { doc: 'SF9 (Report Card)',         cnt: 12, color: '#001C43' },
  { doc: 'Certificate of Enrollment', cnt: 9,  color: '#FFA323' },
  { doc: 'Honorable Dismissal',       cnt: 5,  color: '#6D4DF5' },
  { doc: 'SF10 (Permanent Record)',    cnt: 3,  color: '#808EA1' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('March 2026');

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Reports & Analytics' }]} showNotifDot />
      <div className="page-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 20 }}>
          <select className="drms-select" style={{ width: 160 }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option>March 2026</option>
            <option>February 2026</option>
            <option>January 2026</option>
          </select>
          <button className="btn-primary"><Download size={14} /> Export PDF</button>
        </div>

        <div className="stat-grid stat-grid-5" style={{ marginBottom: 22 }}>
          <div className="stat-card c-navy" style={{ padding: 16 }}><div className="stat-top"><div><div className="stat-num c-navy" style={{ fontSize: 24 }}>47</div><div className="stat-label" style={{ fontSize: 12 }}>Total Requests</div></div><div className="stat-icon" style={{ background: '#EEF4FB', width: 32, height: 32, fontSize: 14 }}>📋</div></div></div>
          <div className="stat-card c-green" style={{ padding: 16 }}><div className="stat-top"><div><div className="stat-num c-green" style={{ fontSize: 24 }}>32</div><div className="stat-label" style={{ fontSize: 12 }}>Released</div></div><div className="stat-icon" style={{ background: '#EAFAF1', width: 32, height: 32, fontSize: 14 }}>✅</div></div></div>
          <div className="stat-card c-orange" style={{ padding: 16 }}><div className="stat-top"><div><div className="stat-num c-orange" style={{ fontSize: 24 }}>9</div><div className="stat-label" style={{ fontSize: 12 }}>In Progress</div></div><div className="stat-icon" style={{ background: '#FFF8E1', width: 32, height: 32, fontSize: 14 }}>⏳</div></div></div>
          <div className="stat-card c-red" style={{ padding: 16 }}><div className="stat-top"><div><div className="stat-num c-red" style={{ fontSize: 24 }}>3</div><div className="stat-label" style={{ fontSize: 12 }}>Rejected</div></div><div className="stat-icon" style={{ background: '#FEEAEA', width: 32, height: 32, fontSize: 14 }}>✗</div></div></div>
          <div className="stat-card c-blue" style={{ padding: 16 }}><div className="stat-top"><div><div className="stat-num c-blue" style={{ fontSize: 20 }}>5.2 days</div><div className="stat-label" style={{ fontSize: 12 }}>Avg. Processing Time</div></div><div className="stat-icon" style={{ background: '#EBF5FB', width: 32, height: 32, fontSize: 14 }}>📅</div></div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="drms-card" style={{ padding: 20 }}>
            <div style={{ paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
              <span className="drms-card-title">Requests by Document Type</span>
            </div>
            <div className="chart-ph" style={{ height: 200 }}>
              <div className="chart-icon">📊</div>
              <div>Bar chart — requests per document type</div>
              <span className="ph-badge">Chart placeholder — connect to backend data</span>
            </div>
          </div>
          <div className="drms-card" style={{ padding: 20 }}>
            <div style={{ paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
              <span className="drms-card-title">Monthly Request Volume</span>
            </div>
            <div className="chart-ph" style={{ height: 200 }}>
              <div className="chart-icon">📈</div>
              <div>Line chart — request volume over time</div>
              <span className="ph-badge">Chart placeholder — connect to backend data</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
          <div className="drms-card">
            <div className="drms-card-header"><span className="drms-card-title">Processing Time Breakdown</span></div>
            <div className="chart-ph" style={{ height: 220, padding: 20 }}>
              <div className="chart-icon">🥧</div>
              <div>Pie/donut chart — processing time ranges</div>
              <span className="ph-badge">Chart placeholder — connect to backend data</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
