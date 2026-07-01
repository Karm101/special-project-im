"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, X, Send } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';
import { API_BASE } from '@/lib/lib_api';

// ── API types ─────────────────────────────────────────────────────────────────

type Clearance = {
  clearance_id:     number;
  office_name:      string;
  clearance_status: string;
  cleared_at:       string | null;
  cleared_by_name:  string | null;
  date_processed:   string | null;
  processed_by:     string | null;
  remarks:          string | null;
  signature_image_url: string | null;
};

type Requester = {
  requester_id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  program_strand: string;
  academic_level: string;
  enrollment_status: string;
  academic_year: string | null;
  term_semester: string | null;
  email: string;
  contact_number: string | null;
};

type Staff = {
  staff_id: number;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
};

type RequestedDoc = {
  request_doc_id: number;
  document_name: string;
  copies: number;
  processing_days: number;
  specification: string | null;
};

type StatusLog = {
  log_id: number;
  status: string;
  timestamp: string;
  remarks: string | null;
  staff_name: string | null;
};

type Payment = {
  payment_id: number;
  amount: string;
  official_receipt_no: string | null;
  payment_date: string | null;
  payment_status: string;
};

type RequestDetail = {
  request_id: number;
  document_request_no: string | null;
  is_board_exam: boolean;
  form_type: string;
  academic_level: string;
  submission_mode: string;
  purpose: string;
  date_submitted: string;
  expected_claim_date: string | null;
  actual_claim_date: string | null;
  is_authorized_rep: boolean;
  representative_name: string | null;
  rep_relation: string | null;
  current_status: string;
  requester_info: Requester | null;
  assigned_staff: Staff | null;
  billed_by_staff: Staff | null;
  requested_documents: RequestedDoc[];
  status_logs: StatusLog[];
  payment_info: Payment | null;
  clearances: Clearance[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const PH_TZ = 'Asia/Manila';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: PH_TZ });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: PH_TZ });
}

function statusToWorkflow(status: string): string {
  const labels: Record<string, string> = {
    'Pending':        '● Submitted',
    'For Validation': '● For Validation',
    'Invalid Request':'● Invalid Request',
    'For Clearance':  '● For Clearance',
    'For Billing':    '● For Billing',
    'For Payment':    '● For Payment',
    'Paid':           '● Paid',
    'For Processing': '● For Processing',
    'For Printing':   '● For Printing',
    'For Release':    '● For Release',
    'Claimed':        '● Claimed',
    'Shredded':       '● Shredded',
    'Rejected':       '● Rejected',
  };
  return labels[status] ?? `● ${status}`;
}

function statusToBadge(status: string): { cls: string; label: string } {
  switch (status) {
    case 'Pending':         return { cls: 'b-sub',  label: 'Submitted' };
    case 'For Validation':  return { cls: 'b-end',  label: 'For Validation' };
    case 'Invalid Request': return { cls: 'b-rej',  label: 'Invalid Request' };
    case 'For Clearance':   return { cls: 'b-rev',  label: 'For Clearance' };
    case 'For Billing':     return { cls: 'b-rev',  label: 'For Billing' };
    case 'For Payment':     return { cls: 'b-rev',  label: 'For Payment' };
    case 'Paid':            return { cls: 'b-apr',  label: 'Paid' };
    case 'For Processing':  return { cls: 'b-apr',  label: 'For Processing' };
    case 'For Printing':    return { cls: 'b-apr',  label: 'For Printing' };
    case 'For Release':     return { cls: 'b-rel',  label: 'For Release' };
    case 'Claimed':         return { cls: 'b-done', label: 'Claimed' };
    case 'Shredded':        return { cls: 'b-rej',  label: 'Shredded' };
    case 'Rejected':        return { cls: 'b-rej',  label: 'Rejected' };
    default:                return { cls: 'b-sub',  label: status };
  }
}

function statusToStageIndex(status: string): number {
  switch (status) {
    case 'Pending':         return 1;
    case 'For Validation':  return 2;
    case 'Invalid Request': return 2;
    case 'For Clearance':   return 2;
    case 'For Billing':     return 3;
    case 'For Payment':     return 4;
    case 'Paid':            return 5;
    case 'For Processing':  return 6;
    case 'For Printing':    return 7;
    case 'For Release':     return 8;
    case 'Claimed':         return 9;
    case 'Shredded':        return 9;
    case 'Rejected':        return 2;
    default:                return 1;
  }
}

function formatRequestId(requestId: number, documentRequestNo?: string | null): string {
  return documentRequestNo ?? `REQ-${String(requestId).padStart(3, '0')}`;
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function SidePanel({
  data, onUpdateStatus, updating, staffList, onAssignStaff, onAssignBilledBy,
}: {
  data: RequestDetail;
  onUpdateStatus: (status: string, remarks: string) => Promise<void>;
  updating: boolean;
  staffList: Staff[];
  onAssignStaff: (staffId: number) => Promise<void>;
  onAssignBilledBy: (staffId: number) => Promise<void>;
}) {
  const [comment, setComment]             = useState('');
  const [rejectMode, setRejectMode]       = useState(false);
  const [invalidMode, setInvalidMode]     = useState(false);
  const [clearanceMode, setClearanceMode] = useState(false);
  const [billingModal, setBillingModal]   = useState(false);

  const staffName     = data.assigned_staff ? `${data.assigned_staff.first_name} ${data.assigned_staff.last_name}` : 'Unassigned';
  const staffInitials = data.assigned_staff ? `${data.assigned_staff.first_name[0]}${data.assigned_staff.last_name[0]}` : '?';
  const billedByName  = data.billed_by_staff ? `${data.billed_by_staff.first_name} ${data.billed_by_staff.last_name}` : 'Not assigned';
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const status        = data.current_status;

  // Sort by timestamp descending — newest first, guaranteed regardless of API order
  const allLogs = [...(data.status_logs || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const visibleLogs = showAll ? allLogs.slice(0, visibleCount) : allLogs.slice(0, 5);
  const hasMore = allLogs.length > visibleCount;
  const hasOlder = !showAll && allLogs.length > 5;

  // Terminal statuses — no more actions
  const isTerminal = ['Claimed', 'Shredded', 'Rejected', 'Invalid Request'].includes(status);

  // Which buttons to show
  const canAdvance    = !isTerminal;
  const canReturn     = ['For Validation', 'For Clearance', 'For Billing', 'For Payment', 'Paid', 'For Processing', 'For Printing'].includes(status);
  const canReject     = !isTerminal;
  const canInvalid    = ['Pending', 'For Validation'].includes(status);
  const canClearance  = ['For Validation', 'For Billing'].includes(status);

  const nextStatus: Record<string, string> = {
    'Pending':        'For Validation',
    'For Validation': 'For Billing',
    'For Clearance':  'For Billing',   // ← add this line
    'For Billing':    'For Payment',
    'For Payment':    'Paid',
    'Paid':           'For Processing',
    'For Processing': 'For Printing',
    'For Printing':   'For Release',
    'For Release':    'Claimed',
  };

  const nextLabel: Record<string, string> = {
    'Pending':        'Mark as For Validation',
    'For Validation': 'Mark as For Billing',
    'For Clearance':  'Resume — Mark as For Billing',  // ← add this line
    'For Billing':    'Mark as For Payment',
    'For Payment':    'Mark as Paid',
    'Paid':           'Mark as For Processing',
    'For Processing': 'Mark as For Printing',
    'For Printing':   'Mark as For Release',
    'For Release':    'Mark as Claimed',
  };

  function resetModes() {
    setRejectMode(false);
    setInvalidMode(false);
    setClearanceMode(false);
    setComment('');
  }

  function handleRejectClick() {
    resetModes();
    setRejectMode(true);
    const reqId = `REQ-${String(data.request_id).padStart(3, '0')}`;
    setComment(`Request ${reqId} has been rejected. Reason: `);
  }

  function handleInvalidClick() {
    resetModes();
    setInvalidMode(true);
    const reqId = `REQ-${String(data.request_id).padStart(3, '0')}`;
    setComment(`Request ${reqId} has been marked as invalid. Reason: `);
  }

  function handleClearanceClick() {
    resetModes();
    setClearanceMode(true);
    setComment('');
  }

  async function handleConfirmReject() {
    if (!comment.trim() || comment.endsWith('Reason: ')) {
      alert('Please enter a reason for the rejection.');
      return;
    }
    await onUpdateStatus('Rejected', comment);
    resetModes();
  }

  async function handleConfirmInvalid() {
    if (!comment.trim() || comment.endsWith('Reason: ')) {
      alert('Please enter a reason for marking as invalid.');
      return;
    }
    await onUpdateStatus('Invalid Request', comment);
    resetModes();
  }

  async function handleConfirmClearance() {
    await onUpdateStatus('For Clearance', comment || 'Request placed on hold pending clearance.');
    resetModes();
  }

  async function handleAdvance() {
    const next = nextStatus[status];
    if (!next) return;
    // Show billing disclaimer when advancing to For Billing
    if (next === 'For Billing') {
      setBillingModal(true);
      return;
    }
    await onUpdateStatus(next, comment || '');
    setComment('');
  }

  async function handleConfirmBilling() {
    setBillingModal(false);
    await onUpdateStatus('For Billing', comment || '');
    setComment('');
  }

  async function handleReturn() {
    await onUpdateStatus('Pending', comment || 'Returned for revision');
    setComment('');
  }

  const activeMode = rejectMode || invalidMode || clearanceMode;

  return (
    <div className="modal-side-pane">

      {/* Billing Disclaimer Modal */}
      {billingModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 320, margin: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#001C43', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Billing Reminder
            </div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6, marginBottom: 16 }}>
              You are about to mark this request as <strong>For Billing</strong>.<br /><br />
              The student will be notified via the school's billing system (SMS/email) with their statement of account.<br /><br />
              The <strong>7-working-day processing period</strong> will only begin after the student's payment is confirmed.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-action btn-release" style={{ flex: 1, fontSize: 12 }} disabled={updating} onClick={handleConfirmBilling}>
                {updating ? 'Processing...' : '✓ Confirm For Billing'}
              </button>
              <button className="btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setBillingModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Staff */}
      <div className="side-sect">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="side-sect-title" style={{ marginBottom: 0 }}>Assigned To</div>
          {staffList.length > 0 && (
            <select className="drms-select" style={{ fontSize: 11, padding: '3px 8px', height: 28, width: 'auto', maxWidth: 130 }}
              value={data.assigned_staff?.staff_id ?? ''}
              onChange={e => e.target.value && onAssignStaff(parseInt(e.target.value))}>
              <option value="">Reassign...</option>
              {staffList.map(s => <option key={s.staff_id} value={s.staff_id}>{s.last_name}, {s.first_name}</option>)}
            </select>
          )}
        </div>
        <div className="approver-row">
          <div className="approver-av">{staffInitials}</div>
          <div>
            <div className="approver-name">{staffName}</div>
            <div className="approver-role">{data.assigned_staff?.position ?? 'RO Staff'}</div>
          </div>
        </div>
      </div>

      {/* Billed By */}
      <div className="side-sect">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="side-sect-title" style={{ marginBottom: 0 }}>Billed By</div>
          {staffList.length > 0 && (
            <select className="drms-select" style={{ fontSize: 11, padding: '3px 8px', height: 28, width: 'auto', maxWidth: 130 }}
              value={data.billed_by_staff?.staff_id ?? ''}
              onChange={e => e.target.value && onAssignBilledBy(parseInt(e.target.value))}>
              <option value="">Assign...</option>
              {staffList.map(s => <option key={s.staff_id} value={s.staff_id}>{s.last_name}, {s.first_name}</option>)}
            </select>
          )}
        </div>
        <div style={{ fontSize: 12, color: data.billed_by_staff ? 'var(--text-primary)' : 'var(--mid-gray)', fontStyle: data.billed_by_staff ? 'normal' : 'italic' }}>
          {billedByName}
        </div>
      </div>

      {/* Status History */}
      <div className="side-sect" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="side-sect-title">Status History</div>
        {allLogs.length === 0 ? (
          <div style={{ fontSize: 12, color: '#B1B1B1' }}>No status changes yet.</div>
        ) : (
          <>
            {visibleLogs.map(log => (
              <div key={log.log_id} className="comment-item">
                <div className="comment-meta">
                  <span className="comment-author">{log.staff_name ?? 'System'}</span>
                  <span className="comment-date">{formatDateTime(log.timestamp)}</span>
                </div>
                <div className="comment-text">
                  Status changed to <strong>{log.status}</strong>
                  {log.remarks ? ` — ${log.remarks}` : ''}
                </div>
              </div>
            ))}
            {/* Load more older entries */}
            {showAll && hasMore && (
              <button
                onClick={() => setVisibleCount(c => c + 5)}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '6px 0', textAlign: 'center' }}>
                ↓ Load more
              </button>
            )}
            {/* Show older / collapse */}
            {hasOlder && !showAll && (
              <button
                onClick={() => { setShowAll(true); setVisibleCount(10); }}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--blue)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '6px 0', textAlign: 'center' }}>
                ↓ Load older entries ({allLogs.length - 5} more)
              </button>
            )}
            {showAll && (
              <button
                onClick={() => { setShowAll(false); setVisibleCount(5); }}
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--mid-gray)', fontSize: 11, cursor: 'pointer', padding: '6px 0', textAlign: 'center' }}>
                ↑ Show less
              </button>
            )}
          </>
        )}
      </div>

      {/* Reject mode */}
      {rejectMode && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff8f8' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E50019', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Confirm Rejection
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>Edit the message below — include the specific reason.</div>
          <textarea className="drms-textarea" style={{ fontSize: 12, minHeight: 80, resize: 'vertical', borderColor: '#E50019' }}
            value={comment} onChange={e => setComment(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-action btn-reject" style={{ flex: 1, fontSize: 12 }} disabled={updating} onClick={handleConfirmReject}>
              {updating ? 'Rejecting...' : '✓ Confirm Rejection'}
            </button>
            <button className="btn-outline btn-sm" style={{ flex: 1 }} onClick={resetModes}>Cancel</button>
          </div>
        </div>
      )}

      {/* Invalid Request mode */}
      {invalidMode && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff8f8' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E50019', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Mark as Invalid Request
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>
            Use this when the requested document is inappropriate for the student's current level, department, or academic status.
          </div>
          <textarea className="drms-textarea" style={{ fontSize: 12, minHeight: 80, resize: 'vertical', borderColor: '#E50019' }}
            value={comment} onChange={e => setComment(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-action btn-reject" style={{ flex: 1, fontSize: 12 }} disabled={updating} onClick={handleConfirmInvalid}>
              {updating ? 'Processing...' : '✓ Confirm Invalid Request'}
            </button>
            <button className="btn-outline btn-sm" style={{ flex: 1 }} onClick={resetModes}>Cancel</button>
          </div>
        </div>
      )}

      {/* For Clearance mode */}
      {clearanceMode && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fffbe6' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#856404', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Place on Clearance Hold
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>
            Use this when the student has outstanding clearances with specific offices. Add a remark specifying which offices need to clear first.
          </div>
          <textarea className="drms-textarea" style={{ fontSize: 12, minHeight: 80, resize: 'vertical', borderColor: '#856404' }}
            placeholder="e.g. Student has outstanding balance at Treasury Office..."
            value={comment} onChange={e => setComment(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-action" style={{ flex: 1, fontSize: 12, background: '#856404', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
              disabled={updating} onClick={handleConfirmClearance}>
              {updating ? 'Processing...' : '✓ Confirm Clearance Hold'}
            </button>
            <button className="btn-outline btn-sm" style={{ flex: 1 }} onClick={resetModes}>Cancel</button>
          </div>
        </div>
      )}

      {/* Comment input — shown when no mode active */}
      {!activeMode && (
        <div className="comment-input-row">
          <input className="comment-input" type="text" placeholder="Add a remark (optional)..."
            value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canAdvance && handleAdvance()} />
          <button className="send-btn"><Send size={12} /></button>
        </div>
      )}

      {/* Action buttons */}
      {!activeMode && (
        <div className="modal-action-btns">
          {canReturn && (
            <button className="btn-action btn-return" disabled={updating} onClick={handleReturn}>
              Return for Revision
            </button>
          )}
          {canClearance && (
            <button className="btn-action" style={{ background: '#856404', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={updating} onClick={handleClearanceClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Put on Clearance Hold
            </button>
          )}
          {canInvalid && (
            <button className="btn-action btn-reject" style={{ background: '#6c757d' }} disabled={updating} onClick={handleInvalidClick}>
              Mark as Invalid Request
            </button>
          )}
          {canReject && (
            <button className="btn-action btn-reject" disabled={updating} onClick={handleRejectClick}>
              Reject Request
            </button>
          )}
          {canAdvance && nextStatus[status] && (
            <button className="btn-action btn-release" disabled={updating} onClick={handleAdvance}>
              {updating ? 'Updating...' : nextLabel[status] ?? 'Advance Status'}
            </button>
          )}
        </div>
      )}

      {/* Terminal state message */}
      {isTerminal && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#B1B1B1', fontStyle: 'italic' }}>
            {status === 'Claimed' && '✓ This request has been completed and claimed.'}
            {status === 'Shredded' && '🗑️ This request has been shredded after 90 days.'}
            {status === 'Rejected' && '✕ This request has been rejected.'}
            {status === 'Invalid Request' && '✕ This request was marked as invalid.'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form Tab ──────────────────────────────────────────────────────────────────
function FormTab({ data }: { data: RequestDetail }) {
  const r = data.requester_info;
  const fullName = r ? `${r.last_name}, ${r.first_name}` : '—';
  const academicPeriod = [r?.academic_year, r?.term_semester].filter(Boolean).join(' · ') || '—';
  const badge = statusToBadge(data.current_status);

  return (
    <div className="modal-form-pane">
      {/* Requester Info */}
      <div className="form-section">
        <div className="form-section-title">Requester Information</div>
        <div className="field-grid">
          <div className="field-group"><div className="field-label">Full Name</div><div className="field-value">{fullName}</div></div>
          <div className="field-group"><div className="field-label">Student Number</div><div className="field-value">{r?.student_number ?? '—'}</div></div>
          <div className="field-group"><div className="field-label">Program / Strand</div><div className="field-value">{r?.program_strand ?? '—'}</div></div>
          <div className="field-group"><div className="field-label">Academic Level</div><div className="field-value">{r?.academic_level ?? '—'}</div></div>
          <div className="field-group"><div className="field-label">Enrollment Status</div><div className="field-value">{r?.enrollment_status ?? '—'}</div></div>
          <div className="field-group"><div className="field-label">Academic Year / Term</div><div className="field-value">{academicPeriod}</div></div>
          <div className="field-group"><div className="field-label">Contact Number</div><div className="field-value">{r?.contact_number ?? '—'}</div></div>
          <div className="field-group"><div className="field-label">Email Address</div><div className="field-value">{r?.email ?? '—'}</div></div>
        </div>
      </div>

      {/* Request Details */}
      <div className="form-section">
        <div className="form-section-title">Request Details</div>
        <div className="field-grid">
          <div className="field-group"><div className="field-label">Request ID</div><div className="field-value">{formatRequestId(data.request_id, data.document_request_no)}</div></div>
          <div className="field-group"><div className="field-label">Current Status</div><div className="field-value"><span className={`badge ${badge.cls}`}>{badge.label}</span></div></div>
          <div className="field-group"><div className="field-label">Form Type</div><div className="field-value">{data.form_type}</div></div>
          <div className="field-group"><div className="field-label">Submission Mode</div><div className="field-value">{data.submission_mode}</div></div>
          <div className="field-group"><div className="field-label">Date Submitted</div><div className="field-value">{formatDate(data.date_submitted)}</div></div>
          <div className="field-group"><div className="field-label">Expected Claim Date</div><div className="field-value">{formatDate(data.expected_claim_date)}</div></div>
          <div className="field-group">
            <div className="field-label">Date Claimed</div>
            <div className="field-value">
              {data.actual_claim_date
                ? <span style={{ color: '#198754', fontWeight: 600 }}>✓ {formatDate(data.actual_claim_date)}</span>
                : <span style={{ color: '#B1B1B1' }}>Not yet claimed</span>}
            </div>
          </div>
          <div className="field-group">
            <div className="field-label">Authorized Representative</div>
            <div className="field-value">{data.is_authorized_rep ? `Yes — ${data.representative_name} (${data.rep_relation})` : 'No'}</div>
          </div>
          <div className="field-group span2"><div className="field-label">Purpose</div><div className="field-value">{data.purpose}</div></div>
        </div>
      </div>

      {/* Documents Requested */}
      <div className="form-section">
        <div className="form-section-title">Documents Requested</div>
        <div className="doc-sub-table">
          <table className="drms-table">
            <thead>
              <tr><th>#</th><th>Document Type</th><th>Copies</th><th>Processing Days</th><th>Specification</th></tr>
            </thead>
            <tbody>
              {data.requested_documents.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#B1B1B1' }}>No documents on record.</td></tr>
              ) : (
                data.requested_documents.map((doc, i) => (
                  <tr key={doc.request_doc_id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{doc.document_name}</td>
                    <td>{doc.copies}</td>
                    <td>{doc.processing_days} working days</td>
                    <td>{doc.specification ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Information */}
      <div className="form-section">
        <div className="form-section-title">Payment Information</div>
        {!data.payment_info ? (
          <div style={{ fontSize: 13, color: '#B1B1B1', padding: '8px 0' }}>No payment record yet.</div>
        ) : (
          <div className="field-grid">
            <div className="field-group">
              <div className="field-label">Payment Status</div>
              <div className="field-value">
                <span className={`badge ${data.payment_info.payment_status === 'Paid' ? 'b-done' : data.payment_info.payment_status === 'Overdue' ? 'b-rej' : 'b-rev'}`}>
                  {data.payment_info.payment_status}
                </span>
              </div>
            </div>
            <div className="field-group">
              <div className="field-label">Payment Date</div>
              <div className="field-value">{formatDate(data.payment_info.payment_date)}</div>
            </div>
            <div className="field-group">
              <div className="field-label">Billed By</div>
              <div className="field-value">
                {data.billed_by_staff
                  ? `${data.billed_by_staff.last_name}, ${data.billed_by_staff.first_name}`
                  : <span style={{ color: '#B1B1B1' }}>Not assigned</span>}
              </div>
            </div>
          </div>
        )}
        {data.payment_info && data.payment_info.payment_status !== 'Paid' && (
          <div className="info-box warn" style={{ marginTop: 10 }}>
            <span className="info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </span>
            <div className="info-text" style={{ fontSize: 12 }}>
              Payment is pending. Once the student pays at the Treasury Office, advance the status to <strong>Paid</strong> using the button in the side panel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Clearance Tab ─────────────────────────────────────────────────────────────
function ClearanceTab({ data, onRefresh }: { data: RequestDetail; onRefresh: () => void }) {
  const [detailModal, setDetailModal]   = useState<Clearance | null>(null);
  const [addingBoardExam, setAddingBoardExam] = useState(false);
  const [removeModal, setRemoveModal]   = useState<Clearance | null>(null);
  const [removing, setRemoving]         = useState(false);
  const [addOfficeModal, setAddOfficeModal] = useState(false);
  const [configOffices, setConfigOffices]   = useState<string[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<Set<string>>(new Set());
  const [freeTextOffice, setFreeTextOffice]   = useState('');
  const [addOfficeLoading, setAddOfficeLoading] = useState(false);
  const [addOfficeError, setAddOfficeError]     = useState('');

  // Documents eligible for board exam clearance
  const BOARD_EXAM_ELIGIBLE_DOCS = ['transcript'];
  const hasBoardExamEligibleDoc = data.requested_documents.some(d =>
    BOARD_EXAM_ELIGIBLE_DOCS.some(keyword =>
      d.document_name.toLowerCase().includes(keyword)
    )
  );

  async function handleAddBoardExamOffices() {
    if (!confirm('This will add Program Chair and College Dean as clearance offices. This cannot be undone. Continue?')) return;
    setAddingBoardExam(true);
    try {
      const res = await fetch(`${API_BASE}/requests/${data.request_id}/add-board-exam-offices/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error ?? 'Failed to add board exam offices.');
        return;
      }
      onRefresh();
    } catch {
      alert('Could not connect to the server.');
    } finally {
      setAddingBoardExam(false);
    }
  }

  async function handleRemoveOffice() {
    if (!removeModal) return;
    setRemoving(true);
    try {
      const res = await fetch(`${API_BASE}/clearance/${removeModal.clearance_id}/remove/`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to remove office.');
        return;
      }
      setRemoveModal(null);
      onRefresh();
    } catch {
      alert('Could not connect to server.');
    } finally {
      setRemoving(false);
    }
  }

  async function openAddOfficeModal() {
    try {
      const res = await fetch(`${API_BASE}/clearance-office/office-names/`);
      if (res.ok) {
        const names: string[] = await res.json();
        setConfigOffices(names);
      }
    } catch {}
    setSelectedOffices(new Set());
    setFreeTextOffice('');
    setAddOfficeError('');
    setAddOfficeModal(true);
  }

  async function handleAddOffices() {
    const toAdd = [
      ...Array.from(selectedOffices),
      ...(freeTextOffice.trim() ? [freeTextOffice.trim()] : []),
    ];
    if (toAdd.length === 0) {
      setAddOfficeError('Select at least one office or enter a name.');
      return;
    }
    setAddOfficeLoading(true);
    setAddOfficeError('');
    try {
      const results = await Promise.all(
        toAdd.map(office_name =>
          fetch(`${API_BASE}/requests/${data.request_id}/add-clearance-office/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ office_name }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        setAddOfficeError(`${failed.length} office(s) could not be added — they may already exist.`);
      } else {
        setAddOfficeModal(false);
        onRefresh();
      }
    } catch {
      setAddOfficeError('Could not connect to server.');
    } finally {
      setAddOfficeLoading(false);
    }
  }

  const clearances = data.clearances ?? [];
  const allCleared = clearances.length > 0 && clearances.every(c => c.clearance_status === 'Cleared');
  const pendingCount = clearances.filter(c => c.clearance_status !== 'Cleared').length;

  return (
    <div className="modal-form-pane">
      {/* Summary banner */}
      {clearances.length === 0 ? (
        <div className="info-box" style={{ marginBottom: 16 }}>
          <span className="info-icon">ℹ️</span>
          <div className="info-text">
            No clearance records for this request. Clearances are auto-created when a request is submitted.
          </div>
        </div>
      ) : allCleared ? (
        <div className="info-box" style={{ marginBottom: 16, background: 'rgba(25,135,84,0.08)', borderColor: '#198754' }}>
          <span className="info-icon">✅</span>
          <div className="info-text">
            All offices have cleared this request. You may proceed to the next stage.
          </div>
        </div>
      ) : (
        <div className="info-box warn" style={{ marginBottom: 16 }}>
          <span className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </span>
          <div className="info-text">
            <strong>{pendingCount} office{pendingCount !== 1 ? 's' : ''} pending clearance.</strong> Copy and send the link to each office. They can click the link to confirm clearance without logging in.
          </div>
        </div>
      )}

      {/* Board Exam / PRC clearance offices */}
      {hasBoardExamEligibleDoc && (
        <div style={{
          marginBottom: 16, padding: '14px 16px',
          background: data.is_board_exam ? 'rgba(25,135,84,0.06)' : 'rgba(17,75,159,0.04)',
          border: `1px solid ${data.is_board_exam ? 'rgba(25,135,84,0.3)' : 'rgba(17,75,159,0.2)'}`,
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Board Exam / PRC Licensure
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid-gray)', lineHeight: 1.6 }}>
                {data.is_board_exam
                  ? 'Program Chair and College Dean clearance offices have been added to this request.'
                  : 'If this TOR is for a PRC board exam or licensure application, click the button to add Program Chair and College Dean as required clearance offices.'}
              </div>
            </div>
            {data.is_board_exam ? (
              <span className="badge b-done" style={{ fontSize: 11, flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}><polyline points="20 6 9 17 4 12"/></svg>
                Added
              </span>
            ) : (
              <button
                className="btn-outline btn-sm"
                style={{ fontSize: 11, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#114B9F', borderColor: '#114B9F' }}
                disabled={addingBoardExam}
                onClick={handleAddBoardExamOffices}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {addingBoardExam ? 'Adding...' : 'Add Board Exam Offices'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clearance table */}
      {clearances.length > 0 && (
        <div className="form-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="form-section-title" style={{ marginBottom: 0 }}>Clearance Status</div>
            <button
              className="btn-outline btn-sm"
              onClick={onRefresh}
              title="Refresh clearance status"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clearances.map(c => {
              const isCleared = c.clearance_status === 'Cleared';
              return (
                <div key={c.clearance_id} style={{
                  border: `1px solid ${isCleared ? 'rgba(25,135,84,0.3)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 10, padding: '12px 16px',
                  background: isCleared ? 'rgba(25,135,84,0.04)' : 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isCleared ? 6 : 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isCleared ? '#198754' : '#FFA323', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      {isCleared ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.office_name}</div>
                      {isCleared && (
                        <div style={{ fontSize: 11, color: '#198754', marginTop: 2 }}>
                          Cleared by {c.cleared_by_name} · {formatDate(c.cleared_at)}
                        </div>
                      )}
                      {isCleared && (
                        <button onClick={() => setDetailModal(c)} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 600, color: '#114B9F', cursor: 'pointer', textDecoration: 'underline' }}>
                          View Clearance Details
                        </button>
                      )}
                    </div>
                    <span className={`badge ${isCleared ? 'b-done' : 'b-rev'}`} style={{ fontSize: 11 }}>
                      {isCleared ? 'Cleared' : 'Pending'}
                    </span>
                  </div>
                  {!isCleared && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn-outline btn-sm"
                        style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: '#E50019', borderColor: '#E50019' }}
                        onClick={() => setRemoveModal(c)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add office button */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-col)' }}>
          <button
            className="btn-outline btn-sm"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={openAddOfficeModal}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Office
          </button>
        </div>

      {/* How it works */}
      <div className="form-section">
        <div className="form-section-title">How Clearance Works</div>
        <div style={{ fontSize: 12, color: 'var(--mid-gray)', lineHeight: 1.8 }}>
          <div>1. Each clearance office listed here has access to their own dashboard where they can confirm clearances.</div>
          <div>2. Once all offices have confirmed, resume the request using <strong>Resume — Mark as For Billing</strong> in the side panel.</div>
          <div>3. You can manually add or remove offices from this list at any time using the buttons above.</div>
        </div>
      </div>

      {/* ── Remove Office Modal ── */}
      {removeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setRemoveModal(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Remove Office</div>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.6 }}>
              Remove <strong>{removeModal.office_name}</strong> from this request's clearance list?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              This only affects this specific request. The office configuration is not changed. You can add it back at any time.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                disabled={removing}
                onClick={handleRemoveOffice}
              >
                {removing ? 'Removing...' : 'Yes, Remove'}
              </button>
              <button className="btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRemoveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Office Modal ── */}
      {addOfficeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setAddOfficeModal(false)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#001C43', marginBottom: 4 }}>Add Clearance Office</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Select from the configured list or enter a new office name.</div>

            {/* Configured offices */}
            {configOffices.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Configured offices for {data.form_type}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                  {configOffices.map(name => {
                    const alreadyIn = clearances.some(c => c.office_name === name);
                    return (
                      <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: alreadyIn ? 'not-allowed' : 'pointer', opacity: alreadyIn ? 0.4 : 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedOffices.has(name)}
                          disabled={alreadyIn}
                          onChange={e => {
                            const next = new Set(selectedOffices);
                            e.target.checked ? next.add(name) : next.delete(name);
                            setSelectedOffices(next);
                          }}
                          style={{ width: 15, height: 15, accentColor: '#114B9F' }}
                        />
                        <span style={{ fontSize: 13, color: '#001C43' }}>{name}</span>
                        {alreadyIn && <span style={{ fontSize: 11, color: '#B1B1B1', fontStyle: 'italic' }}>already on this request</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Free text */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>New office name</div>
              <input
                type="text"
                placeholder="e.g. Program Chair"
                value={freeTextOffice}
                onChange={e => { setFreeTextOffice(e.target.value); setAddOfficeError(''); }}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #ddd', borderRadius: 8, fontFamily: "'Montserrat', sans-serif", outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: '#B1B1B1', marginTop: 3 }}>Leave blank if selecting from the list above</div>
            </div>

            {addOfficeError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12 }}>{addOfficeError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ flex: 1, padding: 10, background: selectedOffices.size + (freeTextOffice.trim() ? 1 : 0) > 0 ? '#001C43' : '#B1B1B1', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedOffices.size + (freeTextOffice.trim() ? 1 : 0) > 0 ? 'pointer' : 'not-allowed', fontFamily: "'Montserrat', sans-serif" }}
                disabled={addOfficeLoading}
                onClick={handleAddOffices}
              >
                {addOfficeLoading ? 'Adding...' : `Add ${selectedOffices.size + (freeTextOffice.trim() ? 1 : 0) || ''} Office${selectedOffices.size + (freeTextOffice.trim() ? 1 : 0) !== 1 ? 's' : ''}`}
              </button>
              <button className="btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAddOfficeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clearance Detail Modal ── */}
      {detailModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setDetailModal(null)}>
          <div style={{
            background: 'white', borderRadius: 12, width: '100%', maxWidth: 640,
            boxShadow: '0 8px 40px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ background: '#001C43', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
                CLEARANCE DETAILS
              </div>
              <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Form-style clearance table */}
            <div style={{ padding: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '28%' }}>Department / Office</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '36%' }}>PROCESSED BY: (name &amp; signature)</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '18%' }}>Date</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: '18%' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* Office name */}
                    <td style={{ border: '1px solid #ccc', padding: '10px 10px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: '#001C43' }}>{detailModal.office_name}</div>
                    </td>

                    {/* Processed by — name + signature image */}
                    <td style={{ border: '1px solid #ccc', padding: '10px 10px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#001C43', marginBottom: 8 }}>
                        {detailModal.cleared_by_name ?? '—'}
                      </div>
                      {detailModal.signature_image_url ? (
                        <img
                          src={detailModal.signature_image_url}
                          alt="E-signature"
                          style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', border: '1px solid #eee', borderRadius: 4, padding: 4, background: '#fafafa' }}
                        />
                      ) : (
                        <div style={{ fontSize: 11, color: '#B1B1B1', fontStyle: 'italic' }}>No signature on file</div>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ border: '1px solid #ccc', padding: '10px 10px', verticalAlign: 'top' }}>
                      <div style={{ color: '#001C43' }}>
                        {detailModal.cleared_at
                          ? new Date(detailModal.cleared_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })
                          : '—'}
                      </div>
                    </td>

                    {/* Remarks */}
                    <td style={{ border: '1px solid #ccc', padding: '10px 10px', verticalAlign: 'top' }}>
                      <div style={{ color: '#001C43' }}>{detailModal.remarks ?? '—'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footer note */}
              <div style={{ marginTop: 16, fontSize: 11, color: '#B1B1B1', textAlign: 'right' }}>
                Mapúa Malayan Colleges Mindanao — Registrar's Office
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Journey Tab ───────────────────────────────────────────────────────────────
function JourneyTab({ data }: { data: RequestDetail }) {
  const currentStage = statusToStageIndex(data.current_status);
  const staffName    = data.assigned_staff ? `${data.assigned_staff.first_name} ${data.assigned_staff.last_name}` : '—';
  const billedBy     = data.billed_by_staff ? `${data.billed_by_staff.first_name} ${data.billed_by_staff.last_name}` : '—';
  const isRejected   = ['Rejected', 'Invalid Request', 'Shredded'].includes(data.current_status);

  const STAGES = [
    {
      num: 1, name: 'Submission',
      leftKey: 'Form Received', leftVal: `${data.submission_mode} (RO Portal)`,
      rightKey: 'Assigned To:', rightVal: staffName,
      statuses: ['Pending'],
    },
    {
      num: 2, name: 'Validation',
      leftKey: 'Validated', leftVal: currentStage > 2 ? 'Done' : '—',
      rightKey: 'Validated By:', rightVal: staffName,
      statuses: ['For Validation', 'Invalid Request', 'For Clearance', 'Rejected'],
    },
    {
      num: 3, name: 'For Billing',
      leftKey: 'Billed By', leftVal: billedBy,
      rightKey: '', rightVal: '',
      statuses: ['For Billing'],
    },
    {
      num: 4, name: 'For Payment',
      leftKey: 'Payment', leftVal: currentStage >= 4 ? 'Awaiting Payment' : '—',
      rightKey: '', rightVal: '',
      statuses: ['For Payment'],
    },
    {
      num: 5, name: 'Paid',
      leftKey: 'Payment', leftVal: currentStage >= 5 ? 'Confirmed' : 'Pending',
      rightKey: 'Date:', rightVal: formatDate(data.payment_info?.payment_date ?? null),
      statuses: ['Paid'],
    },
    {
      num: 6, name: 'For Processing',
      leftKey: 'Status', leftVal: currentStage === 6 ? 'In Progress' : currentStage > 6 ? 'Done' : '—',
      rightKey: 'Assigned To:', rightVal: staffName,
      statuses: ['For Processing'],
    },
    {
      num: 7, name: 'For Printing',
      leftKey: 'Status', leftVal: currentStage === 7 ? 'Being Printed' : currentStage > 7 ? 'Done' : '—',
      rightKey: '', rightVal: '',
      statuses: ['For Printing'],
    },
    {
      num: 8, name: 'For Release',
      leftKey: 'Ready', leftVal: currentStage >= 8 ? 'Yes' : 'Not yet',
      rightKey: '', rightVal: '',
      statuses: ['For Release'],
    },
    {
      num: 9, name: 'Claimed',
      leftKey: 'Date Claimed', leftVal: formatDate(data.actual_claim_date),
      rightKey: '', rightVal: '',
      statuses: ['Claimed', 'Shredded'],
    },
  ];

  const logForStage = (stage: typeof STAGES[0]) => {
    return data.status_logs?.find(l => stage.statuses.includes(l.status));
  };

  return (
    <div className="modal-form-pane">
      {/* Rejected/Invalid/Shredded banner */}
      {isRejected && (
        <div className="info-box warn" style={{ marginBottom: 16 }}>
          <span className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
          <div className="info-text">
            This request was marked as <strong>{data.current_status}</strong>.
            {data.status_logs?.find(l => ['Rejected','Invalid Request','Shredded'].includes(l.status))?.remarks
              ? ` Reason: ${data.status_logs.find(l => ['Rejected','Invalid Request','Shredded'].includes(l.status))?.remarks}`
              : ''}
          </div>
        </div>
      )}

      {/* For Clearance banner */}
      {data.current_status === 'For Clearance' && (
        <div className="info-box warn" style={{ marginBottom: 16, borderColor: '#856404' }}>
          <span className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </span>
          <div className="info-text">
            This request is on <strong>Clearance Hold</strong>.
            {data.status_logs?.find(l => l.status === 'For Clearance')?.remarks
              ? ` ${data.status_logs.find(l => l.status === 'For Clearance')?.remarks}`
              : ' Waiting for office clearances to be completed.'}
          </div>
        </div>
      )}

      <div className="journey-list">
        {STAGES.map((stage, i) => {
          const stageState = stage.num < currentStage ? 'done'
            : stage.num === currentStage ? 'active'
            : 'pending';
          const log = logForStage(stage);
          const dateStr = log ? formatDateTime(log.timestamp) : '';

          return (
            <div key={stage.num}>
              <div className="stage-row">
                <div className={`stage-num ${stageState}`}>{stage.num}</div>
                <div className={`stage-card ${stageState}`}>
                  <div className="stage-card-top">
                    <span className={`stage-name${stageState === 'pending' ? ' pending' : ''}`}>{stage.name}</span>
                    {dateStr && <span className="stage-date">{dateStr}</span>}
                  </div>
                  <div className="stage-meta">
                    <div>
                      <div className={stageState === 'pending' ? '' : 'stage-received-key'}
                        style={stageState === 'pending' ? { fontSize: 14, color: '#B1B1B1' } : {}}>
                        {stage.leftKey}
                      </div>
                      <div className={`stage-received-val${stageState === 'pending' ? ' pending' : ''}`}
                        style={stageState === 'active' ? { color: '#114B9F' } : {}}>
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
                  {log?.remarks && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                      Remarks: {log.remarks}
                    </div>
                  )}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div className="journey-connector">
                  <div className={`connector-line${stageState === 'done' ? ' done' : ''}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RequestPage() {
  const router   = useRouter();
  const params   = useParams();
  const [activeTab, setActiveTab] = useState<'form' | 'journey' | 'clearance'>('form');
  const [data, setData]           = useState<RequestDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [updating, setUpdating]   = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch(`${API_BASE}/staff/`);
        if (!res.ok) return;
        const d = await res.json();
        setStaffList(d.results ?? d);
      } catch {}
    }
    fetchStaff();
  }, []);

  const rawId     = params?.id as string ?? '';
  const numericId = parseInt(rawId, 10);
  const displayId = data ? formatRequestId(data.request_id, data.document_request_no) : rawId;

  useEffect(() => {
    if (!numericId) return;
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/requests/${numericId}/`);
        if (!res.ok) throw new Error('Request not found');
        setData(await res.json());
      } catch {
        setError('Could not load request. Make sure Django is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [numericId]);

  async function handleRefresh() {
    if (!numericId) return;
    try {
      const res = await fetch(`${API_BASE}/requests/${numericId}/`);
      if (res.ok) setData(await res.json());
    } catch {}
  }

  async function handleAssignStaff(staffId: number) {
    try {
      await fetch(`${API_BASE}/requests/${numericId}/assign_staff/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId }),
      });
      const updated = await fetch(`${API_BASE}/requests/${numericId}/`);
      setData(await updated.json());
    } catch { alert('Failed to assign staff.'); }
  }

  async function handleAssignBilledBy(staffId: number) {
    try {
      await fetch(`${API_BASE}/requests/${numericId}/assign_staff/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billed_by_id: staffId }),
      });
      const updated = await fetch(`${API_BASE}/requests/${numericId}/`);
      setData(await updated.json());
    } catch { alert('Failed to assign billing staff.'); }
  }

  async function handleUpdateStatus(newStatus: string, remarks: string) {
    if (!data) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/requests/${numericId}/update_status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, remarks, staff_id: data.assigned_staff?.staff_id ?? null }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await fetch(`${API_BASE}/requests/${numericId}/`);
      setData(await updated.json());
    } catch { alert('Failed to update status. Please try again.'); }
    finally { setUpdating(false); }
  }

  function handleDownload() {
    if (!data) return;

    const r      = data.requester_info;
    const isTC   = data.form_type === 'RO-0004';
    const reqId  = formatRequestId(data.request_id, data.document_request_no);
    const name   = r ? `${r.last_name}, ${r.first_name}` : '';

    // ── Document checklist helpers ──────────────────────────────────────────
    const docNames = data.requested_documents.map(d => d.document_name.toLowerCase());

    const svgCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  function checked(keyword: string): string {
    return docNames.some(n => n.includes(keyword)) ? svgCheck : '___';
  }

    function specFor(keyword: string): string {
      const match = data.requested_documents.find(d =>
        d.document_name.toLowerCase().includes(keyword)
      );
      return match?.specification ?? '';
    }

    // ── Shared CSS ──────────────────────────────────────────────────────────
    const sharedCss = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
      .page { max-width: 720px; margin: 0 auto; padding: 18px 24px; }
      .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
      .logo { height: 54px; object-fit: contain; }
      .rev-box { border: 1px solid #000; padding: 3px 10px; font-size: 10px; line-height: 1.6; text-align: right; }
      .form-title { text-align: center; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 6px; }
      .instruction { font-size: 10.5px; margin-bottom: 6px; }
      .instruction strong { font-weight: 700; }
      table.info { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; }
      table.info td { border: 1px solid #000; padding: 3px 6px; }
      table.info td.label { font-weight: 400; white-space: nowrap; min-width: 110px; }
      .section-header { background: #222; color: #fff; text-align: center; font-weight: 700;
        font-size: 11px; padding: 4px; letter-spacing: 0.5px; margin: 8px 0 6px; }
      .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; margin-bottom: 8px; }
      .doc-item { display: flex; align-items: baseline; gap: 5px; font-size: 11px; padding: 2px 0; }
      .doc-check { font-size: 12px; min-width: 16px; }
      .purpose-label { font-size: 11px; font-weight: 700; margin-bottom: 4px; margin-top: 8px; }
      .purpose-box { border: 1px solid #000; min-height: 60px; padding: 6px; margin-bottom: 10px; font-size: 11px; }
      .purpose-lines { margin-bottom: 4px; }
      .purpose-line { border-bottom: 1px solid #000; min-height: 18px; margin-bottom: 4px; padding-bottom: 2px; font-size: 11px; }
      .sig-section { text-align: center; margin: 16px 0 10px; }
      .sig-line { border-bottom: 1px solid #000; width: 55%; margin: 0 auto 3px; }
      .sig-label { font-size: 10.5px; color: #333; }
      .cut-line { border-top: 2px dashed #555; margin: 10px 0; text-align: center;
        font-size: 10px; color: #444; padding-top: 3px; }
      .claim-slip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .claim-slip-title { font-size: 14px; font-weight: 900; }
      .claim-slip-type { font-size: 10.5px; color: #444; }
      table.claim { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
      table.claim td { border: 1px solid #000; padding: 3px 6px; }
      table.claim td.label { font-weight: 400; min-width: 120px; white-space: nowrap; }
      .note-section { font-size: 10px; margin-bottom: 8px; line-height: 1.5; }
      .note-section strong { font-weight: 700; }
      .note-section ul { margin-left: 20px; }
      .footer { font-size: 10px; text-align: right; margin-top: 8px; }
      .clearance-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 8px 0; }
      .clearance-table th { background: #222; color: #fff; padding: 4px 6px; text-align: left; font-weight: 700; border: 1px solid #222; }
      .clearance-table td { border: 1px solid #888; padding: 5px 6px; min-height: 20px; }
      .clearance-table td.office { font-size: 10.5px; white-space: nowrap; }
      .clearance-table td.sig-cell { min-width: 180px; }
      .clearance-table td.date-cell { min-width: 80px; }
      .clearance-table td.remarks-cell { min-width: 90px; }
      .conforme-row { display: flex; justify-content: space-between; align-items: flex-start; margin: 10px 0; gap: 20px; }
      .conforme-left { flex: 1; font-size: 11px; }
      .conforme-sig-line { border-bottom: 1px solid #000; min-width: 220px; display: inline-block; margin-top: 14px; }
      .conforme-sig-label { font-size: 10px; text-align: center; color: #444; margin-top: 2px; }
      .contact-line { font-size: 11px; margin-top: 6px; }
      .cav-box { border: 1px solid #000; padding: 8px 12px; min-width: 160px; min-height: 70px; font-size: 10.5px; }
      .conditions { font-size: 10px; margin-top: 10px; }
      .conditions ol { margin-left: 16px; line-height: 1.6; }
      .conditions li { margin-bottom: 2px; }
      .conditions strong { font-weight: 700; }
      @media print { body { padding: 0; } @page { margin: 8mm; } }
    `;

    // ── RO-0005 — CREDENTIAL REQUEST ────────────────────────────────────────
    if (!isTC) {
      const html = `<!DOCTYPE html>
  <html><head>
  <title>Credential Request — ${reqId}</title>
  <style>${sharedCss}</style>
  </head><body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <img src="/mmcm-logo-with-name.png" class="logo" alt="MMCM" />
      <div class="rev-box">
      REVISION NO. &nbsp;<span style="display:inline-block;width:80px;border-bottom:1px solid #000;">&nbsp;</span><br>
      REVISION DATE &nbsp;<span style="display:inline-block;width:80px;border-bottom:1px solid #000;">&nbsp;</span>
    </div>
    </div>

    <!-- TITLE -->
    <div class="form-title">CREDENTIAL REQUEST</div>
    <div class="instruction">Please print legibly. Use <strong>BLACK</strong> ink only.</div>

    <!-- INFO TABLE -->
    <table class="info">
      <tr>
        <td class="label">Student Name</td>
        <td colspan="3">${name}</td>
      </tr>
      <tr>
        <td class="label">Student Number</td>
        <td>${r?.student_number ?? ''}</td>
        <td class="label">Date of Request</td>
        <td>${formatDate(data.date_submitted)}</td>
      </tr>
      <tr>
        <td class="label">Program/Strand</td>
        <td>${r?.program_strand ?? ''}</td>
        <td class="label">Claim Date</td>
        <td>${formatDate(data.expected_claim_date)}</td>
      </tr>
      <tr>
        <td class="label">Acad/School Year</td>
        <td>${r?.academic_year ?? ''}</td>
        <td class="label">Term/Sem</td>
        <td>${r?.term_semester ?? ''}</td>
      </tr>
    </table>

    <!-- DOCUMENT REQUEST -->
    <div class="section-header">DOCUMENT REQUEST</div>
    <div class="doc-grid">
      <!-- Left column -->
      <div>
        <div class="doc-item"><span class="doc-check">${checked('transcript')}</span> Transcript of Records ${specFor('transcript') ? `— ${specFor('transcript')}` : ''}</div>
        <div class="doc-item"><span class="doc-check">${checked('honorable') || checked('transfer')}</span> Honorable Dismissal / Transfer of Credentials</div>
        <div class="doc-item"><span class="doc-check">${checked('certified true')}</span> Certified True Copy ${specFor('certified true') ? `— ${specFor('certified true')}` : '___________________'}</div>
        <div class="doc-item"><span class="doc-check">${checked('certification') || checked('certificate')}</span> Certification ${specFor('certification') || specFor('certificate') ? `— ${specFor('certification') || specFor('certificate')}` : '_________________________'}</div>
        <div class="doc-item"><span class="doc-check">___</span> Others ________________________________</div>
      </div>
      <!-- Right column -->
      <div>
        <div class="doc-item"><span class="doc-check">${checked('diploma')}</span> Diploma</div>
        <div class="doc-item"><span class="doc-check">${checked('special order')}</span> Special Order</div>
        <div class="doc-item"><span class="doc-check">${checked('sf9') || checked('report card')}</span> SF9 (Report Card)</div>
        <div class="doc-item"><span class="doc-check">${checked('sf10') || checked('permanent copy')}</span> SF10 (Permanent Copy) ${specFor('sf10') || specFor('permanent') ? `— ${specFor('sf10') || specFor('permanent')}` : '_________'}</div>
      </div>
    </div>

    <!-- PURPOSE -->
    <div class="purpose-label">Purpose of Request</div>
    <div class="purpose-box">${data.purpose}</div>

    <!-- SIGNATURE -->
    <div class="sig-section">
      <div class="sig-line"></div>
      <div class="sig-label">Student's Signature over printed name</div>
    </div>

    <!-- CUT LINE -->
    <div class="cut-line">✂ &nbsp;&nbsp; cut here &nbsp;&nbsp; ✂</div>

    <!-- CLAIM SLIP -->
    <div class="claim-slip-header">
      <img src="/mmcm-logo-with-name.png" style="height:36px;object-fit:contain;" alt="MMCM" />
      <div style="text-align:center;">
        <div class="claim-slip-title">CLAIM SLIP</div>
      </div>
      <div class="claim-slip-type">Credential Request</div>
    </div>

    <table class="claim">
      <tr>
        <td class="label">Student Name</td>
        <td>${name}</td>
        <td class="label">Date of Request</td>
        <td>${formatDate(data.date_submitted)}</td>
      </tr>
      <tr>
        <td class="label">Documents Requested</td>
        <td>${data.requested_documents.map(d => d.document_name).join(', ')}</td>
        <td class="label">Claim Date</td>
        <td>${formatDate(data.expected_claim_date)}</td>
      </tr>
    </table>

    <div class="note-section">
      Note: When claiming for request, kindly bring 1 (one) valid/gov't ID.<br>
      If request will be claimed by another person, please present the following:
      <ul>
        <li>Photocopy of a valid/ gov't ID of the requestor with three (3) specimen signatures.</li>
        <li>Photocopy of a valid/ gov't ID of the authorized person</li>
        <li>An authorization letter signed by the requestor</li>
      </ul>
    </div>

    <div class="note-section">
      <strong>Kindly return this form to the Registrar's Office after payment at the Treasury. Without this form, the
      request cannot be processed.</strong> Documents will be processed within <strong>7 days</strong> after payment has been made.
    </div>

    <div class="footer">RO-0005-FORM<br>THIS FORM IS AVAILABLE AT THE REGISTRAR'S OFFICE.</div>

  </div>
  </body></html>`;

      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
      return;
    }

    // ── RO-0004 — TRANSFER CREDENTIAL REQUEST ───────────────────────────────

    // Build clearance rows from all 11 official offices.
    // Pre-fill digital clearance data where available.
    const OFFICIAL_OFFICES = [
      'Academic Coordinator (SHS)',
      "Principal/Dean's Office",
      'Office of the Student Services',
      'Center for Student Activities and Discipline',
      'Center for Guidance and Counseling',
      'Laboratory Management Office',
      'Center for Learning and Information Resources',
      'Center for Health Services and Wellness',
      'Bookstore',
      'Treasury Office',
      "Registrar's Office",
    ];

    const clearanceRows = OFFICIAL_OFFICES.map(office => {
      const clr = data.clearances?.find(c =>
        c.office_name.toLowerCase().includes(office.toLowerCase().slice(0, 12))
      );
      const processedBy = clr?.cleared_by_name ?? '';
      const sigImg = clr?.signature_image_url
        ? `<div style="font-size:10px;margin-bottom:3px;">${processedBy}</div>
          <img src="${clr.signature_image_url}" style="height:32px;max-width:120px;object-fit:contain;" />`
        : processedBy;
      const dateStr = clr?.cleared_at
        ? new Date(clr.cleared_at).toLocaleDateString('en-US', {
            month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'Asia/Manila'
          })
        : '';
      const remarks = clr?.remarks ?? '';
      return `<tr>
        <td class="office">${office}</td>
        <td class="sig-cell">${sigImg}</td>
        <td class="date-cell">${dateStr}</td>
        <td class="remarks-cell">${remarks}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
  <html><head>
  <title>Transfer Credential Request — ${reqId}</title>
  <style>${sharedCss}</style>
  </head><body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <img src="/mmcm-logo-with-name.png" class="logo" alt="MMCM" />
      <div class="rev-box">
        REVISION NO. &nbsp;<span style="display:inline-block;width:60px;border-bottom:1px solid #000;">00</span><br>
        REVISION DATE &nbsp;<span style="display:inline-block;width:60px;border-bottom:1px solid #000;">&nbsp;</span>
      </div>
    </div>

    <!-- TITLE -->
    <div class="form-title">TRANSFER CREDENTIAL REQUEST</div>
    <div class="instruction">Please print legibly. Use <strong>BLACK</strong> ink only.</div>

    <!-- INFO TABLE -->
    <table class="info">
      <tr>
        <td class="label">Student Name</td>
        <td colspan="3">${name}</td>
        <td class="label">Date of Request</td>
        <td>${formatDate(data.date_submitted)}</td>
      </tr>
      <tr>
        <td class="label">Student Number</td>
        <td>${r?.student_number ?? ''}</td>
        <td class="label">Acad/School Year</td>
        <td>${r?.academic_year ?? ''}</td>
        <td class="label">Claim Date</td>
        <td>${formatDate(data.expected_claim_date)}</td>
      </tr>
      <tr>
        <td class="label">Program/Strand</td>
        <td>${r?.program_strand ?? ''}</td>
        <td class="label">Term/Sem</td>
        <td>${r?.term_semester ?? ''}</td>
        <td class="label">Date of Graduation</td>
        <td></td>
      </tr>
    </table>

    <!-- DOCUMENT REQUEST -->
    <div class="section-header">DOCUMENT REQUEST</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 16px;margin-bottom:8px;">
      <div>
        <div class="doc-item"><span class="doc-check">${checked('transcript')}</span> Transcript of Records ${specFor('transcript') ? `— ${specFor('transcript')}` : '____________________'}</div>
        <div class="doc-item"><span class="doc-check">${checked('honorable') || checked('transfer')}</span> Honorable Dismissal / Transfer of Credentials</div>
        <div class="doc-item"><span class="doc-check">___</span> Others ________________________________</div>
      </div>
      <div>
        <div class="doc-item"><span class="doc-check">${checked('sf10') || checked('permanent')}</span> SF10 (Permanent Copy) ${specFor('sf10') || specFor('permanent') ? `— ${specFor('sf10') || specFor('permanent')}` : '_________________'}</div>
        <div class="doc-item"><span class="doc-check">${checked('certified true')}</span> Certified True Copy ${specFor('certified true') ? `— ${specFor('certified true')}` : '_____________________'}</div>
        <div class="doc-item"><span class="doc-check">${checked('certification') || checked('certificate')}</span> Certification ${specFor('certification') || specFor('certificate') ? `— ${specFor('certification') || specFor('certificate')}` : '___________________________'}</div>
      </div>
      <div>
        <div class="doc-item"><span class="doc-check">${checked('sf9') || checked('report card')}</span> SF9 (Report Card)</div>
        <div class="doc-item"><span class="doc-check">${checked('diploma')}</span> Diploma</div>
        <div class="doc-item"><span class="doc-check">${checked('special order')}</span> Special Order</div>
      </div>
    </div>

    <!-- PURPOSE -->
    <div class="purpose-label">Purpose of Request</div>
    <div class="purpose-lines">
      <div class="purpose-line">${data.purpose}</div>
      <div class="purpose-line"></div>
      <div class="purpose-line"></div>
    </div>

    <!-- CONFORME + CAV BOX -->
    <div style="font-size:10.5px;margin:10px 0 6px;line-height:1.5;">
      By affixing your signature below, it is understood that you have read the instructions as well as the terms
      and conditions of the request and shall be held liable for any outstanding charges that may incur.
    </div>
    <div class="conforme-row">
      <div class="conforme-left">
        <div>CONFORME: <span class="conforme-sig-line"></span></div>
        <div class="conforme-sig-label" style="margin-left:80px;">Student's Signature over printed name</div>
        <div class="contact-line">Contact #: ______________________________</div>
      </div>
      <div class="cav-box">
        <div style="font-size:10.5px;font-weight:700;margin-bottom:4px;">Signature of</div>
        <div style="font-size:10.5px;">Requestor for</div>
        <div style="font-size:10.5px;">CAV request</div>
      </div>
    </div>

    <!-- CLEARANCE TABLE -->
    <div class="section-header">CLEARANCE</div>
    <table class="clearance-table">
      <thead>
        <tr>
          <th style="width:30%">Department / Office</th>
          <th style="width:35%">PROCESSED BY: (name &amp; signature)</th>
          <th style="width:18%">Date</th>
          <th style="width:17%">Remarks</th>
        </tr>
      </thead>
      <tbody>${clearanceRows}</tbody>
    </table>

    <!-- CUT LINE -->
    <div class="cut-line">✂ &nbsp;&nbsp; cut here &nbsp;&nbsp; ✂</div>

    <!-- CLAIM SLIP -->
    <div class="claim-slip-header">
      <img src="/mmcm-logo-with-name.png" style="height:36px;object-fit:contain;" alt="MMCM" />
      <div style="text-align:center;">
        <div class="claim-slip-title">CLAIM SLIP</div>
      </div>
      <div class="claim-slip-type">Transfer Credential Request</div>
    </div>

    <table class="claim" style="margin-bottom:6px;">
      <tr>
        <td class="label">Student Name</td>
        <td>${name}</td>
        <td class="label">For the Authorized Representative:</td>
        <td></td>
      </tr>
      <tr>
        <td class="label">Claim Date</td>
        <td>${formatDate(data.expected_claim_date)}</td>
        <td class="label">Name of Representative</td>
        <td>${data.is_authorized_rep ? (data.representative_name ?? '') : ''}</td>
      </tr>
      <tr>
        <td class="label">Documents Requested</td>
        <td>${data.requested_documents.map(d => d.document_name).join(', ')}</td>
        <td class="label">Relation to the Student</td>
        <td>${data.is_authorized_rep ? (data.rep_relation ?? '') : ''}</td>
      </tr>
      <tr>
        <td class="label">Lacking Docs (if any)</td>
        <td></td>
        <td class="label">Released by:</td>
        <td></td>
      </tr>
    </table>

    <!-- CONDITIONS AND REMINDERS -->
    <div class="conditions">
      <strong>CONDITIONS AND REMINDERS:</strong>
      <ol>
        <li>Under existing laws, only the student is allowed to request and claim documents in connection with his/her school records. In case that the student is not available, the student can authorize somebody to process and claim his/her credentials on his/her behalf provided that:
          <br>&nbsp;&nbsp;&nbsp;&nbsp;a. The student shall write an authorization letter addressed to the registrar.
          <br>&nbsp;&nbsp;&nbsp;&nbsp;b. Attach a copy of his/her school ID with three (3) specimen signatures.
        </li>
        <li>To verify the identity of the requesting/claiming party, a valid Identification Card of the representative shall be required upon request and claiming of the documents.</li>
        <li><strong>Kindly return this form to the Registrar's Office after payment at the Treasury. Without this form, the request cannot be processed.</strong></li>
        <li>Documents will be processed within 7 days after payment has been made.</li>
        <li>Documents not claimed after ninety (90) days will be shredded. Payment made is forfeited.</li>
        <li>The Institution reserves the right to withhold, deny or cancel any request for document due to pending accountabilities.</li>
      </ol>
    </div>

    <div class="footer">RO-0004-FORM<br>THIS FORM IS AVAILABLE AT THE REGISTRAR'S OFFICE.</div>

  </div>
  </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: displayId }]} showNotifDot={false} />
      <div className="modal-full">
        <div className="modal-box-full">
          <div className="modal-header">
            <div className="modal-header-brand">
              <div className="modal-header-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/mmcm-logo.png" alt="MMCM" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="modal-header-name">Registrar's Office — MMCM</span>
            </div>
            <span className="modal-title">Document Request Form — {displayId}</span>
            <button className="modal-dl-btn" onClick={handleDownload}><Download size={12} /> Download Form</button>
            <button className="modal-close-btn" onClick={() => router.back()}><X size={14} /></button>
          </div>
          <div className="modal-tab-row">
            <div className="modal-tab-list">
              <div className={`modal-tab${activeTab === 'form' ? ' active' : ''}`} onClick={() => setActiveTab('form')}>Form</div>
              <div className={`modal-tab${activeTab === 'journey' ? ' active' : ''}`} onClick={() => setActiveTab('journey')}>Journey</div>
              <div className={`modal-tab${activeTab === 'clearance' ? ' active' : ''}`} onClick={() => setActiveTab('clearance')}>
                Clearance
                {data && data.current_status === 'For Clearance' && data.clearances && data.clearances.some(c => c.clearance_status !== 'Cleared') && (
                  <span style={{ marginLeft: 6, width: 7, height: 7, borderRadius: '50%', background: '#FFA323', display: 'inline-block' }} />
                )}
              </div>
            </div>
            <span className="workflow-status">{data ? statusToWorkflow(data.current_status) : '● Loading...'}</span>
          </div>
          <div className="modal-body">
            {loading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B1B1B1', fontSize: 14 }}>Loading request data...</div>}
            {error   && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E50019', fontSize: 14 }}>{error}</div>}
            {data && !loading && (
              <>
                {activeTab === 'form' ? <FormTab data={data} /> : activeTab === 'journey' ? <JourneyTab data={data} /> : <ClearanceTab data={data} onRefresh={handleRefresh} />}
                <SidePanel key={data.current_status} data={data} onUpdateStatus={handleUpdateStatus} updating={updating} staffList={staffList} onAssignStaff={handleAssignStaff} onAssignBilledBy={handleAssignBilledBy} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
