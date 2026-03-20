"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── API types ─────────────────────────────────────────────────────────────────
type StatusLog = {
  log_id: number;
  status: string;
  timestamp: string;
  remarks: string | null;
};

type RequestedDoc = {
  request_doc_id: number;
  document_name: string;
  copies: number;
  processing_days: number;
};

type TrackData = {
  request_id: number;
  form_type: string;
  academic_level: string;
  submission_mode: string;
  date_submitted: string;
  expected_claim_date: string | null;
  current_status: string;
  purpose: string;
  requester_info: {
    first_name: string;
    last_name: string;
    program_strand: string;
    academic_level: string;
  } | null;
  requested_documents: RequestedDoc[];
  status_logs: StatusLog[];
  payment_info: {
    amount: string;
    official_receipt_no: string | null;
    payment_date: string | null;
    payment_status: string;
  } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const PH_TZ = 'Asia/Manila';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: PH_TZ });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: PH_TZ,
  });
}

function statusToBadge(status: string) {
  switch (status) {
    case 'Pending':           return { cls: 'b-sub',  label: 'Submitted' };
    case 'Verifying':         return { cls: 'b-end',  label: 'For Endorsement' };
    case 'For Payment':       return { cls: 'b-rev',  label: 'For Review' };
    case 'Processing':        return { cls: 'b-apr',  label: 'For Approval' };
    case 'Ready for Release': return { cls: 'b-rel',  label: 'For Release' };
    case 'Released':          return { cls: 'b-done', label: 'Released' };
    default:                  return { cls: 'b-sub',  label: status };
  }
}

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

const STAGES = [
  { num: 1, name: 'Submission',        pendingDesc: 'Your request is being received.',                           activeDesc: 'Your request was successfully submitted.',             doneDesc: 'Request submitted successfully.' },
  { num: 2, name: 'Verification',      pendingDesc: 'Waiting for document verification.',                       activeDesc: 'Staff is verifying your documents and enrollment.',    doneDesc: 'Your documents have been verified.' },
  { num: 3, name: 'Billing & Payment', pendingDesc: 'Waiting for payment billing.',                             activeDesc: 'You have been billed. Please settle at Treasury.',    doneDesc: 'Payment confirmed.' },
  { num: 4, name: 'Processing',        pendingDesc: 'Documents not yet being processed.',                       activeDesc: 'Your documents are currently being processed.',        doneDesc: 'Documents have been processed.' },
  { num: 5, name: 'Ready for Release', pendingDesc: 'Documents not yet ready for release.',                     activeDesc: 'Your documents are ready! Please claim at the RO.',   doneDesc: 'Documents were ready for release.' },
  { num: 6, name: 'Released',          pendingDesc: 'Documents not yet released.',                              activeDesc: 'Documents released. Thank you!',                      doneDesc: 'Documents have been released and claimed.' },
];

export default function StudentTrackPage() {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = useState('');

  // Pick up ID passed from submit success page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('trackId');
      if (stored) {
        setTrackingInput(stored);
        sessionStorage.removeItem('trackId');
      }
    }
  }, []);
  const [data, setData]       = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleTrack() {
    const raw = trackingInput.trim().replace(/[^0-9]/g, '');
    if (!raw) { setError('Please enter a valid Tracking ID.'); return; }
    setLoading(true);
    setError(null);
    setData(null);
    setSearched(true);
    try {
      const res = await fetch(`http://localhost:8000/api/track/${parseInt(raw)}/`);
      if (res.status === 404) {
        setError(`Request REQ-${raw.padStart(3, '0')} was not found. Please check your Tracking ID.`);
        return;
      }
      if (!res.ok) throw new Error('API error');
      setData(await res.json());
    } catch {
      setError('Could not connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const currentStage = data ? statusToStageIndex(data.current_status) : 0;
  const badge = data ? statusToBadge(data.current_status) : null;
  const requesterName = data?.requester_info
    ? `${data.requester_info.last_name}, ${data.requester_info.first_name}`
    : '—';
  const docList = data?.requested_documents.map(d => d.document_name).join(' + ') || '—';

  return (
    <div className="public-page drms-root">
      {/* Topbar */}
      <div className="pub-topbar">
        <div className="pub-logo">M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Document Request Monitoring System</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 0, alignItems: 'center' }}>
          <span
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, cursor: 'pointer', padding: '8px 16px', borderRadius: 6, transition: 'background .15s' }}
            onClick={() => router.push('/student/submit')}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >Submit a Request</span>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
          <span
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, cursor: 'pointer', padding: '8px 16px', borderRadius: 6, transition: 'background .15s' }}
            onClick={() => router.push('/student/landing')}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >← Back</span>
        </div>
      </div>

      <div className="pub-body">
        {/* Search card */}
        <div className="track-card">
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
          <div className="track-title">Track Your Request</div>
          <div className="track-sub">
            Enter your Request ID to check the status of your document request.
            Your Request ID was provided when you submitted your request.
          </div>
          <div className="track-input-row">
            <input
              className="track-input"
              type="text"
              placeholder="e.g. REQ-001 or just 1"
              value={trackingInput}
              onChange={e => setTrackingInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
            />
            <button className="btn-track" onClick={handleTrack} disabled={loading}>
              {loading ? '...' : 'Track'}
            </button>
          </div>
          {error && (
            <div className="info-box warn" style={{ marginTop: 12 }}>
              <span className="info-icon">⚠️</span>
              <div className="info-text">{error}</div>
            </div>
          )}
          <div className="info-box" style={{ marginTop: 12 }}>
            <span className="info-icon">ℹ️</span>
            <div className="info-text">
              For concerns, contact the Registrar's Office at <strong>registrar@mcm.edu.ph</strong> or visit Room 101, Admin Building.
            </div>
          </div>
        </div>

        {/* Result card */}
        {data && (
          <div className="track-result">
            {/* Result header */}
            <div className="result-header">
              <div>
                <div className="result-id">
                  Request ID: REQ-{String(data.request_id).padStart(3, '0')}
                </div>
                <div className="result-name">{requesterName}</div>
                <div className="result-doc">{docList}</div>
              </div>
              {badge && <span className={`badge ${badge.cls}`} style={{ fontSize: 13 }}>{badge.label}</span>}
            </div>

            {/* Progress */}
            <div className="drms-card" style={{ padding: 20 }}>
              <div className="section-title" style={{ fontSize: 13 }}>Request Progress</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {STAGES.map((stage, i) => {
                  const stageType = stage.num < currentStage ? 'done' : stage.num === currentStage ? 'active' : 'pending';
                  const log = data.status_logs?.find(l => {
                    const statusMap: Record<number, string[]> = {
                      1: ['Pending'], 2: ['Verifying'], 3: ['For Payment'],
                      4: ['Processing'], 5: ['Ready for Release'], 6: ['Released'],
                    };
                    return statusMap[stage.num]?.includes(l.status);
                  });
                  const desc = stageType === 'done' ? stage.doneDesc : stageType === 'active' ? stage.activeDesc : stage.pendingDesc;

                  return (
                    <div key={stage.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < STAGES.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: stageType === 'done' ? 'var(--blue)' : stageType === 'active' ? 'var(--navy)' : 'var(--light-gray)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: stageType === 'pending' ? 'var(--mid-gray)' : 'white',
                      }}>
                        {stageType === 'done' ? '✓' : stageType === 'active' ? '…' : stage.num}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: stageType === 'pending' ? 'var(--mid-gray)' : 'var(--navy)' }}>
                          {stage.name}
                        </div>
                        {log && (
                          <div style={{ fontSize: 11, color: stageType === 'active' ? 'var(--blue)' : 'var(--mid-gray)', marginTop: 2 }}>
                            {formatDateTime(log.timestamp)}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: stageType === 'pending' ? 'var(--mid-gray)' : '#444', marginTop: 4, lineHeight: 1.5 }}>
                          {desc}
                          {/* Show payment info on billing stage */}
                          {stage.num === 3 && stageType === 'done' && data.payment_info?.official_receipt_no && (
                            <span> (OR: {data.payment_info.official_receipt_no})</span>
                          )}
                          {/* Show amount on billing stage if paid */}
                          {stage.num === 3 && data.payment_info && parseFloat(data.payment_info.amount) > 0 && (
                            <span> — ₱{parseFloat(data.payment_info.amount).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Expected claim date */}
              <div style={{ marginTop: 14, padding: 12, background: '#F0F4FF', borderRadius: 'var(--drms-radius-sm)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
                  📅 Expected Claim Date: {formatDate(data.expected_claim_date)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
                  {data.current_status === 'Released'
                    ? 'Your documents have been released. Thank you!'
                    : data.current_status === 'Ready for Release'
                    ? 'Your documents are ready! Please bring a valid ID when claiming at the Registrar\'s Office.'
                    : 'Claim slip will be issued once your documents are ready. Please bring a valid ID when claiming.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state after failed search */}
        {searched && !data && !loading && !error && (
          <div className="track-result" style={{ textAlign: 'center', padding: 40, color: 'var(--mid-gray)' }}>
            No request found.
          </div>
        )}
      </div>
    </div>
  );
}
