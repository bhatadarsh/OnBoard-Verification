import React from 'react';

const Gauge = ({ value, label, strokeColor }) => {
  const percent = Math.min(100, Math.max(0, value));
  const color = strokeColor || '#00e5ff';

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto', transition: 'transform 0.4s' }}>
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${percent}, 100`}
            style={{ transition: 'stroke-dasharray 1s ease-out', filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 18, fontWeight: 800, color, textShadow: `0 0 10px ${color}40` }}>
          {value}%
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  );
};

export default Gauge;
