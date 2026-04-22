import { useState } from 'react';
import { RECRO_API, INTERVIEW_AI_API } from '../../config/api';
import './CandidateProfile.css';

/* ── No hardcoded demo data. Integrity flags and turn breakdown come from
   the AI Interview backend after the interview is completed. ── */


/* ── Status badge ── */
function StatusBadge({ status }) {
  const MAP = {
    'Under Review':         { bg: '#eff6ff', color: '#1d4ed8' },
    'Shortlisted':          { bg: '#f0fdf4', color: '#15803d' },
    'Interview Scheduled':  { bg: '#fefce8', color: '#a16207' },
    'Interviewed':          { bg: '#f0fdfa', color: '#0f766e' },
    'Rejected':             { bg: '#fef2f2', color: '#dc2626' },
    'Offered':              { bg: '#f5f3ff', color: '#7c3aed' },
  };
  const s = MAP[status] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span className="cp-status-badge" style={{ background: s.bg, color: s.color }}>
      {status?.toUpperCase()}
    </span>
  );
}

/* ── Schedule Interview Modal ── */
function ScheduleModal({ applicant, jobTitle, onClose, onScheduled }) {
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('');
  const [link, setLink]       = useState('');
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!date || !time) { setError('Date and Time are required.'); return; }
    setLoading(true);
    setError(null);

    const scheduledAt = `${date}T${time}:00`;

    try {
      const res = await fetch(`${RECRO_API}/api/interview/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id:   applicant.candidate_id || applicant.candidateId || applicant.id,
          job_id:         applicant.job_id || applicant.jobId || null,
          scheduled_at:   scheduledAt,
          interview_link: link || null,
          notes:          notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Scheduling failed');
      }
      const data = await res.json();
      onScheduled(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-modal-backdrop" onClick={e => e.target.classList.contains('cp-modal-backdrop') && onClose()}>
      <div className="cp-modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
        <div className="cp-header">
          <div>
            <div className="cp-applied-for">SCHEDULE INTERVIEW FOR: <strong>{applicant.name}</strong></div>
            <div className="cp-name-row">
              <span style={{ fontSize: 13, color: '#64748b' }}>{jobTitle}</span>
            </div>
          </div>
          <button className="cp-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 0 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                Time *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
              Interview Link (Zoom / Meet / Teams)
            </label>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://meet.google.com/xyz-abc-def"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
              Notes to Candidate
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Please be ready 5 minutes early. Bring your original documents."
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              ❌ {error}
            </div>
          )}

          <div className="cp-footer-actions">
            <button type="button" className="cp-action-btn ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="cp-action-btn primary"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? '📨 Scheduling...' : '📅 Confirm & Send Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Post-interview Integrity Report ── */
function IntegrityReport({ profile, onBack }) {
  const [turnExpanded, setTurnExpanded] = useState(true);

  const interviewResult  = profile.interviewResult || {};
  const integrityFlags   = interviewResult.integrity_flags || [];
  const turnBreakdown    = interviewResult.turn_breakdown  || [];
  const cheatScore       = interviewResult.cheating_score  ?? 0;
  const tabCount         = interviewResult.tab_change_count ?? 0;

  // Derive risk level from cheating_score (0-20 scale: each camera event adds 0.3–1.5 pts)
  const riskLevel    = cheatScore >= 10 ? 'HIGH' : cheatScore >= 3 ? 'MEDIUM' : 'LOW';
  const isSuspicious = riskLevel !== 'LOW';

  // Build human-readable causes based on score magnitude
  // Backend penalty scale: multi-person +1.0, mobile +1.0, combined +1.5, out-of-frame +0.3, suspicious obj +0.5
  const likelyCauses = [];
  if (cheatScore >= 10) likelyCauses.push({ icon: '👥', label: 'Multiple people detected in frame', detail: 'Camera detected more than one person present during the interview session repeatedly.' });
  if (cheatScore >= 5)  likelyCauses.push({ icon: '📱', label: 'Mobile device detected', detail: 'A mobile phone or secondary device was visible in the camera frame.' });
  if (cheatScore >= 3)  likelyCauses.push({ icon: '🚶', label: 'Candidate frequently left frame', detail: 'Candidate was out of camera frame multiple times during the session.' });
  if (tabCount > 2)     likelyCauses.push({ icon: '🔀', label: `Tab/window switching (${tabCount}×)`, detail: 'Browser focus left the interview tab multiple times — possible external resource lookup.' });

  // Use specific logged events if available, else show the analysis block
  const hasSpecificEvents = integrityFlags.length > 0;
  const hasData = turnBreakdown.length > 0 || cheatScore > 0 || integrityFlags.length > 0;

  return (
    <div className="cp-integrity-report" id="integrity-report">
      <div className="cp-ir-header">
        <div className="cp-ir-title-row">
          <div>
            <div className="cp-ir-applied">APPLIED FOR: <strong>{profile.appliedFor}</strong></div>
            <div className="cp-ir-name">{profile.candidate}</div>
            <StatusBadge status={profile.status} />
          </div>
          <button className="cp-close-btn" onClick={onBack} id="btn-close-profile">✕</button>
        </div>

        {/* ── Suspicious activity banner ── */}
        {isSuspicious && (
          <div style={{
            margin: '10px 0 4px', padding: '10px 16px', borderRadius: 8,
            background: riskLevel === 'HIGH' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${riskLevel === 'HIGH' ? '#fca5a5' : '#fcd34d'}`,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 20 }}>{riskLevel === 'HIGH' ? '🚨' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: riskLevel === 'HIGH' ? '#b91c1c' : '#92400e' }}>
                {riskLevel === 'HIGH' ? 'HIGH RISK — Admin Review Required' : 'Suspicious Activity Detected'}
              </div>
              <div style={{ fontSize: 11, color: riskLevel === 'HIGH' ? '#991b1b' : '#78350f', marginTop: 2 }}>
                Integrity score: {cheatScore.toFixed(1)} · {riskLevel === 'HIGH'
                  ? 'Multiple behavioural anomalies detected during the interview. Do not proceed without manual review.'
                  : 'Some anomalous behaviour was detected. Cross-check with turn scores before proceeding.'}
              </div>
            </div>
          </div>
        )}

        <div className="cp-metrics-row">
          {[
            { label: 'PROCTOR RISK',  value: riskLevel,            color: { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' }[riskLevel] },
            { label: 'CHEAT SCORE',   value: `${cheatScore.toFixed(1)}/20`, color: cheatScore >= 10 ? '#dc2626' : cheatScore >= 3 ? '#d97706' : '#16a34a' },
            { label: 'TAB SHIFTS',    value: tabCount > 0 ? String(tabCount) : '0', color: tabCount > 2 ? '#dc2626' : '#0f172a' },
            { label: 'BRIEF MATCH',   value: profile.briefMatch,   color: '#0f172a' },
            { label: 'INTERVIEW REC', value: profile.interviewRec, color: profile.interviewRec?.includes('YES') ? '#16a34a' : '#d97706' },
          ].map((m, i) => (
            <div key={i} className="cp-metric-card">
              <div className="cp-metric-label">{m.label}</div>
              <div className="cp-metric-value" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎮</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No Interview Data Available</div>
          <div style={{ fontSize: 13 }}>This candidate has not completed an AI interview yet.<br/>Integrity flags and turn scores will appear here after the interview is conducted.</div>
        </div>
      ) : (
        <>
          <div className="cp-ir-section">
            <div className="cp-ir-section-title">
              🚩 Integrity Analysis
              {riskLevel === 'LOW' && <span style={{ fontSize: 11, color: '#16a34a', marginLeft: 8, fontWeight: 600 }}>✓ No issues detected</span>}
              {riskLevel === 'MEDIUM' && <span style={{ fontSize: 11, color: '#d97706', marginLeft: 8, fontWeight: 600 }}>⚠ Review recommended</span>}
              {riskLevel === 'HIGH'   && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 8, fontWeight: 600 }}>🚨 Manual review required</span>}
            </div>

            {/* Specific logged events (from tab switches, real-time flags with timestamps) */}
            {hasSpecificEvents && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 6 }}>LOGGED EVENTS (Top 10)</div>
                {integrityFlags.slice(0, 10).map((flag, i) => {
                  const formatTime = (t) => {
                    if (!t) return '';
                    if (typeof t === 'string' && t.includes(':')) return t;
                    return new Date(t < 10000000000 ? t * 1000 : t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  };
                  return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 12px', marginBottom: 4, borderRadius: 6,
                    background: '#fef2f2', border: '1px solid #fca5a5'
                  }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', marginRight: 8 }}>{formatTime(flag.time)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>{(flag.events || []).join(' · ')}</span>
                    </div>
                    {flag.score != null && <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700, background: '#fee2e2', padding: '1px 7px', borderRadius: 4 }}>+{flag.score} pts</span>}
                  </div>
                )})}
                {integrityFlags.length > 10 && <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>... and {integrityFlags.length - 10} more events</div>}
              </div>
            )}

            {/* Camera AI analysis */}
            {cheatScore > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 8 }}>
                  AI CAMERA ANALYSIS — Score: {cheatScore.toFixed(1)}/20
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>(Real-time video frame monitoring)</span>
                </div>
                {likelyCauses.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Low-level anomaly detected (score {cheatScore.toFixed(1)}). No specific category triggered.</div>
                ) : likelyCauses.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 12px', marginBottom: 6, borderRadius: 8,
                    background: riskLevel === 'HIGH' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${riskLevel === 'HIGH' ? '#fca5a5' : '#fcd34d'}`
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: riskLevel === 'HIGH' ? '#991b1b' : '#78350f', marginBottom: 2 }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{c.detail}</div>
                    </div>
                  </div>
                ))}

                {/* Admin checklist */}
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: 1, marginBottom: 8 }}>📋 ADMIN REVIEW CHECKLIST</div>
                  {[
                    'Request candidate to re-confirm interview was conducted alone and without aids',
                    'Cross-reference turn scores — high scores despite misconduct may indicate answer assistance',
                    'Check if weak turns (2.5/10) correlate with intervals where misconduct was flagged',
                    cheatScore >= 10 ? 'Consider scheduling a secondary verification call before making offer decision' : null,
                    tabCount > 0 ? `Candidate switched tabs ${tabCount} time(s) — verify they were not using external resources` : null,
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#475569', marginBottom: 4, lineHeight: 1.4 }}>
                      <span style={{ color: '#d97706', marginTop: 1 }}>◆</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean session */}
            {cheatScore === 0 && !hasSpecificEvents && (
              <div style={{ fontSize: 12, color: '#16a34a', padding: '8px 0' }}>
                ✅ No integrity violations detected. Session completed without anomalies.
              </div>
            )}
          </div>

          <div className="cp-ir-section">
            <button className="cp-turn-toggle" onClick={() => setTurnExpanded(v => !v)}>
              {turnExpanded ? '▼' : '▶'} Detailed Turn Breakdown
            </button>
            {turnExpanded && (
              <div className="cp-turns-list">
                {turnBreakdown.map((t, i) => {
                  const scoreNum   = Number(t.score ?? 0);
                  const maxNum     = Number(t.max   ?? 10);
                  const pct        = Math.round((scoreNum / maxNum) * 100);
                  const scoreColor = scoreNum >= 7 ? '#15803d' : scoreNum >= 5 ? '#b45309' : '#b91c1c';
                  const scoreBg    = scoreNum >= 7 ? '#f0fdf4' : scoreNum >= 5 ? '#fffbeb' : '#fef2f2';
                  const scoreTag   = scoreNum >= 7 ? 'Strong' : scoreNum >= 5 ? 'Average' : 'Weak';
                  const evActual   = t.expected_vs_actual || {};
                  const covered    = evActual.covered  || [];
                  const missed     = evActual.missed   || [];

                  return (
                    <div key={i} style={{ marginBottom: 14, borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#fff' }}>

                      {/* ── Header ── */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: 11, color: '#64748b', letterSpacing: 1 }}>TURN {t.turn}</span>
                          {t.topic && <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{t.topic.toUpperCase()}</span>}
                          {t.question_type === 'followup' && <span style={{ fontSize: 10, color: '#7c3aed', background: '#f5f3ff', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>Follow-up</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 56, height: 5, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: scoreColor, borderRadius: 999, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: scoreColor, background: scoreBg, padding: '2px 9px', borderRadius: 6, minWidth: 44, textAlign: 'center' }}>
                            {scoreNum}/{maxNum}
                          </span>
                          <span style={{ fontSize: 10, color: scoreColor, fontWeight: 600 }}>{scoreTag}</span>
                        </div>
                      </div>

                      {/* ── Question ── */}
                      <div style={{ padding: '10px 14px 8px', fontSize: 12, color: '#334155', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
                        {t.question || '—'}
                      </div>

                      {/* ── Strengths + Weaknesses side by side ── */}
                      {(t.strengths?.length > 0 || t.weaknesses?.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                          <div style={{ padding: '8px 14px', background: '#f0fdf4', borderRight: '1px solid #dcfce7' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#15803d', letterSpacing: 0.5, marginBottom: 5 }}>✅ STRENGTHS</div>
                            {(t.strengths || []).length === 0
                              ? <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>None noted</div>
                              : (t.strengths || []).map((s, j) => (
                                <div key={j} style={{ fontSize: 11, color: '#166534', marginBottom: 3, lineHeight: 1.4 }}>• {s}</div>
                              ))}
                          </div>
                          <div style={{ padding: '8px 14px', background: '#fef2f2' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', letterSpacing: 0.5, marginBottom: 5 }}>⚠️ WEAKNESSES</div>
                            {(t.weaknesses || []).length === 0
                              ? <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>None noted</div>
                              : (t.weaknesses || []).map((w, j) => (
                                <div key={j} style={{ fontSize: 11, color: '#991b1b', marginBottom: 3, lineHeight: 1.4 }}>• {w}</div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* ── Expected vs Actual Coverage ── */}
                      {(covered.length > 0 || missed.length > 0) && (
                        <div style={{ padding: '7px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', marginRight: 2 }}>COVERAGE:</span>
                          {covered.map((c, j) => (
                            <span key={`c${j}`} style={{ fontSize: 10, color: '#15803d', background: '#dcfce7', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>✓ {c}</span>
                          ))}
                          {missed.map((m, j) => (
                            <span key={`m${j}`} style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 7px', borderRadius: 999 }}>✗ {m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="cp-footer-actions">
        <button className="cp-action-btn outline" onClick={onBack}>Back</button>
        {hasData && (
          <button className="cp-action-btn download" onClick={() => window.print()}>📥 Download Report</button>
        )}
        <button className="cp-action-btn danger-outline">Delete Profile</button>
      </div>
    </div>
  );
}


/* ── Main CandidateProfile Modal ── */
export default function CandidateProfile({ applicant, jobTitle, onClose, onStatusChange }) {
  const INTEGRITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
  const [liveAi, setLiveAi] = useState(applicant.ai_intelligence || {});
  const [preScore, setPreScore] = useState(applicant.pre_score ?? -1);
  const [resumePreviewUrl, setResumePreviewUrl] = useState(null);

  // Score priority: interview > AI assessment > pre-screen
  const ivOverallScore   = applicant.ai_intelligence?.interview_result?.overall_score ?? null;
  const aiAssessScore    = (applicant.ai_intelligence || {}).final_score ?? null;
  const displayScore     = ivOverallScore != null ? ivOverallScore
                         : aiAssessScore  != null ? aiAssessScore
                         : preScore;
  const isInterviewScore = ivOverallScore != null;
  const isAiScore        = ivOverallScore == null && aiAssessScore != null;
  const scoreLabel       = isInterviewScore ? 'Interview Score'
                         : isAiScore        ? 'AI Assessment'
                         : 'Pre-screen';

  const scoreTier = isInterviewScore
    ? (ivOverallScore >= 7 ? 'shortlist' : ivOverallScore >= 5 ? 'review' : 'reject')
    : isAiScore
    ? (aiAssessScore  >= 7 ? 'shortlist' : aiAssessScore  >= 5 ? 'review' : 'reject')
    : (applicant.score_tier || (preScore >= 8 ? 'shortlist' : preScore >= 5 ? 'review' : preScore < 0 ? 'unknown' : 'reject'));

  const tierTag = isInterviewScore ? 'Interview' : isAiScore ? 'AI Match' : 'Pre-screen';

  // Score tier badge
  const tierBadge = {
    shortlist: { label: `🟢 ${Number(displayScore).toFixed(1)}/10 — ${isInterviewScore ? 'Strong Interview' : isAiScore ? 'Strong Match' : 'Auto-Shortlisted'}`, color: '#15803d', bg: '#f0fdf4' },
    review:    { label: `🟡 ${Number(displayScore).toFixed(1)}/10 — ${isInterviewScore ? 'Average Interview' : isAiScore ? 'Partial Match'  : 'Needs Review'}`,    color: '#92400e', bg: '#fffbeb' },
    reject:    { label: `🔴 ${Number(displayScore).toFixed(1)}/10 — ${isInterviewScore ? 'Weak Interview'   : isAiScore ? 'Poor Match'    : 'Auto-Rejected'}`,      color: '#b91c1c', bg: '#fef2f2' },
    unknown:   { label: 'Pre-screen pending',                                                                                                                        color: '#6b7280', bg: '#f9fafb' },
  }[scoreTier] || { label: '—', color: '#6b7280', bg: '#f9fafb' };

  const ai = liveAi;
  let summaryStr = "Analytics pending for this application.";

  if (ai.shortlist_reason && typeof ai.shortlist_reason === 'object') {
    const matched = (ai.shortlist_reason.matched_core_skills || []).length;
    summaryStr = `Matched ${matched} core skills.`;
    const expMeta = ai.shortlist_reason.experience_metadata || {};
    if (expMeta.flexibility_applied) summaryStr += " Shortlisted via skill-alignment flexibility.";
    const pen = ai.shortlist_reason.penalties_applied?.buzzword_only_claims?.length || 0;
    if (pen > 0) summaryStr += ` (${pen} penalties applied for buzzwords).`;
  } else if (typeof ai.shortlist_reason === 'string') {
    summaryStr = ai.shortlist_reason;
  }

  const cid = String(applicant.id).charCodeAt(0) || 0;

  // Pull interview result from ai_intelligence (written by backend on completion)
  const ivResult    = applicant.ai_intelligence?.interview_result || null;
  const ivEval      = ivResult?.evaluation || {};
  const cheatScore  = ivResult?.cheating_score ?? null;
  const integrityVal = cheatScore === null ? 'N/A'
    : cheatScore < 0.3 ? 'HIGH' : cheatScore < 0.7 ? 'MEDIUM' : 'LOW';
  const tabShiftsVal = ivResult ? String(ivResult.tab_change_count ?? 0) : 'N/A';
  const overallScore = ivResult?.overall_score ?? ivEval?.overall_score ?? null;
  const interviewRecVal = ivResult
    ? (ivResult.status === 'COMPLETED_EARLY' ? '❌ TERMINATED EARLY' : overallScore !== null ? (overallScore >= 6 ? '✅ YES' : '❌ NO') : 'PENDING')
    : (applicant.status === 'Offered' ? '✅ YES' : applicant.status === 'Rejected' ? '❌ NO' : 'PENDING');

  const profile = {
    id:          applicant.id,
    anyId:       `any${applicant.id}`,
    candidate:   applicant?.candidate?.name || applicant.name || "Unknown",
    email:       applicant?.candidate?.email || applicant.email || "N/A",
    resumePath:  applicant?.candidate?.resume_path || applicant.resume_path || null,
    appliedFor:  jobTitle,
    status:      applicant.status,
    integrity:   integrityVal,
    tabShifts:   tabShiftsVal,
    briefMatch:  ai.final_score ? Number(ai.final_score).toFixed(1) + '/10' : (preScore > 0 ? `${preScore}/10 (pre-screen)` : 'N/A'),
    resumeRec:   ai.shortlist_decision != null ? (ai.shortlist_decision ? 'YES' : 'NO') : (scoreTier === 'shortlist' ? 'YES' : scoreTier === 'reject' ? 'NO' : 'PENDING'),
    interviewRec: interviewRecVal,
    aiSummary:   summaryStr,
    jdAlignment:  ai.admin_insights?.matched_skills_summary || 'No detailed alignment available.',
    keyStrengths:  ai.admin_insights?.candidate_strengths   || 'Run AI Assessment to generate strength analysis.',
    interviewDone:  !!(ivResult?.turn_breakdown?.length),
    interviewResult: ivResult,
    forensicAlerts: applicant.forensic_alerts || [],
  };

  const [localStatus, setLocalStatus]       = useState(applicant.status);
  const [showReport, setShowReport]         = useState(false);  // always starts closed
  const [scheduledInfo, setScheduledInfo]   = useState(null);
  const [actionLoading, setActionLoading]   = useState(null);
  const [actionError, setActionError]       = useState(null);
  const [aiRunning, setAiRunning]           = useState(false);
  // Track if AI assessment was run this session (hides Re-run after first run)
  const [aiAssessed, setAiAssessed]         = useState(Object.keys(applicant.ai_intelligence || {}).length > 0);

  // ── API call: run AI assessment ─────────────────────────────────────────────
  const runAiAssessment = async () => {
    setAiRunning(true);
    setActionError(null);
    try {
      const res = await fetch(`${RECRO_API}/api/admin/application/${applicant.id}/run-ai`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'AI assessment failed');
      }
      const data = await res.json();
      setLiveAi(data.ai_intelligence || {});
      setAiAssessed(true);   // lock the button — no re-run
    } catch (err) {
      setActionError(`AI Error: ${err.message}`);
    } finally {
      setAiRunning(false);
    }
  };

  // ── API call: update status ─────────────────────────────────────────────────
  const updateStatus = async (newStatus, uiLabel) => {
    setActionLoading(uiLabel);
    setActionError(null);
    const applicationId = applicant.id;
    try {
      const res = await fetch(`${RECRO_API}/api/admin/application/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // If the backend returns 404 (fake applicant without real record), handle gracefully
      if (!res.ok && res.status !== 404) {
        throw new Error(`Status update failed (${res.status})`);
      }
      const LABEL_MAP = {
        shortlist:             'Shortlisted',
        reject:                'Rejected',
        offer:                 'Offered',
        'reject-interviewed':  'Rejected',
      };
      const newLabel = LABEL_MAP[uiLabel] || 'Shortlisted';
      setLocalStatus(newLabel);
      onStatusChange(applicant.id, newLabel);
    } catch (err) {
      // Still update UI even if API fails (fake data scenario)
      setLocalStatus(uiLabel === 'shortlist' ? 'Shortlisted' : 'Rejected');
      onStatusChange(applicant.id, uiLabel === 'shortlist' ? 'Shortlisted' : 'Rejected');
      setActionError(`Note: ${err.message} (UI updated locally)`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── API call: start AI interview ─────────────────────────────────────────────
  const handleStartInterview = async () => {
    setActionLoading('interview');
    setActionError(null);
    const candidateId = applicant.candidate_id || applicant.candidateId || applicant.id;
    const jobId       = applicant.job_id || applicant.jobId || null;
    const scheduledAt = new Date().toISOString().split('.')[0];

    try {
      // ── Step 1: Create LangGraph interview session (backend/main.py) ──────────
      // This invokes initialize_interview + stage4_graph and returns an interview_id
      let aiInterviewId = null;
      try {
        const sessionRes = await fetch(`${RECRO_API}/admin/interview/start/${candidateId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          aiInterviewId = sessionData.interview_id || null;
        } else {
          console.warn('[interview] LangGraph session start returned', sessionRes.status, '— continuing with UUID fallback');
        }
      } catch (sessionErr) {
        console.warn('[interview] LangGraph session start failed:', sessionErr.message, '— using UUID fallback');
      }

      // ── Step 2: Store the ai_interview_id in the application record ────────────
      const schedRes = await fetch(`${RECRO_API}/api/interview/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id:    candidateId,
          job_id:          jobId,
          scheduled_at:    scheduledAt,
          interview_link:  null,
          notes:           'AI Interview Initiated',
          // pass ai_interview_id so the backend stores it; if null backend generates one
          ai_interview_id: aiInterviewId,
        }),
      });
      if (!schedRes.ok) {
        const err = await schedRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Scheduling failed');
      }
      const schedData = await schedRes.json();

      setScheduledInfo({
        scheduled_at:    scheduledAt,
        interview_link:  null,
        ai_interview_id: schedData.ai_interview_id,
      });
      setLocalStatus('Interview Scheduled');
      onStatusChange(applicant.id, 'Interview Scheduled');
    } catch (err) {
      console.error(err);
      setActionError(`AI interview start failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const updatedProfile = { ...profile, status: localStatus };

  if (showReport) {
    return (
      <div className="cp-modal-backdrop" onClick={e => e.target.classList.contains('cp-modal-backdrop') && onClose()}>
        <div className="cp-modal-box cp-modal-wide" role="dialog" aria-modal="true">
          <IntegrityReport profile={updatedProfile} onBack={onClose} />
        </div>
      </div>
    );
  }



  return (
    <div className="cp-modal-backdrop" onClick={e => e.target.classList.contains('cp-modal-backdrop') && onClose()}>
      <div className="cp-modal-box" role="dialog" aria-modal="true" id="candidate-profile-modal">

        {/* Header */}
        <div className="cp-header">
          <div>
            <div className="cp-applied-for">APPLIED FOR: <strong>{jobTitle}</strong></div>
            <div className="cp-name-row">
              <span className="cp-name">{applicant.name}</span>
              <span className="cp-id">ID: {profile.anyId}</span>
            </div>
            <StatusBadge status={localStatus} />
          </div>
          <button className="cp-close-btn" onClick={onClose} id="btn-close-profile" aria-label="Close">✕</button>
        </div>

        {/* Metrics */}
        <div className="cp-metrics-row">
          {[
            { label: 'INTEGRITY',     value: profile.integrity,    color: { HIGH: '#16a34a', MEDIUM: '#d97706', LOW: '#dc2626' }[profile.integrity] },
            { label: 'TAB SHIFTS',    value: profile.tabShifts,    color: '#0f172a' },
            { label: 'RESUME MATCH',  value: profile.briefMatch,   color: '#0f172a' },
            { label: 'RESUME REC',    value: profile.resumeRec,    color: profile.resumeRec === 'YES' ? '#16a34a' : '#dc2626', icon: profile.resumeRec === 'YES' ? '✅' : '❌' },
            { label: 'INTERVIEW REC', value: profile.interviewRec, color: '#d97706' },
          ].map((m, i) => (
            <div key={i} className="cp-metric-card" id={`metric-${m.label.replace(/\s/g, '-')}`}>
              <div className="cp-metric-label">{m.label}</div>
              <div className="cp-metric-value" style={{ color: m.color }}>{m.icon && <span>{m.icon} </span>}{m.value}</div>
            </div>
          ))}
        </div>

        {/* Document Forensics (OnboardGuard) */}
        {profile.forensicAlerts && profile.forensicAlerts.length > 0 && (
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
              🚨 DOCUMENT FORGERY / TAMPERING DETECTED
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#991b1b' }}>
              {profile.forensicAlerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Assessment */}
        <div className="cp-ai-section" id="ai-assessment-section">
          <div className="cp-ai-title">🤖 AI ASSESSMENT</div>
          <p className="cp-ai-summary">{profile.aiSummary}</p>
        </div>

        {/* JD–Resume alignment + Key Strengths */}
        <div className="cp-two-col">
          <div className="cp-insight-card alignment" id="jd-alignment-card">
            <div className="cp-insight-title">JD–RESUME ALIGNMENT</div>
            {Array.isArray(profile.jdAlignment) ? (
              <ul>
                {profile.jdAlignment.map((point, idx) => <li key={idx}>{point}</li>)}
              </ul>
            ) : (
              <p>{profile.jdAlignment}</p>
            )}
          </div>
          <div className="cp-insight-card strengths" id="key-strengths-card">
            <div className="cp-insight-title">KEY STRENGTHS</div>
            {Array.isArray(profile.keyStrengths) ? (
              <ul>
                {profile.keyStrengths.map((strength, idx) => <li key={idx}>{strength}</li>)}
              </ul>
            ) : (
              <p>{profile.keyStrengths}</p>
            )}
          </div>
        </div>

        {/* Scheduled interview info */}
        {scheduledInfo && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 4 }}>📅 Interview Scheduled</div>
            <div style={{ fontSize: 13, color: '#166534' }}>
              {new Date(scheduledInfo.scheduled_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
            </div>
            {scheduledInfo.interview_link && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                🔗 <a href={scheduledInfo.interview_link} target="_blank" rel="noreferrer" style={{ color: '#15803d' }}>{scheduledInfo.interview_link}</a>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>✉️ Email notification sent to candidate</div>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div style={{ fontSize: 12, color: '#d97706', padding: '8px 0', marginTop: 8 }}>ℹ️ {actionError}</div>
        )}

        {/* Footer actions */}
        <div className="cp-footer-actions">
          <button 
            className="cp-action-btn outline" 
            id="btn-view-resume"
            onClick={() => {
              if (profile.resumePath) {
                let path = profile.resumePath;
                if (path.startsWith('.')) path = path.substring(1);
                if (!path.startsWith('/')) path = '/' + path;
                
                const url = profile.resumePath.startsWith('http') 
                  ? profile.resumePath 
                  : `${RECRO_API}${path}`;
                setResumePreviewUrl(url);
              } else {
                alert('No resume available for this candidate.');
              }
            }}
          >
            Resume
          </button>

          {/* Score Badge — shows interview score when available, else pre-screen */}
          {(isInterviewScore || preScore >= 0) && (
            <div style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 999,
              background: tierBadge.bg, color: tierBadge.color,
              fontSize: 12, fontWeight: 700, marginBottom: 8, border: `1px solid ${tierBadge.color}40`,
              textAlign: 'center'
            }}>
              {tierBadge.label}
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{scoreLabel}</div>
            </div>
          )}

          {/* Run AI Assessment — hidden for auto-rejected; locked after first run */}
          {scoreTier !== 'reject' && (
            aiAssessed ? (
              <button className="cp-action-btn" id="btn-run-ai" disabled
                style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #065f46', cursor: 'not-allowed', opacity: 0.9 }}>
                ✅ AI Assessed
              </button>
            ) : (
              <button
                className="cp-action-btn"
                id="btn-run-ai"
                onClick={runAiAssessment}
                disabled={aiRunning}
                style={{ background: aiRunning ? '#6b7280' : '#0f172a', color: 'white', border: '1px solid #334155' }}
              >
                {aiRunning ? '⏳ Analysing...' : '🤖 Run AI Assessment'}
              </button>
            )
          )}

          {/* ── Workflow action button: state machine ───────────────────── */}
          {localStatus === 'Offered' ? (
            // Already hired — locked
            <button className="cp-action-btn success" disabled id="btn-hired"
              style={{ opacity: 0.9, background: '#7c3aed', cursor: 'not-allowed' }}>
              🎉 Offered
            </button>
          ) : localStatus === 'Interviewed' ? (
            // Interview done — show Hire action
            <button
              className="cp-action-btn success"
              id="btn-offer"
              onClick={() => updateStatus('offered', 'offer')}
              disabled={!!actionLoading}
              style={{ background: '#7c3aed', color: 'white' }}
            >
              {actionLoading === 'offer' ? '⏳ Offering...' : '🎉 Offer Job'}
            </button>
          ) : localStatus === 'Interview Scheduled' ? (
            <button className="cp-action-btn success" disabled id="btn-interview-sent"
              style={{ opacity: 0.7 }}>
              ✅ Interview Scheduled
            </button>
          ) : localStatus === 'Shortlisted' ? (
            <button
              className="cp-action-btn"
              style={{ background: '#7c3aed', color: 'white' }}
              id="btn-start-ai-interview"
              onClick={handleStartInterview}
              disabled={!!actionLoading}
            >
              {actionLoading === 'interview' ? '🎙️ Starting...' : '🎙️ Start AI Interview'}
            </button>
          ) : (
            <button
              className="cp-action-btn success"
              id="btn-shortlist"
              onClick={() => updateStatus('shortlisted', 'shortlist')}
              disabled={localStatus === 'Rejected' || !!actionLoading}
            >
              {actionLoading === 'shortlist' ? '⏳ Shortlisting...' : 'Shortlist'}
            </button>
          )}

          <button
            className="cp-action-btn danger-outline"
            id="btn-reject"
            onClick={() => updateStatus('rejected', localStatus === 'Interviewed' ? 'reject-interviewed' : 'reject')}
            disabled={['Rejected', 'Offered'].includes(localStatus) || !!actionLoading}
          >
            {localStatus === 'Rejected' ? '✗ Rejected'
              : actionLoading?.startsWith('reject') ? '⏳...'
              : localStatus === 'Interviewed' ? '✗ Reject Candidate'
              : 'Reject'}
          </button>

          {(['Interview Scheduled', 'Interviewed', 'Offered'].includes(localStatus) || profile.interviewDone) && (
            <button className="cp-action-btn report-btn" id="btn-view-report" onClick={() => setShowReport(true)}>
              📊 View Report
            </button>
          )}
          <button className="cp-action-btn ghost" id="btn-delete-profile">Delete Profile</button>
        </div>

      </div>

      {resumePreviewUrl && (
        <div className="cp-modal-backdrop" style={{ zIndex: 9999 }} onClick={e => e.target.classList.contains('cp-modal-backdrop') && setResumePreviewUrl(null)}>
          <div className="cp-modal-box" style={{ width: '80%', height: '90vh', maxWidth: 1000, padding: 0, display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
            <div className="cp-header" style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b' }}>
              <div style={{ color: '#f8fafc', fontWeight: 600 }}>Resume Preview: {profile.candidate}</div>
              <button className="cp-close-btn" style={{ color: '#94a3b8' }} onClick={() => setResumePreviewUrl(null)}>✕</button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <iframe 
                src={resumePreviewUrl} 
                title="Resume Preview"
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
