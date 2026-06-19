"use client";

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/lib_api';

type DocType = {
  document_type_id: number;
  document_name: string;
  doc_code: string | null;
  academic_level: string;
  processing_days: number;
  description: string | null;
  is_active: boolean;
};

type CreateForm = {
  document_name: string;
  doc_code: string;
  academic_level: string;
  processing_days: number;
  description: string;
  is_active: boolean;
};

const BLANK_FORM: CreateForm = {
  document_name: '',
  doc_code: '',
  academic_level: 'All',
  processing_days: 7,
  description: '',
  is_active: true,
};

function getToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') ?? '' : '';
}

export default function StaffDocumentTypesPage() {
  const [docs, setDocs]       = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editModal, setEditModal]     = useState<DocType | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [deleteModal, setDeleteModal]     = useState<DocType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createModal, setCreateModal]     = useState(false);
  const [createForm, setCreateForm]       = useState<CreateForm>(BLANK_FORM);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

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

  // ── Edit save ─────────────────────────────────────────────────────────────
  async function handleEditSave() {
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
          doc_code:        editModal.doc_code?.trim().toUpperCase() || null,
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

  // ── Toggle active ─────────────────────────────────────────────────────────
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

  // ── Create new ────────────────────────────────────────────────────────────
  async function handleCreate() {
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    if (!createForm.document_name.trim()) {
      setCreateError('Document name is required.');
      setCreateLoading(false);
      return;
    }
    if (createForm.processing_days < 1 || createForm.processing_days > 90) {
      setCreateError('Processing days must be between 1 and 90.');
      setCreateLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/document-types/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getToken()}` },
        body: JSON.stringify({
          document_name:   createForm.document_name.trim(),
          doc_code:        createForm.doc_code.trim().toUpperCase() || null,
          academic_level:  createForm.academic_level === 'All' ? null : createForm.academic_level,
          processing_days: createForm.processing_days,
          description:     createForm.description.trim() || null,
          is_active:       createForm.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Surface Django field errors if present
        const msg = data?.document_name?.[0] ?? data?.detail ?? 'Failed to create document type.';
        throw new Error(msg);
      }
      setCreateSuccess('Document type created!');
      fetchDocs();
      setTimeout(() => {
        setCreateModal(false);
        setCreateForm(BLANK_FORM);
        setCreateSuccess('');
      }, 1000);
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API_BASE}/document-types/${deleteModal.document_type_id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${getToken()}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchDocs();
      setDeleteModal(null);
    } catch {
      setDeleteError('Failed to delete. This document type may be in use by existing requests.');
    } finally {
      setDeleteLoading(false);
    }
  }

  function openCreate() {
    setCreateForm(BLANK_FORM);
    setCreateError('');
    setCreateSuccess('');
    setCreateModal(true);
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid var(--border-col)', borderRadius: 8,
    fontFamily: 'var(--drms-font)', background: 'var(--surface)',
    color: 'var(--text-primary)', boxSizing: 'border-box',
  };

  const active   = docs.filter(d => d.is_active);
  const inactive = docs.filter(d => !d.is_active);

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Document Types</div>
          <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginTop: 2 }}>
            Manage available document types, processing times, and visibility on request forms.
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Document Type</button>
      </div>

      {/* Stats */}
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

      {error && (
        <div className="info-box warn" style={{ marginBottom: 16 }}>
          <span className="info-icon"></span>
          <div className="info-text">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="drms-table">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Code</th>
              <th>Level</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--mid-gray)' }}>Loading...</td></tr>
            )}
            {!loading && docs.map(doc => (
              <tr key={doc.document_type_id} style={{ opacity: doc.is_active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 600 }}>{doc.document_name}</td>
                      <td><span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(17,75,159,0.08)', color: '#114B9F', padding: '2px 8px', borderRadius: 4 }}>{doc.doc_code ?? '—'}</span></td>
                <td>{doc.academic_level ?? 'All'}</td>
                <td>{doc.processing_days} working days</td>
                <td>
                  <span className={`badge ${doc.is_active ? 'b-done' : 'b-rej'}`}>
                    {doc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className="btn-outline btn-sm"
                            onClick={() => { setEditModal({ ...doc }); setEditError(''); setEditSuccess(''); }}
                        >
                            Edit
                        </button>
                        <button
                            className="btn-outline btn-sm"
                            style={{
                            borderColor: doc.is_active ? '#E50019' : undefined,
                            color: doc.is_active ? '#E50019' : undefined,
                            }}
                            onClick={() => toggleActive(doc)}
                        >
                            {doc.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                            className="btn-outline btn-sm"
                            style={{ fontSize: 11, color: '#E50019', borderColor: '#E50019' }}
                            onClick={() => { setDeleteModal(doc); setDeleteError(''); }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            Delete
                        </button>
                    </div>
                </td>
              </tr>
            ))}
            {!loading && docs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--mid-gray)' }}>No document types found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create Modal ── */}
      {createModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setCreateModal(false)}
        >
          <div
            style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Add Document Type</div>
            <div style={{ fontSize: 12, color: 'var(--mid-gray)', marginBottom: 20 }}>
              New types appear immediately on request submission forms once active.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>
                  Document Name *
                </label>
                <input
                  style={inp}
                  placeholder="e.g. Certificate of Latin Honor"
                  value={createForm.document_name}
                  onChange={e => setCreateForm({ ...createForm, document_name: e.target.value })}
                />
              </div>

                <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>
                  Document Code <span style={{ fontWeight: 400, color: '#B1B1B1' }}>(used in Request ID, e.g. TOR, COE, Dip)</span>
                </label>
                <input
                  style={inp}
                  placeholder="e.g. CLH"
                  value={createForm.doc_code}
                  onChange={e => setCreateForm({ ...createForm, doc_code: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>
                  Academic Level
                </label>
                <select
                  style={{ ...inp, cursor: 'pointer' }}
                  value={createForm.academic_level}
                  onChange={e => setCreateForm({ ...createForm, academic_level: e.target.value })}
                >
                  <option value="All">All</option>
                  <option value="College">College</option>
                  <option value="SHS">SHS</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>
                  Processing Days *
                </label>
                <input
                  style={inp}
                  type="number"
                  min={1}
                  max={90}
                  value={createForm.processing_days}
                  onChange={e => setCreateForm({ ...createForm, processing_days: parseInt(e.target.value) || 7 })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' } as React.CSSProperties}
                  placeholder="Optional description or notes"
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={e => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#114B9F' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  Active — visible on request forms immediately
                </span>
              </div>

              {createError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{createError}</div>}
              {createSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>{createSuccess}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleCreate}
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Document Type'}
                </button>
                <button
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E50019', marginBottom: 8 }}>Delete Document Type</div>
            <div style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>{deleteModal.document_name}</strong>?
            </div>
            <div style={{ background: 'rgba(229,0,25,0.06)', border: '1px solid rgba(229,0,25,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#E50019', marginBottom: 20, lineHeight: 1.6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              This cannot be undone. If existing requests reference this document type, deletion may fail to protect data integrity.
            </div>
            {deleteError && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600, marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ flex: 1, padding: 10, background: '#E50019', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--drms-font)' }}
                disabled={deleteLoading}
                onClick={handleDelete}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditModal(null)}
        >
          <div
            style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Edit Document Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Document Name</label>
                <input
                  style={inp}
                  value={editModal.document_name}
                  onChange={e => setEditModal({ ...editModal, document_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>
                  Document Code <span style={{ fontWeight: 400, color: '#B1B1B1' }}>(used in Request ID)</span>
                </label>
                <input
                  style={inp}
                  placeholder="e.g. CLH"
                  value={editModal.doc_code ?? ''}
                  onChange={e => setEditModal({ ...editModal, doc_code: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Academic Level</label>
                <select
                  style={{ ...inp, cursor: 'pointer' }}
                  value={editModal.academic_level ?? 'All'}
                  onChange={e => setEditModal({ ...editModal, academic_level: e.target.value })}
                >
                  <option>All</option><option>College</option><option>SHS</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Processing Days</label>
                <input
                  style={inp}
                  type="number"
                  min={1}
                  max={90}
                  value={editModal.processing_days}
                  onChange={e => setEditModal({ ...editModal, processing_days: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid-gray)', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea
                  style={{ ...inp, minHeight: 80, resize: 'vertical' } as React.CSSProperties}
                  value={editModal.description ?? ''}
                  onChange={e => setEditModal({ ...editModal, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={editModal.is_active}
                  onChange={e => setEditModal({ ...editModal, is_active: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#114B9F' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Active (visible on request forms)</span>
              </div>
              {editError   && <div style={{ fontSize: 12, color: '#E50019', fontWeight: 600 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{editError}</div>}
              {editSuccess && <div style={{ fontSize: 12, color: '#198754', fontWeight: 600 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: "inline-block", verticalAlign: "middle", marginRight: 4, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>{editSuccess}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleEditSave}
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setEditModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
