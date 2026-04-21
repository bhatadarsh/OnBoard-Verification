import { useState } from 'react';
import { RECRO_API, INTERVIEW_AI_API } from '../../config/api';
import './CandidateProfile.css';

/* ── Integrity log data (from AI interview backend when available) ── */
const INTEGRITY_FLAGS = [
  { time: '5:44:31 PM', events: ['🖥️ Suspicious electronics detected', '📱 Mobile phone detected'] },
  { time: '5:44:31 PM', events: ['🔄 TAB CHANGE'] },
  { time: '5:44:33 PM', events: ['📱 Mobile phone detected'] },
  { time: '5:44:36 PM', events: ['👥 Multiple people in frame', '📱 Mobile phone detected', '🚨 CRITICAL: Multiple people detected with mobile usage'] },
  { time: '5:45:15 PM', events: ['❌ Candidate not in frame'] },
];

const TURN_BREAKDOWN = [
  { turn: 1, score: 1, max: 10, text: '"(Floor Applied) The candidate\'s answer is a blatant refusal, indicating a lack of effort and no demonstration of understanding."' },
  { turn: 2, score: 1, max: 10, text: '"(Floor Applied) The candidate\'s answer does not demonstrate any understanding of the question or the topic."' },
  { turn: 3, score: 0, max: 10, text: '"The candidate failed to provide any meaningful response, repeating the question verbatim."' },
];

/* ── Status badge ── */
function StatusBadge({ status }) {
  const MAP = {
    'Under Review':         { bg: '#eff6ff', color: '#1d4ed8' },
    'Shortlisted':          { bg: '#f0fdf4', color: '#15803d' },
    'Interview Scheduled':  { bg: '#fefce8', color: '#a16207' },
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
        <div className="cp-metrics-row">
          {[
            { label: 'INTEGRITY',     value: profile.integrity,    color: { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' }[profile.integrity] || '#64748b' },
            { label: 'TAB SHIFTS',    value: profile.tabShifts,    color: '#0f172a' },
            { label: 'BRIEF MATCH',   value: profile.briefMatch,   color: '#0f172a' },
            { label: 'RESUME REC',    value: profile.resumeRec,    color: profile.resumeRec === 'YES' ? '#16a34a' : '#dc2626', icon: profile.resumeRec === 'YES' ? '✅' : '❌' },
            { label: 'INTERVIEW REC', value: profile.interviewRec, color: '#d97706' },
          ].map((m, i) => (
            <div key={i} className="cp-metric-card">
              <div className="cp-metric-label">{m.label}</div>
              <div className="cp-metric-value" style={{ color: m.color }}>{m.icon && <span>{m.icon} </span>}{m.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="cp-ir-section">
        <div className="cp-ir-section-title">🚩 Integrity Flags ({INTEGRITY_FLAGS.length})</div>
        <div className="cp-flags-list">
          {INTEGRITY_FLAGS.map((flag, i) => (
            <div key={i} className={`cp-flag-row ${flag.events.some(e => e.includes('CRITICAL') || e.includes('TAB')) ? 'critical' : ''}`}>
              <span className="cp-flag-time">{flag.time}:</span>
              <span className="cp-flag-events">{flag.events.join(' | ')}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="cp-ir-section">
        <button className="cp-turn-toggle" onClick={() => setTurnExpanded(v => !v)}>
          {turnExpanded ? '▼' : '▶'} Detailed Turn Breakdown
        </button>
        {turnExpanded && (
          <div className="cp-turns-list">
            {TURN_BREAKDOWN.map((t, i) => (
              <div key={i} className="cp-turn-card">
                <div className="cp-turn-header">
                  <span className="cp-turn-label">TURN {t.turn}</span>
                  <span className={`cp-turn-score ${t.score <= 2 ? 'low' : t.score >= 7 ? 'high' : 'mid'}`}>{t.score}/{t.max}</span>
                </div>
                <p className="cp-turn-text">{t.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="cp-footer-actions">
        <button className="cp-action-btn outline" onClick={onBack}>Resume</button>
        <button className="cp-action-btn download" onClick={() => window.print()}>📥 Download Report</button>
        <button className="cp-action-btn danger-outline">Delete Profile</button>
      </div>
    </div>
  );
}

/* ── Main CandidateProfile Modal ── */
export default function CandidateProfile({ applicant, jobTitle, onClose, onStatusChange }) {
  const INTEGRITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
  const ai = applicant.ai_intelligence || {};
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

  const profile = {
    id:          applicant.id,
    anyId:       `any${applicant.id}`,
    candidate:   applicant?.candidate?.name || applicant.name || "Unknown",
    email:       applicant?.candidate?.email || applicant.email || "N/A",
    appliedFor:  jobTitle,
    status:      applicant.status,
    integrity:   'N/A', // Real interview integration pending
    tabShifts:   'N/A', // Real interview integration pending
    briefMatch:  ai.final_score ? Number(ai.final_score).toFixed(1) + '/10' : 'N/A',
    resumeRec:   ai.shortlist_decision ? 'YES' : 'NO',
    interviewRec: applicant.status === 'Offered' ? 'YES' : applicant.status === 'Rejected' ? 'NO' : 'PENDING',
    aiSummary:   summaryStr,
    jdAlignment: ai.admin_insights?.matched_skills_summary || 'No detailed alignment available.',
    keyStrengths: (ai.admin_insights?.cultural_fit_flags || []).join(', ') || 'No specific strengths flagged yet.',
    interviewDone: ['Offered', 'Rejected'].includes(applicant.status),
  };

  const [localStatus, setLocalStatus]       = useState(applicant.status);
  const [showReport, setShowReport]         = useState(profile.interviewDone);
  const [scheduledInfo, setScheduledInfo]   = useState(null);
  const [actionLoading, setActionLoading]   = useState(null); // 'shortlist' | 'reject' | 'interview'
  const [actionError, setActionError]       = useState(null);

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
      setLocalStatus(uiLabel === 'shortlist' ? 'Shortlisted' : 'Rejected');
      onStatusChange(applicant.id, uiLabel === 'shortlist' ? 'Shortlisted' : 'Rejected');
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
    try {
      const scheduledAt = new Date().toISOString().split('.')[0];
      const res = await fetch(`${RECRO_API}/api/interview/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id:   applicant.candidate_id || applicant.candidateId || applicant.id,
          job_id:         applicant.job_id || applicant.jobId || null,
          scheduled_at:   scheduledAt,
          interview_link: null,
          notes:          "AI Interview Initiated",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Scheduling failed');
      }
      setScheduledInfo({
          scheduled_at: scheduledAt,
          interview_link: null
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
            { label: 'INTEGRITY',     value: profile.integrity,    color: { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' }[profile.integrity] },
            { label: 'TAB SHIFTS',    value: profile.tabShifts,    color: '#0f172a' },
            { label: 'BRIEF MATCH',   value: profile.briefMatch,   color: '#0f172a' },
            { label: 'RESUME REC',    value: profile.resumeRec,    color: profile.resumeRec === 'YES' ? '#16a34a' : '#dc2626', icon: profile.resumeRec === 'YES' ? '✅' : '❌' },
            { label: 'INTERVIEW REC', value: profile.interviewRec, color: '#d97706' },
          ].map((m, i) => (
            <div key={i} className="cp-metric-card" id={`metric-${m.label.replace(/\s/g, '-')}`}>
              <div className="cp-metric-label">{m.label}</div>
              <div className="cp-metric-value" style={{ color: m.color }}>{m.icon && <span>{m.icon} </span>}{m.value}</div>
            </div>
          ))}
        </div>

        {/* AI Assessment */}
        <div className="cp-ai-section" id="ai-assessment-section">
          <div className="cp-ai-title">🤖 AI ASSESSMENT</div>
          <p className="cp-ai-summary">{profile.aiSummary}</p>
        </div>

        {/* JD–Resume alignment + Key Strengths */}
        <div className="cp-two-col">
          <div className="cp-insight-card alignment" id="jd-alignment-card">
            <div className="cp-insight-title">JD–RESUME ALIGNMENT</div>
            <p>{profile.jdAlignment}</p>
          </div>
          <div className="cp-insight-card strengths" id="key-strengths-card">
            <div className="cp-insight-title">KEY STRENGTHS</div>
            <p>{profile.keyStrengths}</p>
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
          <button className="cp-action-btn outline" id="btn-view-resume">Resume</button>

          {localStatus === 'Shortlisted' || localStatus === 'Interview Scheduled' ? (
            localStatus === 'Interview Scheduled' ? (
              <button className="cp-action-btn success" disabled id="btn-interview-sent" style={{ opacity: 0.7 }}>
                ✅ Interview Scheduled
              </button>
            ) : (
                <button
                  className="cp-action-btn"
                  style={{ background: '#7c3aed', color: 'white' }}
                  id="btn-start-ai-interview"
                  onClick={handleStartInterview}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'interview' ? '🎙️ Starting...' : '🎙️ Start AI Interview'}
                </button>
            )
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
            onClick={() => updateStatus('rejected', 'reject')}
            disabled={localStatus === 'Rejected' || !!actionLoading}
          >
            {localStatus === 'Rejected' ? 'Rejected' : actionLoading === 'reject' ? '⏳...' : 'Reject'}
          </button>

          {(profile.interviewDone || localStatus === 'Interview Scheduled') && (
            <button className="cp-action-btn report-btn" id="btn-view-report" onClick={() => setShowReport(true)}>
              📊 View Report
            </button>
          )}
          <button className="cp-action-btn ghost" id="btn-delete-profile">Delete Profile</button>
        </div>

      </div>
    </div>
  );
}
