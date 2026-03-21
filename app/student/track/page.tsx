"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── Inline theme toggle ───────────────────────────────────────────────────────
function PubThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => { setIsDark(document.documentElement.getAttribute('data-theme') === 'dark'); }, []);
  function toggle() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('drms_theme', next);
    setIsDark(!isDark);
  }
  return (
    <button onClick={toggle} title={isDark ? 'Light Mode' : 'Dark Mode'}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0 }}>
      {isDark
        ? <svg viewBox="0 0 24 24" fill="none" stroke="#FFA323" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      }
    </button>
  );
}

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

  // ── Logged-in student state ───────────────────────────────────────────────
  const [studentName, setStudentName]       = useState<string | null>(null);
  const [studentNumber, setStudentNumber]   = useState<string | null>(null);
  const [myRequests, setMyRequests]         = useState<(TrackData & { _role: 'requester' | 'representative' })[]>([]);
  const [myReqLoading, setMyReqLoading]     = useState(false);
  const [selectedReqId, setSelectedReqId]   = useState<number | null>(null);

  // Pick up ID passed from submit success page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('trackId');
      if (stored) {
        setTrackingInput(stored);
        sessionStorage.removeItem('trackId');
      }
      // Check if student is logged in
      const token  = sessionStorage.getItem('student_token');
      const name   = sessionStorage.getItem('student_name');
      const number = sessionStorage.getItem('student_number');
      if (token && number) {
        setStudentName(name);
        setStudentNumber(number);
        fetchMyRequests(number, name);
      }
    }
  }, []);

  async function fetchMyRequests(number: string, name?: string | null) {
    setMyReqLoading(true);
    try {
      // Fetch requests where this student is the requester (server-side filtered)
      const requesterRes = await fetch(
        `http://localhost:8000/api/requests/?student_number=${encodeURIComponent(number)}&page_size=100`
      );

      const requesterIds = new Set<number>();
      const tagMap = new Map<number, 'requester' | 'representative'>();

      if (requesterRes.ok) {
        const json = await requesterRes.json();
        (json.results ?? json).forEach((r: any) => {
          requesterIds.add(r.request_id);
          tagMap.set(r.request_id, 'requester');
        });
      }

      // Fetch requests where this student is listed as representative (server-side filtered)
      const repIds = new Set<number>();
      if (name) {
        // Try matching by last name for best results (names stored as "Last, First")
        const nameParts = name.replace(',', '').trim().split(/\s+/);
        const searchName = nameParts[0]; // Use first token (last name)
        const repRes = await fetch(
          `http://localhost:8000/api/requests/?representative_name=${encodeURIComponent(searchName)}&page_size=100`
        );
        if (repRes.ok) {
          const json = await repRes.json();
          (json.results ?? json).forEach((r: any) => {
            if (!requesterIds.has(r.request_id)) {
              repIds.add(r.request_id);
              tagMap.set(r.request_id, 'representative');
            }
          });
        }
      }

      const allIds = [...requesterIds, ...repIds];
      if (allIds.length === 0) { setMyRequests([]); return; }

      // Fetch full track detail for each matched request
      const detailed = await Promise.all(
        allIds.map(async id => {
          try {
            const d = await fetch(`http://localhost:8000/api/track/${id}/`);
            if (d.ok) return { ...await d.json(), _role: tagMap.get(id) ?? 'requester' };
          } catch {}
          return null;
        })
      );

      // Sort: requester requests first, then by date descending
      const sorted = detailed
        .filter(Boolean)
        .sort((a, b) => {
          if (a._role !== b._role) return a._role === 'requester' ? -1 : 1;
          return new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime();
        });

      setMyRequests(sorted);
    } catch {}
    finally { setMyReqLoading(false); }
  }
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
      const result = await res.json();
      setData(result);
      setSelectedReqId(result.request_id);
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
          <PubThemeToggle />
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
          <span
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, cursor: 'pointer', padding: '8px 16px', borderRadius: 6, transition: 'background .15s' }}
            onClick={() => router.back()}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >← Back</span>
        </div>
      </div>

      <div className="pub-body">
        {/* ── My Requests (logged-in students only) ── */}
        {studentNumber && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Montserrat',sans-serif" }}>
                  My Requests
                </div>
                <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginTop: 2 }}>
                  Logged in as <strong>{studentName ?? studentNumber}</strong>
                </div>
              </div>
              <button
                className="btn-outline btn-sm"
                onClick={() => fetchMyRequests(studentNumber, studentName)}
                disabled={myReqLoading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                &nbsp;Refresh
              </button>
            </div>

            {myReqLoading ? (
              <div className="track-card" style={{ padding: 24, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13 }}>
                Loading your requests...
              </div>
            ) : myRequests.length === 0 ? (
              <div className="track-card" style={{ padding: 24, textAlign: 'center', color: 'var(--mid-gray)', fontSize: 13 }}>
                No requests found for your account yet.{' '}
                <span style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/student/submit')}>
                  Submit one →
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myRequests.map(req => {
                  const b = statusToBadge(req.current_status);
                  const reqId = `REQ-${String(req.request_id).padStart(3, '0')}`;
                  const docs = req.requested_documents.map(d => d.document_name).join(', ') || '—';
                  const isSelected = selectedReqId === req.request_id;
                  return (
                    <div
                      key={req.request_id}
                      onClick={() => {
                        setSelectedReqId(req.request_id);
                        setData(req);
                        setSearched(true);
                        setError(null);
                        // Scroll down to result
                        setTimeout(() => {
                          document.getElementById('track-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }}
                      style={{
                        background: isSelected ? 'rgba(17,75,159,0.06)' : 'white',
                        border: `1.5px solid ${isSelected ? '#114B9F' : 'rgba(0,0,0,0.08)'}`,
                        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(17,75,159,0.3)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)'; }}
                    >
                      {/* Request ID */}
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#114B9F', fontFamily: "'Montserrat',sans-serif" }}>
                          #{reqId}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--mid-gray)', marginTop: 2 }}>
                          {formatDate(req.date_submitted)}
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ width: 1, height: 36, background: 'rgba(0,0,0,0.06)', flexShrink: 0 }} />

                      {/* Docs */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {docs}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>
                          {req.form_type} · {req.academic_level} · {req.submission_mode}
                        </div>
                      </div>

                      {/* Badge + role */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span className={`badge ${b.cls}`} style={{ fontSize: 11 }}>{b.label}</span>
                        {req._role === 'representative' && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#FFA323', background: '#FFF8E1', border: '1px solid #FFE0A0', padding: '1px 7px', borderRadius: 50 }}>
                            As Rep
                          </span>
                        )}
                      </div>

                      {/* Chevron */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ width: 14, height: 14, color: '#B1B1B1', flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ margin: '20px 0 4px', height: 1, background: 'rgba(0,0,0,0.07)' }} />
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', textAlign: 'center', marginBottom: 4 }}>
              — or search by Request ID below —
            </div>
          </div>
        )}

        {/* Search card */}
        <div className="track-card">
          <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
          <div className="track-title">Track Your Request</div>
          <div className="track-sub">
            {studentNumber
              ? 'Your requests are shown above. You can also search any Request ID below.'
              : 'Enter your Request ID to check the status of your document request. Your Request ID was provided when you submitted your request.'
            }
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
          <div className="track-result" id="track-result">
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
                        <div style={{ fontSize: 13, fontWeight: 700, color: stageType === 'pending' ? 'var(--mid-gray)' : 'var(--text-primary)' }}>
                          {stage.name}
                        </div>
                        {log && (
                          <div style={{ fontSize: 11, color: stageType === 'active' ? 'var(--blue)' : 'var(--mid-gray)', marginTop: 2 }}>
                            {formatDateTime(log.timestamp)}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: stageType === 'pending' ? 'var(--mid-gray)' : 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
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
              <div style={{ marginTop: 14, padding: 12, background: 'rgba(125,179,255,0.08)', borderRadius: 'var(--drms-radius-sm)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
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
