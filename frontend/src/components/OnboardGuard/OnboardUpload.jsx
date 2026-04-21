import React, { useState, useEffect } from 'react';
import OBCandidateSearch from './OBCandidateSearch';
import { ONBOARD_API } from '../../config/api';
import './OnboardGuard.css';

/**
 * OnboardUpload — real document upload to OnBoard-Verification backend.
 * Maps doc types to the API's expected field names.
 */
const DOC_TYPES = [
  { key: 'aadhar',        label: 'Aadhar Card',         icon: '🪪' },
  { key: 'pan',           label: 'PAN Card',             icon: '💳' },
  { key: 'marksheet_10th', label: '10th Marksheet',      icon: '🎓' },
  { key: 'marksheet_12th', label: '12th Marksheet',      icon: '🏫' },
  { key: 'resume',        label: 'Resume / CV',          icon: '📄' },
];

const OnboardUpload = () => {
  const [candidates, setCandidates]     = useState([]);
  const [selected, setSelected]         = useState(null);
  const [files, setFiles]               = useState({});
  const [uploading, setUploading]       = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError]               = useState(null);

  // Fetch candidates from OnBoard backend
  useEffect(() => {
    fetch(`${ONBOARD_API}/api/v1/candidates`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setCandidates(d.candidates || []))
      .catch(e => console.warn('Could not fetch OnBoard candidates:', e));
  }, []);

  const handleFileChange = (key, file) => {
    setFiles(prev => ({ ...prev, [key]: file }));
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!selected || Object.keys(files).length === 0) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      DOC_TYPES.forEach(doc => {
        if (files[doc.key]) formData.append(doc.key, files[doc.key]);
      });

      const res = await fetch(`${ONBOARD_API}/api/v1/documents/${selected.id}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed (${res.status})`);
      }

      const result = await res.json();
      setUploadResult(result);
      setFiles({});
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="onboard-container">
      <div className="view-title">
        <h1>Document Uploads</h1>
        <p>Attach verification documents for candidates. Files are encrypted before storage.</p>
      </div>

      <div style={{ position: 'relative', zIndex: 1000 }}>
        <OBCandidateSearch
          candidates={candidates}
          onSelect={c => { setSelected(c); setUploadResult(null); setFiles({}); setError(null); }}
          selectedId={selected?.id}
          placeholder="Search candidate by name or email..."
        />
      </div>

      {!selected ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '16px', border: '1.5px dashed #e2e8f0', marginTop: '20px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>👤</span>
          <p>Select a candidate to begin document upload.</p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }} className="animate-in fade-in">
          {/* Selected candidate banner */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="admin-avatar" style={{ background: '#3b82f6' }}>
              {(selected.full_name || selected.first_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1e40af' }}>{selected.full_name || `${selected.first_name} ${selected.last_name}`}</div>
              <div style={{ fontSize: '12px', color: '#3b82f6' }}>{selected.email} · ID: {selected.id}</div>
            </div>
          </div>

          {/* Success result */}
          {uploadResult && (
            <div style={{ marginBottom: 20, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1.5px solid #bbf7d0', color: '#15803d' }}>
              ✅ Uploaded successfully: <strong>{(uploadResult.uploaded || []).join(', ')}</strong>
              {uploadResult.tamper_warning && (
                <div style={{ marginTop: 8, color: '#d97706' }}>⚠️ Tamper risk detected in one or more documents.</div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 20, padding: 16, background: '#fef2f2', borderRadius: 12, border: '1.5px solid #fecaca', color: '#dc2626' }}>
              ❌ {error}
            </div>
          )}

          {/* Document upload grid */}
          <div className="ob-upload-grid">
            {DOC_TYPES.map(doc => (
              <div
                key={doc.key}
                className="ob-upload-card"
                onClick={() => document.getElementById(`upload-${doc.key}`).click()}
              >
                <input
                  type="file"
                  id={`upload-${doc.key}`}
                  hidden
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => handleFileChange(doc.key, e.target.files[0])}
                />
                <span className="ob-upload-icon">{doc.icon}</span>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{doc.label}</div>
                <div style={{ fontSize: '12px', color: files[doc.key] ? '#16a34a' : '#94a3b8' }}>
                  {files[doc.key]
                    ? `✓ ${files[doc.key].name.length > 18 ? files[doc.key].name.substring(0, 18) + '…' : files[doc.key].name}`
                    : 'Click to select'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            <button
              className="topbar-btn"
              style={{ flex: 1, height: '48px', justifyContent: 'center', opacity: (uploading || Object.keys(files).length === 0) ? 0.6 : 1 }}
              disabled={uploading || Object.keys(files).length === 0}
              onClick={handleUpload}
            >
              {uploading ? '🔒 Encrypting & Uploading...' : `🔒 Securely Upload ${Object.keys(files).length > 0 ? `(${Object.keys(files).length} file${Object.keys(files).length > 1 ? 's' : ''})` : 'Documents'}`}
            </button>
            <button
              className="tbl-btn"
              style={{ width: '120px' }}
              onClick={() => { setFiles({}); setSelected(null); setUploadResult(null); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardUpload;
