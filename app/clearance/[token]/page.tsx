"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ClearanceInfo = {
  clearance_id: number;
  office_name: string;
  request_id: number;
  student_name: string;
  student_number: string;
  documents: string;
  form_type: string;
  date_submitted: string;
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function IconWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function IconSuccess() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40 }}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
function IconSeal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  );
}

export default function ClearancePage() {
  const params = useParams();
  const token  = params?.token as string ?? '';

  const [info, setInfo]                   = useState<ClearanceInfo | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [alreadyCleared, setAlreadyCleared] = useState(false);
  const [disabled, setDisabled]           = useState(false);
  const [done, setDone]                   = useState(false);

  const [name, setName]                   = useState('');
  const [nameError, setNameError]         = useState('');
  const [remarks, setRemarks]             = useState('');
  const [sigFile, setSigFile]             = useState<File | null>(null);
  const [sigPreview, setSigPreview]       = useState<string | null>(null);
  const [sigError, setSigError]           = useState('');
  const [uploading, setUploading]         = useState(false);
  const [confirming, setConfirming]       = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    async function fetchClearance() {
      try {
        const res  = await fetch(`${API_BASE}/clearance/verify/${token}/`);
        const data = await res.json();
        if (!res.ok) {
          if (data.already_cleared) { setAlreadyCleared(true); }
          else if (res.status === 403) { setDisabled(true); }
          else { setError(data.error ?? 'Invalid clearance link.'); }
          return;
        }
        setInfo(data);
      } catch {
        setError('Could not connect to the server. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchClearance();
  }, [token]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setSigError('Only JPG or PNG files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSigError('File must be under 5MB.');
      return;
    }
    setSigError('');
    setSigFile(file);
    setSigPreview(URL.createObjectURL(file));
  }

  async function handleConfirm() {
    let valid = true;
    if (!name.trim()) { setNameError('Please enter your full name before confirming.'); valid = false; }
    if (!sigFile)     { setSigError('Please upload your e-signature image.'); valid = false; }
    if (!valid) return;

    setUploading(true);
    let signatureUrl = '';

    try {
      const ext      = sigFile!.name.split('.').pop();
      const fileName = `${token}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('clearance-signatures')
        .upload(fileName, sigFile!, { contentType: sigFile!.type, upsert: false });

      if (uploadError) throw new Error('Signature upload failed: ' + uploadError.message);

      const { data: urlData } = supabase.storage
        .from('clearance-signatures')
        .getPublicUrl(fileName);

      signatureUrl = urlData.publicUrl;
    } catch (err: any) {
      setSigError(err.message ?? 'Failed to upload signature. Please try again.');
      setUploading(false);
      return;
    }

    setUploading(false);
    setConfirming(true);

    try {
      const res = await fetch(`${API_BASE}/clearance/approve/${token}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleared_by_name:     name.trim(),
          signature_image_url: signatureUrl,
          // Only send remarks if non-empty — never send null
          ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.already_cleared) { setAlreadyCleared(true); return; }
        setError(data.error ?? 'Failed to confirm clearance.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  const isSubmitting = uploading || confirming;
  const canConfirm   = name.trim().length > 0 && sigFile !== null && !isSubmitting;

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: 16, padding: 36,
    width: '100%', maxWidth: 480,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  };

  const iconWrap = (color: string) => ({
    display: 'flex', justifyContent: 'center', marginBottom: 16, color,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F3F3F3', display: 'flex', flexDirection: 'column', fontFamily: "'Montserrat', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#001C43', height: 64, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 14, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900 }}>M</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>MMCM Registrar's Office</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Document Request Clearance System</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={cardStyle}>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', color: '#B1B1B1', fontSize: 14, padding: 40 }}>
              Loading clearance details...
            </div>
          )}

          {/* Already Cleared */}
          {!loading && alreadyCleared && (
            <>
              <div style={{ ...iconWrap('#198754') }}><IconCheck /></div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#198754', textAlign: 'center', marginBottom: 8 }}>Already Cleared</div>
              <div style={{ fontSize: 13, color: '#B1B1B1', textAlign: 'center', lineHeight: 1.6 }}>
                This clearance has already been completed. No further action is needed.
              </div>
            </>
          )}

          {/* Disabled */}
          {!loading && disabled && (
            <>
              <div style={{ ...iconWrap('#001C43') }}><IconLock /></div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#001C43', textAlign: 'center', marginBottom: 8 }}>Link Disabled</div>
              <div style={{ fontSize: 13, color: '#B1B1B1', textAlign: 'center', lineHeight: 1.6 }}>
                This clearance link has been disabled by the Registrar's Office. Please contact them for a new link.
              </div>
            </>
          )}

          {/* Error / Invalid */}
          {!loading && error && !alreadyCleared && !disabled && (
            <>
              <div style={{ ...iconWrap('#E50019') }}><IconWarning /></div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#E50019', textAlign: 'center', marginBottom: 8 }}>Invalid Link</div>
              <div style={{ fontSize: 13, color: '#B1B1B1', textAlign: 'center', lineHeight: 1.6 }}>{error}</div>
            </>
          )}

          {/* Success */}
          {done && (
            <>
              <div style={{ ...iconWrap('#198754') }}><IconSuccess /></div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#198754', textAlign: 'center', marginBottom: 8 }}>Clearance Confirmed!</div>
              <div style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                Thank you, <strong>{name}</strong>. Your clearance for <strong>{info?.office_name}</strong> has been recorded successfully.
              </div>
              <div style={{ background: '#F0FFF8', border: '1px solid #198754', borderRadius: 10, padding: 16, fontSize: 12, color: '#198754', lineHeight: 1.6 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }}><polyline points="20 6 9 17 4 12"/></svg>
                The Registrar's Office has been notified of your clearance approval. You may now close this page.
              </div>
            </>
          )}

          {/* Main form */}
          {!loading && info && !done && !error && !alreadyCleared && !disabled && (
            <>
              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(17,75,159,0.1)', marginBottom: 12, color: '#114B9F' }}>
                  <IconSeal />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#001C43', marginBottom: 4 }}>Clearance Request</div>
                <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, background: 'rgba(17,75,159,0.1)', color: '#114B9F', padding: '4px 12px', borderRadius: 50 }}>
                  {info.office_name}
                </div>
              </div>

              {/* Request details */}
              <div style={{ background: '#F8F9FA', borderRadius: 10, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Request Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Request ID</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#001C43' }}>REQ-{String(info.request_id).padStart(3, '0')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Date Submitted</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#001C43' }}>{formatDate(info.date_submitted)}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Student</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#001C43' }}>{info.student_name}</div>
                    <div style={{ fontSize: 11, color: '#B1B1B1' }}>{info.student_number}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Document(s) Requested</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#001C43' }}>{info.documents}</div>
                  </div>
                </div>
              </div>

              {/* Name field */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#001C43', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Your Full Name <span style={{ color: '#E50019' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${nameError ? '#E50019' : '#B1B1B1'}`, borderRadius: 8, fontSize: 14, fontFamily: "'Montserrat', sans-serif", outline: 'none', boxSizing: 'border-box', background: nameError ? '#fff8f8' : 'white' }}
                />
                {nameError && <div style={{ fontSize: 11, color: '#E50019', marginTop: 4, fontWeight: 600 }}>{nameError}</div>}
              </div>

              {/* Signature upload */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#001C43', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  E-Signature Image <span style={{ color: '#E50019' }}>*</span>
                </label>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
                  Please upload your e-signature image. This will appear on the official clearance form. JPG or PNG, max 5MB.
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleFileChange} />
                {!sigPreview ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: '100%', padding: '20px 12px', border: `2px dashed ${sigError ? '#E50019' : '#B1B1B1'}`, borderRadius: 8, background: sigError ? '#fff8f8' : '#FAFAFA', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#888' }}
                  >
                    <span style={{ color: '#114B9F' }}><IconUpload /></span>
                    <span style={{ fontWeight: 600, color: '#114B9F', fontSize: 13 }}>Click to upload signature</span>
                    <span style={{ fontSize: 11 }}>JPG or PNG · max 5MB</span>
                  </button>
                ) : (
                  <div style={{ border: '1px solid #198754', borderRadius: 8, padding: 12, background: '#F0FFF8', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={sigPreview} alt="Signature preview" style={{ height: 48, maxWidth: 140, objectFit: 'contain', borderRadius: 4, background: 'white', border: '1px solid #ddd', padding: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#198754', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}><polyline points="20 6 9 17 4 12"/></svg>
                        Signature uploaded
                      </div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{sigFile?.name}</div>
                    </div>
                    <button
                      onClick={() => { setSigFile(null); setSigPreview(null); setSigError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4, display: 'flex', alignItems: 'center' }}
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
                {sigError && <div style={{ fontSize: 11, color: '#E50019', marginTop: 4, fontWeight: 600 }}>{sigError}</div>}
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#001C43', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Remarks <span style={{ fontSize: 11, fontWeight: 500, color: '#B1B1B1' }}>(optional)</span>
                </label>
                <textarea
                  placeholder="Add any remarks or notes (optional)..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #B1B1B1', borderRadius: 8, fontSize: 13, fontFamily: "'Montserrat', sans-serif", outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Info box */}
              <div style={{ background: '#EBF5FB', border: '1px solid #72ACFF', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#001C43', lineHeight: 1.6, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>By clicking Confirm Clearance, you are certifying that <strong>{info.student_name}</strong> has been cleared by the <strong>{info.office_name}</strong> for this document request.</span>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                style={{ width: '100%', padding: 13, background: canConfirm ? '#198754' : '#B1B1B1', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: canConfirm ? 'pointer' : 'not-allowed', fontFamily: "'Montserrat', sans-serif", transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {uploading ? (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Uploading signature...</>
                ) : confirming ? (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Confirming...</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg> Confirm Clearance</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 11, color: '#B1B1B1', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        Mapúa Malayan Colleges Mindanao — Registrar's Office Clearance System
      </div>
    </div>
  );
}