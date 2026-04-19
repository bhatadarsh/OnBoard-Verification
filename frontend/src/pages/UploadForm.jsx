import React, { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function UploadForm() {
  const { formFile, setFormFile, uploadForm, loading } = useOutletContext();
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setFormFile(file);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#10b981', letterSpacing: '0.2em', marginBottom: 8 }}>// STEP 1 OF 3</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>Upload Candidate CSV</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>Import your HR onboarding sheet. The system will auto-map all columns.</p>
      </div>

      {/* Info Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 16, marginTop: 1 }}>ℹ️</span>
        <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          Accepted formats: <strong style={{ color: '#818cf8' }}>.csv</strong>, <strong style={{ color: '#818cf8' }}>.xlsx</strong>, <strong style={{ color: '#818cf8' }}>.xls</strong>. Column headers are auto-normalized — no template required.
        </p>
      </div>

      {/* Drop Zone */}
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" style={{ display: 'none' }} onChange={e => setFormFile(e.target.files?.[0])} />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#00e5ff' : formFile ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 18,
          padding: formFile ? '40px' : '60px 40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(0,229,255,0.04)' : formFile ? 'rgba(16,185,129,0.04)' : 'rgba(10,22,40,0.6)',
          backdropFilter: 'blur(16px)',
          transition: 'all 0.3s',
          marginBottom: 20,
        }}
      >
        {formFile ? (
          <div>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>📄</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{formFile.name}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{(formFile.size / 1024).toFixed(1)} KB — Ready to upload</div>
            <button
              onClick={e => { e.stopPropagation(); setFormFile(null); }}
              style={{ marginTop: 14, padding: '6px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, color: '#f43f5e', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px', transition: 'all 0.3s' }}>⬆️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8f0fe', marginBottom: 6 }}>Drop your CSV here</div>
            <div style={{ fontSize: 12, color: '#475569' }}>or click to browse files</div>
            <div style={{ marginTop: 12, fontSize: 10, color: '#1e293b', fontFamily: "'JetBrains Mono',monospace" }}>Supports .csv, .xlsx, .xls</div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={uploadForm}
        disabled={loading || !formFile}
        style={{
          width: '100%',
          padding: '15px',
          borderRadius: 13,
          border: 'none',
          background: (!formFile || loading) ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#10b981,#059669)',
          color: (!formFile || loading) ? '#334155' : '#fff',
          fontSize: 14,
          fontWeight: 800,
          cursor: (!formFile || loading) ? 'not-allowed' : 'pointer',
          boxShadow: (!formFile || loading) ? 'none' : '0 12px 32px rgba(16,185,129,0.3)',
          transition: 'all 0.3s',
          fontFamily: "'Outfit',sans-serif",
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { if (formFile && !loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 18px 40px rgba(16,185,129,0.4)'; }}}
        onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = (!formFile || loading) ? 'none' : '0 12px 32px rgba(16,185,129,0.3)'; }}
      >
        {loading ? '⏳ Processing Candidates...' : 'Import Candidates →'}
      </button>
    </div>
  );
}
