import React from 'react';

const DocumentViewerModal = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(2,8,17,0.85)', backdropFilter: 'blur(12px)' }}
      />

      {/* Modal Frame */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 1024, height: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'rgba(10,22,40,0.95)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 80px rgba(0,229,255,0.08)', overflow: 'hidden', animation: 'enterScale 0.3s cubic-bezier(0.4,0,0.2,1) forwards' }}>

        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,14,26,0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#00e5ff', fontSize: 18 }}>❖</span>
            <div>
              <h3 style={{ color: '#e8f0fe', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.12em' }}>
                Secure Document Viewer
              </h3>
              <p style={{ color: '#475569', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                {file.title || 'File Preview'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid transparent', cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fb7185'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'transparent'; }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, width: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '0 0 18px 18px', overflow: 'hidden' }}>
          <iframe
            src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`}
            title="Secure Document Preview"
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
