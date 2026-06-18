"use client";

import { useAuthGuard } from '../../hooks/useAuthGuard';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/lib_api';

const IcoHome     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoUsers    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcoBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><polyline points="15 18 9 12 15 6"/></svg>;
const IcoLogout   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcoStudents = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;

const NAV = [
  { label: 'Overview',         path: '/admin',          icon: <IcoHome /> },
  { label: 'User Management',  path: '/admin/users',    icon: <IcoUsers /> },
  { label: 'Student Accounts', path: '/admin/students', icon: <IcoStudents /> },
];

function AdminSidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ width: 220, background: '#001C43', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/mmcm-logo.png" alt="MMCM" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ color: 'white', fontSize: 12, fontWeight: 800, fontFamily: "'Montserrat',sans-serif" }}>Admin Panel</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: "'Montserrat',sans-serif" }}>MMCM — DRMS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
          return (
            <div key={item.path}
              onClick={() => router.push(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: active ? 'rgba(255,255,255,0.12)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: active ? 700 : 400, fontFamily: "'Montserrat',sans-serif", transition: 'all .15s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {item.icon}
              {item.label}
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div onClick={() => router.push('/staff/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <IcoBack /> Back to Staff App
        </div>
        <div onClick={() => { sessionStorage.clear(); router.push('/staff/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', color: '#ff6b6b', fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,107,107,0.1)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <IcoLogout /> Sign Out
        </div>
      </div>
    </div>
  );
}

function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard('admin');
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', fontFamily: "'Montserrat',sans-serif" }}>
      <AdminSidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {children}
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAdminLayout>{children}</ProtectedAdminLayout>;
}
