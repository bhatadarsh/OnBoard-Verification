import React from 'react';

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg shadow-2xl p-6 transform transition-all animate-in zoom-in-95 relative overflow-hidden">
        {/* Decorative Sci-Fi Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3 mb-2 tracking-wide">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm">⚠</span> 
          {title}
        </h3>
        <p className="text-slate-400 text-sm mb-8 mt-4 leading-relaxed">{message}</p>
        <div className="flex gap-4 justify-end">
          <button onClick={onCancel} className="px-5 py-2.5 bg-transparent hover:bg-slate-800 text-slate-300 rounded border border-slate-700 hover:border-slate-500 text-sm font-semibold transition-all uppercase tracking-wider">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-sm font-semibold transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] uppercase tracking-wider border border-rose-500/50">Yes, Erase Data</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
