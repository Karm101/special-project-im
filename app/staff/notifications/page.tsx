"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../components/drms/Topbar';

const notifs = [
  { icon: '🚨', bg: '#FEEAEA', title: 'Request #REQ-003 — Overdue for Release',  msg: "Maria Dela Cruz's SF9 + SF10 has passed expected claim date of Feb 27, 2026.",           time: 'Today · 8:00 AM',    unread: true,  cat: 'Document Requests' },
  { icon: '📋', bg: '#EBF5FB', title: 'New Request Submitted — #REQ-006',        msg: 'Carlo Mendoza Vega submitted an online Certificate of Grades request (RO-0005).',      time: 'Mar 5 · 9:15 AM',   unread: true,  cat: 'Document Requests' },
  { icon: '✅', bg: '#EAFAF1', title: 'Payment Confirmed — #REQ-004',             msg: 'Jose Rizal Santos settled payment (OR-2026-00460). Request is ready to process.',       time: 'Mar 3 · 2:30 PM',   unread: true,  cat: 'Payment' },
  { icon: '📤', bg: '#F0EDFF', title: 'Document Released — #REQ-001',            msg: 'CoE for Ian P. Gillo has been released and claimed. Request is now closed.',            time: 'Mar 3 · 10:00 AM',  unread: false, cat: 'Document Requests' },
  { icon: '⚠️', bg: '#FFF8E1', title: 'Claim Slip Expiring — #REQ-007',          msg: "Liza Tan Buenaventura's Diploma claim slip expires in 7 days (Mar 21, 2026).",          time: 'Mar 2 · 8:00 AM',   unread: false, cat: 'Claim Slips' },
  { icon: '💳', bg: '#FEEAEA', title: 'Payment Overdue — #REQ-005',              msg: "Ana Reyes Macaraeg's payment for Honorable Dismissal is 3 days overdue.",              time: 'Mar 6 · 9:00 AM',   unread: false, cat: 'Payment' },
  { icon: '🎫', bg: '#F5F5F5', title: 'Claim Slip Issued — #REQ-007',            msg: "Claim slip CS-007 issued for Buenaventura, Liza Tan. Expires Jun 8, 2026.",            time: 'Mar 10 · 11:00 AM', unread: false, cat: 'Claim Slips' },
  { icon: '⚙️', bg: '#F0F0F0', title: 'System Update Scheduled',                 msg: 'DRMS will undergo scheduled maintenance on Mar 20, 2026 from 11 PM – 1 AM.',           time: 'Mar 1 · 6:00 AM',   unread: false, cat: 'System' },
];

const TABS = [
  { label: 'All',               count: 8, filter: null },
  { label: 'Document Requests', count: 3, filter: 'Document Requests' },
  { label: 'Payment',           count: 2, filter: 'Payment' },
  { label: 'Claim Slips',       count: 2, filter: 'Claim Slips' },
  { label: 'System',            count: 1, filter: 'System' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  const filter = TABS[activeTab].filter;
  const visible = filter ? notifs.filter(n => n.cat === filter) : notifs;
  const unreadCount = notifs.filter(n => n.unread).length;

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Notifications' }]} showNotifDot={false} />
      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="page-heading">Notifications</div>
            <div className="page-sub">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn-outline btn-sm">Mark All as Read</button>
        </div>

        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {TABS.map((t, i) => (
            <div key={t.label} className={`tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
              {t.label} <span className="tab-count">{t.count}</span>
            </div>
          ))}
        </div>

        <div className="notif-card">
          {visible.map((n, i) => (
            <div
              key={i}
              className="notif-item"
              style={{ cursor: n.title.includes('#REQ') ? 'pointer' : 'default' }}
              onClick={() => {
                if (n.title.includes('#REQ')) {
                  const id = n.title.split('#REQ-')[1]?.split(/[ —]/)[0];
                  if (id) router.push(`/staff/request/REQ-${id}`);
                }
              }}
            >
              <div className="notif-icon-wrap" style={{ background: n.bg }}>{n.icon}</div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.msg}</div>
                <div className="notif-time">{n.time}</div>
              </div>
              {n.unread && <div className="unread-dot" />}
            </div>
          ))}
          {visible.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--mid-gray)' }}>No notifications found.</div>
          )}
        </div>
      </div>
    </>
  );
}
