import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Gauge from '../components/Gauge';

const Dashboard = () => {
  const { candidates } = useOutletContext();

  const totalCandidates = candidates.length;
  const withKB = candidates.filter(c => c.has_knowledge_base).length;
  const validated = candidates.filter(c => c.is_validated).length;
  const avgScore = validated > 0 ? Math.round(candidates.filter(c => c.is_validated).reduce((a, c) => a + (c.validation_score || 0), 0) / validated) : 0;
  const kbProgress = totalCandidates > 0 ? Math.round((withKB / totalCandidates) * 100) : 0;
  const validationProgress = totalCandidates > 0 ? Math.round((validated / totalCandidates) * 100) : 0;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-wide">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm">Overview of your candidate verification pipeline.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { n: totalCandidates, l: 'Total Candidates', c: 'border-slate-700', tc: 'text-slate-200' }, 
          { n: withKB, l: 'Extracted Profiles', c: 'border-cyan-500/50', tc: 'text-cyan-400' }, 
          { n: validated, l: 'Validated Profiles', c: 'border-indigo-500/50', tc: 'text-indigo-400' }, 
          { n: `${avgScore}%`, l: 'Average Match Score', c: 'border-emerald-500/50', tc: 'text-emerald-400' }
        ].map((m, i) => (
          <div key={i} className={`bg-slate-900/80 backdrop-blur-md border border-slate-800 border-l-4 ${m.c} p-6 rounded-xl shadow-lg relative overflow-hidden group hover:bg-slate-800/80 transition-all`}>
            <div className={`text-4xl font-bold ${m.tc} mb-2`}>{m.n}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{m.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700 p-8 rounded-2xl shadow-sm group">
          <h3 className="text-sm font-semibold text-slate-300 mb-6">Pipeline Progress</h3>
          <div className="flex justify-around items-end">
            <Gauge value={kbProgress} label="Extracted" colorClass="text-cyan-400" strokeColor="#06b6d4" />
            <Gauge value={validationProgress} label="Validated" colorClass="text-indigo-400" strokeColor="#6366f1" />
            <Gauge value={avgScore} label="Avg Score" colorClass="text-emerald-400" strokeColor="#10b981" />
          </div>
        </div>
        
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700 p-8 rounded-2xl shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Recently Validated</h3>
          <div className="flex-1 justify-center flex flex-col">
            {candidates.filter(c => c.is_validated).slice(0, 4).length > 0 ? (
              <div className="space-y-3">
                {candidates.filter(c => c.is_validated).slice(0, 4).map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700 animate-in slide-in-from-right-4" style={{ animationDelay: `${idx * 100}ms` }}>
                    <span className="font-medium text-slate-200 text-sm">{c.full_name}</span>
                    <span className={`px-3 py-1 rounded-md bg-slate-900 border border-slate-700 font-semibold text-xs ${c.validation_score >= 80 ? 'text-emerald-400' : c.validation_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {c.validation_score}% Match
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm text-center">No validations completed yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
