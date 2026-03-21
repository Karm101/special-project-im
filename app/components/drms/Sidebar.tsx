"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const IcoReports   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 20, height: 20, display: 'block' }}><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const IcoRequests  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>;
const IcoPayment   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const IcoClaimSlip = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}><path d="M4 3l1.5 1.5L7 3l1.5 1.5L10 3l1.5 1.5L13 3l1.5 1.5L16 3l1.5 1.5L19 3v16l-1.5-1.5L16 19l-1.5 1.5L13 19l-1.5 1.5L10 19l-1.5 1.5L7 19l-1.5 1.5L4 19V3z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg>;
const IcoClearance = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}><path d="M12 2l8 4v6c0 4.4-3.3 8.5-8 10-4.7-1.5-8-5.6-8-10V6l8-4z"/><polyline points="9 12 11 14 15 10"/></svg>;
const IcoNewReq    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 20, height: 20, display: 'block' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoBell      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IcoLogout    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, display: 'block' }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcoChevRight = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10, display: 'block' }}><polyline points="9 18 15 12 9 6"/></svg>;
const IcoChevLeft  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ width: 10, height: 10, display: 'block' }}><polyline points="15 18 9 12 15 6"/></svg>;

interface NavItem { icon: React.ReactNode; label: string; path: string; notif?: boolean; }

const topNav: NavItem[] = [
  { icon: <IcoReports />,   label: 'Reports & Analytics', path: '/staff/reports'       },
  { icon: <IcoRequests />,  label: 'Document Requests',   path: '/staff/dashboard'     },
  { icon: <IcoPayment />,   label: 'Payment Monitor',     path: '/staff/payment'       },
  { icon: <IcoClaimSlip />, label: 'Claim Slip Monitor',  path: '/staff/claimslip'     },
  { icon: <IcoClearance />, label: 'Clearance Tracking',  path: '/staff/clearance'     },
];
const midNav: NavItem[] = [
  { icon: <IcoNewReq />, label: 'New Request',   path: '/staff/dashboard/new'          },
  { icon: <IcoBell />,   label: 'Notifications', path: '/staff/notifications', notif: true },
];

function isActive(path: string, loc: string) {
  if (path === '/staff/dashboard') return loc === '/staff/dashboard' || loc.startsWith('/staff/request');
  if (path === '/staff/dashboard/new') return loc.startsWith('/staff/dashboard/new');
  return loc === path || loc.startsWith(path + '/');
}

const itemBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: 10, borderRadius: 10,
  cursor: 'pointer', transition: 'background .18s', position: 'relative',
  border: 'none', background: 'transparent', fontFamily: "'Montserrat', sans-serif",
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Sidebar only collapses via the toggle button — no click-outside collapse
  // so users can keep it expanded while working on any page

  // Fetch live unread notification count
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/');
        if (!res.ok) return;
        const data = await res.json();
        const notifs = data.results ?? data;
        setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
      } catch {
        // Silent fail
      }
    }
    fetchUnread();
    // Refresh every 60 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const NavBtn = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path, pathname);
    return (
      <div
        style={{ ...itemBase, background: active ? '#001C43' : 'transparent' }}
        className={active ? 'sb-nav-active' : ''}
        onClick={() => router.push(item.path)}
        title={item.label}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: active ? 'white' : 'var(--text-primary)' }}>
          {item.icon}
        </span>
        {item.notif && unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, background: '#E50019', borderRadius: '50%', border: '1.5px solid var(--bg-nav)' }} />
        )}
        {expanded && (
          <span style={{ fontSize: 13, fontWeight: 500, color: active ? 'white' : 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>
            {item.label}
          </span>
        )}
        {!expanded && (
          <span className="sb-tt" style={{ position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)', background: '#001C43', color: 'white', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0, transition: 'opacity .15s', zIndex: 300, boxShadow: '0 2px 8px rgba(0,0,0,.2)', fontFamily: "'Montserrat', sans-serif" }}>
            {item.label}
          </span>
        )}
      </div>
    );
  };

  const SBW = expanded ? 240 : 57;

  return (
    <>
      <style>{`div:hover > .sb-tt { opacity: 1 !important; }`}</style>
      <div ref={sidebarRef} className="drms-root" style={{ width: SBW, background: 'var(--bg-nav)', borderRight: '1px solid rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', alignItems: expanded ? 'flex-start' : 'center', padding: '20px 0', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflow: 'visible', transition: 'width .25s cubic-bezier(.4,0,.2,1)', zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: expanded ? 10 : 0, width: '100%', paddingLeft: expanded ? 14 : 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: 8, background: 'linear-gradient(135deg,#001C43,#114B9F)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>M</div>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>Registrar's Office</span>
              <span style={{ fontSize: 10, color: 'var(--mid-gray)', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>MMCM — DRMS</span>
            </div>
          )}
        </div>

        <div style={{ width: 'calc(100% - 20px)', height: 1, background: 'var(--mid-gray)', margin: '0 10px 8px', opacity: 0.4 }} />

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2, flex: 1, padding: '0 7px', overflow: 'hidden' }}>
          {topNav.map(item => <NavBtn key={item.path} item={item} />)}
          <div style={{ width: 'calc(100% - 14px)', height: 1, background: 'var(--mid-gray)', margin: '8px 7px', opacity: 0.4 }} />
          {midNav.map(item => <NavBtn key={item.path} item={item} />)}
        </div>

        <div style={{ padding: '8px 7px', width: '100%', overflow: 'hidden' }}>
          <div style={{ ...itemBase }} onClick={() => { sessionStorage.clear(); router.push('/staff/login'); }} title="Sign Out"
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#FEEAEA')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
            <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#E50019' }}><IcoLogout /></span>
            {expanded && <span style={{ fontSize: 13, fontWeight: 500, color: '#E50019', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>Sign Out</span>}
            {!expanded && (
              <span className="sb-tt" style={{ position: 'absolute', left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)', background: '#001C43', color: 'white', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0, transition: 'opacity .15s', zIndex: 300, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>Sign Out</span>
            )}
          </div>
        </div>

        <button onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand'}
          style={{ position: 'absolute', right: -13, top: '50%', transform: 'translateY(-50%)', width: 13, height: 44, background: 'var(--bg-nav)', border: '1px solid rgba(0,0,0,.10)', borderLeft: 'none', borderRadius: '0 8px 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 250, boxShadow: '2px 0 6px rgba(0,0,0,.07)', transition: 'background .15s' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-nav)')}>
          <span style={{ color: 'var(--mid-gray)' }}>{expanded ? <IcoChevLeft /> : <IcoChevRight />}</span>
        </button>
      </div>

    </>
  );
}
