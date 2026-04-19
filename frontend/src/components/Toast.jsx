import React, { useEffect, useState } from 'react';

const colorMap = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(52,211,153,0.4)', text: '#6ee7b7' },
  error:   { bg: 'rgba(244,63,94,0.15)', border: 'rgba(251,113,133,0.4)', text: '#fda4af' },
  info:    { bg: 'rgba(59,130,246,0.15)', border: 'rgba(96,165,250,0.4)', text: '#93c5fd' },
};

const Toast = ({ msg, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const c = colorMap[type] || colorMap.info;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 50,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      padding: '14px 20px 16px', borderRadius: 14, backdropFilter: 'blur(16px)',
      boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${type === 'success' ? 'rgba(16,185,129,0.1)' : type === 'error' ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)'}`,
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: "'Outfit',sans-serif",
      transform: visible ? 'translateY(0)' : 'translateY(-20px)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s ease-out',
      overflow: 'hidden',
      minWidth: 280,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.text}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{icon}</span>
      </div>
      <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.text, opacity: 0.4, cursor: 'pointer', fontSize: 14, padding: '2px 4px', transition: 'opacity 0.2s', lineHeight: 1 }}
        onMouseEnter={e => e.target.style.opacity = '1'}
        onMouseLeave={e => e.target.style.opacity = '0.4'}
      >✕</button>
      {/* Countdown progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 }}>
        <div style={{ height: '100%', background: c.text, opacity: 0.3, transformOrigin: 'left', animation: 'toastCountdown 3.5s linear forwards' }} />
      </div>
    </div>
  );
};

export default Toast;
