import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import SearchInput from '../components/SearchInput';

const Candidates = () => {
  const { candidates, load, triggerDelete } = useOutletContext();
  const navigate = useNavigate();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Candidates List</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage all on-boarding profiles.</p>
        </div>
        <SearchInput candidates={candidates} onSelect={(c) => { load(c.id); navigate('/docs'); }} placeholder="Search candidates..." className="w-80" />
      </div>

      {candidates.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-16 text-center animate-pulse">
          <div className="text-5xl mb-4 text-slate-600">👥</div>
          <p className="text-slate-400 text-sm">No candidates found. Please upload a CSV sheet first.</p>
        </div>
      ) : (
        <div className="bg-slate-800/80 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-700">
                <th className="px-6 py-4">Candidate Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Progress Status</th>
                <th className="px-6 py-4">Validation Score</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-300">
              {candidates.map((c, idx) => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors last:border-0 animate-in fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                  <td className="px-6 py-4 font-semibold text-slate-200">{c.full_name}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{c.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className={`h-2 rounded-full flex-1 bg-slate-800 border border-slate-700/50 flex overflow-hidden`}>
                         <div className={`h-full ${c.has_form ? 'bg-indigo-500 w-1/3 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-transparent w-1/3'}`}></div>
                         <div className={`h-full ${c.has_knowledge_base ? 'bg-cyan-500 w-1/3 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-transparent w-1/3'}`}></div>
                         <div className={`h-full ${c.is_validated ? 'bg-emerald-500 w-1/3 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-transparent w-1/3'}`}></div>
                       </div>
                       <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                         {!c.has_form ? 'Pending' : !c.has_knowledge_base ? 'Ingested' : !c.is_validated ? 'Extracted' : 'Verified'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {c.is_validated ? (
                      <div className="flex flex-col gap-1">
                        <span className={`font-black text-lg drop-shadow-md ${c.validation_score >= 80 ? 'text-emerald-400' : c.validation_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {c.validation_score}%
                        </span>
                        {c.documents?.forensic_alerts?.length > 0 && (
                          <span className="text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded px-1.5 py-0.5 uppercase tracking-widest animate-pulse inline-block w-max">
                            Tamper Risk
                          </span>
                        )}
                      </div>
                    ) : <span className="text-slate-600 font-bold">N/A</span>}
                  </td>
                  <td className="px-6 py-4 flex gap-2 justify-end">
                    <button onClick={() => { load(c.id); navigate('/docs'); }} className="px-5 py-2 bg-transparent hover:bg-cyan-900/30 text-cyan-400 border border-cyan-800 hover:border-cyan-500 rounded transition-all font-medium text-[11px] shadow-[0_0_10px_rgba(6,182,212,0.05)] uppercase tracking-wider">Inspect</button>
                    <button onClick={() => triggerDelete(c)} className="p-2 text-slate-500 hover:text-rose-400 bg-transparent hover:bg-rose-950/30 border border-slate-700 hover:border-rose-500/50 rounded transition-all shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Candidates;
