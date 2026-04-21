import React from 'react';
import { useOutletContext } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import SelectedBanner from '../components/SelectedBanner';

const UploadDocs = () => {
  const { candidates, selected, load, docFiles, setDocFiles, loading, uploadDocs } = useOutletContext();

  const docTypes = [
    { key: 'resume', label: 'Resume', icon: '📄', accept: '.pdf,.docx,.txt', hint: 'PDF, DOCX, TXT' },
    { key: 'hr_transcript', label: 'HR Interview File', icon: '🎤', accept: '.txt,.mp3,.wav,.m4a', hint: 'Audio or Transcript' },
    { key: 'aadhar', label: 'Aadhar Card', icon: '🪪', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
    { key: 'pan', label: 'PAN Card', icon: '💳', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
    { key: 'marksheet_10th', label: 'Educational Certificates', icon: '🎓', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: '10th / 12th / Degree' },
  ];

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-wide">Document Uploads</h1>
        <p className="text-slate-400 mt-1 text-sm">Attach proofs of identity and education for the applicant.</p>
      </div>
      
      <SelectedBanner />

      {!selected && (
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl p-8 shadow-sm border border-slate-800 mb-6">
          <div className="flex justify-between items-center mb-6">
            <span className="font-semibold text-slate-300">Select a candidate to upload their files</span>
            <SearchInput candidates={candidates} onSelect={(c) => load(c.id)} placeholder="Search candidate..." />
          </div>
          {candidates.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-800">
              {candidates.slice(0, 10).map((c, idx) => (
                <button key={c.id} onClick={() => load(c.id)} className="px-4 py-2 bg-slate-800 hover:bg-cyan-900/40 hover:text-cyan-300 hover:border-cyan-500/50 text-slate-300 rounded border border-slate-700 text-sm font-medium transition-colors animate-in fade-in cursor-pointer" style={{ animationDelay: `${idx * 50}ms` }}>
                  {c.full_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="animate-in fade-in z-10 w-full">
          <div className="bg-slate-900 border-l-4 border-cyan-500 text-cyan-100 p-4 rounded-r-lg text-sm mb-6 flex items-start shadow-inner">
            <span className="text-cyan-400 mr-2 mt-0.5">🔒</span> 
            <span>Privacy Secured. All uploaded documents are symmetrically encrypted locally before writing to disk.</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {docTypes.map(d => (
              <div key={d.key} className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-5 border border-slate-800 hover:border-cyan-500/50 transition-all group shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-2xl ${docFiles[d.key] ? 'text-cyan-400' : 'text-slate-500'}`}>{d.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{d.label}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{d.hint}</div>
                  </div>
                </div>
                
                <input type="file" id={d.key} accept={d.accept} className="hidden" onChange={e => setDocFiles({ ...docFiles, [d.key]: e.target.files?.[0] })} />
                <label 
                  htmlFor={d.key} 
                  className={`block p-3 border border-dashed rounded text-center cursor-pointer font-medium text-xs transition-all ${
                    docFiles[d.key] ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {docFiles[d.key] ? <span className="flex items-center justify-center gap-2">✓ Attached: {docFiles[d.key].name.substring(0, 15)}...</span> : '+ Select File'}
                </label>
              </div>
            ))}
          </div>
          
          <div className="flex gap-4">
            <button onClick={uploadDocs} disabled={loading} className={`flex-1 py-3.5 rounded font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 border ${loading ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-600/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300 hover:text-white active:scale-[0.99] shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer'}`}>
              {loading ? 'Encrypting & Uploading...' : 'Secure Submit'}
            </button>
            <button onClick={() => setDocFiles({})} className="px-6 py-3.5 bg-transparent border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-400 rounded font-bold text-xs uppercase tracking-widest transition-all focus:ring-1 focus:ring-slate-500 cursor-pointer">
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDocs;
