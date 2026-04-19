import React from 'react';
import { useOutletContext } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API = `${API_BASE}/api/v1`;

const maskPII = (val) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '••••••••••')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '•••• •••• ••••');
};

function ScoreRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const col = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ position: 'relative', width: 128, height: 128 }}>
      <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (circ * (score / 100))}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${col})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: col, lineHeight: 1, textShadow: `0 0 12px ${col}30` }}>{score}%</div>
        <div style={{ fontSize: 9, color: '#475569', fontFamily: "'JetBrains Mono',monospace", marginTop: 4, letterSpacing: '0.1em' }}>MATCH</div>
      </div>
    </div>
  );
}

export default function Validate() {
  const { candidates, selected, load, loading, validate, show, setPreviewFile } = useOutletContext();

  const validationResult = selected?.validation_result;
  const validations = validationResult?.validations || [];

  const canValidate = selected?.has_knowledge_base && selected?.has_form;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#10b981', letterSpacing: '0.2em', marginBottom: 8 }}>// STEP 3 OF 3</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>Compliance Validation</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 5 }}>Cross-reference extracted document data against the onboarding CSV using LangGraph agents.</p>
      </div>

      {/* Candidate Selector if not selected */}
      {!selected && (
        <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '28px', backdropFilter: 'blur(16px)' }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Select a candidate with an extracted Knowledge Base:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {candidates.filter(c => c.has_knowledge_base && c.has_form).map(c => (
              <button key={c.id} onClick={() => load(c.id)}
                style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9, color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.07)'; }}
              >{c.full_name}</button>
            ))}
          </div>
          {candidates.filter(c => c.has_knowledge_base).length === 0 && (
            <div style={{ padding: '16px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginTop: 16 }}>
              <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>⚠ No candidates with extracted Knowledge Base found. Upload and process documents first.</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <>
          {/* Selected Candidate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 13, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                {selected.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>{selected.full_name}</div>
                <div style={{ fontSize: 10, color: '#10b981', fontFamily: "'JetBrains Mono',monospace" }}>
                  {selected.is_validated ? 'VALIDATED' : selected.has_knowledge_base ? 'KB READY' : 'AWAITING EXTRACTION'}
                </div>
              </div>
            </div>
            {/* Run Validation Button */}
            <button
              onClick={validate}
              disabled={loading || !canValidate}
              style={{
                padding: '10px 24px', borderRadius: 11, border: 'none',
                background: (loading || !canValidate) ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#10b981,#059669)',
                color: (loading || !canValidate) ? '#334155' : '#fff',
                fontSize: 13, fontWeight: 800, cursor: (loading || !canValidate) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || !canValidate) ? 'none' : '0 8px 24px rgba(16,185,129,0.3)',
                fontFamily: "'Outfit',sans-serif", transition: 'all 0.25s',
              }}
            >
              {loading ? '⏳ Validating...' : selected.is_validated ? '↻ Re-Validate' : '▶ Run Validation'}
            </button>
          </div>

          {/* Forensic Alerts */}
          {selected?.documents?.forensic_alerts?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 13, marginBottom: 20 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#f43f5e', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>Document Forensics Alert</div>
                {selected.documents.forensic_alerts.map((a, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#f87171', fontFamily: "'JetBrains Mono',monospace", marginBottom: 4, lineHeight: 1.5 }}>{a}</div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div>
              {/* Score + Metrics */}
              <div className="enter-stagger" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 24, background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '28px 32px', backdropFilter: 'blur(16px)' }}>
                <ScoreRing score={validationResult.overall_score || 0} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#e8f0fe' }}>Validation Complete</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { n: validationResult.correct_count,   l: 'Verified',  col: '#10b981' },
                      { n: validationResult.ambiguous_count, l: 'Ambiguous', col: '#f59e0b' },
                      { n: validationResult.incorrect_count, l: 'Failed',    col: '#f43f5e' },
                    ].map((m) => (
                      <div key={m.l} style={{ padding: '10px 18px', background: `${m.col}0A`, border: `1px solid ${m.col}20`, borderRadius: 11, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: m.col }}>{m.n}</div>
                        <div style={{ fontSize: 9, color: '#475569', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>{m.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Redacted Doc Links */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.keys(selected.documents || {}).filter(k => k !== 'forensic_alerts').map(docName => (
                      <button key={docName}
                        onClick={() => setPreviewFile({ url: `${API}/documents/${selected.id}/${docName}/redacted`, title: `Redacted — ${docName.replace(/_/g, ' ')}` })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#818cf8', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
                      >
                        🔏 {docName.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field Breakdown */}
              <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, overflow: 'hidden', backdropFilter: 'blur(16px)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(5,14,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Detailed Field Report — {validations.length} fields checked</div>
                </div>

                {validations.map((v, i) => {
                  const isCorrect   = v.status === 'CORRECT';
                  const isIncorrect = v.status === 'INCORRECT';
                  const isAmbiguous = v.status === 'AMBIGUOUS';
                  const col = isCorrect ? '#10b981' : isIncorrect ? '#f43f5e' : '#f59e0b';
                  const sym = isCorrect ? '✓' : isIncorrect ? '✕' : '?';

                  return (
                    <div key={i} style={{
                      padding: '20px 24px',
                      borderBottom: i < validations.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      background: isIncorrect ? 'rgba(244,63,94,0.03)' : isAmbiguous ? 'rgba(245,158,11,0.03)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${col}12`, border: `1px solid ${col}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: col, flexShrink: 0 }}>
                          {sym}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe', flex: 1, textTransform: 'capitalize' }}>{v.field?.replace(/_/g, ' ')}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 6, background: `${col}10`, border: `1px solid ${col}20`, color: col, fontSize: 9, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.1em' }}>{v.status}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginLeft: 38 }}>
                        {[
                          { label: 'CSV (Master)', value: maskPII(v.form_value), accent: '#334155' },
                          { label: 'Extracted Source', value: maskPII(v.doc_value), accent: '#00e5ff' },
                        ].map((side) => (
                          <div key={side.label} style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.04)`, borderRadius: 9, padding: '10px 14px', borderLeft: `3px solid ${side.accent}` }}>
                            <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono',monospace", color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{side.label}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace" }}>{side.value || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>null</span>}</div>
                          </div>
                        ))}
                      </div>

                      {v.reason && (
                        <div style={{ marginLeft: 38, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8 }}>
                          <span style={{ fontSize: 10, color: '#475569', fontFamily: "'JetBrains Mono',monospace" }}>{'>'} {v.reason}</span>
                          {v.reason.toLowerCase().includes('semantic') && (
                            <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 8, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.1em' }}>AI SEMANTIC</span>
                          )}
                        </div>
                      )}

                      {isAmbiguous && (
                        <div style={{ marginLeft: 38, marginTop: 12, display: 'flex', gap: 10 }}>
                          {[
                            { label: '✓ Accept', resolution: 'CORRECT', color: '#10b981' },
                            { label: '✕ Reject', resolution: 'INCORRECT', color: '#f43f5e' },
                          ].map(({ label, resolution, color }) => (
                            <button key={resolution}
                              onClick={async () => {
                                const token = localStorage.getItem('token');
                                const r = await fetch(`${API}/resolve/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ field: v.field, resolution }) });
                                if (r.ok) { show(`Marked as ${resolution}`); load(selected.id); }
                              }}
                              style={{ padding: '7px 16px', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 8, color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
                              onMouseLeave={e => e.currentTarget.style.background = `${color}08`}
                            >{label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
