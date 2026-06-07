"use client";

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/lib_api';

type DocType = {
  document_type_id: number;
  document_name: string;
  academic_level: string;
  processing_days: number;
  description: string | null;
  is_active: boolean;
};

function getToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') ?? '' : '';
}

export default function AdminDocumentsPage() {
  const [docs, setDocs]       = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editModal, setEditModal]   = useState<DocType | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]   = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/document-types/?all=true`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs(data.results ?? data);
    } catch {
      setError('Could not load document types.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDocs(); }, []);

  async function handleSave() {
    if (!editModal) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      const res = await fetch(`${API_BASE}/document-types/${editModal.document_type_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify({
          document_name:   editModal.document_name,
          academic_level:  editModal.academic_level,
          processing_days: editModal.processing_days,
          description:     editModal.description,
          is_active:       editModal.is_active,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditSuccess('Saved successfully!');
      fetchDocs();
      setTimeout(() => { setEditModal(null); setEditSuccess(''); }, 1000);
    } catch {
      setEditError('Failed to save. Please try again.');
    } finally {
      setEditLoading(false);
    }
  }

  async function toggleActive(doc: DocType) {
    try {
      await fetch(`${API_BASE}/document-types/${doc.document_type_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify({ is_active: !doc.is_active }),
      });
      fetchDocs();
    } catch { /* silent */ }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid var(--border-col)', borderRadius: 8, fontFamily: 'var(--drms-font)', background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box' };

  const active   = docs.filter(d => d.is_active);
  const inactive = docs.filter(d => !d.is_active);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Document Types</div>
        <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 2 }}>
          Enable or disable document types and adjust processing times.
          Disabled types won't appear on request forms.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="drms-card" style={{ padding: '14px 20px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#198754' }}>{active.length}</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>Active Types</div>
        </div>
        <div className="drms-card" style={{ padding: '14px 20px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#E50019' }}>{inactive.length}</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>Inactive Types</div>
        </div>
        <div className="drms-card" style={{ padding: '14px 20px', flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#114B9F' }}>{docs.length}</div>
          <div style={{ fontSize: 12, color: 'var(--mid-gray)' }}>Total Types</div>
        </div>
      </div>

      {error && <div className="info-box warn" style={{ marginBottom: 16 }}><span className="info-icon">⚠️</span><div className="info-text">{error}</div></div>}

      <div className="table-wrap">
        <table className="drms-table">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Academic Level</th>
              <th>Processing Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--mid-gray)' }}>Loading...</td></tr>}
            {!loading && docs.map(doc => (
              <tr key={doc.document_type_id} style={{ opacity: doc.is_active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 600 }}>{doc.document_name}</td>
                <td>{doc.academic_level ?? 'All'}</td>
                <td>{doc.processing_days} working days</td>
                <td>
                  <span className={`badge ${doc.is_active ? 'b-done' : 'b-rej'}`}>
                    {doc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-outline btn-sm" onClick={() => { setEditModal({ ...doc }); setEditError(''); setEditSuccess(''); }}>Edit</button>
                    <button
                      className={doc.is_active ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
                      style={{ borderColor: doc.is_active ? '#E50019' : undefined, color: doc.is_active ? '#E50019' : undefined }}
                      onClick={() => toggleActive(doc)}
                    >
                      {doc.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEditModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Edit Document Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document Name</label>
                <input style={inp} value={editModal.document_name} onChange={e => setEditModal({ ...editModal, document_name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Academic Level</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={editModal.academic_level ?? 'All'} onChange={e => setEditModal({ ...editModal, academic_level: e.target.value })}>
                  <option>All</option><option>College</option><option>SHS</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Processing Days</label>
                <input style={inp} type="number" min={1} max={90} value={editModal.processing_days} onChange={e => setEditModal({ ...editModal, processing_days: parseInt(e.target.value) })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' } as React.CSSProperties} value={editModal.description ?? ''} onChange={e => setEditModal({ ...editModal, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={editModal.is_active} onChange={e => setEditModal({ ...editModal, is_active: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#114B9F' }} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Active (visible on request forms)</span>
              </div>
              {editError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}>⚠️ {editError}</div>}
              {editSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600 }}>✅ {editSuccess}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
                <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}