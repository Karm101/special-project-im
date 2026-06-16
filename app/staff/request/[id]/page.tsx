"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, X, Send } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';
import { API_BASE } from '@/lib/lib_api';

// ── API types ─────────────────────────────────────────────────────────────────

type Clearance = {
  clearance_id: number;
  office_name: string;
  clearance_status: string;
  clearance_token: string;
  is_active: boolean;
  cleared_at: string | null;
  cleared_by_name: string | null;
  date_processed: string | null;
  processed_by: string | null;
  remarks: string | null;
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
            <div style={{ fontSize: 14, fontWeight: 800, color: '#001C43', marginBottom: 8 }}>💳 Billing Reminder</div>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E50019', marginBottom: 8 }}>⚠️ Confirm Rejection</div>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E50019', marginBottom: 8 }}>⚠️ Mark as Invalid Request</div>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: '#856404', marginBottom: 8 }}>🔒 Place on Clearance Hold</div>
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
            <button className="btn-action" style={{ background: '#856404', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              disabled={updating} onClick={handleClearanceClick}>
              🔒 Put on Clearance Hold
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
          <div className="field-group"><div className="field-label">Request ID</div><div className="field-value">#{`REQ-${String(data.request_id).padStart(3, '0')}`}</div></div>
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
            <span className="info-icon">💳</span>
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
  const [toggling, setToggling]       = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [copied, setCopied]           = useState<number | null>(null);

  const clearances = data.clearances ?? [];
  const allCleared = clearances.length > 0 && clearances.every(c => c.clearance_status === 'Cleared');
  const pendingCount = clearances.filter(c => c.clearance_status !== 'Cleared').length;

  function getClearanceLink(token: string): string {
    return `${window.location.origin}/clearance/${token}`;
  }

  async function copyLink(clearanceId: number, token: string) {
    try {
      await navigator.clipboard.writeText(getClearanceLink(token));
      setCopied(clearanceId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      alert('Could not copy link. Please copy it manually.');
    }
  }

  async function toggleActive(clearanceId: number, currentActive: boolean) {
    setToggling(clearanceId);
    try {
      await fetch(`${API_BASE}/clearance/${clearanceId}/toggle/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      onRefresh();
    } catch { alert('Failed to toggle link.'); }
    finally { setToggling(null); }
  }

  async function regenerateToken(clearanceId: number) {
    if (!confirm('This will invalidate the current link and generate a new one. Continue?')) return;
    setRegenerating(clearanceId);
    try {
      await fetch(`${API_BASE}/clearance/${clearanceId}/regenerate/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      onRefresh();
    } catch { alert('Failed to regenerate token.'); }
    finally { setRegenerating(null); }
  }

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
          <span className="info-icon">🔒</span>
          <div className="info-text">
            <strong>{pendingCount} office{pendingCount !== 1 ? 's' : ''} pending clearance.</strong> Copy and send the link to each office. They can click the link to confirm clearance without logging in.
          </div>
        </div>
      )}

      {/* Clearance table */}
      {clearances.length > 0 && (
        <div className="form-section">
          <div className="form-section-title">Clearance Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clearances.map(c => {
              const isCleared  = c.clearance_status === 'Cleared';
              const isDisabled = !c.is_active && !isCleared;
              return (
                <div key={c.clearance_id} style={{
                  border: `1px solid ${isCleared ? 'rgba(25,135,84,0.3)' : isDisabled ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 10, padding: '12px 16px',
                  background: isCleared ? 'rgba(25,135,84,0.04)' : isDisabled ? 'rgba(0,0,0,0.02)' : 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isCleared ? 6 : 10 }}>
                    {/* Status icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isCleared ? '#198754' : isDisabled ? '#B1B1B1' : '#FFA323',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: 'white',
                    }}>
                      {isCleared ? '✓' : isDisabled ? '⊘' : '⏳'}
                    </div>

                    {/* Office name */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.office_name}
                      </div>
                      {isCleared && (
                        <div style={{ fontSize: 11, color: '#198754', marginTop: 2 }}>
                          Cleared by {c.cleared_by_name} · {formatDate(c.cleared_at)}
                        </div>
                      )}
                      {isDisabled && (
                        <div style={{ fontSize: 11, color: '#B1B1B1', marginTop: 2 }}>
                          Link disabled
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`badge ${isCleared ? 'b-done' : isDisabled ? 'b-sub' : 'b-rev'}`} style={{ fontSize: 11 }}>
                      {isCleared ? 'Cleared' : isDisabled ? 'Disabled' : 'Pending'}
                    </span>
                  </div>

                  {/* Actions — only show for non-cleared */}
                  {!isCleared && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* Copy link */}
                      {c.is_active && (
                        <button
                          className="btn-outline btn-sm"
                          style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                          onClick={() => copyLink(c.clearance_id, c.clearance_token)}
                        >
                          {copied === c.clearance_id ? '✓ Copied!' : '📋 Copy Link'}
                        </button>
                      )}

                      {/* Toggle enable/disable */}
                      <button
                        className="btn-outline btn-sm"
                        style={{ fontSize: 11 }}
                        disabled={toggling === c.clearance_id}
                        onClick={() => toggleActive(c.clearance_id, c.is_active)}
                      >
                        {toggling === c.clearance_id ? '...' : c.is_active ? '🔴 Disable Link' : '🟢 Enable Link'}
                      </button>

                      {/* Regenerate */}
                      <button
                        className="btn-outline btn-sm"
                        style={{ fontSize: 11 }}
                        disabled={regenerating === c.clearance_id}
                        onClick={() => regenerateToken(c.clearance_id)}
                      >
                        {regenerating === c.clearance_id ? '...' : '🔄 New Link'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="form-section">
        <div className="form-section-title">How Clearance Works</div>
        <div style={{ fontSize: 12, color: 'var(--mid-gray)', lineHeight: 1.8 }}>
          <div>1. Click <strong>Copy Link</strong> next to each office that needs to clear the student.</div>
          <div>2. Send the link via your existing email or Teams channel to the respective office.</div>
          <div>3. The office staff clicks the link, enters their name, and confirms clearance — no login required.</div>
          <div>4. Once all offices have cleared, resume the request using <strong>Resume — Mark as For Billing</strong> in the side panel.</div>
          <div style={{ marginTop: 8, color: '#856404' }}>⚠️ If you sent a link to the wrong person, click <strong>Disable Link</strong> to immediately invalidate it, then click <strong>New Link</strong> to generate a fresh one.</div>
        </div>
      </div>
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
          <span className="info-icon">⚠️</span>
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
          <span className="info-icon">🔒</span>
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
  const numericId = parseInt(rawId.replace(/[^0-9]/g, ''), 10);
  const displayId = `#REQ-${String(numericId).padStart(3, '0')}`;

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
    const r     = data.requester_info;
    const name  = r ? `${r.last_name}, ${r.first_name}` : '—';
    const isTC  = data.form_type === 'RO-0004';
    const reqId = `REQ-${String(data.request_id).padStart(3, '0')}`;

    const docNames = data.requested_documents.map(d => d.document_name.toLowerCase());
    const checked  = (keyword: string) => docNames.some(n => n.includes(keyword)) ? '✓' : '___';

    const clearanceOffices = [
      'Academic Coordinator (SHS)', "Principal / Dean's Office",
      'Office of Student Services', 'Center for Student Activities and Discipline',
      'Center for Guidance and Counseling', 'Laboratory Management Office',
      'Center for Learning and Information Resources', 'Center for Health Services',
      'Bookstore', 'Treasury Office', "Registrar's Office",
    ];
    const clearanceRows = clearanceOffices.map(office => {
      const clr = (data as any).clearances?.find((c: any) => c.office_name === office);
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;">${office}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;">${clr?.processed_by ?? ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;">${clr?.date_processed ?? ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px;">${clr?.remarks ?? ''}</td>
      </tr>`;
    }).join('');

    const css = `*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:20px;color:#000}.page{max-width:750px;margin:0 auto}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.logo-area{display:flex;align-items:center;gap:10px}.logo-box{width:60px;height:60px}.school-name{font-size:14px;font-weight:900;color:#001C43}.form-title{font-size:18px;font-weight:900;text-align:center;margin:8px 0 4px;text-transform:uppercase;letter-spacing:1px}.rev-box{border:1px solid #000;padding:4px 8px;font-size:10px;text-align:right}.note{font-size:11px;margin-bottom:8px;font-style:italic}table.info{width:100%;border-collapse:collapse;margin-bottom:8px}table.info td{border:1px solid #000;padding:4px 6px;font-size:12px}table.info td.label{background:#f0f0f0;font-weight:700;width:30%}.section-header{background:#001C43;color:white;text-align:center;font-weight:700;font-size:12px;padding:4px;margin:6px 0 4px;letter-spacing:1px}.doc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 16px;margin:6px 0}.doc-item{font-size:12px;display:flex;align-items:center;gap:6px;padding:2px 0}.purpose-box{border:1px solid #000;min-height:60px;padding:6px;margin:6px 0;font-size:12px}.sig-line{border-top:1px solid #000;width:60%;margin:24px auto 2px}.sig-label{text-align:center;font-size:11px}.cut-line{border-top:2px dashed #000;margin:16px 0;text-align:center;font-size:10px;color:#666}.claim-slip{margin-top:4px}table.clearance{width:100%;border-collapse:collapse;margin:6px 0;font-size:11px}table.clearance th{background:#001C43;color:white;padding:4px 6px;text-align:left}table.clearance td{border:1px solid #ccc;padding:6px}.conditions{font-size:10px;margin-top:8px}.conditions li{margin-bottom:3px}@media print{body{padding:10px}@page{margin:10mm}}`;

    const html = `<!DOCTYPE html><html><head><title>${isTC ? 'Transfer Credential' : 'Credential Request'} — ${reqId}</title><style>${css}</style></head><body><div class="page">
<div class="header"><div class="logo-area"><svg class="logo-box" viewBox="0 0 60 60"><rect width="60" height="60" rx="4" fill="#001C43"/><text x="30" y="42" font-size="28" font-weight="900" fill="white" text-anchor="middle" font-family="Arial">M</text></svg><div><div class="school-name">MAPÚA MALAYAN COLLEGES MINDANAO</div><div style="font-size:10px;color:#666;">Registrar's Office</div></div></div><div class="rev-box">REVISION NO. &nbsp; 00<br>REVISION DATE &nbsp;&nbsp;</div></div>
<div class="form-title">${isTC ? 'Transfer Credential Request' : 'Credential Request'}</div>
<div style="text-align:right;font-size:10px;color:#666;margin-bottom:4px;">${isTC ? 'RO-0004-FORM' : 'RO-0005-FORM'} &nbsp;|&nbsp; ${reqId}</div>
<div class="note">Please print legibly. Use BLACK ink only.</div>
<table class="info">
  <tr><td class="label">Student Name</td><td colspan="3">${name}</td><td class="label">Date of Request</td><td>${formatDate(data.date_submitted)}</td></tr>
  <tr><td class="label">Student Number</td><td colspan="3">${r?.student_number ?? ''}</td><td class="label">Claim Date</td><td>${formatDate(data.expected_claim_date)}</td></tr>
  <tr><td class="label">Program / Strand</td><td colspan="3">${r?.program_strand ?? ''}</td><td class="label">${isTC ? 'Date of Graduation' : 'Term/Sem'}</td><td>${r ? (isTC ? '' : r.term_semester ?? '') : ''}</td></tr>
</table>
<div class="section-header">DOCUMENT REQUEST</div>
<div class="doc-grid">
  <div class="doc-item"><span style="font-size:14px;">${checked('transcript')}</span> Transcript of Records</div>
  <div class="doc-item"><span style="font-size:14px;">${checked('sf10')}</span> SF10 (Permanent Copy)</div>
  <div class="doc-item"><span style="font-size:14px;">${checked('sf9')}</span> SF9 (Report Card)</div>
  <div class="doc-item"><span style="font-size:14px;">${checked('honorable') || checked('transfer')}</span> Honorable Dismissal / TC</div>
  <div class="doc-item"><span style="font-size:14px;">${checked('certified true')}</span> Certified True Copy</div>
  <div class="doc-item"><span style="font-size:14px;">${checked('diploma')}</span> Diploma</div>
  <div class="doc-item"><span style="font-size:14px;">${checked('certification') || checked('certificate')}</span> Certification _______________</div>
  <div class="doc-item"><span style="font-size:14px;">___</span> Special Order</div>
</div>
<div style="font-weight:700;margin-top:6px;">Purpose of Request</div>
<div class="purpose-box">${data.purpose}</div>
${isTC ? `
<div style="display:flex;gap:20px;margin:8px 0;"><div style="flex:1;"><div style="font-size:11px;margin-bottom:20px;">By affixing your signature below, it is understood that you have read the instructions and terms and conditions.</div><div>CONFORME: <span style="border-bottom:1px solid #000;display:inline-block;width:200px;"></span></div><div style="font-size:10px;margin-left:80px;">Student's Signature over printed name</div><div style="margin-top:6px;">Contact #: <span style="border-bottom:1px solid #000;display:inline-block;width:180px;">${r?.contact_number ?? ''}</span></div></div></div>
<div class="section-header">CLEARANCE</div>
<table class="clearance"><thead><tr><th>Department / Office</th><th>PROCESSED BY: (name & signature)</th><th>Date</th><th>Remarks</th></tr></thead><tbody>${clearanceRows}</tbody></table>
` : `<div style="text-align:center;margin:12px 0 4px;"><div class="sig-line"></div><div class="sig-label">Student's Signature over printed name</div></div>`}
<div class="cut-line">✂ &nbsp; cut here &nbsp; ✂</div>
<div class="claim-slip">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><div style="display:flex;align-items:center;gap:8px;"><svg width="30" height="30" viewBox="0 0 60 60"><rect width="60" height="60" rx="4" fill="#001C43"/><text x="30" y="42" font-size="28" font-weight="900" fill="white" text-anchor="middle" font-family="Arial">M</text></svg><div style="font-size:13px;font-weight:900;">CLAIM SLIP</div></div><div style="font-size:11px;color:#666;">${isTC ? 'Transfer Credential Request' : 'Credential Request'}</div></div>
  <table class="info">
    <tr><td class="label">Student Name</td><td>${name}</td><td class="label">Date of Request</td><td>${formatDate(data.date_submitted)}</td></tr>
    <tr><td class="label">Documents Requested</td><td>${data.requested_documents.map(d => d.document_name).join(', ')}</td><td class="label">Claim Date</td><td>${formatDate(data.expected_claim_date)}</td></tr>
  </table>
</div>
<div class="conditions"><strong>CONDITIONS AND REMINDERS:</strong><ol>
  <li>Under existing laws, only the student is allowed to request and claim documents. For authorized representatives: (a) written authorization letter addressed to the Registrar, (b) copy of student's school ID with 3 specimen signatures, and (c) valid ID of representative.</li>
  <li>Kindly return this form to the Registrar's Office after payment at the Treasury. Without this form, the request cannot be processed.</li>
  <li>Documents will be processed within <strong>7 working days</strong> after payment has been made.</li>
  <li>Documents not claimed after <strong>ninety (90) days</strong> will be shredded. Payment made is forfeited.</li>
  <li>The Institution reserves the right to withhold, deny or cancel any request due to pending accountabilities.</li>
</ol></div>
<div style="margin-top:12px;font-size:10px;color:#666;text-align:right;">${isTC ? 'RO-0004-FORM' : 'RO-0005-FORM'} &nbsp;|&nbsp; THIS FORM IS AVAILABLE AT THE REGISTRAR'S OFFICE.</div>
</div></body></html>`;

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
              <div className="modal-header-icon">M</div>
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
                {data && data.clearances && data.clearances.some(c => c.clearance_status !== 'Cleared') && (
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
