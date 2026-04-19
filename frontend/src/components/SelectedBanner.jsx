import React from 'react';
import { useOutletContext } from 'react-router-dom';

const SelectedBanner = () => {
  const { selected, setSelected } = useOutletContext();

  if (!selected) return null;
  return (
    <div style={{ background: 'rgba(10,22,40,0.8)', backdropFilter: 'blur(12px)', borderLeft: '3px solid rgba(0,229,255,0.4)', padding: '14px 20px', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(0,229,255,0.1)', color: '#00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, textTransform: 'uppercase', border: '1px solid rgba(0,229,255,0.25)' }}>
          {selected.full_name[0]}
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 2 }}>Active Profile</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#e8f0fe' }}>{selected.full_name}</p>
        </div>
      </div>
      <button
        onClick={() => setSelected(null)}
        style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.25)'; e.currentTarget.style.color = '#fb7185'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; }}
      >
        <span>✕</span> Unselect
      </button>
    </div>
  );
};

export default SelectedBanner;
