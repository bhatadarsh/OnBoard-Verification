import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MODULES = [
  {
    id: 'interview',
    icon: '🎙️',
    label: 'INTERVIEW AGENT',
    title: 'AI-Conducted Interviews',
    desc: 'Real-time voice interviews powered by Groq (Llama 3). Offline transcription via Faster-Whisper. YOLOv8 fraud detection catches phones, multiple persons, and tab-switching in real time.',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.2)',
    tags: ['Faster-Whisper STT', 'YOLOv8 Anti-Cheat', 'LangGraph Grader'],
  },
  {
    id: 'extraction',
    icon: '🧬',
    label: 'KNOWLEDGE BASE',
    title: 'Heterogeneous Extraction',
    desc: 'Aadhar, PAN, Passports, and Resumes are ingested and parsed into structured JSON profiles via AI-powered OCR. Simultaneously embedded into ChromaDB for semantic search and MongoDB for raw storage.',
    color: '#00e5ff',
    glow: 'rgba(0,229,255,0.2)',
    tags: ['ChromaDB Vector Store', 'MongoDB Raw Store', 'LLM OCR Pipeline'],
  },
  {
    id: 'onboardguard',
    icon: '🛡️',
    label: 'ONBOARDGUARD',
    title: 'Compliance Verification',
    desc: 'Cross-references candidate inputs against the Knowledge Base using fuzzy-matching and LangGraph agents. Incremental delta-scoring for new documents. AES-256 PII auto-redaction on disk.',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.2)',
    tags: ['Incremental Validation', 'AES-256 Redaction', 'LangGraph Matcher'],
  },
];

const STATS = [
  { val: '99%', label: 'Bias Reduction' },
  { val: '3', label: 'Integrated Modules' },
  { val: '4HR', label: 'Saved Per Hire' },
  { val: '0', label: 'Azure Dependencies' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule(prev => (prev + 1) % MODULES.length);
      setTick(t => t + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const active = MODULES[activeModule];

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#020811', color: '#e8f0fe', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)', top: -200, right: -100, filter: 'blur(60px)', animation: 'blobFloat 20s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', bottom: -200, left: -100, filter: 'blur(60px)', animation: 'blobFloat 25s ease-in-out infinite alternate-reverse' }} />
      </div>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        padding: scrolled ? '14px 8%' : '24px 8%',
        background: scrolled ? 'rgba(2,8,17,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,229,255,0.08)' : '1px solid transparent',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00e5ff, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #00e5ff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI HirePro
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#00e5ff', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 6, padding: '2px 8px', letterSpacing: '0.1em' }}>ENTERPRISE</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '10px 22px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.color = '#e8f0fe'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { e.target.style.color = '#94a3b8'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 8px 24px rgba(99,102,241,0.35)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.35)'; }}
          >
            Get Started →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 10, padding: '180px 8% 100px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'pulse-glow 2s infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#10b981', letterSpacing: '0.15em' }}>ALL SYSTEMS OPERATIONAL — v2.0</span>
          </div>

          <h1 style={{ fontSize: 'clamp(52px, 7vw, 100px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-4px', marginBottom: 32 }}>
            <span style={{ display: 'block', color: '#ffffff' }}>Hire Smarter.</span>
            <span style={{ display: 'block', background: 'linear-gradient(135deg, #00e5ff 0%, #6366f1 60%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Verify Faster.
            </span>
          </h1>

          <p style={{ fontSize: 20, color: '#94a3b8', lineHeight: 1.7, maxWidth: 620, marginBottom: 48 }}>
            The world's most advanced AI-powered recruitment platform. From semantic resume matching to real-time voice interviews and post-hire compliance verification — fully automated, fully integrated.
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/register')}
              style={{ padding: '16px 40px', fontSize: 16, background: 'linear-gradient(135deg, #00e5ff, #0ea5e9)', color: '#020811', border: 'none', borderRadius: 14, fontWeight: 900, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 12px 40px rgba(0,229,255,0.3)', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-4px)'; e.target.style.boxShadow = '0 20px 50px rgba(0,229,255,0.5)'; }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 12px 40px rgba(0,229,255,0.3)'; }}
            >
              Launch Your AI Assistant ⚡
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '16px 40px', fontSize: 16, background: 'transparent', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 14, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.3s' }}
              onMouseEnter={e => { e.target.style.background = 'rgba(99,102,241,0.1)'; e.target.style.borderColor = 'rgba(99,102,241,0.7)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(99,102,241,0.4)'; }}
            >
              Admin Portal →
            </button>
          </div>
        </div>

        {/* Floating terminal card */}
        <div className="hero-terminal" style={{
          position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)',
          width: 380, background: 'rgba(10,22,40,0.9)', border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 20, padding: 28, backdropFilter: 'blur(20px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,229,255,0.05)',
          display: 'flex', flexDirection: 'column',
          animation: 'float 6s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ marginLeft: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#475569' }}>ai-hirepro.sh</span>
          </div>
          {[
            { color: '#10b981', text: '✓ Interview Agent online' },
            { color: '#00e5ff', text: '✓ ChromaDB connected' },
            { color: '#00e5ff', text: '✓ MongoDB connected' },
            { color: '#818cf8', text: '✓ OnboardGuard active' },
            { color: '#f59e0b', text: '↗ Processing 3 candidates...' },
          ].map((line, i) => (
            <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: line.color, marginBottom: 10, opacity: 0, animation: `fade-in 0.4s ease ${0.3 + i * 0.2}s forwards` }}>
              {line.text}
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569' }}>$</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94a3b8', borderRight: '2px solid #00e5ff', paddingRight: 2, animation: 'pulse-glow 1s infinite' }}>_</span>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.03), transparent)', padding: '50px 8%' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1, marginBottom: 8 }}>{s.val}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* THREE MODULES */}
      <section style={{ position: 'relative', zIndex: 10, padding: '120px 8%' }}>
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00e5ff', letterSpacing: '0.2em' }}>
            <span style={{ width: 20, height: 1, background: '#00e5ff', display: 'inline-block' }} />
            INTEGRATED MODULES
            <span style={{ width: 20, height: 1, background: '#00e5ff', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, letterSpacing: '-2px', color: '#ffffff', marginBottom: 16 }}>
            Three Engines. One Platform.
          </h2>
          <p style={{ color: '#64748b', fontSize: 18, maxWidth: 580, margin: '0 auto' }}>
            Each module operates independently yet shares a unified data layer — candidates flow seamlessly from interview to onboarding.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, maxWidth: 1100, margin: '0 auto' }}>
          {MODULES.map((mod, i) => (
            <div
              key={mod.id}
              onClick={() => setActiveModule(i)}
              style={{
                padding: 40, borderRadius: 24,
                background: activeModule === i ? `rgba(${mod.color === '#6366f1' ? '99,102,241' : mod.color === '#00e5ff' ? '0,229,255' : '16,185,129'},0.06)` : 'rgba(10,22,40,0.6)',
                border: `1px solid ${activeModule === i ? mod.color + '40' : 'rgba(255,255,255,0.05)'}`,
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: activeModule === i ? `0 20px 60px ${mod.glow}` : 'none',
                transform: activeModule === i ? 'translateY(-4px)' : 'none',
              }}
            >
              <div style={{ width: 60, height: 60, borderRadius: 16, background: `${mod.color}15`, border: `1px solid ${mod.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 24, transition: 'all 0.3s' }}>
                {mod.icon}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: mod.color, letterSpacing: '0.2em', marginBottom: 12 }}>{mod.label}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#e8f0fe', marginBottom: 16, letterSpacing: '-0.5px' }}>{mod.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>{mod.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {mod.tags.map(t => (
                  <span key={t} style={{ padding: '4px 10px', borderRadius: 6, background: `${mod.color}12`, color: mod.color, fontSize: 11, fontWeight: 700, border: `1px solid ${mod.color}25`, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SPLIT */}
      <section style={{ position: 'relative', zIndex: 10, padding: '80px 8% 120px' }}>
        <div className="cta-grid" style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Admin CTA */}
          <div style={{ padding: 48, borderRadius: 28, background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(20px)', textAlign: 'center', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(99,102,241,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: 48, marginBottom: 20 }}>🎛️</div>
            <h3 style={{ fontSize: 26, fontWeight: 900, color: '#818cf8', marginBottom: 12 }}>I'm an Admin</h3>
            <p style={{ color: '#64748b', marginBottom: 32, lineHeight: 1.6 }}>Manage JDs, review candidates, launch AI interviews, and oversee onboarding compliance.</p>
            <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 8px 24px rgba(99,102,241,0.35)', transition: 'all 0.3s' }}>
              Enter Mission Control →
            </button>
          </div>
          {/* Candidate CTA */}
          <div style={{ padding: 48, borderRadius: 28, background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(0,229,255,0.15)', backdropFilter: 'blur(20px)', textAlign: 'center', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,229,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.15)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
            <h3 style={{ fontSize: 26, fontWeight: 900, color: '#00e5ff', marginBottom: 12 }}>I'm a Candidate</h3>
            <p style={{ color: '#64748b', marginBottom: 32, lineHeight: 1.6 }}>Upload your resume, complete an AI-powered technical interview, and track your application status.</p>
            <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #00e5ff, #0ea5e9)', color: '#020811', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 8px 24px rgba(0,229,255,0.25)', transition: 'all 0.3s' }}>
              Start Application →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.04)', padding: '40px 8%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #00e5ff, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
          <span style={{ fontSize: 14, fontWeight: 700, background: 'linear-gradient(90deg, #00e5ff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI HirePro Enterprise</span>
        </div>
        <div style={{ fontSize: 12, color: '#1e293b' }}>© 2026 AI HirePro Intelligence. All rights reserved.</div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(-50%) translateY(0px); }
          50%       { transform: translateY(-50%) translateY(-18px); }
        }
        @keyframes blobFloat {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(40px,-60px) scale(1.08); }
          66%  { transform: translate(-30px,30px) scale(0.92); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @media (max-width: 1100px) {
          .hero-terminal { display: none !important; }
        }
        @media (max-width: 768px) {
          .cta-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
}
