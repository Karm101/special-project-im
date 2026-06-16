"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE } from '@/lib/lib_api';

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

export default function ClearancePage() {
  const params  = useParams();
  const token   = params?.token as string ?? '';

  const [info, setInfo]         = useState<ClearanceInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [name, setName]         = useState('');
  const [nameError, setNameError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone]         = useState(false);
  const [alreadyCleared, setAlreadyCleared] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (!token) return;
    async function fetchClearance() {
      try {
        const res = await fetch(`${API_BASE}/clearance/verify/${token}/`);
        const data = await res.json();

        if (!res.ok) {
          if (data.already_cleared) {
            setAlreadyCleared(true);
          } else if (res.status === 403) {
            setDisabled(true);
          } else {
            setError(data.error ?? 'Invalid clearance link.');
          }
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

  async function handleConfirm() {
    if (!name.trim()) {
      setNameError('Please enter your full name before confirming.');
      return;
    }
    setConfirming(true);
    setNameError('');
    try {
      const res = await fetch(`${API_BASE}/clearance/approve/${token}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleared_by_name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.already_cleared) {
          setAlreadyCleared(true);
          return;
        }
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

  return (
    <div style={{
      minHeight: '100vh', background: '#F3F3F3',
      display: 'flex', flexDirection: 'column', fontFamily: "'Montserrat', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: '#001C43', height: 64,
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: 14, flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 900,
        }}>M</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>MMCM Registrar's Office</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Document Request Clearance System</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          background: 'white', borderRadius: 16, padding: 36,
          width: '100%', maxWidth: 480,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', color: '#B1B1B1', fontSize: 14, padding: 40 }}>
              Loading clearance details...
            </div>
          )}

          {/* Disabled */}
          {!loading && disabled && (
            <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#001C43', textAlign: 'center', marginBottom: 8 }}>
                Link Disabled
              </div>
              <div style={{ fontSize: 13, color: '#B1B1B1', textAlign: 'center', lineHeight: 1.6 }}>
                This clearance link has been disabled by the Registrar's Office. Please contact them for a new link.
              </div>
            </>
          )}

          {/* Already Cleared */}
          {!loading && alreadyCleared && (
            <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#198754', textAlign: 'center', marginBottom: 8 }}>
                Already Cleared
              </div>
              <div style={{ fontSize: 13, color: '#B1B1B1', textAlign: 'center', lineHeight: 1.6 }}>
                This clearance has already been completed. No further action is needed.
              </div>
            </>
          )}

          {/* Error */}
          {!loading && error && !alreadyCleared && !disabled && (
            <>
              <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#E50019', textAlign: 'center', marginBottom: 8 }}>
                Invalid Link
              </div>
              <div style={{ fontSize: 13, color: '#B1B1B1', textAlign: 'center', lineHeight: 1.6 }}>
                {error}
              </div>
            </>
          )}

          {/* Success */}
          {done && (
            <>
              <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#198754', textAlign: 'center', marginBottom: 8 }}>
                Clearance Confirmed!
              </div>
              <div style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                Thank you, <strong>{name}</strong>. Your clearance for <strong>{info?.office_name}</strong> has been recorded successfully.
              </div>
              <div style={{
                background: '#F0FFF8', border: '1px solid #198754',
                borderRadius: 10, padding: 16, fontSize: 12, color: '#198754', lineHeight: 1.6,
              }}>
                ✓ The Registrar's Office has been notified of your clearance approval.
                You may now close this page.
              </div>
            </>
          )}

          {/* Main clearance form */}
          {!loading && info && !done && !error && !alreadyCleared && !disabled && (
            <>
              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(17,75,159,0.1)', fontSize: 24, marginBottom: 12,
                }}>🔏</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#001C43', marginBottom: 4 }}>
                  Clearance Request
                </div>
                <div style={{
                  display: 'inline-block', fontSize: 12, fontWeight: 700,
                  background: 'rgba(17,75,159,0.1)', color: '#114B9F',
                  padding: '4px 12px', borderRadius: 50,
                }}>
                  {info.office_name}
                </div>
              </div>

              {/* Request details */}
              <div style={{
                background: '#F8F9FA', borderRadius: 10, padding: 16,
                marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Request Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Request ID</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#001C43' }}>
                      REQ-{String(info.request_id).padStart(3, '0')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Date Submitted</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#001C43' }}>
                      {formatDate(info.date_submitted)}
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Student</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#001C43' }}>
                      {info.student_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#B1B1B1' }}>{info.student_number}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 10, color: '#B1B1B1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Document(s) Requested</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#001C43' }}>{info.documents}</div>
                  </div>
                </div>
              </div>

              {/* Name input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 700,
                  color: '#001C43', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3,
                }}>
                  Your Full Name <span style={{ color: '#E50019' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: `1px solid ${nameError ? '#E50019' : '#B1B1B1'}`,
                    borderRadius: 8, fontSize: 14, fontFamily: "'Montserrat', sans-serif",
                    outline: 'none', boxSizing: 'border-box',
                    background: nameError ? '#fff8f8' : 'white',
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                />
                {nameError && (
                  <div style={{ fontSize: 11, color: '#E50019', marginTop: 4, fontWeight: 600 }}>
                    {nameError}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div style={{
                background: '#EBF5FB', border: '1px solid #72ACFF',
                borderRadius: 8, padding: '10px 14px', fontSize: 12,
                color: '#001C43', lineHeight: 1.6, marginBottom: 20,
              }}>
                ℹ️ By clicking Confirm Clearance, you are certifying that <strong>{info.student_name}</strong> has been cleared by the <strong>{info.office_name}</strong> for this document request.
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  width: '100%', padding: 13,
                  background: confirming ? '#B1B1B1' : '#198754',
                  border: 'none', borderRadius: 10,
                  color: 'white', fontSize: 14, fontWeight: 700,
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                  transition: 'background 0.15s',
                }}
              >
                {confirming ? 'Confirming...' : '✓ Confirm Clearance'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '16px 20px',
        fontSize: 11, color: '#B1B1B1', borderTop: '1px solid rgba(0,0,0,0.06)',
      }}>
        Mapúa Malayan Colleges Mindanao — Registrar's Office Clearance System
      </div>
    </div>
  );
}
