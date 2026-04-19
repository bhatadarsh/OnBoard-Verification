import React from 'react';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,17,0.85)', backdropFilter: 'blur(12px)' }}>
      <div style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 440, borderRadius: 18, boxShadow: '0 25px 60px rgba(0,0,0,0.6)', padding: 28, position: 'relative', overflow: 'hidden', animation: 'enterScale 0.25s cubic-bezier(0.4,0,0.2,1) forwards' }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: 'linear-gradient(to right, transparent, #00e5ff, transparent)', opacity: 0.4 }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e8f0fe', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, letterSpacing: '-0.5px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.25)', fontSize: 13 }}>⚠</span>
          {title}
        </h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 28, marginTop: 16, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', background: 'transparent', color: '#94a3b8', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >Cancel</button>
          <button onClick={onConfirm} style={{ padding: '10px 20px', background: 'rgba(225,29,72,0.2)', color: '#fb7185', borderRadius: 10, border: '1px solid rgba(225,29,72,0.35)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Outfit',sans-serif", boxShadow: '0 0 20px rgba(225,29,72,0.15)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.35)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(225,29,72,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(225,29,72,0.15)'; }}
          >Yes, Erase Data</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
