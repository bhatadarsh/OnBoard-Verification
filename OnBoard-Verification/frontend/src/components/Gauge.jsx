import React from 'react';

const Gauge = ({ value, label, colorClass, strokeColor }) => {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div className="text-center group">
      <div className="relative w-24 h-24 mx-auto transition-transform duration-500 group-hover:scale-105">
        <svg viewBox="0 0 36 36" className="-rotate-90 w-full h-full relative z-10 transition-transform">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <path 
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
            fill="none" 
            stroke={strokeColor || "currentColor"} 
            strokeWidth="3" 
            strokeDasharray={`${percent}, 100`} 
            className={`transition-all duration-1000 ease-out ${colorClass}`}
          />
        </svg>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold z-20 ${colorClass}`}>
          {value}%
        </div>
      </div>
      <div className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-wide">{label}</div>
    </div>
  );
};

export default Gauge;
