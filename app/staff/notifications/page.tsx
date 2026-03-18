"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../components/drms/Topbar';

const notifs = [
  { icon: '🚨', bg: '#FEEAEA', title: 'Request #REQ-003 — Overdue for Release',  msg: "Maria Dela Cruz's SF9 + SF10 has passed expected claim date of Feb 27, 2026.",           time: 'Today · 8:00 AM',    unread: true,  cat: 'Document Requests' },
  { icon: '📋', bg: '#EBF5FB', title: 'New Request Submitted — #REQ-006',        msg: 'Carlo Mendoza Vega submitted an online Certificate of Grades request (RO-0005).',      time: 'Mar 5 · 9:15 AM',   unread: true,  cat: 'Document Requests' },
  { icon: '✅', bg: '#EAFAF1', title: 'Payment Confirmed — #REQ-004',             msg: 'Jose Rizal Santos settled payment (OR-2026-00460). Request is ready to process.',       time: 'Mar 3 · 2:30 PM',   unread: true,  cat: 'Payment' },
  { icon: '📤', bg: '#F0EDFF', title: 'Document Released — #REQ-001',            msg: 'CoE for Ian P. Gillo has been released and claimed. Request is now closed.',            time: 'Mar 3 · 10:00 AM',  unread: false, cat: 'Document Requests' },
  { icon: '⚠️', bg: '#FFF8E1', title: 'Claim Slip Expiring — #REQ-012',          msg: 'Claim slip for Kian Del Rosario will expire in 6 days. Documents are still in the office.', time: 'Mar 2 · 4:45 PM',   unread: false, cat: 'Document Requests' },
];

const TABS = [
  { label: 'All', count: 5 },
  { label: 'Unread', count: 3 },
  { label: 'Archived', count: 0 },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  const unreadCount = notifs.filter(n => n.unread).length;
  const visible = activeTab === 1 ? notifs.filter(n => n.unread) : notifs;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Notifications' }]} showNotifDot={false} />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="page-heading" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--navy)' }}>Notifications</div>
            <div className="page-sub" style={{ fontSize: '14px', color: 'var(--mid-gray)' }}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </div>
          </div>
          <button className="btn-outline btn-sm">Mark All as Read</button>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          {TABS.map((t, i) => (
            <div
              key={t.label}
              className={`tab${activeTab === i ? ' active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        {/* Notif list */}
        <div className="notif-card" style={{ background: 'white', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)' }}>
          {visible.map((n, i) => (
            <div 
                key={i} 
                className="notif-item" 
                style={{ 
                    display: 'flex', 
                    gap: 16, 
                    padding: '20px', 
                    borderBottom: i === visible.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                    background: n.unread ? 'rgba(17, 75, 159, 0.02)' : 'transparent',
                    cursor: 'pointer'
                }}
                onClick={() => n.title.includes('#REQ') && router.push(`/staff/request/${n.title.split('#')[1].split(' ')[0]}`)}
            >
              <div 
                className="notif-icon-wrap" 
                style={{ 
                    width: 40, height: 40, borderRadius: '50%', background: n.bg, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 
                }}
              >
                {n.icon}
              </div>
              <div className="notif-body" style={{ flex: 1 }}>
                <div className="notif-title" style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{n.title}</div>
                <div className="notif-msg" style={{ fontSize: 13, color: '#444', marginTop: 4, lineHeight: 1.4 }}>{n.msg}</div>
                <div className="notif-time" style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 8 }}>{n.time}</div>
              </div>
              {n.unread && (
                <div 
                    className="unread-dot" 
                    style={{ width: 8, height: 8, background: 'var(--blue)', borderRadius: '50%', marginTop: 6 }} 
                />
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid-gray)' }}>
                No notifications found.
            </div>
          )}
        </div>
      </div>
    </>
  );
}