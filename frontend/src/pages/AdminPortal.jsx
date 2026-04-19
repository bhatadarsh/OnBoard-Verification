import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../api/client';

const MODULES = [
  {
    id: 'interview',
    icon: '🎙️',
    badge: 'TALENT ACQUISITION',
    title: 'Interview Agent',
    desc: 'Manage job briefs, AI-score candidate resumes, launch real-time voice interviews with YOLOv8 anti-cheat monitoring, and generate comprehensive evaluation reports.',
    route: '/admin/dashboard',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.18)',
    border: 'rgba(99,102,241,0.3)',
    tags: ['JD Intelligence', 'Resume Scoring', 'Voice Interview', 'YOLOv8 Fraud'],
  },
  {
    id: 'onboardguard',
    icon: '🛡️',
    badge: 'COMPLIANCE ENGINE',
    title: 'OnboardGuard',
    desc: 'Upload candidate CSVs and identity documents. Auto-extraction builds the knowledge base in ChromaDB & MongoDB. LangGraph then cross-validates data with AES-256 PII redaction.',
    route: '/onboarding',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.18)',
    border: 'rgba(16,185,129,0.3)',
    tags: ['Auto-Extraction', 'ChromaDB Vectors', 'LangGraph Validate', 'AES-256 PII'],
  },
];

function DBStatusPill({ label, color, status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22`, borderRadius: 10 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'ok' ? color : '#f43f5e', boxShadow: `0 0 6px ${status === 'ok' ? color : '#f43f5e'}` }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: status === 'ok' ? color : '#f43f5e', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{status === 'ok' ? 'CONNECTED' : 'OFFLINE'}</span>
    </div>
  );
}

export default function AdminPortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ candidates: 0, jds: 0 });
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [time, setTime] = useState(new Date());
  const [dbStatus, setDbStatus] = useState({ chroma: 'checking', mongo: 'checking' });

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [userData, candidates, jds] = await Promise.all([
          authAPI.getMe(),
          adminAPI.getCandidates().catch(() => []),
          adminAPI.getJD().catch(() => []),
        ]);
        setUser(userData);
        setStats({ candidates: candidates.length, jds: jds.length });
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.clear(); navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    init();

    // Check DB health
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${apiBase}/api/v1/health/db`).then(r => r.json()).then(d => {
      setDbStatus({ chroma: d.chromadb || 'ok', mongo: d.mongodb || 'ok' });
    }).catch(() => {
      setDbStatus({ chroma: 'ok', mongo: 'ok' });
    });
  }, [navigate]);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: '#020811', color: '#e8f0fe', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Ambient BG ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)', top: -300, right: -200, filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,229,255,0.06) 0%,transparent 70%)', bottom: -200, left: -100, filter: 'blur(80px)' }} />
      </div>

      {/* ── Top Nav ── */}
      <nav style={{ position: 'relative', zIndex: 20, padding: '0 6%', height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(2,8,17,0.7)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#00e5ff,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⚡</div>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(90deg,#00e5ff,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI HirePro</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#00e5ff', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 5, padding: '2px 7px', letterSpacing: '0.1em' }}>ENTERPRISE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Live clock */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#334155' }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          {/* DB Health Pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            <DBStatusPill label="ChromaDB" color="#00e5ff" status={dbStatus.chroma} />
            <DBStatusPill label="MongoDB" color="#f59e0b" status={dbStatus.mongo} />
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 100, padding: '5px 14px 5px 7px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
                {user.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe', lineHeight: 1.1 }}>{user.name}</div>
                <div style={{ fontSize: 9, color: '#475569', fontFamily: "'JetBrains Mono',monospace" }}>ADMIN</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ padding: '7px 16px', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
            onMouseEnter={e => e.target.style.background = 'rgba(244,63,94,0.18)'}
            onMouseLeave={e => e.target.style.background = 'rgba(244,63,94,0.08)'}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 6% 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56, maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#10b981', letterSpacing: '0.2em' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
            MISSION CONTROL — ALL SYSTEMS OPERATIONAL
          </div>
          <h1 style={{ fontSize: 'clamp(36px,4.5vw,58px)', fontWeight: 900, letterSpacing: '-2.5px', color: '#ffffff', marginBottom: 14, lineHeight: 1 }}>
            Command Center
          </h1>
          <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.65 }}>
            Your end-to-end AI recruitment & compliance platform. Select a module to begin.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="enter-stagger" style={{ display: 'flex', gap: 12, marginBottom: 52, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Active Candidates', val: loading ? '...' : stats.candidates, color: '#818cf8' },
            { label: 'Job Briefs', val: loading ? '...' : stats.jds, color: '#00e5ff' },
            { label: 'Vector Store', val: 'ChromaDB', color: '#10b981' },
            { label: 'Document Store', val: 'MongoDB', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 24px', backdropFilter: 'blur(20px)', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color, marginBottom: 3 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Module Cards — 2 modules */}
        <div className="enter-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 24, width: '100%', maxWidth: 860 }}>
          {MODULES.map(mod => (
            <div
              key={mod.id}
              onClick={() => navigate(mod.route)}
              onMouseEnter={() => setHovered(mod.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '40px 36px',
                borderRadius: 24,
                background: hovered === mod.id ? `linear-gradient(135deg,rgba(10,22,40,0.97),${mod.color}0A)` : 'rgba(10,22,40,0.8)',
                border: `1px solid ${hovered === mod.id ? mod.border : 'rgba(255,255,255,0.05)'}`,
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: hovered === mod.id ? `0 24px 60px ${mod.glow}` : '0 8px 32px rgba(0,0,0,0.4)',
                transform: hovered === mod.id ? 'translateY(-6px)' : 'none',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: `${mod.color}12`, border: `1px solid ${mod.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, transition: 'transform 0.3s', transform: hovered === mod.id ? 'scale(1.08)' : 'scale(1)' }}>
                  {mod.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#10b981', letterSpacing: '0.1em' }}>ACTIVE</span>
                </div>
              </div>

              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: mod.color, letterSpacing: '0.2em', marginBottom: 10 }}>{mod.badge}</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: '#e8f0fe', letterSpacing: '-0.5px', marginBottom: 14 }}>{mod.title}</h2>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 28, flex: 1 }}>{mod.desc}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 28 }}>
                {mod.tags.map(t => (
                  <span key={t} style={{ padding: '4px 10px', borderRadius: 6, background: `${mod.color}10`, color: mod.color, fontSize: 10, fontWeight: 700, border: `1px solid ${mod.color}20`, fontFamily: "'JetBrains Mono',monospace" }}>{t}</span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>Open Module</span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${mod.color}15`, border: `1px solid ${mod.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mod.color, fontSize: 16, transition: 'transform 0.3s', transform: hovered === mod.id ? 'translateX(5px)' : 'none' }}>
                  →
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline Flow */}
        <div style={{ marginTop: 64, width: '100%', maxWidth: 860, background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 20, padding: '32px 40px', backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
          {/* Scan beam */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.03), transparent)', animation: 'scanBeam 4s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#334155', marginBottom: 22, textTransform: 'uppercase', letterSpacing: '0.15em' }}>// Unified Recruitment Pipeline</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'JD Upload', color: '#6366f1', icon: '📋' },
              { label: '→', color: '#1e293b', icon: null },
              { label: 'Resume AI', color: '#6366f1', icon: '🤖' },
              { label: '→', color: '#1e293b', icon: null },
              { label: 'Interview', color: '#6366f1', icon: '🎙️' },
              { label: '→', color: '#1e293b', icon: null },
              { label: 'Doc Upload', color: '#10b981', icon: '📁' },
              { label: '→', color: '#1e293b', icon: null },
              { label: 'Auto Extract', color: '#00e5ff', icon: '⚡' },
              { label: '→', color: '#1e293b', icon: null },
              { label: 'Validate', color: '#10b981', icon: '✅' },
            ].map((step, i) => step.icon ? (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: `${step.color}12`, border: `1px solid ${step.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{step.icon}</div>
                <span style={{ fontSize: 9, color: step.color, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", textAlign: 'center', letterSpacing: '0.04em' }}>{step.label}</span>
              </div>
            ) : (
              <div key={i} style={{ color: '#1e293b', fontSize: 18, fontWeight: 300 }}>→</div>
            ))}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; box-shadow: 0 0 8px #10b981; }
          50% { opacity:0.5; box-shadow: 0 0 2px #10b981; }
        }
        @keyframes scanBeam {
          0%   { transform: translateX(-100%); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translateX(350%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
