"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, X, Send, FileDown } from 'lucide-react';
import { Topbar } from '../../../components/drms/Topbar';

// ── API types ─────────────────────────────────────────────────────────────────
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
  is_authorized_rep: boolean;
  representative_name: string | null;
  rep_relation: string | null;
  current_status: string;
  requester_info: Requester | null;
  assigned_staff: Staff | null;
  requested_documents: RequestedDoc[];
  status_logs: StatusLog[];
  payment_info: Payment | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusToWorkflow(status: string): string {
  switch (status) {
    case 'Pending':           return '● Submitted';
    case 'Verifying':         return '● For Endorsement';
    case 'For Payment':       return '● For Review';
    case 'Processing':        return '● For Approval';
    case 'Ready for Release': return '● For Release';
    case 'Released':          return '● Completed';
    case 'Rejected':          return '● Rejected';
    default:                  return `● ${status}`;
  }
}

// Maps status to the sequential journey stage index (1-based)
function statusToStageIndex(status: string): number {
  switch (status) {
    case 'Pending':           return 1;
    case 'Verifying':         return 2;
    case 'For Payment':       return 3;
    case 'Processing':        return 4;
    case 'Ready for Release': return 5;
    case 'Released':          return 6;
    default:                  return 1;
  }
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function SidePanel({
  data,
  onUpdateStatus,
  updating,
}: {
  data: RequestDetail;
  onUpdateStatus: (status: string, remarks: string) => Promise<void>;
  updating: boolean;
}) {
  const [comment, setComment]           = useState('');
  const [rejectMode, setRejectMode]     = useState(false);
  const commentInputRef                 = useState<HTMLInputElement | null>(null);

  const staffName = data.assigned_staff
    ? `${data.assigned_staff.first_name} ${data.assigned_staff.last_name}`
    : 'Unassigned';
  const staffInitials = data.assigned_staff
    ? `${data.assigned_staff.first_name[0]}${data.assigned_staff.last_name[0]}`
    : '?';

  const recentLogs = [...(data.status_logs || [])].reverse().slice(0, 5);

  const status     = data.current_status;
  const canReturn  = ['Verifying', 'For Payment', 'Processing'].includes(status);
  const canReject  = !['Released', 'Rejected'].includes(status);
  const canAdvance = !['Released', 'Rejected'].includes(status);

  const nextStatus: Record<string, string> = {
    'Pending':           'Verifying',
    'Verifying':         'For Payment',
    'For Payment':       'Processing',
    'Processing':        'Ready for Release',
    'Ready for Release': 'Released',
  };
  const nextLabel: Record<string, string> = {
    'Pending':           'Mark as Verifying',
    'Verifying':         'Mark as For Payment',
    'For Payment':       'Mark as Processing',
    'Processing':        'Mark as Ready for Release',
    'Ready for Release': 'Mark as Released',
  };

  // When reject mode activates, pre-fill the comment box
  function handleRejectClick() {
    setRejectMode(true);
    const reqId = `REQ-${String(data.request_id).padStart(3, '0')}`;
    setComment(`Request ${reqId} has been rejected. Reason: `);
  }

  function handleCancelReject() {
    setRejectMode(false);
    setComment('');
  }

  async function handleConfirmReject() {
    if (!comment.trim() || comment.endsWith('Reason: ')) {
      alert('Please enter a reason for the rejection.');
      return;
    }
    await onUpdateStatus('Rejected', comment);
    setRejectMode(false);
    setComment('');
  }

  async function handleAdvance() {
    if (!nextStatus[status]) return;
    await onUpdateStatus(nextStatus[status], comment || '');
    setComment('');
  }

  async function handleReturn() {
    await onUpdateStatus('Pending', comment || 'Returned for revision');
    setComment('');
  }

  return (
    <div className="modal-side-pane">
      {/* Assigned Staff */}
      <div className="side-sect">
        <div className="side-sect-title">Assigned Staff</div>
        <div className="approver-row">
          <div className="approver-av">{staffInitials}</div>
          <div>
            <div className="approver-name">{staffName}</div>
            <div className="approver-role">{data.assigned_staff?.position ?? 'RO Staff'}</div>
          </div>
        </div>
      </div>

      {/* Status History */}
      <div className="side-sect" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="side-sect-title">Status History</div>
        {recentLogs.length === 0 ? (
          <div style={{ fontSize: 12, color: '#B1B1B1' }}>No status changes yet.</div>
        ) : (
          recentLogs.map(log => (
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
          ))
        )}
      </div>

      {/* Comment / Reject input */}
      {rejectMode ? (
        // ── Reject mode — inline rejection form ──────────────────────────────
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff8f8' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E50019', marginBottom: 8 }}>
            ⚠️ Confirm Rejection
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>
            Edit the message below — include the specific reason for rejection.
          </div>
          <textarea
            className="drms-textarea"
            style={{ fontSize: 12, minHeight: 80, resize: 'vertical', borderColor: '#E50019' }}
            value={comment}
            onChange={e => setComment(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn-action btn-reject"
              style={{ flex: 1, fontSize: 12 }}
              disabled={updating}
              onClick={handleConfirmReject}
            >
              {updating ? 'Rejecting...' : '✓ Confirm Rejection'}
            </button>
            <button
              className="btn-outline btn-sm"
              style={{ flex: 1 }}
              onClick={handleCancelReject}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // ── Normal comment input ──────────────────────────────────────────────
        <div className="comment-input-row">
          <input
            className="comment-input"
            type="text"
            placeholder="Add a remark (optional)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canAdvance && handleAdvance()}
          />
          <button className="send-btn"><Send size={12} /></button>
        </div>
      )}

      {/* Action buttons — hidden in reject mode */}
      {!rejectMode && (
        <div className="modal-action-btns">
          {canReturn && (
            <button
              className="btn-action btn-return"
              disabled={updating}
              onClick={handleReturn}
            >
              Return for Revision
            </button>
          )}
          {canReject && (
            <button
              className="btn-action btn-reject"
              disabled={updating}
              onClick={handleRejectClick}
            >
              Reject Request
            </button>
          )}
          {canAdvance && nextStatus[status] && (
            <button
              className="btn-action btn-release"
              disabled={updating}
              onClick={handleAdvance}
            >
              {updating ? 'Updating...' : nextLabel[status] ?? 'Advance Status'}
            </button>
          )}
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
          <div className="field-group"><div className="field-label">Form Type</div><div className="field-value">{data.form_type}</div></div>
          <div className="field-group"><div className="field-label">Submission Mode</div><div className="field-value">{data.submission_mode}</div></div>
          <div className="field-group"><div className="field-label">Date Submitted</div><div className="field-value">{formatDate(data.date_submitted)}</div></div>
          <div className="field-group"><div className="field-label">Expected Claim Date</div><div className="field-value">{formatDate(data.expected_claim_date)}</div></div>
          <div className="field-group"><div className="field-label">Authorized Representative</div><div className="field-value">{data.is_authorized_rep ? `Yes — ${data.representative_name} (${data.rep_relation})` : 'No'}</div></div>
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
            <div className="field-group"><div className="field-label">Amount</div><div className="field-value">₱ {parseFloat(data.payment_info.amount).toFixed(2)}</div></div>
            <div className="field-group"><div className="field-label">Official Receipt No.</div><div className="field-value">{data.payment_info.official_receipt_no ?? '—'}</div></div>
            <div className="field-group"><div className="field-label">Payment Date</div><div className="field-value">{formatDate(data.payment_info.payment_date)}</div></div>
            <div className="field-group">
              <div className="field-label">Payment Status</div>
              <div className="field-value">
                <span className={`badge ${data.payment_info.payment_status === 'Paid' ? 'b-done' : data.payment_info.payment_status === 'Overdue' ? 'b-rej' : 'b-rev'}`}>
                  {data.payment_info.payment_status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Journey Tab ───────────────────────────────────────────────────────────────
function JourneyTab({ data }: { data: RequestDetail }) {
  const currentStage = statusToStageIndex(data.current_status);
  const staffName = data.assigned_staff
    ? `${data.assigned_staff.first_name} ${data.assigned_staff.last_name}`
    : '—';

  const STAGES = [
    { num: 1, name: 'Submission',        leftKey: 'Form Received',  leftVal: `${data.submission_mode} (RO Portal)`, rightKey: 'Assigned Staff:', rightVal: staffName },
    { num: 2, name: 'Verification',      leftKey: 'Verified',       leftVal: currentStage > 2 ? 'Done' : '—',       rightKey: 'Verified By:',    rightVal: staffName },
    { num: 3, name: 'Billing & Payment', leftKey: 'Amount Billed',  leftVal: data.payment_info ? `₱ ${parseFloat(data.payment_info.amount).toFixed(2)}` : '—', rightKey: 'Receipt:', rightVal: data.payment_info?.official_receipt_no ?? '—' },
    { num: 4, name: 'Processing',        leftKey: 'Status',         leftVal: currentStage === 4 ? 'In Progress' : currentStage > 4 ? 'Done' : '—', rightKey: 'Assigned Staff:', rightVal: staffName },
    { num: 5, name: 'Ready for Release', leftKey: 'Claim Slip',     leftVal: currentStage >= 5 ? 'Issued' : 'Not yet issued', rightKey: '', rightVal: '' },
    { num: 6, name: 'Released',          leftKey: 'Claimed By',     leftVal: '—', rightKey: '', rightVal: '' },
  ];

  // Match status logs to stages
  const logForStage = (stageNum: number) => {
    const statusMap: Record<number, string[]> = {
      1: ['Pending'],
      2: ['Verifying'],
      3: ['For Payment'],
      4: ['Processing'],
      5: ['Ready for Release'],
      6: ['Released'],
    };
    return data.status_logs?.find(l => statusMap[stageNum]?.includes(l.status));
  };

  return (
    <div className="modal-form-pane">
      <div className="journey-list">
        {STAGES.map((stage, i) => {
          const stageState = stage.num < currentStage ? 'done' : stage.num === currentStage ? 'active' : 'pending';
          const log = logForStage(stage.num);
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
                      <div className={stageState === 'pending' ? '' : 'stage-received-key'} style={stageState === 'pending' ? { fontSize: 14, color: '#B1B1B1' } : {}}>
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
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState<'form' | 'journey'>('form');
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Extract numeric ID from URL param (e.g. "REQ-001" → 1)
  const rawId = params?.id as string ?? '';
  const numericId = parseInt(rawId.replace(/[^0-9]/g, ''), 10);
  const displayId = `#REQ-${String(numericId).padStart(3, '0')}`;

  // ── Fetch request detail ──────────────────────────────────────────────────
  useEffect(() => {
    if (!numericId) return;
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/api/requests/${numericId}/`);
        if (!res.ok) throw new Error('Request not found');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Could not load request. Make sure Django is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [numericId]);

  // ── Update status ─────────────────────────────────────────────────────────
  async function handleUpdateStatus(newStatus: string, remarks: string) {
    if (!data) return;
    setUpdating(true);
    try {
      const res = await fetch(`http://localhost:8000/api/requests/${numericId}/update_status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, remarks, staff_id: data.assigned_staff?.staff_id ?? null }),
      });
      if (!res.ok) throw new Error('Update failed');
      // Re-fetch to get updated data
      const updated = await fetch(`http://localhost:8000/api/requests/${numericId}/`);
      setData(await updated.json());
    } catch (err) {
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: displayId }]}
        showNotifDot={false}
      />
      <div className="modal-full">
        <div className="modal-box-full">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-brand">
              <div className="modal-header-icon">M</div>
              <span className="modal-header-name">Registrar's Office — MMCM</span>
            </div>
            <span className="modal-title">Document Request Form — {displayId}</span>
            <button className="modal-dl-btn"><Download size={12} /> Download Form</button>
            <button className="modal-close-btn" onClick={() => router.push('/staff/dashboard')}><X size={14} /></button>
          </div>

          {/* Tabs */}
          <div className="modal-tab-row">
            <div className="modal-tab-list">
              <div className={`modal-tab${activeTab === 'form' ? ' active' : ''}`} onClick={() => setActiveTab('form')}>Form</div>
              <div className={`modal-tab${activeTab === 'journey' ? ' active' : ''}`} onClick={() => setActiveTab('journey')}>Journey</div>
            </div>
            <span className="workflow-status">
              {data ? statusToWorkflow(data.current_status) : '● Loading...'}
            </span>
          </div>

          {/* Body */}
          <div className="modal-body">
            {loading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B1B1B1', fontSize: 14 }}>
                Loading request data...
              </div>
            )}
            {error && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E50019', fontSize: 14 }}>
                {error}
              </div>
            )}
            {data && !loading && (
              <>
                {activeTab === 'form' ? <FormTab data={data} /> : <JourneyTab data={data} />}
                <SidePanel data={data} onUpdateStatus={handleUpdateStatus} updating={updating} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
