import React from 'react';
import { useOutletContext } from 'react-router-dom';

const UploadForm = () => {
  const { formFile, setFormFile, uploadForm, loading } = useOutletContext();

  return (
    <div className="max-w-3xl animate-in slide-in-from-bottom-4 duration-500 mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-white tracking-wide">Upload CSV Sheet</h1>
        <p className="text-slate-400 mt-2 text-sm">Upload a master CSV sheet containing applicant base data.</p>
      </div>
      
      <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-10 shadow-lg border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="bg-slate-900 border-l-4 border-cyan-500 text-slate-300 p-4 rounded-r-lg text-sm mb-8 flex items-start shadow-inner">
          <span className="text-cyan-400 mr-3 mt-0.5">ℹ️</span> 
          <span>Note: The system will automatically map the columns found in your CSV to the standardized HR candidate array.</span>
        </div>
        
        <input type="file" accept=".csv,.xlsx,.xls" id="form" className="hidden" onChange={e => setFormFile(e.target.files?.[0])} />
        <label 
          htmlFor="form" 
          className={`block border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 ${formFile ? 'border-cyan-500 bg-cyan-500/5 p-12' : 'border-slate-600 hover:border-cyan-500/50 hover:bg-slate-800/50 p-16'}`}
        >
          {formFile ? (
            <div className="space-y-3 animate-in zoom-in-95">
              <div className="text-5xl text-cyan-400">📄</div>
              <div className="text-white font-semibold text-lg">{formFile.name}</div>
              <div className="text-cyan-400 text-xs uppercase tracking-wider font-medium">Ready to Upload</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400 group-hover:text-cyan-400 transition-colors">↑</div>
              <div className="text-slate-200 font-semibold text-lg">Click to select CSV/Excel</div>
              <div className="text-slate-400 text-sm">or drag and drop here</div>
            </div>
          )}
        </label>
        
        <button 
          onClick={uploadForm} 
          disabled={loading || !formFile} 
          className={`w-full mt-8 py-3.5 rounded border font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-xl ${!formFile || loading ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-600/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300 hover:text-white active:scale-[0.98]'}`}
        >
          {loading ? 'Processing Data...' : 'Upload Base Data'}
        </button>
      </div>
    </div>
  );
};

export default UploadForm;
