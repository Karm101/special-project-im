"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, Sun, Moon } from 'lucide-react';

interface BreadcrumbItem { label: string; href?: string; }

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[];
  showNotifDot?: boolean;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  rightExtras?: React.ReactNode;
}

export function Topbar({
  breadcrumbs,
  showNotifDot = false,
  userName,
  userRole,
  userInitials,
  rightExtras,
}: TopbarProps) {
  const router = useRouter();
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(false);

  // ── Sync dark state from documentElement ──────────────────────────────────
  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('drms_theme', next);
    setIsDark(!isDark);
  }, [isDark]);

  // ── Read auth from sessionStorage ──────────────────────────────────────────
  const [displayName, setDisplayName]       = useState(userName ?? 'Staff');
  const [displayRole, setDisplayRole]       = useState(userRole ?? 'RO Staff');
  const [displayInitials, setDisplayInitials] = useState(userInitials ?? '??');

  useEffect(() => {
    // Read staff info from sessionStorage (set during login)
    const storedName = sessionStorage.getItem('staff_name');
    const storedRole = sessionStorage.getItem('staff_role');
    if (storedName) {
      setDisplayName(storedName);
      // Generate initials from "LastName, FirstName" format
      const parts = storedName.replace(',', '').split(' ').filter(Boolean);
      const initials = parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : storedName.substring(0, 2).toUpperCase();
      setDisplayInitials(initials);
    }
    if (storedRole) setDisplayRole(storedRole);
  }, []);

  // ── Fetch unread notification count ───────────────────────────────────────
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/');
        if (!res.ok) return;
        const data = await res.json();
        const notifs = data.results ?? data;
        setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
      } catch {
        // Silent fail — not critical
      }
    }
    fetchUnread();
    // Refresh every 60 seconds — same as sidebar
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Use prop values if explicitly passed, otherwise use sessionStorage values
  const finalName     = userName     ?? displayName;
  const finalRole     = userRole     ?? displayRole;
  const finalInitials = userInitials ?? displayInitials;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: 'var(--mid-gray)', margin: '0 2px', fontSize: 16 }}>/</span>}
              <span
                className="topbar-page-title"
                style={crumb.href ? { cursor: 'pointer', color: 'var(--mid-gray)', fontWeight: 400 } : {}}
                onClick={crumb.href ? () => router.push(crumb.href!) : undefined}
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="topbar-right">
        {rightExtras}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'transparent', cursor: 'pointer', transition: 'background .15s', flexShrink: 0 }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {isDark ? <Sun size={15} color="#FFA323" /> : <Moon size={15} color="var(--text-primary)" />}
        </button>

        <div className="topbar-bell" onClick={() => router.push('/staff/notifications')} style={{ cursor: 'pointer', position: 'relative', padding: 4 }}>
          <Bell size={18} color="var(--text-primary)" />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, background: '#E50019', borderRadius: '50%', border: '1.5px solid var(--bg-nav)' }} />
          )}
        </div>

        <div ref={ddRef} style={{ position: 'relative' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px 6px 6px', borderRadius: 50, transition: 'background .15s' }}
            onClick={() => setDdOpen(o => !o)}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="user-info-block">
              <span className="user-name">{finalName}</span>
              <span className="user-role">{finalRole}</span>
            </div>
            <div className="user-avatar">{finalInitials}</div>
            <ChevronDown size={10} color="var(--mid-gray)" />
          </div>

          <div className={`user-dropdown${ddOpen ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <button className="dd-item" onClick={() => { setDdOpen(false); router.push('/staff/profile'); }}>👤 View Profile</button>
            <button className="dd-item" onClick={() => { setDdOpen(false); router.push('/staff/settings'); }}>⚙️ Settings</button>
            <div className="dd-sep" />
            <button className="dd-item danger" onClick={() => {
              sessionStorage.clear();
              router.push('/staff/login');
            }}>🚪 Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
