"use client";

import { useRouter } from 'next/navigation';
import { Topbar } from '../../../../components/drms/Topbar';

export default function SubmitRequestStep3Page() {
  const router = useRouter();

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Document Requests', href: '/staff/dashboard' }, { label: 'New Request — Step 3' }]} showNotifDot={false} />
      <div className="page-body">
        <div className="step-bar">
          <div className="step done"><div className="step-circle">✓</div><div className="step-label">Requester Info</div></div>
          <div className="step-line done" />
          <div className="step done"><div className="step-circle">✓</div><div className="step-label">Select Documents</div></div>
          <div className="step-line done" />
          <div className="step active"><div className="step-circle">3</div><div className="step-label">Review &amp; Submit</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="info-box">
              <span className="info-icon">✅</span>
              <div className="info-text">Please review all information below before submitting. Click "Edit" on any section to make changes.</div>
            </div>

            <div className="drms-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Requester Information</div>
                <button className="btn-outline btn-sm" onClick={() => router.push('/staff/dashboard/new')}>✏ Edit</button>
              </div>
              <div className="field-grid">
                <div className="field-group"><div className="field-label">Name</div><div className="field-value">Maria Dela Cruz</div></div>
                <div className="field-group"><div className="field-label">Student Number</div><div className="field-value">2024110012</div></div>
                <div className="field-group"><div className="field-label">Level / Program</div><div className="field-value">SHS · STEM</div></div>
                <div className="field-group"><div className="field-label">Enrollment Status</div><div className="field-value">Enrolled</div></div>
                <div className="field-group"><div className="field-label">Form Type</div><div className="field-value">RO-0005</div></div>
                <div className="field-group"><div className="field-label">Authorized Rep</div><div className="field-value">None</div></div>
              </div>
            </div>

            <div className="drms-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Documents Requested</div>
                <button className="btn-outline btn-sm" onClick={() => router.push('/staff/dashboard/new/step2')}>✏ Edit</button>
              </div>
              <div className="table-wrap">
                <table className="drms-table">
                  <thead><tr><th>#</th><th>Document Type</th><th>Copies</th><th>Est. Fee</th><th>Processing Time</th></tr></thead>
                  <tbody>
                    <tr><td>1</td><td style={{ fontWeight: 600 }}>Transcript of Records</td><td>1</td><td>₱150.00</td><td>7 working days</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="fg" style={{ marginTop: 12 }}>
                <div className="field-label">Purpose</div>
                <div className="field-value">Requirement for college admission application</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 24px)', display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content' }}>
            <div className="drms-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Request Summary</div>
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Form Type</span><span style={{ fontWeight: 600 }}>RO-0005</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Requester</span><span style={{ fontWeight: 600 }}>Maria Dela Cruz</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Documents</span><span style={{ fontWeight: 600 }}>TOR × 1</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Processing Time</span><span style={{ fontWeight: 600 }}>7 working days</span></div>
                <div style={{ height: 1, background: 'rgba(0,0,0,.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Est. Amount Due</span><span style={{ fontWeight: 800, color: 'var(--navy)' }}>₱150.00</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--mid-gray)' }}>Expected Claim</span><span style={{ fontWeight: 600 }}>~Mar 24, 2026</span></div>
              </div>
            </div>
            <div className="info-box warn">
              <span className="info-icon">💳</span>
              <div className="info-text" style={{ fontSize: 11 }}>Payment at Treasury Office after verification. Billing email will be sent to the student.</div>
            </div>
            <button className="btn-primary" style={{ justifyContent: 'center', padding: 11 }} onClick={() => router.push('/staff/dashboard')}>✓ Submit Request</button>
            <button className="btn-outline" style={{ justifyContent: 'center' }} onClick={() => router.push('/staff/dashboard/new/step2')}>← Back</button>
          </div>
        </div>
      </div>
    </>
  );
}
