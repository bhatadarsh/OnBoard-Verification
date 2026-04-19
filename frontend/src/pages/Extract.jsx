import React, { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';

const maskPII = (val) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '••••••••••')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '•••• •••• ••••');
};

const StreamingTerminal = ({ logs, loading }) => {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!loading && logs.length === 0) return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 14, padding: 20, marginTop: 16, border: '1px solid rgba(0,229,255,0.15)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, maxHeight: 320, overflowY: 'auto', boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, position: 'sticky', top: 0, background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#334155' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#475569' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b' }} />
        <span style={{ color: '#475569', fontSize: 10, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#00e5ff', animation: 'pulse-glow 1s infinite' }}>●</span> Extraction Engine — Live
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.6, wordBreak: 'break-all' }}>
        {logs.map((log, idx) => (
          <div key={idx} style={{ fontWeight: 500, whiteSpace: 'pre-wrap', color: log.startsWith('>') ? '#00e5ff' : idx === logs.length - 1 ? '#e8f0fe' : '#64748b' }}>
            {log}
          </div>
        ))}
        {loading && (
          <div style={{ color: '#00e5ff', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ animation: 'pulse-glow 1s infinite' }}>_</span>
            <span style={{ fontSize: 10, color: '#475569' }}>Awaiting stream...</span>
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
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#10b981', letterSpacing: '0.2em', marginBottom: 8 }}>// KNOWLEDGE BASE BUILDER</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>Data Extraction</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 5 }}>Extract structured field data from uploaded candidate documents and build the Knowledge Base.</p>
      </div>

      {!selected && (
        <div style={{ background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: 28, backdropFilter: 'blur(16px)' }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Select a candidate to extract data from their uploaded documents:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {candidates.filter(c => c.has_form).map(c => (
              <button key={c.id} onClick={() => load(c.id)}
                style={{ padding: '8px 16px', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 9, color: '#00e5ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.07)'}
              >{c.full_name}</button>
            ))}
          </div>
          {candidates.filter(c => c.has_form).length === 0 && (
            <div style={{ padding: 16, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginTop: 16 }}>
              <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>No candidates with uploaded documents found. Upload documents first.</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div>
          {/* Selected Candidate Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 13, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#00e5ff' }}>
                {selected.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe' }}>{selected.full_name}</div>
                <div style={{ fontSize: 10, color: '#00e5ff', fontFamily: "'JetBrains Mono',monospace" }}>
                  {selected.has_knowledge_base ? 'KB INDEXED' : 'AWAITING EXTRACTION'}
                </div>
              </div>
            </div>
          </div>

          {/* Extract Button */}
          <button
            onClick={extract}
            disabled={loading}
            style={{
              width: '100%', padding: 16, borderRadius: 13, border: loading ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,229,255,0.3)',
              background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(0,229,255,0.08)',
              color: loading ? '#475569' : '#00e5ff',
              fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: "'Outfit',sans-serif", transition: 'all 0.3s',
              boxShadow: loading ? 'none' : '0 0 20px rgba(0,229,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,0.2)'; }}}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,229,255,0.1)'; }}}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00e5ff', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
                Interfacing with LLM...
              </>
            ) : (
              '⚡ Start Extraction Processing'
            )}
          </button>

          <StreamingTerminal logs={extractLogs || []} loading={loading} />

          {/* Knowledge Base Display */}
          {selected?.knowledge_base && Object.keys(selected.knowledge_base).length > 0 && !loading && (
            <div style={{ background: 'rgba(10,22,40,0.8)', borderRadius: 18, padding: 28, marginTop: 24, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace" }}>
                <span style={{ color: '#00e5ff', fontSize: 16 }}>⌬</span> Extracted Knowledge Base Profiles
              </h3>

              <div className="enter-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {Object.entries(selected.knowledge_base).map(([source, data]) => (
                  <div key={source} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(5,14,26,0.8)', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', opacity: 0.6 }} />
                      <span style={{ fontWeight: 700, color: '#e8f0fe', textTransform: 'capitalize', fontSize: 11, letterSpacing: '0.08em', fontFamily: "'JetBrains Mono',monospace" }}>{source.replace(/_/g, ' ')} Schema</span>
                    </div>
                    <div style={{ padding: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                      {Object.entries(data || {}).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: 16, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: 4, transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ color: '#00e5ff', opacity: 0.5, fontWeight: 500, minWidth: 130, flexShrink: 0 }}>{k}:</span>
                          <span style={{ color: '#cbd5e1', wordBreak: 'break-words', fontWeight: 500 }}>{maskPII(v)}</span>
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

      <style>{`
        @keyframes pulse-glow { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Extract;
