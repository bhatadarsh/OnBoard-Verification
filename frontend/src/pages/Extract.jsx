import React, { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import SelectedBanner from '../components/SelectedBanner';

const StreamingTerminal = ({ logs, loading }) => {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!loading && logs.length === 0) return null;

  return (
    <div className="bg-[#0a0a0a] rounded-lg p-5 mt-4 border border-slate-800/80 shadow-[0_0_15px_rgba(0,0,0,0.5)] font-mono text-sm max-h-80 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-3 sticky top-0 bg-[#0a0a0a]">
        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
        <div className="w-3 h-3 rounded-full bg-slate-600"></div>
        <div className="w-3 h-3 rounded-full bg-slate-500"></div>
        <span className="text-slate-400 text-xs ml-2 uppercase tracking-widest flex items-center gap-2">
          <span className="text-cyan-500 animate-pulse">●</span> Data Subsystem Online
        </span>
      </div>
      <div className="space-y-2 text-[13px] leading-relaxed break-all">
        {logs.map((log, idx) => (
          <div key={idx} className={`font-medium whitespace-pre-wrap ${log.startsWith('>') ? 'text-cyan-400' : 'text-slate-300'}`}>
             {log}
          </div>
        ))}
        {loading && (
          <div className="text-cyan-500 flex items-center gap-2 mt-2">
            <span className="animate-pulse">_</span>
            <span className="text-xs text-slate-500 animate-pulse">Awaiting stream...</span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

const Extract = () => {
  const { candidates, selected, load, loading, extract, extractLogs } = useOutletContext();

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-wide">Data Extraction</h1>
        <p className="text-slate-400 mt-1 text-sm">Automatically extract field data from the uploaded candidate documents.</p>
      </div>
      
      <SelectedBanner />

      {!selected && (
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl p-8 shadow-sm border border-slate-800">
          <p className="text-slate-400 text-sm mb-4">Please select a candidate to extract data from their uploaded documents.</p>
          <SearchInput candidates={candidates} onSelect={(c) => load(c.id)} placeholder="Search candidate..." />
        </div>
      )}

      {selected && (
        <div className="space-y-6">
          <button onClick={extract} disabled={loading} className={`w-full py-4 rounded font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 border ${loading ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait' : 'bg-cyan-600/20 hover:bg-cyan-500/40 border-cyan-500/50 text-cyan-300 hover:text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-[0.99] cursor-pointer'}`}>
            {loading ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-slate-600/20 border-t-cyan-400 rounded-full animate-spin"></div> Interfacing with LLM...</span>
            ) : (
              <>Start Extraction Processing</>
            )}
          </button>
          
          <StreamingTerminal logs={extractLogs || []} loading={loading} />

          {selected?.knowledge_base && Object.keys(selected.knowledge_base).length > 0 && !loading && (
            <div className="bg-slate-900/80 rounded-xl p-6 shadow-lg border border-slate-800 animate-in fade-in">
              <h3 className="text-sm font-semibold text-slate-300 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2 tracking-wide uppercase">
                <span className="text-cyan-500 text-lg">⌬</span> Extracted Raw Profiles
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {Object.entries(selected.knowledge_base).map(([source, data], idx) => (
                  <div key={source} className="bg-slate-950/50 border border-slate-800 rounded-lg overflow-hidden animate-in zoom-in-95 shadow-inner" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse"></div>
                      <span className="font-semibold text-cyan-100 capitalize text-xs tracking-wider uppercase">{source.replace(/_/g, ' ')} Schema</span>
                    </div>
                    <div className="p-4 text-xs font-mono">
                      {Object.entries(data || {}).map(([k, v]) => (
                        <div key={k} className="flex gap-4 mb-2 pb-2 last:mb-0 last:pb-0 border-b border-slate-800/30 last:border-0 hover:bg-slate-900/30 px-2 py-1 rounded transition-colors">
                          <span className="text-cyan-600/60 font-medium min-w-[130px]">{k}:</span>
                          <span className="text-slate-300 break-words font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Extract;
