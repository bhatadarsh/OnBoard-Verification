import React, { useState, useEffect, useRef } from 'react';

const API = '/api/v1';

// Toast
const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6', color: '#fff', padding: '12px 20px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', gap: 8, alignItems: 'center' }}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      <span style={{ fontWeight: 500 }}>{msg}</span>
    </div>
  );
};

// Smart Search with Suggestions
const SearchInput = ({ candidates, onSelect, placeholder = "Search candidates...", width = 280 }) => {
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
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        style={{ padding: '8px 12px 8px 32px', border: '1px solid #e2e8f0', borderRadius: 6, width, fontSize: 12, outline: 'none' }}
      />
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}>🔍</span>
      {show && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => { onSelect(c); setQuery(''); setShow(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 12 }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = '#fff'}>
              <div style={{ fontWeight: 500, color: '#1e3a5f' }}>{c.full_name}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{c.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Gauge component
const Gauge = ({ value, label, color }) => {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${percent}, 100`} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 16, fontWeight: 700, color }}>{value}%</div>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{label}</div>
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
        if (btn) window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', width: 280 });
      }
    }, 100);
    document.head.appendChild(script);
  }, [googleConfig, onLogin]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 60, maxWidth: 850, alignItems: 'center' }}>
        <div style={{ color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🛡️</div>
            <div><div style={{ fontWeight: 700, fontSize: 18 }}>OnboardGuard</div><div style={{ fontSize: 11, opacity: 0.7 }}>Document Validation</div></div>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.1 }}>Welcome to<br /><span style={{ color: '#fbbf24' }}>OnboardGuard</span></h1>
          <p style={{ fontSize: 15, opacity: 0.85 }}>AI-powered onboarding document verification with OCR, smart matching & semantic analysis.</p>
        </div>
        <div style={{ background: '#fff', padding: 36, borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26 }}>🔐</div>
          <h2 style={{ textAlign: 'center', margin: '0 0 6px', color: '#1e3a5f', fontSize: 20, fontWeight: 700 }}>Welcome Back</h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 28 }}>Sign in to access the platform</p>
          {googleConfig?.configured && <div id="g-btn" style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}></div>}
          <button onClick={() => onLogin({ name: 'HR Admin', email: 'hr@sigmoid.com', picture: '' })} style={{ width: '100%', padding: 13, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>🚀 Continue with Demo</button>
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

  const show = (msg, type = 'success') => setToast({ msg, type });
  const refresh = () => fetch(`${API}/candidates`).then(r => r.json()).then(d => setCandidates(d.candidates || []));
  const load = async (id) => { const r = await fetch(`${API}/candidate/${id}`); if (r.ok) setSelected(await r.json()); };

  const deleteCandidate = async (id) => {
    if (!confirm('Delete this candidate?')) return;
    setLoading(true);
    const r = await fetch(`${API}/candidate/${id}`, { method: 'DELETE' });
    if (r.ok) { show('Deleted'); setSelected(null); refresh(); }
    setLoading(false);
  };

  const uploadForm = async () => {
    if (!formFile) return show('Select file', 'error');
    setLoading(true);
    const fd = new FormData(); fd.append('form_file', formFile);
    const r = await fetch(`${API}/onboarding/upload`, { method: 'POST', body: fd });
    const d = await r.json();
    if (r.ok) { show(`${d.candidates?.filter(c => c.status === 'created').length || 0} created, ${d.candidates?.filter(c => c.status === 'updated').length || 0} updated`); setFormFile(null); refresh(); }
    else show(d.detail || 'Failed', 'error');
    setLoading(false);
  };

  const uploadDocs = async () => {
    if (!selected) return show('Select candidate', 'error');
    if (!Object.values(docFiles).some(f => f)) return show('Select documents', 'error');
    setLoading(true);
    const fd = new FormData();
    Object.entries(docFiles).forEach(([k, f]) => f && fd.append(k, f));
    const r = await fetch(`${API}/documents/${selected.id}`, { method: 'POST', body: fd });
    if (r.ok) { show('Uploaded'); setDocFiles({}); refresh(); load(selected.id); }
    else show('Failed', 'error');
    setLoading(false);
  };

  const extract = async () => {
    if (!selected) return show('Select candidate', 'error');
    setLoading(true);
    show('Extracting (OCR + AI)...', 'info');
    const r = await fetch(`${API}/extract/${selected.id}`, { method: 'POST' });
    const d = await r.json();
    if (r.ok) { show(`Extracted from ${d.sources_extracted?.length || 0} sources`); refresh(); load(selected.id); }
    else show(d.detail || 'Failed', 'error');
    setLoading(false);
  };

  const validate = async () => {
    if (!selected) return show('Select candidate', 'error');
    setLoading(true);
    show('Smart validation in progress...', 'info');
    const r = await fetch(`${API}/validate/${selected.id}`, { method: 'POST' });
    const d = await r.json();
    if (r.ok) { show(`Score: ${d.summary?.overall_score || 0}%`); refresh(); load(selected.id); }
    else show(d.detail || 'Failed', 'error');
    setLoading(false);
  };

  const card = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 };
  const btn = (primary = true, color = '#1e3a5f') => ({ padding: '10px 18px', background: primary ? color : '#e2e8f0', color: primary ? '#fff' : '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 });
  const metric = (c) => ({ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${c}` });
  const chip = (active) => ({ padding: '6px 12px', borderRadius: 6, background: active ? '#1e3a5f' : '#f1f5f9', color: active ? '#fff' : '#475569', cursor: 'pointer', fontSize: 12, border: 'none' });

  if (!user) return <Login onLogin={setUser} />;

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Dashboard' },
    { id: 'candidates', icon: '👥', label: 'Candidates' },
    { id: 'form', icon: '📋', label: '1. Upload Form' },
    { id: 'docs', icon: '📄', label: '2. Documents' },
    { id: 'extract', icon: '🤖', label: '3. Build KB' },
    { id: 'validate', icon: '✅', label: '4. Validate' },
  ];

  // Combined document types (images accepted for ID docs)
  const docTypes = [
    { key: 'resume', label: 'Resume', icon: '📄', accept: '.pdf,.docx,.txt', hint: 'PDF, DOCX, TXT' },
    { key: 'hr_transcript', label: 'HR Interview', icon: '🎙️', accept: '.txt,.mp3,.wav,.m4a', hint: 'Text or Audio' },
    { key: 'aadhar', label: 'Aadhar Card', icon: '🪪', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
    { key: 'pan', label: 'PAN Card', icon: '💳', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
    { key: 'marksheet_10th', label: 'Marksheet (10th/12th)', icon: '📜', accept: '.png,.jpg,.jpeg,.pdf,.txt', hint: 'Image or PDF' },
  ];

  const firstName = user.name?.split(' ')[0] || 'User';

  // Stats calculations
  const totalCandidates = candidates.length;
  const withKB = candidates.filter(c => c.has_knowledge_base).length;
  const validated = candidates.filter(c => c.is_validated).length;
  const avgScore = validated > 0 ? Math.round(candidates.filter(c => c.is_validated).reduce((a, c) => a + (c.validation_score || 0), 0) / validated) : 0;
  const kbProgress = totalCandidates > 0 ? Math.round((withKB / totalCandidates) * 100) : 0;
  const validationProgress = totalCandidates > 0 ? Math.round((validated / totalCandidates) * 100) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Segoe UI, sans-serif' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <nav style={{ width: sidebar ? 200 : 52, background: '#1e3a5f', color: '#fff', transition: 'width 0.2s', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSidebar(!sidebar)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>☰</button>
          {sidebar && <span style={{ fontWeight: 700, fontSize: 14 }}>OnboardGuard</span>}
        </div>
        <div style={{ flex: 1, padding: '8px 4px' }}>
          {navItems.map(n => (
            <div key={n.id} onClick={() => setTab(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: sidebar ? '9px 12px' : 9, marginBottom: 2, borderRadius: 6, cursor: 'pointer', background: tab === n.id ? 'rgba(59,130,246,0.25)' : 'transparent', color: tab === n.id ? '#fff' : 'rgba(255,255,255,0.7)', justifyContent: sidebar ? 'flex-start' : 'center' }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>
              {sidebar && <span style={{ fontSize: 12 }}>{n.label}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.picture ? <img src={user.picture} referrerPolicy="no-referrer" style={{ width: 32, height: 32, borderRadius: '50%' }} alt="" /> : <div style={{ width: 32, height: 32, background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{firstName[0]}</div>}
            {sidebar && <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div><div style={{ fontSize: 10, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div></div>}
          </div>
          {sidebar && <button onClick={() => { localStorage.removeItem('og_user'); setUser(null); }} style={{ width: '100%', marginTop: 8, padding: 6, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 10 }}>Sign Out</button>}
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

        {/* Dashboard */}
        {tab === 'home' && (
          <>
            <h1 style={{ fontSize: 22, color: '#1e3a5f', margin: '0 0 20px' }}>Hi, {firstName} 👋</h1>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[{ n: totalCandidates, l: 'Total Candidates', c: '#3b82f6' }, { n: withKB, l: 'KB Built', c: '#10b981' }, { n: validated, l: 'Validated', c: '#8b5cf6' }, { n: `${avgScore}%`, l: 'Avg Score', c: '#f59e0b' }].map((m, i) => <div key={i} style={metric(m.c)}><div style={{ fontSize: 24, fontWeight: 700, color: m.c }}>{m.n}</div><div style={{ fontSize: 11, color: '#64748b' }}>{m.l}</div></div>)}
            </div>

            {/* Workflow Steps */}
            <div style={{ ...card, background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)' }}>
              <h3 style={{ fontSize: 14, color: '#1e3a5f', margin: '0 0 12px' }}>📋 Workflow</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ n: 1, t: 'Upload Form', d: 'CSV with any fields', tab: 'form' }, { n: 2, t: 'Upload Docs', d: 'PDF, Image, Audio', tab: 'docs' }, { n: 3, t: 'Build KB', d: 'OCR + AI extraction', tab: 'extract' }, { n: 4, t: 'Validate', d: 'Smart matching', tab: 'validate' }].map((s, i) => (
                  <div key={i} onClick={() => setTab(s.tab)} style={{ flex: 1, background: '#fff', padding: 14, borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, background: '#1e3a5f', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, margin: '0 auto 8px' }}>{s.n}</div>
                    <div style={{ fontWeight: 600, color: '#1e3a5f', fontSize: 13, marginBottom: 2 }}>{s.t}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{s.d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={card}>
                <h3 style={{ fontSize: 13, color: '#1e3a5f', margin: '0 0 16px' }}>📊 Progress Overview</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  <Gauge value={kbProgress} label="KB Built" color="#10b981" />
                  <Gauge value={validationProgress} label="Validated" color="#8b5cf6" />
                  <Gauge value={avgScore} label="Avg Score" color="#f59e0b" />
                </div>
              </div>
              <div style={card}>
                <h3 style={{ fontSize: 13, color: '#1e3a5f', margin: '0 0 16px' }}>📈 Recent Validations</h3>
                {candidates.filter(c => c.is_validated).slice(0, 4).length > 0 ? (
                  <div>
                    {candidates.filter(c => c.is_validated).slice(0, 4).map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 12, color: '#1e3a5f' }}>{c.full_name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.validation_score >= 80 ? '#10b981' : c.validation_score >= 50 ? '#f59e0b' : '#ef4444' }}>{c.validation_score}%</span>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>No validations yet</p>}
              </div>
            </div>

            {/* Features */}
            <div style={card}>
              <h3 style={{ fontSize: 13, color: '#1e3a5f', margin: '0 0 12px' }}>✨ Smart Features</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { icon: '📷', title: 'OCR Support', desc: 'Images → Text (Aadhar, PAN)' },
                  { icon: '📄', title: 'PDF/DOCX', desc: 'Resume extraction' },
                  { icon: '🎙️', title: 'Audio Transcription', desc: 'HR interviews' },
                  { icon: '📞', title: 'Phone Matching', desc: 'Ignores country codes' },
                  { icon: '🎓', title: 'Abbreviations', desc: 'BTech = Bachelor of Tech' },
                  { icon: '📍', title: 'Location Match', desc: 'Bangalore = Bengaluru' },
                ].map((f, i) => (
                  <div key={i} style={{ background: '#f8fafc', padding: 12, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#1e3a5f' }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Candidates Page */}
        {tab === 'candidates' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h1 style={{ fontSize: 18, color: '#1e3a5f', margin: 0 }}>👥 Candidates</h1>
              <SearchInput candidates={candidates} onSelect={(c) => { load(c.id); setTab('validate'); }} placeholder="Search candidates..." width={300} />
            </div>

            {candidates.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ color: '#64748b', margin: 0 }}>No candidates yet. Upload onboarding form first.</p>
              </div>
            ) : (
              <table style={{ width: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}><th style={{ padding: 12 }}>Name</th><th style={{ padding: 12 }}>Email</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Score</th><th style={{ padding: 12 }}>Actions</th></tr></thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12, fontWeight: 500 }}>{c.full_name}</td>
                      <td style={{ padding: 12, color: '#64748b' }}>{c.email || '-'}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.has_form && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>Form</span>}
                          {c.has_knowledge_base && <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>KB</span>}
                          {c.is_validated && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>Done</span>}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>{c.is_validated ? <span style={{ fontWeight: 600, color: c.validation_score >= 80 ? '#10b981' : c.validation_score >= 50 ? '#f59e0b' : '#ef4444' }}>{c.validation_score}%</span> : '-'}</td>
                      <td style={{ padding: 12 }}>
                        <button onClick={() => { load(c.id); setTab('validate'); }} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 6 }}>View</button>
                        <button onClick={() => deleteCandidate(c.id)} style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* 1. Upload Form */}
        {tab === 'form' && (
          <>
            <h1 style={{ fontSize: 18, color: '#1e3a5f', margin: '0 0 16px' }}>📋 Step 1: Upload Onboarding Form</h1>
            <div style={card}>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
                <strong>Supports any CSV fields!</strong> Semantic mapping handles: email_id → email, phone_no → phone, highest_qualification → degree, etc.
              </p>
              <input type="file" accept=".csv,.xlsx,.xls" id="form" style={{ display: 'none' }} onChange={e => setFormFile(e.target.files?.[0])} />
              <label htmlFor="form" style={{ display: 'block', padding: 32, border: formFile ? '2px solid #10b981' : '2px dashed #e2e8f0', borderRadius: 8, textAlign: 'center', cursor: 'pointer', background: formFile ? '#f0fdf4' : '#f8fafc' }}>
                {formFile ? <><div style={{ fontSize: 32, marginBottom: 8 }}>📄</div><div style={{ color: '#10b981', fontWeight: 600 }}>{formFile.name}</div></> : <><div style={{ fontSize: 32, marginBottom: 8 }}>📤</div><div style={{ color: '#64748b' }}>Drop CSV/Excel here</div></>}
              </label>
              <button onClick={uploadForm} disabled={loading} style={{ ...btn(), width: '100%', marginTop: 12, opacity: loading ? 0.6 : 1 }}>{loading ? '⏳ Uploading...' : '📋 Upload & Create Candidates'}</button>
            </div>
          </>
        )}

        {/* 2. Documents */}
        {tab === 'docs' && (
          <>
            <h1 style={{ fontSize: 18, color: '#1e3a5f', margin: '0 0 16px' }}>📄 Step 2: Upload Documents</h1>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Select Candidate</span>
                <SearchInput candidates={candidates} onSelect={(c) => load(c.id)} placeholder="Search..." width={280} />
              </div>
              {selected && <div style={{ padding: 8, background: '#eff6ff', borderRadius: 6, fontSize: 12 }}>Selected: <strong>{selected.full_name}</strong></div>}
              {!selected && candidates.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{candidates.slice(0, 8).map(c => <button key={c.id} onClick={() => load(c.id)} style={chip(false)}>{c.full_name}</button>)}</div>}
              {candidates.length === 0 && <p style={{ color: '#f59e0b', fontSize: 12 }}>⚠️ Upload form first</p>}
            </div>
            {selected && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {docTypes.map(d => (
                    <div key={d.key} style={{ ...card, marginBottom: 0, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{d.icon}</span>
                        <div><div style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f' }}>{d.label}</div><div style={{ fontSize: 9, color: '#94a3b8' }}>{d.hint}</div></div>
                      </div>
                      <input type="file" id={d.key} accept={d.accept} style={{ display: 'none' }} onChange={e => setDocFiles({ ...docFiles, [d.key]: e.target.files?.[0] })} />
                      <label htmlFor={d.key} style={{ display: 'block', padding: 10, border: docFiles[d.key] ? '2px solid #10b981' : '2px dashed #e2e8f0', borderRadius: 6, textAlign: 'center', cursor: 'pointer', fontSize: 11 }}>{docFiles[d.key] ? <span style={{ color: '#10b981' }}>✓ {docFiles[d.key].name.substring(0, 15)}...</span> : 'Select'}</label>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={uploadDocs} disabled={loading} style={btn()}>{loading ? '⏳...' : '📤 Upload Documents'}</button>
                  <button onClick={() => setDocFiles({})} style={btn(false)}>Clear</button>
                </div>
              </>
            )}
          </>
        )}

        {/* 3. Extract */}
        {tab === 'extract' && (
          <>
            <h1 style={{ fontSize: 18, color: '#1e3a5f', margin: '0 0 16px' }}>🤖 Step 3: Build Knowledge Base</h1>
            <div style={card}>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>Uses <strong>OCR</strong> for images, <strong>PDF extraction</strong> for documents, <strong>Whisper</strong> for audio.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Select Candidate</span>
                <SearchInput candidates={candidates} onSelect={(c) => load(c.id)} placeholder="Search..." width={280} />
              </div>
              {selected && <div style={{ padding: 8, background: '#eff6ff', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>Selected: <strong>{selected.full_name}</strong> {selected.has_knowledge_base && '✓ KB exists'}</div>}
              {!selected && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{candidates.slice(0, 8).map(c => <button key={c.id} onClick={() => load(c.id)} style={chip(false)}>{c.full_name} {c.has_knowledge_base && '✓'}</button>)}</div>}
              <button onClick={extract} disabled={loading || !selected} style={{ ...btn(), opacity: loading || !selected ? 0.6 : 1 }}>{loading ? '⏳ Extracting (OCR+AI)...' : '🤖 Build Knowledge Base'}</button>
            </div>
            {selected?.knowledge_base && Object.keys(selected.knowledge_base).length > 0 && (
              <div style={card}>
                <h3 style={{ fontSize: 14, color: '#1e3a5f', margin: '0 0 12px' }}>📚 Extracted Knowledge Base</h3>
                {Object.entries(selected.knowledge_base).map(([source, data]) => (
                  <div key={source} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, color: '#3b82f6', fontSize: 12, marginBottom: 6, textTransform: 'capitalize' }}>📄 {source.replace(/_/g, ' ')}</div>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                      {Object.entries(data || {}).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: '#64748b', minWidth: 140, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
                          <span style={{ color: '#1e3a5f', fontWeight: 500 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 4. Validate */}
        {tab === 'validate' && (
          <>
            <h1 style={{ fontSize: 18, color: '#1e3a5f', margin: '0 0 16px' }}>✅ Step 4: Validate Candidate</h1>
            <div style={card}>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>
                <strong>Smart matching:</strong> Phone codes ignored • Abbreviations expanded • Locations normalized
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Select Candidate</span>
                <SearchInput candidates={candidates.filter(c => c.has_knowledge_base && c.has_form)} onSelect={(c) => load(c.id)} placeholder="Search validated..." width={280} />
              </div>
              {selected && <div style={{ padding: 8, background: '#eff6ff', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>Selected: <strong>{selected.full_name}</strong> {selected.is_validated && `(Score: ${selected.validation_score}%)`}</div>}
              {!selected && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {candidates.filter(c => c.has_knowledge_base && c.has_form).slice(0, 8).map(c => (
                    <button key={c.id} onClick={() => load(c.id)} style={chip(false)}>{c.full_name} {c.is_validated && `${c.validation_score}%`}</button>
                  ))}
                  {candidates.filter(c => c.has_knowledge_base && c.has_form).length === 0 && <p style={{ color: '#f59e0b', fontSize: 12, margin: 0 }}>⚠️ Build KB first</p>}
                </div>
              )}
              <button onClick={validate} disabled={loading || !selected} style={{ ...btn(true, '#10b981'), opacity: loading || !selected ? 0.6 : 1 }}>{loading ? '⏳ Validating...' : '✅ Run Validation'}</button>
            </div>

            {selected?.validation_result && (
              <>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={metric('#10b981')}><div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{selected.validation_result.overall_score || 0}%</div><div style={{ fontSize: 11, color: '#64748b' }}>Score</div></div>
                  <div style={metric('#3b82f6')}><div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{selected.validation_result.correct_count || 0}</div><div style={{ fontSize: 11, color: '#64748b' }}>Correct</div></div>
                  <div style={metric('#f59e0b')}><div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{selected.validation_result.ambiguous_count || 0}</div><div style={{ fontSize: 11, color: '#64748b' }}>Ambiguous</div></div>
                  <div style={metric('#ef4444')}><div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{selected.validation_result.incorrect_count || 0}</div><div style={{ fontSize: 11, color: '#64748b' }}>Incorrect</div></div>
                </div>

                {/* Field Details */}
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: 0, fontSize: 14, color: '#1e3a5f' }}>📋 Field-by-Field Validation: {selected.full_name}</h3>
                  </div>

                  <div style={{ padding: 12, background: '#fffbeb', borderBottom: '1px solid #fcd34d', fontSize: 11 }}>
                    <strong>Legend:</strong>
                    <span style={{ marginLeft: 12, color: '#166534' }}>✓ CORRECT</span> = Matches (smart matching applied)
                    <span style={{ marginLeft: 12, color: '#991b1b' }}>✗ INCORRECT</span> = Mismatch
                    <span style={{ marginLeft: 12, color: '#92400e' }}>? AMBIGUOUS</span> = Not found
                  </div>

                  {(selected.validation_result.validations || []).map((v, i) => (
                    <div key={i} style={{ padding: 16, background: v.status === 'INCORRECT' ? '#fef2f2' : v.status === 'AMBIGUOUS' ? '#fffbeb' : '#f0fdf4', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, color: v.status === 'CORRECT' ? '#166534' : v.status === 'INCORRECT' ? '#991b1b' : '#92400e' }}>
                          {v.status === 'CORRECT' ? '✓' : v.status === 'INCORRECT' ? '✗' : '?'}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1e3a5f', textTransform: 'capitalize', flex: 1 }}>{v.field?.replace(/_/g, ' ')}</span>
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: v.status === 'CORRECT' ? '#dcfce7' : v.status === 'INCORRECT' ? '#fee2e2' : '#fef3c7', color: v.status === 'CORRECT' ? '#166534' : v.status === 'INCORRECT' ? '#991b1b' : '#92400e' }}>{v.status}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
                        <div><div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>📋 Form Value</div><div style={{ fontSize: 12, color: '#1e3a5f', fontWeight: 500, background: '#fff', padding: 6, borderRadius: 4 }}>{v.form_value || '-'}</div></div>
                        <div><div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>📄 Document Value</div><div style={{ fontSize: 12, color: '#1e3a5f', fontWeight: 500, background: '#fff', padding: 6, borderRadius: 4 }}>{v.doc_value || '-'}</div></div>
                      </div>
                      {v.reason && <div style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.5)', padding: 8, borderRadius: 4, marginBottom: v.status === 'AMBIGUOUS' ? 8 : 0 }}>💡 {v.reason}</div>}
                      {v.status === 'AMBIGUOUS' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={async () => {
                            const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: v.field, resolution: 'CORRECT' }) });
                            if (r.ok) { show('Marked as Correct'); load(selected.id); }
                          }} style={{ padding: '5px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Mark Correct</button>
                          <button onClick={async () => {
                            const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: v.field, resolution: 'INCORRECT' }) });
                            if (r.ok) { show('Marked as Incorrect'); load(selected.id); }
                          }} style={{ padding: '5px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>✗ Mark Incorrect</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
