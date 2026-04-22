import React, { useState, useEffect, useRef } from 'react';
import { ONBOARD_API } from '../../config/api';
import './OnboardGuard.css';

/**
 * OnboardValidate — real extraction + validation via OnBoard-Verification backend.
 *
 * Flow:
 *   1. Admin selects candidate
 *   2. Click "Extract" → POST /api/v1/extract/{id} (SSE streaming logs)
 *   3. Click "Validate" → POST /api/v1/validate/{id} → real field comparison
 *   4. Show field-by-field results with CORRECT / INCORRECT / AMBIGUOUS tags
 */
const STATUS_STYLE = {
  CORRECT:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  INCORRECT: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  AMBIGUOUS: { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
};

const OnboardValidate = () => {
  const [candidates, setCandidates]     = useState([]);
  const [selected, setSelected]         = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');

  // Extraction state
  const [extracting, setExtracting]     = useState(false);
  const [extractLogs, setExtractLogs]   = useState([]);
  const [extractDone, setExtractDone]   = useState(false);
  const [extractError, setExtractError] = useState(null);

  // Validation state
  const [validating, setValidating]     = useState(false);
  const [validation, setValidation]     = useState(null);
  const [valError, setValError]         = useState(null);

  const logEndRef = useRef(null);

  // Fetch candidates once
  useEffect(() => {
    fetch(`${ONBOARD_API}/api/v1/candidates`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setCandidates(d.candidates || []))
      .catch(e => console.warn('Could not fetch OnBoard candidates:', e));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [extractLogs]);

  const resetCandidate = (c) => {
    setSelected(c);
    setExtractLogs([]);
    setExtractDone(false);
    setExtractError(null);
    setValidation(null);
    setValError(null);
  };

  // ── Step 1: Extract (SSE streaming) ────────────────────────────────────────
  const handleExtract = async () => {
    if (!selected) return;
    setExtracting(true);
    setExtractLogs([]);
    setExtractDone(false);
    setExtractError(null);
    setValidation(null);

    try {
      const res = await fetch(`${ONBOARD_API}/api/v1/extract/${selected.id}`, { method: 'POST' });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Extract failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep incomplete last frame

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.type === 'log' || payload.type === 'stream') {
                setExtractLogs(prev => [...prev, payload.message]);
              }
              if (payload.type === 'result') {
                setExtractDone(true);
              }
              if (payload.type === 'error') {
                setExtractError(payload.message);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
      setExtractDone(true);
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  // ── Step 2: Validate ────────────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!selected) return;
    setValidating(true);
    setValError(null);
    setValidation(null);

    try {
      const res = await fetch(`${ONBOARD_API}/api/v1/validate/${selected.id}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Validation failed (${res.status})`);
      }
      const data = await res.json();
      setValidation(data.details);
    } catch (err) {
      setValError(err.message);
    } finally {
      setValidating(false);
    }
  };

  // ── Step 3: Reset Data ──────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!selected) return;
    if (!window.confirm("Are you sure you want to completely wipe all uploaded documents and validation data for this candidate?")) return;
    
    try {
      const res = await fetch(`${ONBOARD_API}/api/v1/documents/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to reset candidate data');
      
      // Reset UI state
      setExtractDone(false);
      setValidation(null);
      setExtractLogs([]);
      alert("Candidate data successfully wiped. You can now upload new documents.");
    } catch (err) {
      alert("Error resetting data: " + err.message);
    }
  };

  // ── Resolve ambiguous field ─────────────────────────────────────────────────
  const handleResolve = async (field, resolution) => {
    if (!selected) return;
    try {
      const res = await fetch(`${ONBOARD_API}/api/v1/resolve/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, resolution }),
      });
      if (!res.ok) throw new Error('Resolve failed');
      const data = await res.json();
      // Refresh validation state
      setValidation(prev => ({
        ...prev,
        validations: prev.validations.map(v =>
          v.field === field ? { ...v, status: resolution } : v
        ),
        overall_score: data.new_score,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="onboard-container">
      <div className="view-title">
        <h1>Validation Report</h1>
        <p>Extract knowledge from documents, then compare against the candidate's onboarding form.</p>
      </div>

      {/* Candidate selector */}
      <div style={{ position: 'relative', zIndex: 1000, marginBottom: '20px' }}>
        <div className="ob-search-box">
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input 
            type="text" 
            className="ob-search-input" 
            placeholder="Select candidate to run validation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {!selected && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {candidates
              .filter(c => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.email?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(c => (
                <div 
                  key={c.id} 
                  className="ob-upload-card" 
                  style={{ alignItems: 'flex-start', padding: '16px', textAlign: 'left', cursor: 'pointer', border: '1.5px solid #e2e8f0' }}
                  onClick={() => resetCandidate(c)}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="admin-avatar" style={{ background: '#3b82f6', width: '36px', height: '36px', fontSize: '16px' }}>
                      {(c.full_name || c.first_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{c.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{c.email}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {candidates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '16px', border: '1.5px dashed #e2e8f0' }}>
              <p>No candidates available. Import a CSV first.</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 20 }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              className="topbar-btn"
              style={{ opacity: extracting ? 0.7 : 1 }}
              disabled={extracting}
              onClick={handleExtract}
            >
              {extracting ? '⚙️ Extracting...' : extractDone ? '🔄 Re-Extract Documents' : '⚙️ Extract from Documents'}
            </button>

            {(extractDone || validation) && (
              <button
                className="topbar-btn"
                style={{ background: '#4f46e5', opacity: validating ? 0.7 : 1 }}
                disabled={validating}
                onClick={handleValidate}
              >
                {validating ? '🔍 Validating...' : '🔍 Run Validation'}
              </button>
            )}

            <button
              className="topbar-btn"
              style={{ background: '#ef4444', marginLeft: 'auto' }}
              onClick={handleReset}
            >
              🗑️ Clear Candidate Data
            </button>
          </div>

          {/* SSE Extraction log */}
          {extractLogs.length > 0 && (
            <div style={{ background: '#0f172a', borderRadius: 12, padding: '16px 20px', marginBottom: 20, maxHeight: 220, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
              {extractLogs.map((log, i) => (
                <div key={i} style={{ color: log.startsWith('>') ? '#22d3ee' : '#e2e8f0', marginBottom: 2 }}>{log}</div>
              ))}
              {extracting && <div style={{ color: '#a3e635' }}>▶ Processing...</div>}
              <div ref={logEndRef} />
            </div>
          )}

          {extractError && (
            <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, color: '#dc2626', marginBottom: 16 }}>
              ❌ Extraction error: {extractError}
              <br /><small>Ensure documents are uploaded first via the Upload Docs tab.</small>
            </div>
          )}

          {valError && (
            <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, color: '#dc2626', marginBottom: 16 }}>
              ❌ Validation error: {valError}
            </div>
          )}

          {/* Validation results */}
          {validation && (
            <div className="animate-in fade-in">
              {/* Score cards */}
              <div className="ob-stat-grid" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Match Score',  value: `${validation.overall_score}%`, accent: validation.overall_score >= 80 ? '#10b981' : '#f59e0b' },
                  { label: 'Correct',      value: validation.correct_count,       accent: '#10b981' },
                  { label: 'Ambiguous',    value: validation.ambiguous_count,     accent: '#f59e0b' },
                  { label: 'Incorrect',    value: validation.incorrect_count,     accent: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} className="ob-stat-card" style={{ '--accent': s.accent }}>
                    <div className="ob-stat-value">{s.value}</div>
                    <div className="ob-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Field breakdown */}
              <div className="ob-report">
                <div className="ob-report-header">
                  <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                    Detailed Field Analysis
                  </span>
                  <button
                    className="tbl-btn"
                    style={{ fontSize: '11px', fontWeight: 700, padding: '6px 14px' }}
                    onClick={() => { window.print(); }}
                  >
                    📥 Export Report
                  </button>
                </div>
                <div className="ob-report-content">
                  {(validation.validations || []).map((v, i) => {
                    const sty = STATUS_STYLE[v.status] || STATUS_STYLE.AMBIGUOUS;
                    return (
                      <div key={i} className="ob-field-row">
                        <div>
                          <div className="ob-field-label">{v.field?.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{v.reason}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Form Value</div>
                          <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#334155' }}>{v.form_value || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Doc Value</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#334155' }}>{v.doc_value || '—'}</div>
                            <span
                              className={`ob-status-pill status-${v.status?.toLowerCase()}`}
                              style={{ background: sty.bg, color: sty.color, border: `1px solid ${sty.border}` }}
                            >
                              {v.status}
                            </span>
                          </div>
                          {v.status === 'AMBIGUOUS' && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              <button
                                className="tbl-btn edit"
                                style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={() => handleResolve(v.field, 'CORRECT')}
                              >✓ Mark Correct</button>
                              <button
                                className="tbl-btn del"
                                style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={() => handleResolve(v.field, 'INCORRECT')}
                              >✗ Mark Incorrect</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnboardValidate;
