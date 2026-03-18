"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, X, Send, FileDown } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';

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
        <div className="comment-item">
          <div className="comment-meta">
            <span className="comment-author">Grace H. Sinday</span>
            <span className="comment-date">Feb 20, 2026</span>
          </div>
          <div className="comment-text">Billing sent to student. Please settle at the Treasury Office.</div>
        </div>
        <div style={{ marginTop: 6 }}>
          <a style={{ fontSize: 11, color: '#114B9F', cursor: 'pointer' }}>View full comments history →</a>
        </div>
      </div>

      <div className="comment-input-row">
        <input className="comment-input" type="text" placeholder="Type your comment here..." />
        <button className="send-btn"><Send size={12} /></button>
      </div>

      <div className="side-sect">
        <div className="side-sect-title">Attachments</div>
        <div className="attach-row">
          <div className="attach-icon-box"><FileDown size={13} /></div>
          <div>
            <div className="attach-name">RO-0005_REQ003.pdf</div>
            <div className="attach-meta">124 KB · Feb 20, 2026</div>
          </div>
          <button className="attach-dl"><Download size={13} /></button>
        </div>
        <div className="attach-row">
          <div className="attach-icon-box"><FileDown size={13} /></div>
          <div>
            <div className="attach-name">OR-2026-00453.pdf</div>
            <div className="attach-meta">48 KB · Feb 21, 2026</div>
          </div>
          <button className="attach-dl"><Download size={13} /></button>
        </div>
      </div>

      <div className="modal-action-btns">
        <button className="btn-action btn-return">Return for Revision</button>
        <button className="btn-action btn-reject">Reject Request</button>
        <button className="btn-action btn-release">Mark as Ready for Release</button>
      </div>
    </div>
  );
}

function FormTab() {
  return (
    <div className="modal-form-pane">
      <div className="form-section">
        <div className="form-section-title">Requester Information</div>
        <div className="field-grid">
          <div className="field-group"><div className="field-label">Requested By</div><div className="field-value">Maria Dela Cruz</div></div>
          <div className="field-group"><div className="field-label">Student Number</div><div className="field-value">2024110012</div></div>
          <div className="field-group"><div className="field-label">Program / Strand</div><div className="field-value">STEM</div></div>
          <div className="field-group"><div className="field-label">Academic Level</div><div className="field-value">Senior High School</div></div>
          <div className="field-group"><div className="field-label">Enrollment Status</div><div className="field-value">Enrolled</div></div>
          <div className="field-group"><div className="field-label">Academic Year / Term</div><div className="field-value">2025-2026 · 2nd Semester</div></div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Request Details</div>
        <div className="field-grid">
          <div className="field-group"><div className="field-label">Request ID</div><div className="field-value">#REQ-003</div></div>
          <div className="field-group"><div className="field-label">Form Type</div><div className="field-value">RO-0005 (Enrolled Student)</div></div>
          <div className="field-group"><div className="field-label">Submission Mode</div><div className="field-value">Online</div></div>
          <div className="field-group"><div className="field-label">Date Submitted</div><div className="field-value">February 20, 2026</div></div>
          <div className="field-group"><div className="field-label">Expected Claim Date</div><div className="field-value">February 27, 2026</div></div>
          <div className="field-group"><div className="field-label">Authorized Representative</div><div className="field-value">No</div></div>
          <div className="field-group span2"><div className="field-label">Purpose</div><div className="field-value">Requirement for college admission application</div></div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Documents Requested</div>
        <div className="doc-sub-table">
          <table className="drms-table">
            <thead>
              <tr><th>#</th><th>Document Type</th><th>Copies</th><th>Processing Days</th><th>Specification</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td style={{ fontWeight: 600 }}>SF9 (Report Card)</td><td>1</td><td>7 working days</td><td>—</td></tr>
              <tr><td>2</td><td style={{ fontWeight: 600 }}>SF10 (Permanent Record)</td><td>1</td><td>7 working days</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Payment Information</div>
        <div className="field-grid">
          <div className="field-group"><div className="field-label">Amount</div><div className="field-value">₱ 100.00</div></div>
          <div className="field-group"><div className="field-label">Official Receipt No.</div><div className="field-value">OR-2026-00453</div></div>
          <div className="field-group"><div className="field-label">Payment Date</div><div className="field-value">February 21, 2026</div></div>
          <div className="field-group"><div className="field-label">Payment Status</div><div className="field-value"><span className="badge b-done" style={{ fontSize: 13 }}>Paid</span></div></div>
        </div>
      </div>
    </div>
  );
}

const stages = [
  { num: 1, state: 'done',    name: 'Submission',        date: 'Feb 20, 2026 at 8:30 AM',     leftKey: 'Form Received',  leftVal: 'Online (RO Portal)', rightKey: 'Assigned Staff:', rightVal: 'Grace H. Sinday' },
  { num: 2, state: 'done',    name: 'Verification',      date: 'Feb 20, 2026 at 9:00 AM',     leftKey: 'Verified',       leftVal: 'Done',               rightKey: 'Verified By:',    rightVal: 'Grace H. Sinday' },
  { num: 3, state: 'done',    name: 'Billing & Payment', date: 'Feb 21, 2026',                leftKey: 'Amount Billed',  leftVal: '₱ 100.00',           rightKey: 'Official Receipt:', rightVal: 'OR-2026-00453' },
  { num: 4, state: 'active',  name: 'Processing',        date: 'Feb 22, 2026 at 8:00 AM',     leftKey: 'Status',         leftVal: 'In Progress',        rightKey: 'Assigned Staff:', rightVal: 'Grace H. Sinday' },
  { num: 5, state: 'pending', name: 'Ready for Release', date: '',                            leftKey: 'Claim Slip',     leftVal: 'Not yet issued',     rightKey: '',               rightVal: '' },
  { num: 6, state: 'pending', name: 'Released',          date: '',                            leftKey: 'Claimed By',     leftVal: '—',                  rightKey: '',               rightVal: '' },
];

function JourneyTab() {
  return (
    <div className="modal-form-pane">
      <div className="journey-list">
        {stages.map((stage, i) => (
          <div key={stage.num}>
            <div className="stage-row">
              <div className={`stage-num ${stage.state}`}>{stage.num}</div>
              <div className={`stage-card ${stage.state}`}>
                <div className="stage-card-top">
                  <span className={`stage-name${stage.state === 'pending' ? ' pending' : ''}`}>{stage.name}</span>
                  {stage.date && <span className="stage-date">{stage.date}</span>}
                </div>
                <div className="stage-meta">
                  <div>
                    <div className={stage.state === 'pending' ? '' : 'stage-received-key'} style={stage.state === 'pending' ? { fontSize: 14, color: '#B1B1B1' } : {}}>
                      {stage.leftKey}
                    </div>
                    <div className={`stage-received-val${stage.state === 'pending' ? ' pending' : ''}`}
                      style={stage.state === 'active' ? { color: '#114B9F' } : {}}>
                      {stage.leftVal}
                    </div>
                  </div>
                  {stage.rightKey && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="stage-approver-key">{stage.rightKey}</div>
                      <div className="stage-approver-val">{stage.rightVal}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="journey-connector">
                <div className={`connector-line${stage.state === 'done' ? ' done' : ''}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RequestPage() {
  const router = useRouter();
  const params = useParams();
  const reqId = params?.id ? `#${params.id}` : '#REQ-003';
  const [activeTab, setActiveTab] = useState<'form' | 'journey'>('form');

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: reqId as string }]} showNotifDot={false} />
      <div className="modal-full">
        <div className="modal-box-full">
          <div className="modal-header">
            <div className="modal-header-brand">
              <div className="modal-header-icon">M</div>
              <span className="modal-header-name">Registrar's Office — MMCM</span>
            </div>
            <span className="modal-title">Document Request Form — {reqId}</span>
            <button className="modal-dl-btn"><Download size={12} /> Download Form</button>
            <button className="modal-close-btn" onClick={() => router.push('/staff/dashboard')}><X size={14} /></button>
          </div>

          <div className="modal-tab-row">
            <div className="modal-tab-list">
              <div className={`modal-tab${activeTab === 'form' ? ' active' : ''}`} onClick={() => setActiveTab('form')}>Form</div>
              <div className={`modal-tab${activeTab === 'journey' ? ' active' : ''}`} onClick={() => setActiveTab('journey')}>Journey</div>
            </div>
            <span className="workflow-status">● For Approval</span>
          </div>

          <div className="modal-body">
            {activeTab === 'form' ? <FormTab /> : <JourneyTab />}
            <SidePanel />
          </div>
        </div>
      </div>
    </>
  );
}
