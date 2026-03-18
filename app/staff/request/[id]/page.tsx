"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Changed to Next.js hooks
import { Download, X, Send, FileDown } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar'; // Go up 3 levels for dynamic routes

/* ── Side Panel (shared between Form and Journey tabs) ────────── */
function SidePanel() {
  return (
    <div className="modal-side-pane">
      <div className="side-sect">
        <div className="side-sect-title">Assigned Staff</div>
        <div className="approver-row">
          <div className="approver-av">GS</div>
          <div>
            <div className="approver-name">Grace H. Sinday</div>
            <div className="approver-role">RO Staff</div>
          </div>
        </div>
      </div>

      <div className="side-sect" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="side-sect-title">Recent Comments</div>
        <div className="comment-item">
          <div className="comment-meta">
            <span className="comment-author">Grace H. Sinday</span>
            <span className="comment-date">Feb 21, 2026</span>
          </div>
          <div className="comment-text">Payment confirmed via Treasury Office. Now processing SF9 and SF10.</div>
        </div>
      </div>

      <div className="side-sect" style={{ borderBottom: 'none' }}>
        <div style={{ position: 'relative' }}>
          <textarea className="drms-input" placeholder="Type an internal comment..." style={{ height: 80, paddingRight: 40, resize: 'none' }} />
          <button style={{ position: 'absolute', right: 8, bottom: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#114B9F' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Form ────────────────────────────────────────────────── */
function FormTab() {
  return (
    <div className="modal-scroll-area">
      <div className="req-group">
        <div className="req-g-title">Requester Information</div>
        <div className="req-grid">
          <div><div className="req-lbl">Full Name</div><div className="req-val">Dela Cruz, Maria</div></div>
          <div><div className="req-lbl">Student Number</div><div className="req-val">2021-100234</div></div>
          <div><div className="req-lbl">Program / Strand</div><div className="req-val">STEM</div></div>
          <div><div className="req-lbl">Level / Status</div><div className="req-val">SHS · Enrolled</div></div>
          <div><div className="req-lbl">Contact Number</div><div className="req-val">0917 123 4567</div></div>
          <div><div className="req-lbl">Email Address</div><div className="req-val">mdelacruz@mcm.edu.ph</div></div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Journey ─────────────────────────────────────────────── */
function JourneyTab() {
  return (
    <div className="modal-scroll-area">
      <div style={{ padding: 20 }}>
        <h4>Request Journey Tracker</h4>
        <p style={{ color: '#B1B1B1', fontSize: 13 }}>Tracking steps will appear here.</p>
      </div>
    </div>
  );
}

export default function RequestPage() { // Added 'default'
  const router = useRouter();
  const params = useParams(); // Next.js way to get URL params
  const reqId = params?.id ? `#${params.id}` : '#REQ-XXXX'; // Re-add the hash
  
  const [activeTab, setActiveTab] = useState<'form' | 'journey'>('form');

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests', href: '/dashboard' }, { label: reqId as string }]} showNotifDot={false} />
      
      {/* Dim overlay */}
      <div className="modal-overlay">
        <div className="modal-box-full">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-brand">
              <div className="modal-header-icon">M</div>
              <span className="modal-header-name">Registrar's Office — MMCM</span>
            </div>
            <span className="modal-title">Document Request Form — {reqId}</span>
            <button className="modal-dl-btn"><Download size={12} /> Download Form</button>
            <button className="modal-close-btn" onClick={() => router.push('/dashboard')}>
              <X size={14} />
            </button>
          </div>

          {/* Modal Tabs */}
          <div className="modal-tab-row">
            <div className="modal-tab-list">
              <div
                className={`modal-tab${activeTab === 'form' ? ' active' : ''}`}
                onClick={() => setActiveTab('form')}
              >
                Form
              </div>
              <div
                className={`modal-tab${activeTab === 'journey' ? ' active' : ''}`}
                onClick={() => setActiveTab('journey')}
              >
                Journey
              </div>
            </div>
            <span className="workflow-status">● For Approval</span>
          </div>

          {/* Body */}
          <div className="modal-body">
            {activeTab === 'form' ? <FormTab /> : <JourneyTab />}
            <SidePanel />
          </div>
        </div>
      </div>
    </>
  );
}