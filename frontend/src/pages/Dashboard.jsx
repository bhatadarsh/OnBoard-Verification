import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Gauge from '../components/Gauge';

function AnimatedValue({ value }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const target = typeof value === 'number' ? value : parseInt(value) || 0;
    const from = prev.current;
    prev.current = target;
    if (target === from) { setDisplay(target); return; }
    const dur = 800, start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
}

const StatCard = ({ value, suffix, label, color, borderColor, icon }) => (
  <div style={{
    background: 'rgba(10,22,40,0.85)', border: `1px solid ${borderColor}`, borderRadius: 16,
    padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12,
    backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${color}15`; e.currentTarget.style.borderColor = `${color}40`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = borderColor; }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)` }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 38, fontWeight: 900, color, lineHeight: 1 }}>
      {typeof value === 'number' ? <AnimatedValue value={value} /> : value}{suffix || ''}
    </div>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono',monospace" }}>{label}</div>
  </div>
);

export default function Dashboard() {
  const { candidates, refresh } = useOutletContext();
  const navigate = useNavigate();

  const total       = candidates.length;
  const withKB      = candidates.filter(c => c.has_knowledge_base).length;
  const validated   = candidates.filter(c => c.is_validated).length;
  const avgScore    = validated > 0
    ? Math.round(candidates.filter(c => c.is_validated).reduce((a, c) => a + (c.validation_score || 0), 0) / validated)
    : 0;
  const kbPct       = total > 0 ? Math.round((withKB / total) * 100) : 0;
  const validPct    = total > 0 ? Math.round((validated / total) * 100) : 0;
  const recentValid = candidates.filter(c => c.is_validated).slice(0, 5);

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#10b981', letterSpacing: '0.2em', marginBottom: 8 }}>// ONBOARDGUARD</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>Compliance Dashboard</h1>
          <p style={{ color: '#475569', fontSize: 14, marginTop: 6 }}>Real-time overview of the onboarding verification pipeline.</p>
        </div>
        <button
          onClick={refresh}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.color = '#00e5ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#64748b'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="enter-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard value={total}       label="Total Candidates"   color="#818cf8" borderColor="rgba(129,140,248,0.2)" icon="👥" />
        <StatCard value={withKB}      label="KB Indexed"         color="#00e5ff" borderColor="rgba(0,229,255,0.2)"   icon="🧠" />
        <StatCard value={validated}   label="Validated"          color="#10b981" borderColor="rgba(16,185,129,0.2)"  icon="✅" />
        <StatCard value={avgScore} suffix="%" label="Avg Match Score" color="#f59e0b" borderColor="rgba(245,158,11,0.2)"  icon="📊" />
      </div>

      {/* Two columns: gauges + recent */}
      <div className="enter-stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Pipeline Progress */}
        <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '28px 32px', backdropFilter: 'blur(16px)' }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.15em', marginBottom: 20, textTransform: 'uppercase' }}>Pipeline Progress</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
            <Gauge value={kbPct}    label="Extracted"  colorClass="text-cyan-400"    strokeColor="#00e5ff" />
            <Gauge value={validPct} label="Validated"  colorClass="text-indigo-400"  strokeColor="#6366f1" />
            <Gauge value={avgScore} label="Avg Score"  colorClass="text-emerald-400" strokeColor="#10b981" />
          </div>
        </div>

        {/* Recently Validated */}
        <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '28px 32px', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.15em', marginBottom: 20, textTransform: 'uppercase' }}>Recent Validations</div>
          {recentValid.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              No validations yet. Upload candidates to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentValid.map((c) => {
                const score = c.validation_score || 0;
                const col = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${col}15`, border: `1px solid ${col}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: col }}>
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{c.full_name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: col }}>{score}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 18, padding: '28px 32px', backdropFilter: 'blur(16px)' }}>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.15em', marginBottom: 20, textTransform: 'uppercase' }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Add Candidates',    icon: '📄', route: '/onboarding/form',      color: '#6366f1' },
            { label: 'Upload Documents',  icon: '📎', route: '/onboarding/docs',      color: '#00e5ff' },
            { label: 'Run Validation',    icon: '✅', route: '/onboarding/validate',  color: '#10b981' },
            { label: 'View Candidates',   icon: '👥', route: '/onboarding/candidates', color: '#818cf8' },
          ].map((action) => (
            <button
              key={action.route}
              onClick={() => navigate(action.route)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: `${action.color}0C`, border: `1px solid ${action.color}20`, borderRadius: 12, color: action.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${action.color}18`; e.currentTarget.style.borderColor = `${action.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${action.color}0C`; e.currentTarget.style.borderColor = `${action.color}20`; }}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
