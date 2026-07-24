"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { API_BASE } from '@/lib/lib_api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClearanceOfficeProfilePage() {
  const router = useRouter();

  const [token, setToken]           = useState('');
  const [officeName, setOfficeName] = useState('');
  const [role, setRole]             = useState('');

  const [isDark, setIsDark] = useState(false);

  // Profile fields
  const [displayName, setDisplayName]   = useState('');
  const [email, setEmail]               = useState('');
  const [sigUrl, setSigUrl]             = useState('');

  // Edit states
  const [editName, setEditName]         = useState('');
  const [editingName, setEditingName]   = useState(false);
  const [savingName, setSavingName]     = useState(false);
  const [nameError, setNameError]       = useState('');
  const [nameSuccess, setNameSuccess]   = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [editEmail, setEditEmail]       = useState('');
  const [savingEmail, setSavingEmail]   = useState(false);
  const [emailError, setEmailError]     = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password reset
  const [showPwForm, setShowPwForm]     = useState(false);
  const [oldPw, setOldPw]               = useState('');
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwError, setPwError]           = useState('');
  const [pwSuccess, setPwSuccess]       = useState('');

  // Signature
  const [sigFile, setSigFile]           = useState<File | null>(null);
  const [sigPreview, setSigPreview]     = useState('');
  const [uploadingSig, setUploadingSig] = useState(false);
  const [sigError, setSigError]         = useState('');
  const [sigSuccess, setSigSuccess]     = useState('');

  useEffect(() => {
    const t  = sessionStorage.getItem('co_token') ?? '';
    const on = sessionStorage.getItem('co_office_name') ?? '';
    const dn = sessionStorage.getItem('co_display_name') ?? '';
    const r  = sessionStorage.getItem('co_role') ?? '';
    const sig = sessionStorage.getItem('co_signature') ?? '';
    const em = sessionStorage.getItem('co_email') ?? '';
    const savedTheme = sessionStorage.getItem('co_theme') ?? 'light';

    if (!t) { router.push('/clearance-office/login'); return; }

    setToken(t);
    setOfficeName(on);
    setDisplayName(dn);
    setEditName(dn);
    setRole(r);
    setSigUrl(sig);
    setEmail(em);
    setIsDark(savedTheme === 'dark');

    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  function toggleDark() {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', next);
    sessionStorage.setItem('co_theme', next);
  }

  async function handleSaveName() {
    if (!editName.trim()) { setNameError('Display name is required.'); return; }
    setSavingName(true);
    setNameError('');
    setNameSuccess('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office/profile/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ display_name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setNameError(data.error ?? 'Failed to save.'); return; }
      setDisplayName(editName.trim());
      sessionStorage.setItem('co_display_name', editName.trim());
      setEditingName(false);
      setNameSuccess('Display name updated.');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch { setNameError('Could not connect to server.'); }
    finally { setSavingName(false); }
  }

  async function handleChangePassword() {
    if (!oldPw || !newPw || !confirmPw) { setPwError('All fields are required.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    setPwError('');
    setPwSuccess('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office/change-password/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? 'Failed to change password.'); return; }
      setPwSuccess('Password changed successfully.');
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setShowPwForm(false);
      setTimeout(() => setPwSuccess(''), 3000);
    } catch { setPwError('Could not connect to server.'); }
    finally { setPwLoading(false); }
  }

  function handleSigChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSigFile(file);
    setSigPreview(URL.createObjectURL(file));
    setSigError('');
    setSigSuccess('');
  }

  async function handleUploadSig() {
    if (!sigFile) { setSigError('Please select a signature image.'); return; }
    setUploadingSig(true);
    setSigError('');
    setSigSuccess('');
    try {
      const ext      = sigFile.name.split('.').pop();
      const fileName = `sig_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('office-signatures')
        .upload(fileName, sigFile, { upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage
        .from('office-signatures')
        .getPublicUrl(fileName);

      const newSigUrl = urlData.publicUrl;

      const res = await fetch(`${API_BASE}/clearance-office/profile/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ signature_image_url: newSigUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setSigError(data.error ?? 'Failed to save signature.'); return; }

      setSigUrl(newSigUrl);
      sessionStorage.setItem('co_signature', newSigUrl);
      setSigFile(null);
      setSigPreview('');
      setSigSuccess('E-signature updated successfully.');
      setTimeout(() => setSigSuccess(''), 3000);
    } catch (e: any) {
      setSigError(e.message ?? 'Upload failed.');
    } finally {
      setUploadingSig(false);
    }
  }

  async function handleSaveEmail() {
    if (!editEmail.trim()) { setEmailError('Email is required.'); return; }
    setSavingEmail(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      const res = await fetch(`${API_BASE}/clearance-office/change-email/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ email: editEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error ?? 'Failed to save.'); return; }
      setEmail(editEmail.trim());
      sessionStorage.setItem('co_email', editEmail.trim());
      setEditingEmail(false);
      setEmailSuccess('Email updated.');
      setTimeout(() => setEmailSuccess(''), 3000);
    } catch { setEmailError('Could not connect to server.'); }
    finally { setSavingEmail(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: '1.5px solid var(--border-col)', borderRadius: 8,
    fontFamily: "'Montserrat', sans-serif", outline: 'none',
    boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--text-primary)',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Montserrat', sans-serif" }}>

      {/* Top nav */}
      <div style={{ background: '#001C43', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/mmcm-logo.png" alt="MMCM" style={{ height: 32 }} />
          <div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{officeName}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Clearance Office Portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/clearance-office/dashboard')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={toggleDark}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle dark mode"
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>My Profile</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 28 }}>{officeName} — {role}</div>

        {/* Display Name */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Display Name</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 12 }}>
            This name appears on all clearance records you confirm.
          </div>
          {editingName ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inp} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your display name" autoFocus />
              {nameError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{nameError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveName} disabled={savingName} style={{ flex: 1, padding: '9px', background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                  {savingName ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditingName(false); setEditName(displayName); setNameError(''); }} style={{ flex: 1, padding: '9px', background: 'none', border: '1.5px solid var(--border-col)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", color: 'var(--text-primary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName || '—'}</div>
              <button onClick={() => setEditingName(true)} style={{ fontSize: 12, fontWeight: 600, color: '#114B9F', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>Edit</button>
            </div>
          )}
          {nameSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600, marginTop: 8 }}>✓ {nameSuccess}</div>}
        </div>

        {/* Email */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Email</div>
          {editingEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inp} type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Your email address" autoFocus />
              {emailError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{emailError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveEmail} disabled={savingEmail} style={{ flex: 1, padding: '9px', background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                  {savingEmail ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditingEmail(false); setEditEmail(email); setEmailError(''); }} style={{ flex: 1, padding: '9px', background: 'none', border: '1.5px solid var(--border-col)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", color: 'var(--text-primary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{email || '—'}</div>
              <button onClick={() => { setEditingEmail(true); setEditEmail(email); }} style={{ fontSize: 12, fontWeight: 600, color: '#114B9F', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>Edit</button>
            </div>
          )}
          {emailSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600, marginTop: 8 }}>✓ {emailSuccess}</div>}
        </div>

        {/* E-Signature */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>E-Signature</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 16 }}>Your e-signature is auto-populated when you confirm clearances.</div>

          {/* Current signature */}
          {sigUrl && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Current Signature</div>
              <img src={sigUrl} alt="Current signature" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', border: '1px solid var(--border-col)', borderRadius: 4, padding: 4, background: 'white' }} />
            </div>
          )}

          {/* Upload new */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mid-gray)', marginBottom: 8 }}>
            {sigUrl ? 'Replace Signature' : 'Upload Signature'}
          </div>
          <div
            onClick={() => document.getElementById('sig-upload-profile')?.click()}
            style={{ border: '2px dashed var(--border-col)', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)', marginBottom: 12 }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#114B9F')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-col)')}
          >
            {sigPreview ? (
              <img src={sigPreview} alt="New signature preview" style={{ maxHeight: 70, maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, margin: '0 auto 8px' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>Click to select a signature image</div>
                <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>JPG or PNG recommended</div>
              </>
            )}
          </div>
          <input id="sig-upload-profile" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSigChange} />

          {sigPreview && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={handleUploadSig} disabled={uploadingSig} style={{ flex: 1, padding: '9px', background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                {uploadingSig ? 'Uploading...' : 'Save New Signature'}
              </button>
              <button onClick={() => { setSigFile(null); setSigPreview(''); }} style={{ flex: 1, padding: '9px', background: 'none', border: '1.5px solid var(--border-col)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", color: 'var(--text-primary)' }}>
                Cancel
              </button>
            </div>
          )}
          {sigError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{sigError}</div>}
          {sigSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600 }}>✓ {sigSuccess}</div>}
        </div>

        {/* Change Password */}
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPwForm ? 16 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Password</div>
            <button onClick={() => { setShowPwForm(!showPwForm); setPwError(''); setPwSuccess(''); setOldPw(''); setNewPw(''); setConfirmPw(''); }} style={{ fontSize: 12, fontWeight: 600, color: '#114B9F', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
              {showPwForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>
          {showPwForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>CURRENT PASSWORD</label>
                <input style={inp} type="password" value={oldPw} onChange={e => { setOldPw(e.target.value); setPwError(''); }} placeholder="Enter current password" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>NEW PASSWORD</label>
                <input style={inp} type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(''); }} placeholder="At least 8 characters" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>CONFIRM NEW PASSWORD</label>
                <input style={inp} type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(''); }} placeholder="Repeat new password" />
              </div>
              {pwError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>{pwError}</div>}
              {pwSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600 }}>✓ {pwSuccess}</div>}
              <button onClick={handleChangePassword} disabled={pwLoading} style={{ padding: '10px', background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}