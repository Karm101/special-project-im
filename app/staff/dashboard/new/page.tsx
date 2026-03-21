"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Topbar } from '../../../components/drms/Topbar';

// ── API types ─────────────────────────────────────────────────────────────────
type DocType = {
  document_type_id: number;
  document_name: string;
  processing_days: number;
  academic_level: string; // 'College' | 'SHS' | 'All'
};

type RequesterResult = {
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

// ── Form state shape ──────────────────────────────────────────────────────────
type FormData = {
  // Step 1 — requester
  formType: 'RO-0005' | 'RO-0004';
  studentNumber: string;
  firstName: string;
  lastName: string;
  programStrand: string;
  academicLevel: 'College' | 'Senior High School';
  enrollmentStatus: string;
  academicYear: string;
  termSemester: string;
  contactNumber: string;
  email: string;
  hasRep: boolean;
  repName: string;
  repRelation: string;
  submissionMode: 'Online' | 'Onsite';
  purpose: string;
  // Step 2 — documents
  selectedDocs: { docTypeId: number; docName: string; copies: number; processingDays: number }[];
};

// ── Add working days helper ───────────────────────────────────────────────────
function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  return (
    <div className="step-bar">
      <div className={`step ${step > 1 ? 'done' : step === 1 ? 'active' : ''}`}>
        <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
        <div className="step-label">Requester Info</div>
      </div>
      <div className={`step-line ${step > 1 ? 'done' : ''}`} />
      <div className={`step ${step > 2 ? 'done' : step === 2 ? 'active' : ''}`}>
        <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
        <div className="step-label">Select Documents</div>
      </div>
      <div className={`step-line ${step > 2 ? 'done' : ''}`} />
      <div className={`step ${step === 3 ? 'active' : ''}`}>
        <div className="step-circle">3</div>
        <div className="step-label">Review &amp; Submit</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep]             = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Document types from API ───────────────────────────────────────────────
  const [docTypes, setDocTypes]     = useState<DocType[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocTypes() {
      try {
        const res = await fetch('http://localhost:8000/api/document-types/');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDocTypes(data.results ?? data);
      } catch {
        // Fall back to hardcoded defaults if API fails
        setDocTypes([
          { document_type_id: 1, document_name: 'Transcript of Records (TOR)',   processing_days: 7, academic_level: 'College' },
          { document_type_id: 2, document_name: 'Honorable Dismissal',            processing_days: 7, academic_level: 'College' },
          { document_type_id: 3, document_name: 'Certificate of Enrollment',      processing_days: 7, academic_level: 'All'     },
          { document_type_id: 4, document_name: 'Certificate of Grades',          processing_days: 7, academic_level: 'College' },
          { document_type_id: 5, document_name: 'SF9 — Report Card',              processing_days: 7, academic_level: 'SHS'     },
          { document_type_id: 6, document_name: 'SF10 — Permanent Record',        processing_days: 7, academic_level: 'SHS'     },
          { document_type_id: 7, document_name: 'Certified True Copy',            processing_days: 7, academic_level: 'All'     },
          { document_type_id: 8, document_name: 'CAV (via CHED)',                 processing_days: 21, academic_level: 'All'     },
        ]);
      } finally {
        setDocsLoading(false);
      }
    }
    fetchDocTypes();
  }, []);

  // ── Requester lookup ──────────────────────────────────────────────────────
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult]   = useState<RequesterResult | null>(null);
  const [lookupError, setLookupError]     = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormData>({
    formType: 'RO-0005',
    studentNumber: '', firstName: '', lastName: '',
    programStrand: '', academicLevel: 'College',
    enrollmentStatus: 'Enrolled', academicYear: '',
    termSemester: '', contactNumber: '', email: '',
    hasRep: false, repName: '', repRelation: '',
    submissionMode: 'Onsite', purpose: '',
    selectedDocs: [],
  });

  const set = (field: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // ── Lookup student by student number ─────────────────────────────────────
  async function handleLookup() {
    if (!form.studentNumber.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(`http://localhost:8000/api/requesters/?search=${form.studentNumber}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const results: RequesterResult[] = data.results ?? data;
      const match = results.find(r => r.student_number === form.studentNumber);
      if (match) {
        setLookupResult(match);
        setForm(prev => ({
          ...prev,
          firstName:        match.first_name,
          lastName:         match.last_name,
          programStrand:    match.program_strand,
          academicLevel:    match.academic_level === 'SHS' ? 'Senior High School' : 'College',
          enrollmentStatus: match.enrollment_status,
          academicYear:     match.academic_year ?? '',
          termSemester:     match.term_semester ?? '',
          email:            match.email,
          contactNumber:    match.contact_number ?? '',
        }));
      } else {
        setLookupError('Student not found. Please fill in the details manually.');
      }
    } catch {
      setLookupError('Could not search. Please fill in manually.');
    } finally {
      setLookupLoading(false);
    }
  }

  // ── Toggle document selection ─────────────────────────────────────────────
  function toggleDoc(dt: DocType) {
    setForm(prev => {
      const exists = prev.selectedDocs.find(d => d.docTypeId === dt.document_type_id);
      if (exists) {
        return { ...prev, selectedDocs: prev.selectedDocs.filter(d => d.docTypeId !== dt.document_type_id) };
      }
      return {
        ...prev,
        selectedDocs: [...prev.selectedDocs, {
          docTypeId: dt.document_type_id,
          docName: dt.document_name,
          copies: 1,
          processingDays: dt.processing_days,
        }],
      };
    });
  }

  function setCopies(docTypeId: number, copies: number) {
    setForm(prev => ({
      ...prev,
      selectedDocs: prev.selectedDocs.map(d =>
        d.docTypeId === docTypeId ? { ...d, copies } : d
      ),
    }));
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const totalAmount = 0; // Fee set by Treasury after verification — not pre-defined per document
  const maxDays     = form.selectedDocs.reduce((max, d) => Math.max(max, d.processingDays), 7);
  const expectedClaim = formatDate(addWorkingDays(new Date(), maxDays));

  // Filter doc types by academic level
  const filteredDocTypes = useMemo(() => {
    const level = form.academicLevel === 'Senior High School' ? 'SHS' : 'College';
    return docTypes.filter(dt =>
      dt.academic_level === 'All' ||
      dt.academic_level === level
    );
  }, [docTypes, form.academicLevel]);

  // ── Validation errors state ──────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Refs for scroll-to-error ──────────────────────────────────────────────
  const firstNameRef    = useRef<HTMLDivElement>(null);
  const lastNameRef     = useRef<HTMLDivElement>(null);
  const emailRef        = useRef<HTMLDivElement>(null);
  const programRef      = useRef<HTMLDivElement>(null);
  const docsRef         = useRef<HTMLDivElement>(null);
  const purposeRef      = useRef<HTMLDivElement>(null);

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim())    e.firstName    = 'First name is required.';
    if (!form.lastName.trim())     e.lastName     = 'Last name is required.';
    if (!form.email.trim())        e.email        = 'Email is required.';
    if (!form.programStrand.trim()) e.programStrand = 'Program / Strand is required.';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Scroll to the first error field
      const firstRef = e.firstName ? firstNameRef : e.lastName ? lastNameRef : e.programStrand ? programRef : emailRef;
      setTimeout(() => firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (form.selectedDocs.length === 0) e.docs    = 'Please select at least one document.';
    if (!form.purpose.trim())           e.purpose  = 'Purpose is required.';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const firstRef = e.docs ? docsRef : purposeRef;
      setTimeout(() => firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return false;
    }
    return true;
  }

  // ── Submit to API ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        form_type:          form.formType,
        academic_level:     form.academicLevel === 'Senior High School' ? 'SHS' : 'College',
        submission_mode:    form.submissionMode,
        purpose:            form.purpose,
        is_authorized_rep:  form.hasRep,
        representative_name: form.hasRep ? form.repName : null,
        rep_relation:        form.hasRep ? form.repRelation : null,
        requester: {
          student_number:   form.studentNumber || null,
          first_name:       form.firstName,
          last_name:        form.lastName,
          program_strand:   form.programStrand,
          academic_level:   form.academicLevel === 'Senior High School' ? 'SHS' : 'College',
          enrollment_status: form.enrollmentStatus,
          academic_year:    form.academicYear || null,
          term_semester:    form.termSemester || null,
          email:            form.email,
          contact_number:   form.contactNumber || null,
        },
        documents: form.selectedDocs.map(d => ({
          document_type_id: d.docTypeId,
          copies:           d.copies,
        })),
      };

      const res = await fetch('http://localhost:8000/api/requests/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }

      const created = await res.json();
      const newId = `REQ-${String(created.request_id).padStart(3, '0')}`;
      router.push(`/staff/request/${newId}`);
    } catch (err: any) {
      setSubmitError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Topbar
        breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: 'New Request' }]}
        showNotifDot={false}
      />
      <div className="page-body">
        <StepBar step={step} />

        {/* ── STEP 1: Requester Info ── */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
            <div>
              {/* Form Type */}
              <div className="drms-card" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-title">Form Type</div>
                <div className="radio-group">
                  <div className={`radio-card${form.formType === 'RO-0005' ? ' selected' : ''}`} onClick={() => set('formType', 'RO-0005')}>
                    <input type="radio" name="ftype" readOnly checked={form.formType === 'RO-0005'} />
                    <div><div className="radio-label">RO-0005 — Credential Request</div><div className="radio-sub">For currently enrolled students</div></div>
                  </div>
                  <div className={`radio-card${form.formType === 'RO-0004' ? ' selected' : ''}`} onClick={() => set('formType', 'RO-0004')}>
                    <input type="radio" name="ftype" readOnly checked={form.formType === 'RO-0004'} />
                    <div><div className="radio-label">RO-0004 — Transfer Credential</div><div className="radio-sub">For non-enrolled / alumni / transferees</div></div>
                  </div>
                </div>
              </div>

              {/* Requester Info */}
              <div className="drms-card" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-title">Requester Information</div>

                {/* Student number lookup */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <div className="fg" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Student Number</label>
                    <input
                      className="drms-input"
                      type="text"
                      placeholder="e.g. 2024110012 — press Lookup to autofill"
                      value={form.studentNumber}
                      onChange={e => set('studentNumber', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLookup()}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      className="btn-outline"
                      style={{ height: 38, padding: '0 14px' }}
                      onClick={handleLookup}
                      disabled={lookupLoading}
                    >
                      {lookupLoading ? 'Searching...' : '🔍 Lookup'}
                    </button>
                  </div>
                </div>

                {lookupResult && (
                  <div className="info-box" style={{ marginBottom: 12 }}>
                    <span className="info-icon">✅</span>
                    <div className="info-text">Student found — fields auto-filled from database.</div>
                  </div>
                )}
                {lookupError && (
                  <div className="info-box warn" style={{ marginBottom: 12 }}>
                    <span className="info-icon">⚠️</span>
                    <div className="info-text">{lookupError}</div>
                  </div>
                )}

                <div className="form-grid">
                  <div className="fg">
                    <label>Academic Level <span className="req-asterisk">*</span></label>
                    <select className="drms-select" value={form.academicLevel} onChange={e => set('academicLevel', e.target.value)}>
                      <option>College</option>
                      <option>Senior High School</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label>Submission Mode <span className="req-asterisk">*</span></label>
                    <select className="drms-select" value={form.submissionMode} onChange={e => set('submissionMode', e.target.value)}>
                      <option>Onsite</option>
                      <option>Online</option>
                    </select>
                  </div>
                  <div className="fg" ref={firstNameRef}>
                    <label>First Name <span className="req-asterisk">*</span></label>
                    <input className={`drms-input${errors.firstName ? ' input-error' : ''}`} type="text" value={form.firstName} onChange={e => { set('firstName', e.target.value); setErrors(p => ({...p, firstName: ''})); }} />
                    {errors.firstName && <div className="field-error">{errors.firstName}</div>}
                  </div>
                  <div className="fg" ref={lastNameRef}>
                    <label>Last Name <span className="req-asterisk">*</span></label>
                    <input className={`drms-input${errors.lastName ? ' input-error' : ''}`} type="text" value={form.lastName} onChange={e => { set('lastName', e.target.value); setErrors(p => ({...p, lastName: ''})); }} />
                    {errors.lastName && <div className="field-error">{errors.lastName}</div>}
                  </div>
                  <div className="fg" ref={programRef}>
                    <label>Program / Strand <span className="req-asterisk">*</span></label>
                    <input className={`drms-input${errors.programStrand ? ' input-error' : ''}`} type="text" placeholder="e.g. BSCS, STEM" value={form.programStrand} onChange={e => { set('programStrand', e.target.value); setErrors(p => ({...p, programStrand: ''})); }} />
                    {errors.programStrand && <div className="field-error">{errors.programStrand}</div>}
                  </div>
                  <div className="fg">
                    <label>Enrollment Status <span className="req-asterisk">*</span></label>
                    <select className="drms-select" value={form.enrollmentStatus} onChange={e => set('enrollmentStatus', e.target.value)}>
                      <option>Enrolled</option>
                      <option>Not Enrolled</option>
                      <option>Alumni</option>
                      <option>Transferee</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label>Academic Year</label>
                    <input className="drms-input" type="text" placeholder="e.g. 2025-2026" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Term / Semester</label>
                    <input className="drms-input" type="text" placeholder="e.g. 2nd Semester" value={form.termSemester} onChange={e => set('termSemester', e.target.value)} />
                  </div>
                  <div className="fg">
                    <label>Contact Number</label>
                    <input className="drms-input" type="text" placeholder="09XXXXXXXXX" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} />
                  </div>
                  <div className="fg" ref={emailRef}>
                    <label>Email Address <span className="req-asterisk">*</span></label>
                    <input className={`drms-input${errors.email ? ' input-error' : ''}`} type="email" placeholder="student@mcm.edu.ph" value={form.email} onChange={e => { set('email', e.target.value); setErrors(p => ({...p, email: ''})); }} />
                    {errors.email && <div className="field-error">{errors.email}</div>}
                  </div>
                </div>

                {/* Authorized rep */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
                    <input type="checkbox" style={{ width: 16, height: 16, accentColor: 'var(--navy)', flexShrink: 0 }} checked={form.hasRep} onChange={e => set('hasRep', e.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Filed by Authorized Representative</span>
                  </label>
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, opacity: form.hasRep ? 1 : 0.4, pointerEvents: form.hasRep ? 'auto' : 'none' }}>
                    <div className="fg"><label>Representative Name</label><input className="drms-input" type="text" placeholder="Full name" value={form.repName} onChange={e => set('repName', e.target.value)} /></div>
                    <div className="fg"><label>Relationship</label><input className="drms-input" type="text" placeholder="e.g. Parent, Sibling" value={form.repRelation} onChange={e => set('repRelation', e.target.value)} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary sidebar */}
            <div style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 28px)', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="drms-card" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Request Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Form Type</span><span style={{ fontWeight: 600 }}>{form.formType}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Level</span><span style={{ fontWeight: 600 }}>{form.academicLevel}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Mode</span><span style={{ fontWeight: 600 }}>{form.submissionMode}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Requester</span><span style={{ fontWeight: 600 }}>{form.firstName || '—'} {form.lastName}</span></div>
                </div>
              </div>
              <div className="info-box">
                <span className="info-icon">ℹ️</span>
                <div className="info-text">Enter the student number and click Lookup to auto-fill from the database, or fill in manually.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn-primary" style={{ justifyContent: 'center', padding: 12 }} onClick={() => {
                  if (!validateStep1()) return;
                  setStep(2);
                }}>Continue to Documents →</button>
                <button className="btn-outline" style={{ justifyContent: 'center' }} onClick={() => router.push('/staff/dashboard')}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Select Documents ── */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
            <div className="drms-card" style={{ padding: 20 }}>
              <div className="section-title">Documents to Request</div>
              <div ref={docsRef}>{errors.docs && <div className="field-error" style={{ marginBottom: 8 }}>{errors.docs}</div>}</div>
              {docsLoading ? (
                <div style={{ color: '#B1B1B1', padding: 20 }}>Loading document types...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredDocTypes.map(dt => {
                    const sel = form.selectedDocs.find(d => d.docTypeId === dt.document_type_id);
                    const isChecked = !!sel;
                    return (
                      <div key={dt.document_type_id} className={`check-item${isChecked ? ' checked' : ''}`} onClick={() => toggleDoc(dt)}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ width: 15, height: 15, accentColor: 'var(--navy)', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
                        <div style={{ flex: 1 }}>
                          <div className="check-item-label">{dt.document_name}</div>
                          <div className="check-item-sub">
                            {dt.processing_days} working days · Fee set at Treasury
                          </div>
                        </div>
                        {(
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              value={sel?.copies ?? 1}
                              min={1} max={10}
                              style={{ width: 48, padding: '4px 6px', fontSize: 12, border: '1px solid var(--mid-gray)', borderRadius: 6 }}
                              onChange={e => setCopies(dt.document_type_id, Number(e.target.value))}
                              disabled={!isChecked}
                            />
                            <span style={{ color: 'var(--mid-gray)' }}>copies</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="fg" ref={purposeRef} style={{ marginTop: 16 }}>
                <label>Purpose / Reason for Request <span className="req-asterisk">*</span></label>
                <textarea className={`drms-textarea${errors.purpose ? ' input-error' : ''}`} placeholder="State the specific purpose of this request..." value={form.purpose} onChange={e => { set('purpose', e.target.value); setErrors(p => ({...p, purpose: ''})); }} />
                {errors.purpose && <div className="field-error">{errors.purpose}</div>}
              </div>
            </div>

            {/* Summary sidebar */}
            <div style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 24px)', display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
              <div className="drms-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Selected Documents</div>
                <div style={{ fontSize: 12, color: 'var(--navy)' }}>
                  {form.selectedDocs.length === 0 ? (
                    <div style={{ color: 'var(--mid-gray)', fontStyle: 'italic' }}>No documents selected</div>
                  ) : (
                    form.selectedDocs.map(d => (
                      <div key={d.docTypeId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                        <span>{d.docName} × {d.copies}</span>
                        <span style={{ fontWeight: 700, color: '#B1B1B1' }}>TBD</span>
                      </div>
                    ))
                  )}
                  {form.selectedDocs.length > 0 && (
                    <div style={{ fontSize: 11, color: '#B1B1B1', marginTop: 4, fontStyle: 'italic' }}>
                      Fees are billed by Treasury Office after verification.
                    </div>
                  )}
                </div>
              </div>
              <div className="info-box warn">
                <span className="info-icon">⚠️</span>
                <div className="info-text" style={{ fontSize: 11 }}>Payment is settled at the Treasury Office after RO verification. Official receipt required.</div>
              </div>
              <button className="btn-primary" style={{ justifyContent: 'center', padding: 11 }} onClick={() => {
                if (!validateStep2()) return;
                setStep(3);
              }}>Continue to Review →</button>
              <button className="btn-outline" style={{ justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Submit ── */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="info-box">
                <span className="info-icon">✅</span>
                <div className="info-text">Please review all information below before submitting. Click "Edit" on any section to make changes.</div>
              </div>

              {/* Requester review */}
              <div className="drms-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>Requester Information</div>
                  <button className="btn-outline btn-sm" onClick={() => setStep(1)}>✏ Edit</button>
                </div>
                <div className="field-grid">
                  <div className="field-group"><div className="field-label">Name</div><div className="field-value">{form.lastName}, {form.firstName}</div></div>
                  <div className="field-group"><div className="field-label">Student Number</div><div className="field-value">{form.studentNumber || '—'}</div></div>
                  <div className="field-group"><div className="field-label">Level / Program</div><div className="field-value">{form.academicLevel} · {form.programStrand}</div></div>
                  <div className="field-group"><div className="field-label">Enrollment Status</div><div className="field-value">{form.enrollmentStatus}</div></div>
                  <div className="field-group"><div className="field-label">Form Type</div><div className="field-value">{form.formType}</div></div>
                  <div className="field-group"><div className="field-label">Submission Mode</div><div className="field-value">{form.submissionMode}</div></div>
                  <div className="field-group"><div className="field-label">Email</div><div className="field-value">{form.email}</div></div>
                  <div className="field-group"><div className="field-label">Authorized Rep</div><div className="field-value">{form.hasRep ? `${form.repName} (${form.repRelation})` : 'None'}</div></div>
                </div>
              </div>

              {/* Documents review */}
              <div className="drms-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>Documents Requested</div>
                  <button className="btn-outline btn-sm" onClick={() => setStep(2)}>✏ Edit</button>
                </div>
                <div className="table-wrap">
                  <table className="drms-table">
                    <thead><tr><th>#</th><th>Document Type</th><th>Copies</th><th>Processing</th></tr></thead>
                    <tbody>
                      {form.selectedDocs.map((d, i) => (
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
                <div className="fg" style={{ marginTop: 12 }}>
                  <div className="field-label">Purpose</div>
                  <div className="field-value">{form.purpose}</div>
                </div>
              </div>

              {submitError && (
                <div className="info-box warn">
                  <span className="info-icon">⚠️</span>
                  <div className="info-text">{submitError}</div>
                </div>
              )}
            </div>

            {/* Final summary sidebar */}
            <div style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 24px)', display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
              <div className="drms-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Request Summary</div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Form Type</span><span style={{ fontWeight: 600 }}>{form.formType}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Requester</span><span style={{ fontWeight: 600 }}>{form.lastName}, {form.firstName}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Documents</span><span style={{ fontWeight: 600 }}>{form.selectedDocs.length} item(s)</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Processing</span><span style={{ fontWeight: 600 }}>{maxDays} working days</span></div>
                  <div style={{ height: 1, background: 'rgba(0,0,0,.06)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Amount Due</span><span style={{ fontWeight: 800, color: '#B1B1B1' }}>Set at Treasury</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Expected Claim</span><span style={{ fontWeight: 600 }}>{expectedClaim}</span></div>
                </div>
              </div>
              <div className="info-box warn">
                <span className="info-icon">💳</span>
                <div className="info-text" style={{ fontSize: 11 }}>Payment at Treasury Office after verification. Billing email will be sent to the student.</div>
              </div>
              <button
                className="btn-primary"
                style={{ justifyContent: 'center', padding: 11 }}
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting...' : '✓ Submit Request'}
              </button>
              <button className="btn-outline" style={{ justifyContent: 'center' }} onClick={() => setStep(2)}>← Back</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
