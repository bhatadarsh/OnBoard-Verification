import React from 'react';
import { useOutletContext } from 'react-router-dom';

const SelectedBanner = () => {
  const { selected, setSelected } = useOutletContext();
  
  if (!selected) return null;
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border-l-4 border-cyan-500/50 p-5 rounded-xl flex justify-between items-center mb-6 shadow-[0_4px_20px_rgba(6,182,212,0.05)] transition-all animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-4 ml-2">
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xl uppercase border border-cyan-500/30">
          {selected.full_name[0]}
        </div>
        <div>
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] mb-0.5">
            Active Profile
          </p>
          <p className="text-lg font-bold text-slate-100">{selected.full_name}</p>
        </div>
      </div>
      <button 
        onClick={() => setSelected(null)}
        className="px-4 py-2 bg-transparent hover:bg-rose-950/30 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 rounded transition-colors flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider shadow-sm cursor-pointer"
      >
        <span>✕</span> Unselect
      </button>
    </div>
  );
};

export default SelectedBanner;
