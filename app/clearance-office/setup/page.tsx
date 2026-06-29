"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { API_BASE } from '@/lib/lib_api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClearanceOfficeSetupPage() {
  const router = useRouter();
  const [token, setToken]           = useState('');
  const [officeName, setOfficeName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sigFile, setSigFile]       = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const t  = sessionStorage.getItem('co_token') ?? '';
    const on = sessionStorage.getItem('co_office_name') ?? '';
    const dn = sessionStorage.getItem('co_display_name') ?? '';
    if (!t) { router.push('/clearance-office/login'); return; }
    setToken(t);
    setOfficeName(on);
    setDisplayName(dn);
  }, []);

  function handleSigChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSigFile(file);
    setSigPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!displayName.trim()) { setError('Display name is required.'); return; }
    if (!sigFile)            { setError('E-signature is required.'); return; }

    setError('');
    setUploading(true);

    try {
      // Upload signature to Supabase office-signatures bucket
      const ext      = sigFile.name.split('.').pop();
      const fileName = `sig_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('office-signatures')
        .upload(fileName, sigFile, { upsert: true });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage
        .from('office-signatures')
        .getPublicUrl(fileName);

      const signatureUrl = urlData.publicUrl;
      setUploading(false);
      setSaving(true);

      // Save to backend
      const res = await fetch(`${API_BASE}/clearance-office/setup/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ display_name: displayName.trim(), signature_image_url: signatureUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Setup failed.'); return; }

      // Update session
      sessionStorage.setItem('co_display_name', displayName.trim());
      sessionStorage.setItem('co_signature',    signatureUrl);
      sessionStorage.setItem('co_setup',        'true');

      router.push('/clearance-office/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: '1.5px solid #dde3ed', borderRadius: 8,
    fontFamily: "'Montserrat', sans-serif", outline: 'none',
    boxSizing: 'border-box', background: 'white', color: '#001C43',
  };

  return (
    <div style={{ minHeight: '100vh', background: `url('/mmcm-bg.jpeg') center/cover no-repeat fixed`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Single connected card */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
          
          {/* Header section */}
          <div style={{ textAlign: 'center', padding: '28px 28px 20px', borderBottom: '1px solid #eee' }}>
            <img src="/mmcm-logo-with-name.png" alt="MMCM" style={{ height: 52, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: '#001C43', fontFamily: "'Montserrat', sans-serif" }}>
              Clearance Office Portal
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>
              Mapúa Malayan Colleges Mindanao — Registrar's Office
            </div>
          </div>

        <div style={{ padding: 28 }}>

          {/* Info */}
          <div style={{ background: 'rgba(17,75,159,0.06)', border: '1px solid rgba(17,75,159,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#114B9F', marginBottom: 20, lineHeight: 1.6, fontFamily: "'Montserrat', sans-serif" }}>
            Your display name and e-signature will be auto-populated on every clearance you confirm. You only need to do this once.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Display name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 5, fontFamily: "'Montserrat', sans-serif" }}>DISPLAY NAME *</label>
              <input style={inp} placeholder="e.g. Maria Santos" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, fontFamily: "'Montserrat', sans-serif" }}>This name will appear on all clearance records you confirm.</div>
            </div>

            {/* E-signature upload */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#888', display: 'block', marginBottom: 5, fontFamily: "'Montserrat', sans-serif" }}>E-SIGNATURE *</label>
              <div
                onClick={() => document.getElementById('sig-upload')?.click()}
                style={{ border: '2px dashed #dde3ed', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: '#fafbfd', transition: 'border-color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#114B9F')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#dde3ed')}
              >
                {sigPreview ? (
                  <img src={sigPreview} alt="Signature preview" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32, margin: '0 auto 8px' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <div style={{ fontSize: 12, color: '#aaa', fontFamily: "'Montserrat', sans-serif" }}>Click to upload signature image</div>
                    <div style={{ fontSize: 11, color: '#ccc', marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>JPG or PNG recommended</div>
                  </>
                )}
              </div>
              <input id="sig-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSigChange} />
              {sigPreview && (
                <button onClick={() => { setSigFile(null); setSigPreview(''); }} style={{ marginTop: 6, fontSize: 11, color: '#E50019', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                  Remove and re-upload
                </button>
              )}
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '8px 12px', fontFamily: "'Montserrat', sans-serif" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={uploading || saving}
              style={{ width: '100%', padding: 11, background: '#001C43', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: uploading || saving ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat', sans-serif" }}
            >
              {uploading ? 'Uploading signature...' : saving ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
          </div>
          </div>
      </div>
    </div>
  );
}