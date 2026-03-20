"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../components/drms/Topbar';

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

// Derive icon + bg + category from message content
function getNotifStyle(notif: ApiNotification): {
  icon: string; bg: string; cat: string;
} {
  const msg = notif.message.toLowerCase();
  if (msg.includes('payment') || msg.includes('receipt') || msg.includes('paid')) {
    return { icon: '💳', bg: '#EAFAF1', cat: 'Payment' };
  }
  if (msg.includes('claim slip') || msg.includes('expir') || msg.includes('shred')) {
    return { icon: '🎫', bg: '#FFF8E1', cat: 'Claim Slips' };
  }
  if (msg.includes('overdue')) {
    return { icon: '🚨', bg: '#FEEAEA', cat: 'Document Requests' };
  }
  if (msg.includes('submitted') || msg.includes('new request')) {
    return { icon: '📋', bg: '#EBF5FB', cat: 'Document Requests' };
  }
  if (msg.includes('released') || msg.includes('ready')) {
    return { icon: '📤', bg: '#F0EDFF', cat: 'Document Requests' };
  }
  if (msg.includes('system') || msg.includes('maintenance') || msg.includes('update')) {
    return { icon: '⚙️', bg: '#F0F0F0', cat: 'System' };
  }
  return { icon: '🔔', bg: '#F5F5F5', cat: 'Document Requests' };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  // ── API state ─────────────────────────────────────────────────────────────
  const [notifs, setNotifs]     = useState<ApiNotification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  function handleRefresh() { fetchNotifs(); }

  // ── Fetch notifications ───────────────────────────────────────────────────
  useEffect(() => {
    fetchNotifs();
  }, []);

  async function fetchNotifs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/notifications/');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setNotifs(data.results ?? data);
    } catch {
      setError('Could not connect to the API. Make sure Django is running.');
    } finally {
      setLoading(false);
    }
  }

  // ── Mark single notification as read ─────────────────────────────────────
  async function markRead(id: number) {
    try {
      await fetch(`http://localhost:8000/api/notifications/${id}/mark_read/`, {
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
          fetch(`http://localhost:8000/api/notifications/${n.notification_id}/mark_read/`, {
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
      'Claim Slips': 0,
      'System': 0,
    };
    notifs.forEach(n => {
      const { cat } = getNotifStyle(n);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [notifs]);

  const TABS = [
    { label: 'All',               count: notifs.length,                          filter: null               },
    { label: 'Document Requests', count: categoryCounts['Document Requests'],    filter: 'Document Requests' },
    { label: 'Payment',           count: categoryCounts['Payment'],              filter: 'Payment'           },
    { label: 'Claim Slips',       count: categoryCounts['Claim Slips'],          filter: 'Claim Slips'       },
    { label: 'System',            count: categoryCounts['System'],               filter: 'System'            },
  ];

  // ── Filter by tab ─────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const filter = TABS[activeTab]?.filter;
    if (!filter) return notifs;
    return notifs.filter(n => getNotifStyle(n).cat === filter);
  }, [notifs, activeTab]);

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const displayedNotifs = visible.slice(0, displayCount);
  const hasMore = displayCount < visible.length;

  // ── Handle click on notification ──────────────────────────────────────────
  function handleClick(n: ApiNotification) {
    if (!n.is_read) markRead(n.notification_id);
    if (n.request) {
      const reqId = `REQ-${String(n.request).padStart(3, '0')}`;
      router.push(`/staff/request/${reqId}`);
    }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Notifications' }]} showNotifDot={false} />
      <div className="page-body">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="page-heading" style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)' }}>
              Notifications
            </div>
            <div className="page-sub" style={{ fontSize: 14, color: 'var(--mid-gray)' }}>
              {loading ? '...' : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
            <span className="info-icon">⚠️</span>
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
                        {`Request #REQ-${String(n.request).padStart(3, '0')}`}
                        {' — '}
                        {n.sent_via === 'Email' ? '📧 Email' : '📱 SMS'}
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
