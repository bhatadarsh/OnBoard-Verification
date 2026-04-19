import React, { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const DOC_TYPES = [
  { key: 'resume',        label: 'Resume',            icon: '📄', accent: '#818cf8', accept: '.pdf,.docx,.txt',           hint: 'PDF / DOCX / TXT' },
  { key: 'aadhar',        label: 'Aadhar Card',       icon: '🪪', accent: '#00e5ff', accept: '.png,.jpg,.jpeg,.pdf',       hint: 'Image or PDF' },
  { key: 'pan',           label: 'PAN Card',          icon: '💳', accent: '#f59e0b', accept: '.png,.jpg,.jpeg,.pdf',       hint: 'Image or PDF' },
  { key: 'marksheet_10th',label: '10th Marksheet',    icon: '🎓', accent: '#10b981', accept: '.png,.jpg,.jpeg,.pdf',       hint: 'High School Result' },
  { key: 'marksheet_12th',label: '12th Marksheet',    icon: '🎓', accent: '#10b981', accept: '.png,.jpg,.jpeg,.pdf',       hint: 'Intermediate Result' },
  { key: 'hr_transcript', label: 'HR Interview File', icon: '🎤', accent: '#8b5cf6', accept: '.txt,.mp3,.wav,.m4a',        hint: 'Audio or Transcript' },
  { key: 'i9_form',       label: 'I-9 Form',          icon: '📝', accent: '#f43f5e', accept: '.png,.jpg,.jpeg,.pdf',       hint: 'Signed Onboarding Form' },
];

function DocCard({ doc, file, onSelect, onClear }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  return (
    <div
      style={{
        background: file ? `${doc.accent}09` : 'rgba(10,22,40,0.8)',
        border: `1px solid ${file ? doc.accent + '35' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16, padding: '20px', backdropFilter: 'blur(16px)',
        transition: 'all 0.25s', position: 'relative',
      }}
      onMouseEnter={e => { if (!file) e.currentTarget.style.borderColor = `${doc.accent}25`; }}
      onMouseLeave={e => { if (!file) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
    >
      {file && (
        <button
          onClick={() => onClear(doc.key)}
          style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700 }}
        >✕</button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: file ? `${doc.accent}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${file ? doc.accent + '30' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {doc.icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{doc.label}</div>
          <div style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{doc.hint}</div>
        </div>
      </div>

      <input ref={inputRef} type="file" id={doc.key} accept={doc.accept} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onSelect(doc.key, f); }} />

      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${doc.accent}10`, border: `1px solid ${doc.accent}25`, borderRadius: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: doc.accent, boxShadow: `0 0 5px ${doc.accent}` }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: doc.accent, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          <span style={{ fontSize: 10, color: '#334155' }}>{(file.size / 1024).toFixed(0)}K</span>
        </div>
      ) : (
        <label htmlFor={doc.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', color: '#475569', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${doc.accent}40`; e.currentTarget.style.color = doc.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#475569'; }}
        >
          <span style={{ fontSize: 14 }}>+</span> Select File
        </label>
      )}
    </div>
  );
}

export default function UploadDocs() {
  const { candidates, selected, load, docFiles, setDocFiles, loading, uploadDocs, extractLogs, setPreviewFile } = useOutletContext();
  const [search, setSearch] = useState('');

  const uploadedCount = Object.values(docFiles).filter(Boolean).length;
  const isExtracting  = loading && extractLogs.length > 0;

  const filtered = candidates.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#10b981', letterSpacing: '0.2em', marginBottom: 8 }}>// STEP 2 OF 3</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>Upload Documents</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 5 }}>Upload identity & education proofs. Extraction builds the Knowledge Base automatically.</p>
      </div>

      {/* Candidate Selector */}
      {!selected ? (
        <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '28px', backdropFilter: 'blur(16px)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Select a candidate to upload documents</span>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 200, padding: '8px 12px 8px 30px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, color: '#e8f0fe', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {filtered.slice(0, 12).map(c => (
              <button key={c.id} onClick={() => load(c.id)}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.color = '#00e5ff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#94a3b8'; }}
              >{c.full_name}</button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Selected Candidate Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 13, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                {selected.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>{selected.full_name}</div>
                <div style={{ fontSize: 10, color: '#10b981', fontFamily: "'JetBrains Mono',monospace" }}>SELECTED — {uploadedCount} file{uploadedCount !== 1 ? 's' : ''} queued</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span style={{ fontSize: 10, color: '#10b981', fontFamily: "'JetBrains Mono',monospace" }}>
                {selected.has_knowledge_base ? 'KB INDEXED' : 'AWAITING EXTRACTION'}
              </span>
            </div>
          </div>

          {/* Encryption Note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, marginBottom: 22 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>All files are <strong style={{ color: '#818cf8' }}>AES-256 encrypted</strong> locally before writing to disk. Zero plaintext persisted.</span>
          </div>

          {/* Previously Uploaded Documents */}
          {selected.uploaded_documents?.length > 0 && (
            <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#00e5ff', letterSpacing: '0.15em', marginBottom: 14 }}>
                UPLOADED DOCUMENTS ({selected.uploaded_documents.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selected.uploaded_documents.map(docName => {
                  const docInfo = DOC_TYPES.find(d => d.key === docName);
                  const isTampered = selected.forensic_alerts?.some(a => a.toUpperCase().includes(docName.toUpperCase()));
                  return (
                    <button
                      key={docName}
                      onClick={() => setPreviewFile({ url: `${API_BASE}/api/v1/documents/${selected.id}/${docName}/redacted`, title: docInfo?.label || docName })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                        background: isTampered ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isTampered ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 9, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = (docInfo?.accent || '#00e5ff') + '50'; e.currentTarget.style.background = (docInfo?.accent || '#00e5ff') + '10'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = isTampered ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = isTampered ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.03)'; }}
                    >
                      <span style={{ fontSize: 14 }}>{docInfo?.icon || '📄'}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#e8f0fe' }}>{docInfo?.label || docName}</span>
                      {isTampered && <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 4, color: '#f43f5e', fontWeight: 700 }}>TAMPER</span>}
                      <span style={{ fontSize: 10, color: '#475569' }}>👁</span>
                    </button>
                  );
                })}
              </div>
              {selected.forensic_alerts?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {selected.forensic_alerts.map((alert, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#f43f5e', padding: '6px 10px', background: 'rgba(244,63,94,0.06)', borderRadius: 6, marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                      ⚠ {alert}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Document Grid */}
          <div className="enter-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14, marginBottom: 24 }}>
            {DOC_TYPES.map(doc => (
              <DocCard
                key={doc.key} doc={doc}
                file={docFiles[doc.key] || null}
                onSelect={(k, f) => setDocFiles(prev => ({ ...prev, [k]: f }))}
                onClear={(k) => setDocFiles(prev => { const n = { ...prev }; delete n[k]; return n; })}
              />
            ))}
          </div>

          {/* Extraction Log (auto-triggered) */}
          {extractLogs.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 14, padding: '18px 20px', marginBottom: 20, fontFamily: "'JetBrains Mono',monospace" }}>
              <div style={{ fontSize: 10, color: '#00e5ff', letterSpacing: '0.15em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', animation: 'pulse 1s infinite' }} />
                EXTRACTION ENGINE — LIVE LOG
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {extractLogs.map((log, i) => (
                  <div key={i} style={{ fontSize: 11, color: i === extractLogs.length - 1 ? '#e8f0fe' : '#475569', lineHeight: 1.5 }}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={uploadDocs}
              disabled={loading || uploadedCount === 0}
              style={{
                flex: 1, padding: '15px', borderRadius: 13, border: 'none',
                background: (loading || uploadedCount === 0) ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#00e5ff,#0ea5e9)',
                color: (loading || uploadedCount === 0) ? '#334155' : '#020811',
                fontSize: 14, fontWeight: 800, cursor: (loading || uploadedCount === 0) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || uploadedCount === 0) ? 'none' : '0 12px 32px rgba(0,229,255,0.25)',
                transition: 'all 0.3s', fontFamily: "'Outfit',sans-serif",
              }}
            >
              {isExtracting ? '⚡ Building Knowledge Base...' : loading ? '🔒 Encrypting & Uploading...' : `Upload & Extract (${uploadedCount} file${uploadedCount !== 1 ? 's' : ''})`}
            </button>
            <button
              onClick={() => setDocFiles({})}
              style={{ padding: '15px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(244,63,94,0.3)'; e.currentTarget.style.color = '#f43f5e'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#475569'; }}
            >Clear</button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
