import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const STATUS_META = {
  Pending:   { color: '#475569', bg: 'rgba(71,85,105,0.1)',  border: 'rgba(71,85,105,0.25)',  label: 'Pending'   },
  Ingested:  { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)', label: 'Ingested' },
  Extracted: { color: '#00e5ff', bg: 'rgba(0,229,255,0.1)',  border: 'rgba(0,229,255,0.25)',  label: 'Extracted' },
  Verified:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', label: 'Verified'  },
};

function getStatus(c) {
  if (c.is_validated) return 'Verified';
  if (c.has_knowledge_base) return 'Extracted';
  if (c.has_form) return 'Ingested';
  return 'Pending';
}

function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: '#334155', fontWeight: 700, fontSize: 13 }}>—</span>;
  const col = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
  return <span style={{ fontWeight: 900, fontSize: 18, color: col, fontFamily: "'Outfit',sans-serif" }}>{score}%</span>;
}

function PipelineBar({ candidate }) {
  const stages = [
    { done: candidate.has_form, color: '#818cf8', label: 'Form' },
    { done: (candidate.uploaded_documents?.length > 0) || candidate.has_knowledge_base, color: '#00e5ff', label: 'Docs' },
    { done: candidate.has_knowledge_base, color: '#10b981', label: 'KB' },
    { done: candidate.is_validated, color: '#f59e0b', label: 'Valid' },
  ];
  return (
    <div style={{ display: 'flex', gap: 2, height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6, maxWidth: 100 }}>
      {stages.map((s, i) => (
        <div key={i} style={{ flex: 1, background: s.done ? s.color : 'rgba(255,255,255,0.04)', borderRadius: 1, transition: 'background 0.4s' }} title={s.label} />
      ))}
    </div>
  );
}

export default function Candidates() {
  const { candidates, load, triggerDelete } = useOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = candidates.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#10b981', letterSpacing: '0.2em', marginBottom: 8 }}>// ONBOARDGUARD</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>Candidates</h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 5 }}>{candidates.length} profile{candidates.length !== 1 ? 's' : ''} in pipeline</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 260, padding: '10px 14px 10px 36px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, color: '#e8f0fe', fontSize: 13, fontFamily: "'Outfit',sans-serif", outline: 'none', transition: 'all 0.2s' }}
            onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.35)'; e.target.style.background = 'rgba(0,229,255,0.03)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'rgba(10,22,40,0.7)', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 20, padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>👥</div>
          <p style={{ color: '#334155', fontSize: 14 }}>{search ? 'No matching candidates.' : 'No candidates yet. Upload a CSV to get started.'}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(16px)' }}>
          {/* Table Head */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.4fr 1fr 1fr', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(5,14,26,0.6)' }}>
            {['Candidate', 'Email', 'Pipeline Status', 'Match Score', 'Actions'].map((h, i) => (
              <div key={h} style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: i === 4 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((c, idx) => {
            const status = getStatus(c);
            const meta = STATUS_META[status];
            return (
              <div
                key={c.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.4fr 1fr 1fr', padding: '16px 24px', borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#818cf8', flexShrink: 0 }}>
                    {c.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe' }}>{c.full_name}</div>
                    <div style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>ID: {c.id?.slice(0,12)}...</div>
                    <PipelineBar candidate={c} />
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: 12, color: '#475569' }}>{c.email || '—'}</div>

                {/* Status */}
                <div>
                  <span style={{ padding: '4px 10px', borderRadius: 7, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em' }}>
                    {meta.label}
                  </span>
                  {c.documents?.forensic_alerts?.length > 0 && (
                    <span style={{ marginLeft: 6, padding: '3px 7px', borderRadius: 5, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e', fontSize: 9, fontWeight: 700 }}>⚠ TAMPER</span>
                  )}
                </div>

                {/* Score */}
                <ScoreBadge score={c.is_validated ? c.validation_score : null} />

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={() => { load(c.id); navigate('/onboarding/docs'); }}
                    style={{ padding: '7px 14px', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, color: '#00e5ff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.07)'; }}
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => triggerDelete(c)}
                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 8, color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.15)'; e.currentTarget.style.color = '#f43f5e'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.05)'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
