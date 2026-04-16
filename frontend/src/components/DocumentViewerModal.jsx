import React from 'react';

const DocumentViewerModal = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      {/* Deep Blur Background Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      ></div>

      {/* Cybernetic Interactive Glassmorphic Frame */}
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col bg-slate-900/90 rounded-2xl border border-slate-700 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 text-xl">❖</span>
            <div>
              <h3 className="text-slate-200 font-bold tracking-wider uppercase text-sm">
                Zero-Trust Secure Viewer
              </h3>
              <p className="text-slate-500 text-[10px] font-mono tracking-widest uppercase">
                {file.title || 'Encrypted File Access'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/50 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 w-full bg-slate-200 flex items-center justify-center relative rounded-b-2xl overflow-hidden">
          <iframe 
            src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`} 
            title="Secure Document Preview"
            className="w-full h-full absolute inset-0 border-0"
          >
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <p>Your browser requires native plugin support for inline PDFs.</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/30 rounded text-xs uppercase tracking-wider font-bold">
                Open Securely in New Tab
              </a>
            </div>
          </iframe>
        </div>

      </div>
    </div>
  );
};

export default DocumentViewerModal;
