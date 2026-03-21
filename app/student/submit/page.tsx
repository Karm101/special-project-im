"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuthGuard } from '../../../hooks/useAuthGuard';
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

type DocType = {
  document_type_id: number;
  document_name: string;
  processing_days: number;
  academic_level: string;
};

type SelectedDoc = {
  docTypeId: number;
  docName: string;
  copies: number;
  processingDays: number;
};

function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) added++;
  }
  return result;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function StudentSubmitPage() {
  const router = useRouter();
  useAuthGuard('student');
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [studentNumber, setStudentNumber] = useState('');
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [programStrand, setProgramStrand] = useState('');
  const [academicLevel, setAcademicLevel] = useState<'College' | 'Senior High School'>('College');
  const [enrollmentStatus, setEnrollmentStatus] = useState('Enrolled');
  const [academicYear, setAcademicYear]   = useState('');
  const [termSemester, setTermSemester]   = useState('');
  const [email, setEmail]                 = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [purpose, setPurpose]             = useState('');
  const [hasRep, setHasRep]               = useState(false);
  const [repName, setRepName]             = useState('');
  const [repRelation, setRepRelation]     = useState('');
  const [selectedDocs, setSelectedDocs]   = useState<SelectedDoc[]>([]);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  // ── Doc types from API ─────────────────────────────────────────────────────
  const [docTypes, setDocTypes]     = useState<DocType[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch('https://web-production-5905e.up.railway.app/api/document-types/');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDocTypes(data.results ?? data);
      } catch {
        setDocTypes([
          { document_type_id: 3,  document_name: 'Certificate of Enrollment', processing_days: 7,  academic_level: 'All'     },
          { document_type_id: 5,  document_name: 'SF9 — Report Card',          processing_days: 7,  academic_level: 'SHS'     },
          { document_type_id: 6,  document_name: 'SF10 — Permanent Record',    processing_days: 7,  academic_level: 'SHS'     },
          { document_type_id: 7,  document_name: 'Certified True Copy',        processing_days: 7,  academic_level: 'All'     },
          { document_type_id: 1,  document_name: 'Transcript of Records (TOR)', processing_days: 7, academic_level: 'College' },
          { document_type_id: 2,  document_name: 'Honorable Dismissal',        processing_days: 7,  academic_level: 'College' },
          { document_type_id: 8,  document_name: 'CAV (via CHED)',             processing_days: 21, academic_level: 'All'     },
        ]);
      } finally {
        setDocsLoading(false);
      }
    }
    fetchDocs();
  }, []);

  // Filter by academic level
  const filteredDocs = useMemo(() => {
    const level = academicLevel === 'Senior High School' ? 'SHS' : 'College';
    return docTypes.filter(d => d.academic_level === 'All' || d.academic_level === level);
  }, [docTypes, academicLevel]);

  function toggleDoc(dt: DocType) {
    setSelectedDocs(prev => {
      const exists = prev.find(d => d.docTypeId === dt.document_type_id);
      if (exists) return prev.filter(d => d.docTypeId !== dt.document_type_id);
      return [...prev, { docTypeId: dt.document_type_id, docName: dt.document_name, copies: 1, processingDays: dt.processing_days }];
    });
  }

  function setCopies(id: number, copies: number) {
    setSelectedDocs(prev => prev.map(d => d.docTypeId === id ? { ...d, copies } : d));
  }

  const maxDays = selectedDocs.reduce((m, d) => Math.max(m, d.processingDays), 7);
  const expectedClaim = formatDate(addWorkingDays(new Date(), maxDays));

  // ── Validation ─────────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!firstName.trim())    e.firstName    = 'First name is required.';
    if (!lastName.trim())     e.lastName     = 'Last name is required.';
    if (!email.trim())        e.email        = 'Email is required.';
    if (!programStrand.trim()) e.programStrand = 'Program / Strand is required.';
    if (selectedDocs.length === 0) e.docs    = 'Please select at least one document.';
    if (!purpose.trim())      e.purpose      = 'Purpose is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit to API ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        form_type:         derivedFormType,
        academic_level:    academicLevel === 'Senior High School' ? 'SHS' : 'College',
        submission_mode:   'Online',
        purpose,
        is_authorized_rep: hasRep,
        representative_name: hasRep ? repName : null,
        rep_relation:       hasRep ? repRelation : null,
        requester: {
          student_number:   studentNumber || null,
          first_name:       firstName,
          last_name:        lastName,
          program_strand:   programStrand,
          academic_level:   academicLevel === 'Senior High School' ? 'SHS' : 'College',
          enrollment_status: enrollmentStatus,
          academic_year:    academicYear || null,
          term_semester:    termSemester || null,
          email,
          contact_number:   contactNumber || null,
        },
        documents: selectedDocs.map(d => ({
          document_type_id: d.docTypeId,
          copies: d.copies,
        })),
      };

      const res = await fetch('https://web-production-5905e.up.railway.app/api/requests/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Submission failed');
      const created = await res.json();
      setSubmittedId(created.request_id);
      setStep(3);
    } catch {
      setSubmitError('Submission failed. Please try again or contact the Registrar\'s Office.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Form type derived from enrollment status ───────────────────────────────
  // Students never see "RO-0004" or "RO-0005" — system picks automatically
  const isEnrolled   = enrollmentStatus === 'Enrolled';
  const derivedFormType = isEnrolled ? 'RO-0005' : 'RO-0004';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="public-page drms-root">
      <div className="pub-topbar">
        <div className="pub-logo">M</div>
        <div>
          <div className="pub-title">MMCM Registrar's Office</div>
          <div className="pub-sub">Online Document Request</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <PubThemeToggle />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }} onClick={() => router.push('/student/track')}>
            Track My Request
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px', width: '100%' }}>

        {/* Step bar */}
        <div className="step-bar" style={{ marginBottom: 28 }}>
          <div className={`step ${step > 1 ? 'done' : step === 1 ? 'active' : ''}`}>
            <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
            <div className="step-label">Request Details</div>
          </div>
          <div className={`step-line ${step > 1 ? 'done' : ''}`} />
          <div className={`step ${step > 2 ? 'done' : step === 2 ? 'active' : ''}`}>
            <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
            <div className="step-label">Review</div>
          </div>
          <div className={`step-line ${step > 2 ? 'done' : ''}`} />
          <div className={`step ${step === 3 ? 'active' : ''}`}>
            <div className="step-circle">{step === 3 ? '✓' : '3'}</div>
            <div className="step-label">Submitted</div>
          </div>
        </div>

        {/* ── STEP 1: Request Details ── */}
        {step === 1 && (
          <div className="drms-card" style={{ padding: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Document Request Form</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 24 }}>Fill in the form below to submit your document request to the Registrar's Office.</div>

            {/* ── Enrollment status — drives form type automatically ── */}
            <div style={{ marginBottom: 24 }}>
              <div className="section-title">What is your enrollment status?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  className={`radio-card${enrollmentStatus === 'Enrolled' ? ' selected' : ''}`}
                  onClick={() => { setEnrollmentStatus('Enrolled'); setSelectedDocs([]); }}
                  style={{ cursor: 'pointer' }}
                >
                  <input type="radio" readOnly checked={enrollmentStatus === 'Enrolled'} />
                  <div>
                    <div className="radio-label">Currently Enrolled</div>
                    <div className="radio-sub">I am an active student this semester</div>
                  </div>
                </div>
                <div
                  className={`radio-card${enrollmentStatus !== 'Enrolled' ? ' selected' : ''}`}
                  onClick={() => { setEnrollmentStatus('Alumni'); setSelectedDocs([]); }}
                  style={{ cursor: 'pointer' }}
                >
                  <input type="radio" readOnly checked={enrollmentStatus !== 'Enrolled'} />
                  <div>
                    <div className="radio-label">Alumni / No longer enrolled / Transferring out</div>
                    <div className="radio-sub">I have already graduated, left, or am transferring</div>
                  </div>
                </div>
              </div>
              {/* Show which form will be used */}
              <div className="info-box" style={{ marginTop: 12 }}>
                <span className="info-icon">📋</span>
                <div className="info-text" style={{ fontSize: 12 }}>
                  {isEnrolled
                    ? <span>You will be filing a <strong>Credential Request</strong> — for currently enrolled students.</span>
                    : <span>You will be filing a <strong>Transfer Credential Request</strong> — includes clearance from 11 offices.</span>
                  }
                </div>
              </div>
              {enrollmentStatus !== 'Enrolled' && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 6 }}>
                    Specify status
                  </label>
                  <select className="drms-select" style={{ width: 220 }} value={enrollmentStatus}
                    onChange={e => setEnrollmentStatus(e.target.value)}>
                    <option value="Alumni">Alumni / Graduate</option>
                    <option value="Not Enrolled">Not Enrolled</option>
                    <option value="Transferee">Transferring Out</option>
                  </select>
                </div>
              )}
            </div>

            {/* Personal info */}
            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Your Information</div>
              <div className="form-grid">
                <div className="fg">
                  <label>Student Number</label>
                  <input className="drms-input" type="text" placeholder="e.g. 2024110012" maxLength={12}
                    value={studentNumber} onChange={e => setStudentNumber(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="fg">
                  <label>Academic Level <span className="req-asterisk">*</span></label>
                  <select className="drms-select" value={academicLevel} onChange={e => { setAcademicLevel(e.target.value as any); setSelectedDocs([]); }}>
                    <option>College</option>
                    <option>Senior High School</option>
                  </select>
                </div>
                <div className="fg">
                  <label>First Name <span className="req-asterisk">*</span></label>
                  <input className={`drms-input${errors.firstName ? ' input-error' : ''}`} type="text"
                    value={firstName} onChange={e => { setFirstName(e.target.value); setErrors(p => ({...p, firstName: ''})); }} />
                  {errors.firstName && <div className="field-error">{errors.firstName}</div>}
                </div>
                <div className="fg">
                  <label>Last Name <span className="req-asterisk">*</span></label>
                  <input className={`drms-input${errors.lastName ? ' input-error' : ''}`} type="text"
                    value={lastName} onChange={e => { setLastName(e.target.value); setErrors(p => ({...p, lastName: ''})); }} />
                  {errors.lastName && <div className="field-error">{errors.lastName}</div>}
                </div>
                <div className="fg">
                  <label>Program / Strand <span className="req-asterisk">*</span></label>
                  <input className={`drms-input${errors.programStrand ? ' input-error' : ''}`} type="text" placeholder="e.g. BSCS, STEM"
                    value={programStrand} onChange={e => { setProgramStrand(e.target.value); setErrors(p => ({...p, programStrand: ''})); }} />
                  {errors.programStrand && <div className="field-error">{errors.programStrand}</div>}
                </div>
                <div className="fg">
                  <label>Academic Year</label>
                  <input className="drms-input" type="text" placeholder="e.g. 2025-2026" value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Term / Semester</label>
                  <input className="drms-input" type="text" placeholder="e.g. 2nd Semester" value={termSemester} onChange={e => setTermSemester(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Contact Number</label>
                  <input className="drms-input" type="text" placeholder="09XXXXXXXXX" maxLength={11}
                    value={contactNumber} onChange={e => setContactNumber(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="fg">
                  <label>Email Address <span className="req-asterisk">*</span></label>
                  <input className={`drms-input${errors.email ? ' input-error' : ''}`} type="email" placeholder="student@mcm.edu.ph"
                    value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ''})); }} />
                  {errors.email && <div className="field-error">{errors.email}</div>}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div style={{ marginBottom: 20 }}>
              <div className="section-title">Documents to Request</div>
              {errors.docs && <div className="field-error" style={{ marginBottom: 8 }}>{errors.docs}</div>}
              {docsLoading ? (
                <div style={{ color: '#B1B1B1', padding: 12 }}>Loading document types...</div>
              ) : (
                <div className="check-group">
                  {filteredDocs.map(dt => {
                    const sel = selectedDocs.find(d => d.docTypeId === dt.document_type_id);
                    return (
                      <div key={dt.document_type_id} className={`check-item${sel ? ' checked' : ''}`} onClick={() => { toggleDoc(dt); setErrors(p => ({...p, docs: ''})); }}>
                        <input type="checkbox" checked={!!sel} onChange={() => {}} />
                        <div style={{ flex: 1 }}>
                          <div className="check-item-label">{dt.document_name}</div>
                          <div className="check-item-sub">{dt.processing_days} working days · Fee set at Treasury</div>
                        </div>
                        {sel && (
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} onClick={e => e.stopPropagation()}>
                            <input type="number" value={sel.copies} min={1} max={10}
                              style={{ width: 48, padding: '4px 6px', fontSize: 12, border: '1px solid var(--border-col)', borderRadius: 6 }}
                              onChange={e => setCopies(dt.document_type_id, Number(e.target.value))} />
                            <span style={{ color: 'var(--mid-gray)' }}>copies</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purpose */}
            <div className="fg" style={{ marginBottom: 20 }}>
              <label>Purpose / Reason for Request <span className="req-asterisk">*</span></label>
              <textarea
                className={`drms-textarea${errors.purpose ? ' input-error' : ''}`}
                placeholder="e.g. For college admission application at [school name]"
                value={purpose}
                onChange={e => { setPurpose(e.target.value); setErrors(p => ({...p, purpose: ''})); }}
              />
              {errors.purpose && <div className="field-error">{errors.purpose}</div>}
            </div>

            {/* Authorized rep */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, marginBottom: 12 }}>
                <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--navy)' }} checked={hasRep} onChange={e => setHasRep(e.target.checked)} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Someone else will claim on my behalf (Authorized Representative)</span>
              </label>
              <div style={{ opacity: hasRep ? 1 : 0.4, pointerEvents: hasRep ? 'auto' : 'none' }}>
                <div className="form-grid">
                  <div className="fg"><label>Representative Name</label><input className="drms-input" type="text" placeholder="Full name" value={repName} onChange={e => setRepName(e.target.value)} /></div>
                  <div className="fg"><label>Relationship to You</label><input className="drms-input" type="text" placeholder="e.g. Parent, Sibling" value={repRelation} onChange={e => setRepRelation(e.target.value)} /></div>
                </div>
              </div>
            </div>

            <div className="info-box warn" style={{ marginBottom: 20 }}>
              <span className="info-icon">💳</span>
              <div className="info-text">Payment will be made at the <strong>Treasury Office</strong> after your request is verified. You will receive an email with billing instructions.</div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => router.push('/student/landing')}>← Cancel</button>
              <button className="btn-primary" onClick={() => { if (validateStep1()) setStep(2); }}>Review Request →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === 2 && (
          <div className="drms-card" style={{ padding: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Review Your Request</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 20 }}>Please confirm all details before submitting.</div>

            <div className="info-box" style={{ marginBottom: 20 }}>
              <span className="info-icon">👤</span>
              <div className="info-text">
                Requesting as: <strong>{lastName}, {firstName}</strong>
                {studentNumber ? ` · No. ${studentNumber}` : ''}
                {' · '}{academicLevel} · {programStrand}
                {termSemester ? ` · ${termSemester} ${academicYear}` : ''}
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 16 }}>
              <div className="form-section-title">Documents Requested</div>
              <table className="drms-table">
                <thead><tr><th>#</th><th>Document</th><th>Copies</th><th>Processing</th></tr></thead>
                <tbody>
                  {selectedDocs.map((d, i) => (
                    <tr key={d.docTypeId}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{d.docName}</td>
                      <td>{d.copies}</td>
                      <td>{d.processingDays} working days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="field-grid" style={{ marginBottom: 16 }}>
              <div className="field-group"><div className="field-label">Purpose</div><div className="field-value">{purpose}</div></div>
              <div className="field-group"><div className="field-label">Submission Mode</div><div className="field-value">Online</div></div>
              <div className="field-group"><div className="field-label">Expected Claim Date</div><div className="field-value">{expectedClaim}</div></div>
              <div className="field-group"><div className="field-label">Authorized Rep</div><div className="field-value">{hasRep ? `${repName} (${repRelation})` : 'None'}</div></div>
            </div>

            <div className="info-box warn" style={{ marginBottom: 20 }}>
              <span className="info-icon">💳</span>
              <div className="info-text">Amount will be billed by Treasury Office after verification. Fee is set per document type.</div>
            </div>

            {submitError && (
              <div className="info-box warn" style={{ marginBottom: 16 }}>
                <span className="info-icon">⚠️</span>
                <div className="info-text">{submitError}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setStep(1)}>← Edit</button>
              <button className="btn-primary" disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting...' : '✓ Submit Request'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 3 && submittedId && (
          <div className="drms-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>Request Submitted!</div>
            <div style={{ fontSize: 14, color: 'var(--mid-gray)', marginBottom: 24, lineHeight: 1.6 }}>
              Your document request has been successfully submitted to the Registrar's Office.<br />
              Your Request ID is:
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)', marginBottom: 8, fontFamily: 'var(--drms-font)' }}>
              REQ-{String(submittedId).padStart(3, '0')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 32 }}>
              Save this ID — you'll need it to track your request.
            </div>
            <div className="info-box" style={{ textAlign: 'left', marginBottom: 24 }}>
              <span className="info-icon">ℹ️</span>
              <div className="info-text">
                A confirmation email will be sent to <strong>{email}</strong>. You will also receive payment instructions once your request is verified.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => {
                setTrackingId(String(submittedId));
                router.push('/student/track');
              }}>Track My Request →</button>
              <button className="btn-outline" onClick={() => router.push('/student/landing')}>Back to Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function setTrackingId(id: string) {
    // Store in sessionStorage so track page can pick it up
    if (typeof window !== 'undefined') sessionStorage.setItem('trackId', id);
  }
}
