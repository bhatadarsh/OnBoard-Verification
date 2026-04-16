import React from 'react';
import { useOutletContext } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import SelectedBanner from '../components/SelectedBanner';

const API = '/api/v1';

const maskPII = (val) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '••••••••••')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '•••• •••• ••••');
};

const Validate = () => {
  const { candidates, selected, load, loading, validate, show, setPreviewFile } = useOutletContext();

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-wide">Validation Results</h1>
        <p className="text-slate-400 mt-1 text-sm">Compare document data against the uploaded CSV to ensure consistency.</p>
      </div>
      
      <SelectedBanner />

      {!selected && (
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl p-8 shadow-sm border border-slate-800">
          <div className="flex flex-col gap-4">
            <span className="font-semibold text-slate-300">Select a candidate whose data has been extracted</span>
            <SearchInput candidates={candidates.filter(c => c.has_knowledge_base && c.has_form)} onSelect={(c) => load(c.id)} placeholder="Search ready candidates..." />
          </div>
          {candidates.filter(c => c.has_knowledge_base && c.has_form).length === 0 && <p className="mt-4 text-amber-400/80 text-sm bg-amber-500/10 p-3 rounded text-center border border-amber-500/20">Please extract document data first.</p>}
        </div>
      )}

      {selected && (
        <>
          <button onClick={validate} disabled={loading} className={`w-full mb-8 py-4 rounded font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 border ${loading ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait' : 'bg-cyan-600/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300 hover:text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-[0.99] cursor-pointer'}`}>
            {loading ? 'Running Automated Verification...' : '✓ Start Validation Process'}
          </button>

          {selected?.validation_result && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
                {selected.documents?.forensic_alerts?.length > 0 && (
                  <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-xl mb-6 flex items-start gap-4">
                    <span className="text-rose-500 text-2xl">⚠️</span>
                    <div>
                      <h4 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-1">Document Forensics Alert</h4>
                      <div className="flex flex-col gap-1">
                        {selected.documents.forensic_alerts.map((alert, idx) => (
                          <div key={idx} className="text-xs text-rose-300/80 font-mono tracking-tight">{alert}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[{ n: selected.validation_result.overall_score+'%', l: 'Average Score', c: selected.validation_result.overall_score >= 80 ? 'text-emerald-400 border-emerald-500/30' : selected.validation_result.overall_score >= 50 ? 'text-amber-400 border-amber-500/30' : 'text-rose-400 border-rose-500/30' }, { n: selected.validation_result.correct_count, l: 'Verified Data', c: 'text-cyan-100 border-slate-700' }, { n: selected.validation_result.ambiguous_count, l: 'Flagged Mismatch', c: 'text-amber-400 border-slate-700' }, { n: selected.validation_result.incorrect_count, l: 'Anomalies', c: 'text-rose-400 border-slate-700' }].map((s, i) => (
                   <div key={i} className={`bg-slate-900/80 rounded-xl p-5 border ${s.c} text-center shadow-sm relative overflow-hidden group`}>
                     <div className="absolute inset-0 bg-gradient-to-t from-transparent to-current opacity-5 pointer-events-none"></div>
                     <div className={`text-3xl font-bold mb-1 ${s.c.split(' ')[0]}`}>{s.n}</div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.l}</div>
                   </div>
                ))}
              </div>
              
              {/* Zero-Trust Action */}
              <div className="flex justify-end mb-6 gap-2 flex-wrap">
                {Object.keys(selected.documents || {}).filter(k => k !== 'forensic_alerts').map(docName => {
                  const url = `${API}/documents/${selected.id}/${docName}/redacted`;
                  const title = `Redacted ${docName.replace(/_/g, ' ')}`;
                  return (
                    <button key={docName} onClick={() => setPreviewFile ? setPreviewFile({ url, title }) : console.error("setPreviewFile missing in context")} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded hover:bg-slate-700 border border-slate-700 transition-colors text-xs font-bold uppercase tracking-wider shadow-sm">
                      <span className="text-indigo-400">❖</span> View Enterprise Redacted {docName.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>

              {/* Field Validation List */}
              <div className="bg-slate-900/80 rounded-xl shadow-lg border border-slate-800 overflow-hidden">
                <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-300 text-xs tracking-wider uppercase">Detailed Field Report</h3>
                </div>

                <div className="divide-y divide-slate-800/50">
                  {(selected.validation_result.validations || []).map((v, i) => (
                    <div key={i} className={`p-6 transition-colors ${v.status === 'INCORRECT' ? 'bg-rose-500/5' : v.status === 'AMBIGUOUS' ? 'bg-amber-500/5' : 'bg-transparent hover:bg-slate-800/20'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${v.status === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : v.status === 'INCORRECT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                          {v.status === 'CORRECT' ? '✓' : v.status === 'INCORRECT' ? '✕' : '?'}
                        </span>
                        <h4 className="font-bold text-slate-100 capitalize text-sm flex-1">{v.field?.replace(/_/g, ' ')}</h4>
                        <span className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest border ${v.status === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : v.status === 'INCORRECT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {v.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-9">
                        <div className="bg-slate-950/50 border border-slate-800/50 rounded p-3 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700"></div>
                          <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-1">CSV (Master)</div>
                          <div className="text-slate-300 text-[11px] font-mono">{maskPII(v.form_value) || <span className="opacity-40 italic">Null</span>}</div>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-800/50 rounded p-3 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-800/50"></div>
                          <div className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-1">Extracted Source</div>
                          <div className="text-slate-300 text-[11px] font-mono">{maskPII(v.doc_value) || <span className="opacity-40 italic">Null</span>}</div>
                        </div>
                      </div>
                      
                      {v.reason && (
                        <div className="ml-9 mt-3 text-[10px] flex items-center justify-between font-mono px-3 py-2 rounded leading-relaxed border border-slate-800/50 bg-slate-900/50">
                          <span className="text-slate-500">{'> '} {v.reason}</span>
                          {v.reason.toLowerCase().includes('semantic') && (
                            <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-pulse uppercase tracking-[0.2em] text-[8px] font-black">
                              AI Semantic Match
                            </span>
                          )}
                        </div>
                      )}

                      {v.status === 'AMBIGUOUS' && (
                        <div className="ml-9 mt-4 flex gap-3">
                          <button onClick={async () => {
                            const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: v.field, resolution: 'CORRECT' }) });
                            if (r.ok) { show('Marked as Correct'); load(selected.id); }
                          }} className="px-4 py-2 bg-emerald-500/5 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer">
                            Accept Value
                          </button>
                          <button onClick={async () => {
                            const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: v.field, resolution: 'INCORRECT' }) });
                            if (r.ok) { show('Marked as Incorrect', 'error'); load(selected.id); }
                          }} className="px-4 py-2 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer">
                            Reject Value
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Validate;
