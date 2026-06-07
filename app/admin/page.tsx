"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, documents: 0, activeDocuments: 0, requests: 0 });
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  useEffect(() => {
    setAdminName(sessionStorage.getItem('staff_name') ?? 'Admin');
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = sessionStorage.getItem('auth_token');
        const headers = { Authorization: `Token ${token}` };
        const [usersRes, docsRes, reqsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/users/`, { headers }),
          fetch(`${API_BASE}/document-types/?all=true`),
          fetch(`${API_BASE}/requests/`),
        ]);
        const users = usersRes.ok ? await usersRes.json() : [];
        const docs  = docsRes.ok  ? await docsRes.json()  : { results: [] };
        const reqs  = reqsRes.ok  ? await reqsRes.json()  : { count: 0 };
        const docsArr = docs.results ?? docs;
        setStats({
          users:           users.length,
          documents:       docsArr.length,
          activeDocuments: docsArr.filter((d: any) => d.is_active).length,
          requests:        reqs.count ?? 0,
        });
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const cards = [
    { label: 'Staff Accounts',      value: stats.users,           color: '#114B9F', path: '/admin/users',     action: 'Manage Users' },
    { label: 'Active Document Types', value: stats.activeDocuments, color: '#198754', path: '/admin/documents', action: 'Manage Documents' },
    { label: 'Total Requests',       value: stats.requests,        color: '#FFA323', path: '/staff/dashboard', action: 'View Dashboard' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Welcome, {adminName}</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4 }}>DRMS Administration Panel — Registrar's Office, MMCM</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {cards.map(card => (
          <div key={card.label} className="drms-card" style={{ padding: 24, borderBottom: `3px solid ${card.color}` }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: card.color }}>{loading ? '—' : card.value}</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 4, marginBottom: 16 }}>{card.label}</div>
            <button className="btn-outline btn-sm" onClick={() => router.push(card.path)}>{card.action} →</button>
          </div>
        ))}
      </div>

      <div className="info-box">
        <span className="info-icon">ℹ️</span>
        <div className="info-text">
          This admin panel allows you to manage staff accounts, document types, and system settings without needing backend access.
          Changes here take effect immediately across the entire system.
        </div>
      </div>
    </div>
  );
}