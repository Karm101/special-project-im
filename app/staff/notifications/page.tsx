"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../components/drms/Topbar';
import { API_BASE } from '@/lib/lib_api';
import { IcoCard, IcoTrash, IcoAlert, IcoList, IcoSend, IcoBell, IcoWarn } from '@/app/components/drms/Icons';
import type { ReactNode } from 'react';

// ── API type ──────────────────────────────────────────────────────────────────
type ApiNotification = {
  notification_id: number;
  request: number;
  recipient_type: 'Student' | 'Staff';
  recipient_id: number;
  message: string;
  sent_via: 'Email' | 'SMS';
  sent_at: string;
  is_read: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const PH_TZ = 'Asia/Manila';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const dPH   = d.toLocaleDateString('en-US', { timeZone: PH_TZ });
  const nowPH = now.toLocaleDateString('en-US', { timeZone: PH_TZ });
  const isToday = dPH === nowPH;
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: PH_TZ });
  if (isToday) return `Today · ${timeStr}`;
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: PH_TZ });
  return `${dateLabel} · ${timeStr}`;
}

// Derive icon + bg + category from message content.
// SVG icons + rgba backgrounds so both light and dark themes render cleanly.
function getNotifStyle(notif: ApiNotification): {
  icon: ReactNode; bg: string; cat: string;
} {
  const msg = notif.message.toLowerCase();
  if (msg.includes('payment') || msg.includes('receipt') || msg.includes('paid')) {
    return { icon: <IcoCard size={16} />, bg: 'rgba(25,135,84,0.14)', cat: 'Payment' };
  }
  if (msg.includes('claim slip') || msg.includes('expir') || msg.includes('shred')) {
    return { icon: <IcoTrash size={16} />, bg: 'rgba(255,163,35,0.16)', cat: 'Disposal' };
  }
  if (msg.includes('overdue')) {
    return { icon: <IcoAlert size={16} />, bg: 'rgba(229,0,25,0.12)', cat: 'Document Requests' };
  }
  if (msg.includes('submitted') || msg.includes('new request')) {
    return { icon: <IcoList size={16} />, bg: 'rgba(17,75,159,0.12)', cat: 'Document Requests' };
  }
  if (msg.includes('released') || msg.includes('ready')) {
    return { icon: <IcoSend size={16} />, bg: 'rgba(111,66,193,0.14)', cat: 'Document Requests' };
  }
  return { icon: <IcoBell size={16} />, bg: 'rgba(128,128,128,0.14)', cat: 'Document Requests' };
}

function formatRequestId(requestId: number, documentRequestNo?: string | null): string {
  return documentRequestNo ?? `REQ-${String(requestId).padStart(3, '0')}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  // ── API state ─────────────────────────────────────────────────────────────
  const [notifs, setNotifs]     = useState<ApiNotification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [requestNoMap, setRequestNoMap] = useState<Record<number, string | null>>({});

  function handleRefresh() { fetchNotifs(); }

  // ── Fetch notifications ───────────────────────────────────────────────────
  useEffect(() => {
    fetchNotifs();
  }, []);

  async function fetchNotifs() {
    setLoading(true);
    setError(null);
    try {
      const staffId = sessionStorage.getItem('staff_id');
      const params  = staffId
        ? `?recipient_type=Staff&recipient_id=${staffId}&page_size=200`
        : `?recipient_type=Staff&page_size=200`;
      const res = await fetch(`${API_BASE}/notifications/${params}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const fetched: ApiNotification[] = data.results ?? data;
      setNotifs(fetched);

      // Fetch document_request_no for each unique request ID
      const uniqueIds = [...new Set(fetched.map(n => n.request).filter(Boolean))];
      const noMap: Record<number, string | null> = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE}/requests/${id}/`);
            if (r.ok) {
              const d = await r.json();
              noMap[id] = d.document_request_no ?? null;
            }
          } catch {}
        })
      );
      setRequestNoMap(noMap);
    } catch {
      setError('Could not connect to the API. Make sure Django is running.');
    } finally {
      setLoading(false);
    }
  }

  // ── Mark single notification as read ─────────────────────────────────────
  async function markRead(id: number) {
    try {
      await fetch(`${API_BASE}/notifications/${id}/mark_read/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      setNotifs(prev => prev.map(n =>
        n.notification_id === id ? { ...n, is_read: true } : n
      ));
    } catch {
      // Silent fail — not critical
    }
  }

  // ── Mark all as read ──────────────────────────────────────────────────────
  async function markAllRead() {
    setMarkingAll(true);
    try {
      const unread = notifs.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n =>
          fetch(`${API_BASE}/notifications/${n.notification_id}/mark_read/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      alert('Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  }

  // ── Tab definitions ───────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Document Requests': 0,
      'Payment': 0,
      'Disposal': 0,
    };
    notifs.forEach(n => {
      const { cat } = getNotifStyle(n);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [notifs]);

  // "Claim Slips" tab renamed to "Disposal" (claim slips are retired; shredding
  // notifications live here). "System" tab removed — no backend message ever
  // matched its keywords, so it was permanently empty.
  const TABS = [
    { label: 'All',               count: notifs.length,                          filter: null               },
    { label: 'Document Requests', count: categoryCounts['Document Requests'],    filter: 'Document Requests' },
    { label: 'Payment',           count: categoryCounts['Payment'],              filter: 'Payment'           },
    { label: 'Disposal',          count: categoryCounts['Disposal'],             filter: 'Disposal'          },
  ];

  // ── Filter by tab + read status ──────────────────────────────────────────
  const visible = useMemo(() => {
    const filter = TABS[activeTab]?.filter;
    let rows = !filter ? notifs : notifs.filter(n => getNotifStyle(n).cat === filter);
    if (filterRead === 'unread') rows = rows.filter(n => !n.is_read);
    if (filterRead === 'read')   rows = rows.filter(n =>  n.is_read);
    return rows;
  }, [notifs, activeTab, filterRead]);

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const displayedNotifs = visible.slice(0, displayCount);
  const hasMore = displayCount < visible.length;

  // ── Handle click on notification ──────────────────────────────────────────
  function handleClick(n: ApiNotification) {
    if (!n.is_read) markRead(n.notification_id);
    if (n.request) {
      router.push(`/staff/request/${n.request}`);
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Notifications' }]} showNotifDot={false} />
      <div className="page-body">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="page-heading" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
              Notifications
            </div>
            <div className="page-sub" style={{ fontSize: 14, color: 'var(--mid-gray)' }}>
              {loading ? '...' : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Filter button */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-filter"
                data-filter-btn="true"
                onClick={() => setFilterOpen(o => !o)}
                title="Filter"
                style={{ position: 'relative' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                {filterRead !== 'all' && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#114B9F', color: 'white', borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                )}
              </button>

              {filterOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'white', border: '1px solid rgba(0,0,0,.1)', borderRadius: 10, padding: 16, width: 200, zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Read Status</div>
                  {(['all', 'unread', 'read'] as const).map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: 'var(--navy)' }}>
                      <input type="radio" name="notif_read" checked={filterRead === opt}
                        onChange={() => { setFilterRead(opt); setFilterOpen(false); }}
                        style={{ accentColor: '#114B9F' }} />
                      {opt === 'all' ? 'All notifications' : opt === 'unread' ? 'Unread only' : '✓ Read only'}
                    </label>
                  ))}
                  {filterRead !== 'all' && (
                    <button className="btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                      onClick={() => { setFilterRead('all'); setFilterOpen(false); }}>
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>

            <button className="btn-outline btn-sm" onClick={handleRefresh} title="Refresh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            </button>
            <button
              className="btn-outline btn-sm"
              onClick={markAllRead}
              disabled={markingAll || unreadCount === 0}
            >
              {markingAll ? 'Marking...' : 'Mark All as Read'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="info-box warn" style={{ marginBottom: 16 }}>
            <span className="info-icon"><IcoWarn /></span>
            <div className="info-text">{error}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {TABS.map((t, i) => (
            <div key={t.label} className={`tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        {/* Active read filter chip */}
        {filterRead !== 'all' && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 0 0' }}>
            <span
              style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 50, background: 'rgba(17,75,159,0.1)', color: '#114B9F', border: '1px solid rgba(17,75,159,0.2)', cursor: 'pointer' }}
              onClick={() => setFilterRead('all')}
            >
              {filterRead === 'unread' ? 'Unread only' : '✓ Read only'} ✕
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#B1B1B1', fontSize: 14 }}>
            Loading notifications...
          </div>
        )}

        {/* Notification list */}
        {!loading && (
          <div className="notif-card">
            {visible.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid-gray)' }}>
                {notifs.length === 0
                  ? 'No notifications yet. They will appear here when requests are submitted or statuses change.'
                  : 'No notifications in this category.'}
              </div>
            ) : (
              displayedNotifs.map(n => {
                const { icon, bg } = getNotifStyle(n);
                return (
                  <div
                    key={n.notification_id}
                    className="notif-item"
                    style={{
                      cursor: 'pointer',
                      background: n.is_read ? 'transparent' : 'rgba(17,75,159,0.02)',
                    }}
                    onClick={() => handleClick(n)}
                  >
                    <div className="notif-icon-wrap" style={{ background: bg }}>{icon}</div>
                    <div className="notif-body">
                      <div className="notif-title">
                        {`Request ${formatRequestId(n.request, requestNoMap[n.request])}`}
                        {' — '}
                        {n.sent_via === 'Email' ? 'Email' : 'SMS'}
                      </div>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">{formatTime(n.sent_at)}</div>
                    </div>
                    {!n.is_read && <div className="unread-dot" />}
                  </div>
                );
              })
            )}
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <button className="btn-outline btn-sm" onClick={() => setDisplayCount(c => c + 10)}>
                Load More ({visible.length - displayCount} more)
              </button>
            </div>
          )}
          </div>
        )}
      </div>
    </>
  );
}
