import React, { useState, useEffect, useRef } from 'react';

const API = '/api/v1';

// Toast Component
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  
  const colors = type === 'success' ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : type === 'error' ? 'bg-rose-500/20 border-rose-400/50 text-rose-300' : 'bg-blue-500/20 border-blue-400/50 text-blue-300';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  
  return (
    <div className={`fixed top-5 right-5 ${colors} border px-5 py-3 rounded-lg shadow-lg backdrop-blur-md z-50 flex items-center gap-3 transform transition-all animate-in fade-in slide-in-from-top-4`}>
      <span className="font-bold text-lg">{icon}</span>
      <span className="font-medium">{msg}</span>
    </div>
  );
};

// Smart Search with Suggestions
const SearchInput = ({ candidates, onSelect, placeholder = "Search...", className = "w-64" }) => {
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  const filtered = query ? candidates.filter(c =>
    c.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    c.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5) : [];

  useEffect(() => {
    const handleClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className} z-50`}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      {show && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {filtered.map(c => (
            <div 
              key={c.id} 
              onClick={() => { onSelect(c); setQuery(''); setShow(false); }} 
              className="px-4 py-3 cursor-pointer hover:bg-slate-700/80 border-b border-slate-700 transition-colors last:border-0"
            >
              <div className="font-semibold text-slate-200 text-sm">{c.full_name}</div>
              <div className="text-xs text-slate-400">{c.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Gauge component
const Gauge = ({ value, label, colorClass, strokeColor }) => {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div className="text-center group">
      <div className="relative w-24 h-24 mx-auto transition-transform duration-500 group-hover:scale-105">
        <svg viewBox="0 0 36 36" className="-rotate-90 w-full h-full relative z-10 transition-transform">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          <path 
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
            fill="none" 
            stroke={strokeColor || "currentColor"} 
            strokeWidth="3" 
            strokeDasharray={`${percent}, 100`} 
            className={`transition-all duration-1000 ease-out ${colorClass}`}
          />
        </svg>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold z-20 ${colorClass}`}>
          {value}%
        </div>
      </div>
      <div className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-wide">{label}</div>
    </div>
  );
};

// Login
const Login = ({ onLogin }) => {
  const [googleConfig, setGoogleConfig] = useState(null);
  useEffect(() => { fetch(`${API}/auth/google/config`).then(r => r.json()).then(setGoogleConfig).catch(() => setGoogleConfig({ configured: false })); }, []);
  useEffect(() => {
    if (!googleConfig?.configured) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setTimeout(() => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({ client_id: googleConfig.client_id, callback: async (r) => { const res = await fetch(`${API}/auth/google/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: r.credential }) }); if (res.ok) onLogin(await res.json()); } });
        const btn = document.getElementById('g-btn');
        if (btn) window.google.accounts.id.renderButton(btn, { theme: 'filled_black', size: 'large', width: 280 });
      }
    }, 100);
    document.head.appendChild(script);
  }, [googleConfig, onLogin]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans relative overflow-hidden text-slate-200">
      <style>{`
        @keyframes ambient {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .anim-blob { animation: ambient 25s infinite alternate ease-in-out; }
        .anim-delay-5000 { animation-delay: 5s; }
      `}</style>
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none anim-blob"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none anim-blob anim-delay-5000"></div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-16 max-w-5xl w-full px-8 items-center z-10">
        <div className="animate-in slide-in-from-left-8 duration-700 fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-800 backdrop-blur-md rounded-xl flex items-center justify-center text-3xl shadow-lg border border-slate-700">
              ⚡
            </div>
            <div className="font-bold text-2xl tracking-wide text-slate-100">OnboardGuard</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-white">
            Automated HR Document<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Validation System</span>
          </h1>
          <p className="text-lg text-slate-400 font-light max-w-lg leading-relaxed">
            Verify candidate documents instantly using advanced OCR, Audio Transcription, and LLM matching. Professional, secure, and fully automated.
          </p>
        </div>
        
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 p-10 rounded-3xl shadow-2xl animate-in slide-in-from-right-8 duration-700 fade-in">
          <div className="w-16 h-16 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner">
            🔐
          </div>
          <h2 className="text-center text-2xl font-bold text-white mb-2">HR Login</h2>
          <p className="text-center text-slate-400 text-sm mb-8">Sign in to manage candidates</p>
          
          {googleConfig?.configured && <div id="g-btn" className="mb-6 flex justify-center"></div>}
          
          <button 
            onClick={() => onLogin({ name: 'HR Admin', email: 'hr@company.com', picture: '' })} 
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all shadow-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Sign in as Demo Admin
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [sidebar, setSidebar] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formFile, setFormFile] = useState(null);
  const [docFiles, setDocFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { const s = localStorage.getItem('og_user'); if (s) setUser(JSON.parse(s)); }, []);
  useEffect(() => { if (user) { localStorage.setItem('og_user', JSON.stringify(user)); refresh(); } }, [user]);

  const logout = () => {
    localStorage.removeItem('og_user');
    setUser(null);
  }

  const show = (msg, type = 'success') => setToast({ msg, type });
  const refresh = () => fetch(`${API}/candidates`).then(r => r.json()).then(d => setCandidates(d.candidates || []));
  const load = async (id) => { const r = await fetch(`${API}/candidate/${id}`); if (r.ok) setSelected(await r.json()); };

  const deleteCandidate = async (id) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    setLoading(true);
    const r = await fetch(`${API}/candidate/${id}`, { method: 'DELETE' });
    if (r.ok) { show('Candidate deleted successfully'); if(selected?.id === id) setSelected(null); refresh(); }
    setLoading(false);
  };

  const uploadForm = async () => {
    if (!formFile) return show('Please select a file first', 'error');
    setLoading(true);
    const fd = new FormData(); fd.append('form_file', formFile);
    const r = await fetch(`${API}/onboarding/upload`, { method: 'POST', body: fd });
    const d = await r.json();
    if (r.ok) { show(`Uploaded successfully: ${d.candidates?.filter(c => c.status === 'created').length || 0} candidates added.`); setFormFile(null); refresh(); }
    else show(d.detail || 'Upload Failed', 'error');
    setLoading(false);
  };

  const uploadDocs = async () => {
    if (!selected) return show('Please select a candidate first', 'error');
    if (!Object.values(docFiles).some(f => f)) return show('No documents provided', 'error');
    setLoading(true);
    const fd = new FormData();
    Object.entries(docFiles).forEach(([k, f]) => f && fd.append(k, f));
    const r = await fetch(`${API}/documents/${selected.id}`, { method: 'POST', body: fd });
    if (r.ok) { show('Documents securely uploaded'); setDocFiles({}); refresh(); load(selected.id); }
    else show('Upload Failed', 'error');
    setLoading(false);
  };

  const extract = async () => {
    if (!selected) return show('Please select a candidate', 'error');
    setLoading(true);
    show('Starting data extraction...', 'info');
    const r = await fetch(`${API}/extract/${selected.id}`, { method: 'POST' });
    const d = await r.json();
    if (r.ok) { show(`Extraction complete for ${d.sources_extracted?.length || 0} documents`); refresh(); load(selected.id); }
    else show(d.detail || 'Extraction Failed', 'error');
    setLoading(false);
  };

  const validate = async () => {
    if (!selected) return show('Please select a candidate', 'error');
    setLoading(true);
    show('Running validation...', 'info');
    const r = await fetch(`${API}/validate/${selected.id}`, { method: 'POST' });
    const d = await r.json();
    if (r.ok) { show(`Validation Complete. Match Score: ${d.summary?.overall_score || 0}%`); refresh(); load(selected.id); }
    else show(d.detail || 'Validation Failed', 'error');
    setLoading(false);
  };

  if (!user) return <Login onLogin={setUser} />;

  const navItems = [
    { id: 'home', icon: '📊', label: 'Dashboard' },
    { id: 'candidates', icon: '👥', label: 'Candidates List' },
    { id: 'form', icon: '📄', label: '1. Upload CSV Base' },
    { id: 'docs', icon: '📎', label: '2. Upload Documents' },
    { id: 'extract', icon: '🧠', label: '3. Extract Data' },
    { id: 'validate', icon: '✅', label: '4. Run Validation' },
  ];

  const docTypes = [
    { key: 'resume', label: 'Resume', icon: '📄', accept: '.pdf,.docx,.txt', hint: 'PDF, DOCX, TXT' },
    { key: 'hr_transcript', label: 'HR Interview File', icon: '🎤', accept: '.txt,.mp3,.wav,.m4a', hint: 'Audio or Transcript' },
    { key: 'aadhar', label: 'Aadhar Card', icon: '🪪', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
    { key: 'pan', label: 'PAN Card', icon: '💳', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
    { key: 'marksheet_10th', label: 'Educational Certificates', icon: '🎓', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: '10th / 12th / Degree' },
  ];

  const firstName = user.name?.split(' ')[0] || 'User';

  const totalCandidates = candidates.length;
  const withKB = candidates.filter(c => c.has_knowledge_base).length;
  const validated = candidates.filter(c => c.is_validated).length;
  const avgScore = validated > 0 ? Math.round(candidates.filter(c => c.is_validated).reduce((a, c) => a + (c.validation_score || 0), 0) / validated) : 0;
  const kbProgress = totalCandidates > 0 ? Math.round((withKB / totalCandidates) * 100) : 0;
  const validationProgress = totalCandidates > 0 ? Math.round((validated / totalCandidates) * 100) : 0;

  // Selected Candidate Banner Component
  const SelectedBanner = () => {
    if (!selected) return null;
    return (
      <div className="bg-slate-800/80 backdrop-blur-md border border-blue-500/30 p-5 rounded-2xl flex justify-between items-center mb-6 shadow-md transition-all animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-4 ml-2">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xl uppercase ring-2 ring-blue-500/50">
            {selected.full_name[0]}
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-0.5">
              Active Candidate
            </p>
            <p className="text-lg font-bold text-slate-100">{selected.full_name}</p>
          </div>
        </div>
        <button 
          onClick={() => setSelected(null)}
          className="px-4 py-2 bg-slate-700/50 hover:bg-rose-500/20 border border-slate-600 hover:border-rose-500/50 text-slate-300 hover:text-rose-400 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>✕</span> Deselect
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-300 relative overflow-hidden">
      <style>{`
        @keyframes ambient {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .anim-blob { animation: ambient 25s infinite alternate ease-in-out; }
        .anim-delay-2000 { animation-delay: 2s; }
        .anim-delay-5000 { animation-delay: 5s; }
      `}</style>
      
      {/* Gentle Animated Ambient Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none anim-blob"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none anim-blob anim-delay-5000"></div>
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none anim-blob anim-delay-2000"></div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <nav className={`${sidebar ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 text-white transition-all duration-300 flex-shrink-0 flex flex-col z-20`}>
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <button onClick={() => setSidebar(!sidebar)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {sidebar && <span className="font-bold text-lg tracking-wide">OnboardGuard</span>}
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map(n => (
            <button 
              key={n.id} 
              onClick={() => setTab(n.id)} 
              className={`w-full flex items-center gap-3 ${sidebar ? 'px-4 py-3' : 'justify-center p-3'} rounded-xl transition-all font-medium text-sm ${tab === n.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className={`text-xl`}>{n.icon}</span>
              {sidebar && <span>{n.label}</span>}
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            {user.picture ? 
              <img src={user.picture} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border border-slate-700" alt="" /> : 
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 text-slate-300 rounded-full flex items-center justify-center font-bold text-lg">{firstName[0]}</div>
            }
            {sidebar && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                <div className="text-xs text-slate-400 truncate">{user.email}</div>
              </div>
            )}
          </div>
          {sidebar && (
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign out
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-10 overflow-y-auto relative h-screen z-10 w-full">
        <div className="max-w-6xl mx-auto pb-20 mt-2">

          {/* Dashboard */}
          {tab === 'home' && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-wide">Dashboard</h1>
                <p className="text-slate-400 mt-1 text-sm">Overview of your candidate verification pipeline.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { n: totalCandidates, l: 'Total Candidates', c: 'border-slate-700', tc: 'text-slate-200' }, 
                  { n: withKB, l: 'Extracted Profiles', c: 'border-blue-500/50', tc: 'text-blue-400' }, 
                  { n: validated, l: 'Validated Profiles', c: 'border-indigo-500/50', tc: 'text-indigo-400' }, 
                  { n: `${avgScore}%`, l: 'Average Match Score', c: 'border-emerald-500/50', tc: 'text-emerald-400' }
                ].map((m, i) => (
                  <div key={i} className={`bg-slate-800/50 backdrop-blur-sm border-t-4 ${m.c} p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow`}>
                    <div className={`text-4xl font-bold ${m.tc} mb-2`}>{m.n}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{m.l}</div>
                  </div>
                ))}
              </div>

              {/* Progress Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700 p-8 rounded-2xl shadow-sm group">
                  <h3 className="text-sm font-semibold text-slate-300 mb-6">Pipeline Progress</h3>
                  <div className="flex justify-around items-end">
                    <Gauge value={kbProgress} label="Extracted" colorClass="text-blue-400" strokeColor="#3b82f6" />
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
          )}

          {/* Candidates Page */}
          {tab === 'candidates' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-wide">Candidates List</h1>
                  <p className="text-slate-400 mt-1 text-sm">Manage all on-boarding profiles.</p>
                </div>
                <SearchInput candidates={candidates} onSelect={(c) => { load(c.id); setTab('docs'); }} placeholder="Search candidates..." className="w-80" />
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
                            <div className="flex flex-wrap gap-2">
                              {c.has_form && <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-medium">CSV Uploaded</span>}
                              {c.has_knowledge_base && <span className="bg-blue-900/40 text-blue-300 px-2 py-1 rounded text-xs font-medium">Data Extracted</span>}
                              {c.is_validated && <span className="bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded text-xs font-medium">Validated</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {c.is_validated ? (
                              <span className={`font-bold ${c.validation_score >= 80 ? 'text-emerald-400' : c.validation_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {c.validation_score}%
                              </span>
                            ) : <span className="text-slate-500">-</span>}
                          </td>
                          <td className="px-6 py-4 flex gap-2 justify-end">
                            <button onClick={() => { load(c.id); setTab('docs'); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-xs shadow-sm">Manage</button>
                            <button onClick={() => deleteCandidate(c.id)} className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors shadow-sm">
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
          )}

          {/* 1. Upload Form */}
          {tab === 'form' && (
            <div className="max-w-3xl animate-in slide-in-from-bottom-4 duration-500 mx-auto">
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold text-white tracking-wide">Upload CSV Sheet</h1>
                <p className="text-slate-400 mt-2 text-sm">Upload a master CSV sheet containing applicant base data.</p>
              </div>
              
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-3xl p-10 shadow-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="bg-slate-900 border-l-4 border-blue-500 text-slate-300 p-4 rounded-r-lg text-sm mb-8 flex items-start shadow-inner">
                  <span className="text-blue-400 mr-3 mt-0.5">ℹ️</span> 
                  <span>Note: The system will automatically map the columns found in your CSV to the standardized HR candidate array.</span>
                </div>
                
                <input type="file" accept=".csv,.xlsx,.xls" id="form" className="hidden" onChange={e => setFormFile(e.target.files?.[0])} />
                <label 
                  htmlFor="form" 
                  className={`block border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 ${formFile ? 'border-blue-500 bg-blue-500/10 p-12' : 'border-slate-600 hover:border-blue-400 hover:bg-slate-800 p-16'}`}
                >
                  {formFile ? (
                    <div className="space-y-3 animate-in zoom-in-95">
                      <div className="text-5xl text-blue-400">📄</div>
                      <div className="text-white font-semibold text-lg">{formFile.name}</div>
                      <div className="text-blue-400 text-xs uppercase tracking-wider font-medium">Ready to Upload</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-400 group-hover:text-blue-400 transition-colors">↑</div>
                      <div className="text-slate-200 font-semibold text-lg">Click to select CSV/Excel</div>
                      <div className="text-slate-400 text-sm">or drag and drop here</div>
                    </div>
                  )}
                </label>
                
                <button 
                  onClick={uploadForm} 
                  disabled={loading || !formFile} 
                  className={`w-full mt-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md ${!formFile || loading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 active:scale-[0.98]'}`}
                >
                  {loading ? 'Processing Data...' : 'Upload Base Data'}
                </button>
              </div>
            </div>
          )}

          {/* 2. Documents */}
          {tab === 'docs' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white tracking-wide">Document Uploads</h1>
                <p className="text-slate-400 mt-1 text-sm">Attach proofs of identity and education for the applicant.</p>
              </div>
              
              <SelectedBanner />

              {!selected && (
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-slate-700 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold text-slate-300">Select a candidate to upload their files</span>
                    <SearchInput candidates={candidates} onSelect={(c) => load(c.id)} placeholder="Search candidate..." />
                  </div>
                  {candidates.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-700/50">
                      {candidates.slice(0, 10).map((c, idx) => (
                        <button key={c.id} onClick={() => load(c.id)} className="px-4 py-2 bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-600 animate-in fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                          {c.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selected && (
                <div className="animate-in fade-in z-10 w-full">
                  <div className="bg-slate-900 border-l-4 border-blue-500 text-slate-300 p-4 rounded-r-lg text-sm mb-6 flex items-start shadow-inner">
                    <span className="text-blue-400 mr-2 mt-0.5">🔒</span> 
                    <span>Privacy Secured. All uploaded documents are symmetrically encrypted locally before writing to disk.</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                    {docTypes.map(d => (
                      <div key={d.key} className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-700 hover:border-blue-500/50 transition-all group shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`text-2xl ${docFiles[d.key] ? 'text-blue-400' : 'text-slate-400'}`}>{d.icon}</span>
                          <div>
                            <div className="font-semibold text-slate-200 text-sm">{d.label}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{d.hint}</div>
                          </div>
                        </div>
                        
                        <input type="file" id={d.key} accept={d.accept} className="hidden" onChange={e => setDocFiles({ ...docFiles, [d.key]: e.target.files?.[0] })} />
                        <label 
                          htmlFor={d.key} 
                          className={`block p-3 border border-dashed rounded-lg text-center cursor-pointer font-medium text-xs transition-all ${
                            docFiles[d.key] ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          {docFiles[d.key] ? <span className="flex items-center justify-center gap-2">✓ Attached: {docFiles[d.key].name.substring(0, 15)}...</span> : '+ Select File'}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-4">
                    <button onClick={uploadDocs} disabled={loading} className={`flex-1 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md flex justify-center items-center gap-2 ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.99] hover:shadow-blue-500/25'}`}>
                      {loading ? 'Encrypting & Uploading...' : 'Secure Submit'}
                    </button>
                    <button onClick={() => setDocFiles({})} className="px-6 py-3.5 bg-slate-800 border border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-all focus:ring-2 focus:ring-slate-500">
                      Clear Cache
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Extract */}
          {tab === 'extract' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white tracking-wide">Data Extraction</h1>
                <p className="text-slate-400 mt-1 text-sm">Automatically extract field data from the uploaded candidate documents.</p>
              </div>
              
              <SelectedBanner />

              {!selected && (
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-slate-700">
                  <p className="text-slate-400 text-sm mb-4">Please select a candidate to extract data from their uploaded documents.</p>
                  <SearchInput candidates={candidates} onSelect={(c) => load(c.id)} placeholder="Search candidate..." />
                </div>
              )}

              {selected && (
                <div className="space-y-6">
                  <button onClick={extract} disabled={loading} className={`w-full py-4 rounded-xl font-bold text-sm transition-all shadow-md flex justify-center items-center gap-2 ${loading ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 active:scale-[0.99]'}`}>
                    {loading ? (
                      <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Extracting File Data...</span>
                    ) : (
                      <>Start Extraction Processing</>
                    )}
                  </button>

                  {selected?.knowledge_base && Object.keys(selected.knowledge_base).length > 0 && (
                    <div className="bg-slate-800/80 rounded-2xl p-6 shadow-lg border border-slate-700 animate-in fade-in">
                      <h3 className="text-sm font-semibold text-slate-300 mb-6 border-b border-slate-700/50 pb-3 flex items-center gap-2">
                        <span className="text-blue-400">📄</span> Extracted Data Profiling
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.entries(selected.knowledge_base).map(([source, data], idx) => (
                          <div key={source} className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden animate-in zoom-in-95" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700/50">
                              <span className="font-semibold text-slate-200 capitalize text-sm">{source.replace(/_/g, ' ')} Document</span>
                            </div>
                            <div className="p-4 text-xs">
                              {Object.entries(data || {}).map(([k, v]) => (
                                <div key={k} className="flex gap-4 mb-2 pb-2 last:mb-0 last:pb-0 border-b border-slate-800/50 last:border-0">
                                  <span className="text-slate-400 font-medium min-w-[130px] capitalize">{k.replace(/_/g, ' ')}:</span>
                                  <span className="text-slate-200 break-words font-medium">{v}</span>
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
          )}

          {/* 4. Validate */}
          {tab === 'validate' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white tracking-wide">Validation Results</h1>
                <p className="text-slate-400 mt-1 text-sm">Compare document data against the uploaded CSV to ensure consistency.</p>
              </div>
              
              <SelectedBanner />

              {!selected && (
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-slate-700">
                  <div className="flex flex-col gap-4">
                    <span className="font-semibold text-slate-300">Select a candidate whose data has been extracted</span>
                    <SearchInput candidates={candidates.filter(c => c.has_knowledge_base && c.has_form)} onSelect={(c) => load(c.id)} placeholder="Search ready candidates..." />
                  </div>
                  {candidates.filter(c => c.has_knowledge_base && c.has_form).length === 0 && <p className="mt-4 text-amber-400/80 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">Please extract document data first.</p>}
                </div>
              )}

              {selected && (
                <>
                  <button onClick={validate} disabled={loading} className={`w-full mb-8 py-4 rounded-xl font-bold text-sm transition-all shadow-md flex justify-center items-center gap-2 ${loading ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 active:scale-[0.99]'}`}>
                    {loading ? 'Running Automated Verification...' : '✓ Start Validation Process'}
                  </button>

                  {selected?.validation_result && (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[{ n: selected.validation_result.overall_score+'%', l: 'Average Score', c: selected.validation_result.overall_score >= 80 ? 'text-emerald-400 border-emerald-500/30' : selected.validation_result.overall_score >= 50 ? 'text-amber-400 border-amber-500/30' : 'text-rose-400 border-rose-500/30' }, { n: selected.validation_result.correct_count, l: 'Verified Data', c: 'text-slate-200 border-slate-700' }, { n: selected.validation_result.ambiguous_count, l: 'Flagged Mismatch', c: 'text-amber-400 border-slate-700' }, { n: selected.validation_result.incorrect_count, l: 'Anomalies', c: 'text-rose-400 border-slate-700' }].map((s, i) => (
                           <div key={i} className={`bg-slate-800/80 rounded-xl p-5 border ${s.c} text-center shadow-sm`}>
                             <div className={`text-3xl font-bold mb-1 ${s.c.split(' ')[0]}`}>{s.n}</div>
                             <div className="text-xs font-semibold text-slate-400 uppercase">{s.l}</div>
                           </div>
                        ))}
                      </div>

                      {/* Field Validation List */}
                      <div className="bg-slate-800/80 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
                        <div className="bg-slate-900/50 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                          <h3 className="font-semibold text-slate-200 text-sm">Detailed Field Report</h3>
                        </div>

                        <div className="divide-y divide-slate-700/50">
                          {(selected.validation_result.validations || []).map((v, i) => (
                            <div key={i} className={`p-6 transition-colors ${v.status === 'INCORRECT' ? 'bg-rose-500/5' : v.status === 'AMBIGUOUS' ? 'bg-amber-500/5' : 'bg-transparent'}`}>
                              <div className="flex items-center gap-3 mb-4">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${v.status === 'CORRECT' ? 'bg-emerald-500/20 text-emerald-400' : v.status === 'INCORRECT' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {v.status === 'CORRECT' ? '✓' : v.status === 'INCORRECT' ? '✕' : '?'}
                                </span>
                                <h4 className="font-medium text-slate-200 capitalize text-base flex-1">{v.field?.replace(/_/g, ' ')}</h4>
                                <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${v.status === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-400' : v.status === 'INCORRECT' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {v.status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-9">
                                <div className="bg-slate-900/50 border text-sm border-slate-700/50 rounded-lg p-3">
                                  <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">CSV (Master File)</div>
                                  <div className="text-slate-300 text-xs font-medium">{v.form_value || <span className="opacity-40 italic">Not Provided</span>}</div>
                                </div>
                                <div className="bg-slate-900/50 border text-sm border-slate-700/50 rounded-lg p-3">
                                  <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Found in Document</div>
                                  <div className="text-slate-300 text-xs font-medium">{v.doc_value || <span className="opacity-40 italic">Not Found</span>}</div>
                                </div>
                              </div>
                              
                              {v.reason && (
                                <div className="ml-9 mt-3 text-xs text-slate-400 font-medium bg-slate-900/30 border border-slate-700/30 px-3 py-2 rounded-lg leading-relaxed">
                                  Note: {v.reason}
                                </div>
                              )}

                              {v.status === 'AMBIGUOUS' && (
                                <div className="ml-9 mt-4 flex gap-3">
                                  <button onClick={async () => {
                                    const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: v.field, resolution: 'CORRECT' }) });
                                    if (r.ok) { show('Marked as Correct'); load(selected.id); }
                                  }} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                    Approve Data
                                  </button>
                                  <button onClick={async () => {
                                    const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: v.field, resolution: 'INCORRECT' }) });
                                    if (r.ok) { show('Marked as Incorrect', 'error'); load(selected.id); }
                                  }} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                    Reject Data
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
          )}

        </div>
      </main>
    </div>
  );
}
