import React, { useEffect } from 'react';

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { 
    const t = setTimeout(onClose, 3500); 
    return () => clearTimeout(t); 
  }, [onClose]);
  
  const colors = type === 'success' 
    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' 
    : type === 'error' 
      ? 'bg-rose-500/20 border-rose-400/50 text-rose-300' 
      : 'bg-blue-500/20 border-blue-400/50 text-blue-300';
      
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  
  return (
    <div className={`fixed top-5 right-5 ${colors} border px-5 py-3 rounded-lg shadow-lg backdrop-blur-md z-50 flex items-center gap-3 transform transition-all animate-in fade-in slide-in-from-top-4`}>
      <span className="font-bold text-lg">{icon}</span>
      <span className="font-medium">{msg}</span>
    </div>
  );
};

export default Toast;
