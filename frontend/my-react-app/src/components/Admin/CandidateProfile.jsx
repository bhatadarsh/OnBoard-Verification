import { useState } from 'react';
import './CandidateProfile.css';

/* ── Mock data generators ── */
const INTEGRITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const INTEGRITY_COLOR  = { LOW: '#16a34a', MEDIUM: '#d97706', HIGH: '#dc2626' };

const INTEGRITY_FLAGS = [
  { time: '5:44:31 PM', events: ['🖥️ Suspicious electronics detected', '📱 Mobile phone detected'] },
  { time: '5:44:31 PM', events: ['🔄 TAB CHANGE'] },
  { time: '5:44:33 PM', events: ['📱 Mobile phone detected'] },
  { time: '5:44:34 PM', events: ['🖥️ Suspicious electronics detected', '📱 Mobile phone detected'] },
  { time: '5:44:35 PM', events: ['🖥️ Suspicious electronics detected', '📱 Mobile phone detected'] },
  { time: '5:44:36 PM', events: ['👥 Multiple people in frame', '📱 Mobile phone detected', '🚨 CRITICAL: Multiple people detected with mobile usage'] },
  { time: '5:45:15 PM', events: ['❌ Candidate not in frame'] },
];

const TURN_BREAKDOWN = [
  {
    turn: 1, score: 1, max: 10,
    text: '"(Floor Applied) The candidate\'s answer is a blatant refusal to answer the question, indicating a lack of effort and no demonstration of understanding."',
  },
  {
    turn: 2, score: 1, max: 10,
    text: '"(Floor Applied) The candidate\'s answer does not demonstrate any understanding of the question or the topic. The answer is not relevant, does not provide any real-world examples, and does not demonstrate any technical or conceptual strengths."',
  },
  {
    turn: 3, score: 0, max: 10,
    text: '"The candidate failed to provide any meaningful response, repeating the question verbatim. This indicates a lack of understanding of the topic and inability to apply relevant concepts."',
  },
];

function generateProfile(applicant, jobTitle) {
  const integrityIdx = applicant.id % 3;
  return {
    id: applicant.id,
    anyId: `any${applicant.id}`,
    candidate: applicant.name,
    email: applicant.email,
    appliedFor: jobTitle,
    status: applicant.status,
    integrity: INTEGRITY_LEVELS[integrityIdx],
    tabShifts: applicant.id % 4,
    briefMatch: `${(15 + (applicant.id % 15)).toFixed(1)}/10`,
    resumeRec: applicant.id % 3 === 0 ? 'YES' : 'NO',
    interviewRec: applicant.status === 'Offered' ? 'YES' : applicant.status === 'Rejected' ? 'NO' : 'PENDING',
    aiSummary: `Matched ${1 + (applicant.id % 3)} core skills. (${applicant.id % 2} penalties applied for buzzwords).`,
    jdAlignment: 'The candidate\'s resume indicates a match for the core skill of presenting insights and findings to non-technical teams. This skill is directly aligned with the role requirements, as it demonstrates the ability to effectively communicate complex data analysis to stakeholders. Although the JD requires proficiency in creating interactive dashboards and reports, the candidate\'s resume does not explicitly mention this skill. However, the matched skill of presenting insights and findings suggests that the candidate may possess the necessary skills to create engaging reports.',
    keyStrengths: 'The candidate\'s resume highlights practical experience in driving cross-functional initiatives, improving business processes, and managing large-scale operational workflows. These strengths are directly relevant to the JD, as they demonstrate the candidate\'s ability to analyze complex data, identify trends and patterns, and present insights to non-technical teams. Additionally, the candidate\'s experience in managing external vendors and establishing communication protocols suggests a strong understanding of data accuracy, consistency, and integrity.',
    interviewDone: ['Offered', 'Rejected'].includes(applicant.status),
    flagCount: INTEGRITY_FLAGS.length,
  };
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const MAP = {
    'Under Review':        { bg: '#eff6ff', color: '#1d4ed8' },
    'Shortlisted':         { bg: '#f0fdf4', color: '#15803d' },
    'Interview Scheduled': { bg: '#fefce8', color: '#a16207' },
    'Rejected':            { bg: '#fef2f2', color: '#dc2626' },
    'Offered':             { bg: '#f5f3ff', color: '#7c3aed' },
  };
  const s = MAP[status] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span className="cp-status-badge" style={{ background: s.bg, color: s.color }}>
      {status.toUpperCase()}
    </span>
  );
}

/* ── Integrity report (post-interview) ── */
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

        {/* Metrics */}
        <div className="cp-metrics-row">
          {[
            { label: 'INTEGRITY', value: profile.integrity, color: INTEGRITY_COLOR[profile.integrity] },
            { label: 'TAB SHIFTS', value: profile.tabShifts, color: '#0f172a' },
            { label: 'BRIEF MATCH', value: profile.briefMatch, color: '#0f172a' },
            { label: 'RESUME REC', value: profile.resumeRec, color: profile.resumeRec === 'YES' ? '#16a34a' : '#dc2626', icon: profile.resumeRec === 'YES' ? '✅' : '❌' },
            { label: 'INTERVIEW REC', value: profile.interviewRec, color: '#d97706' },
          ].map((m, i) => (
            <div key={i} className="cp-metric-card">
              <div className="cp-metric-label">{m.label}</div>
              <div className="cp-metric-value" style={{ color: m.color }}>
                {m.icon && <span>{m.icon} </span>}{m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrity Flags */}
      <div className="cp-ir-section">
        <div className="cp-ir-section-title">
          🚩 Integrity Flag Details ({profile.flagCount})
        </div>
        <div className="cp-flags-list">
          {INTEGRITY_FLAGS.map((flag, i) => (
            <div
              key={i}
              className={`cp-flag-row ${flag.events.some(e => e.includes('CRITICAL') || e.includes('TAB')) ? 'critical' : ''}`}
              id={`flag-row-${i}`}
            >
              <span className="cp-flag-time">{flag.time}:</span>
              <span className="cp-flag-events">{flag.events.join(' | ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Turn Breakdown */}
      <div className="cp-ir-section">
        <button
          className="cp-turn-toggle"
          id="btn-turn-toggle"
          onClick={() => setTurnExpanded(v => !v)}
        >
          {turnExpanded ? '▼' : '▶'} Detailed Turn Breakdown
        </button>
        {turnExpanded && (
          <div className="cp-turns-list">
            {TURN_BREAKDOWN.map((t, i) => (
              <div key={i} className="cp-turn-card" id={`turn-card-${i}`}>
                <div className="cp-turn-header">
                  <span className="cp-turn-label">TURN {t.turn}</span>
                  <span className={`cp-turn-score ${t.score <= 2 ? 'low' : t.score >= 7 ? 'high' : 'mid'}`}>
                    {t.score}/{t.max}
                  </span>
                </div>
                <p className="cp-turn-text">{t.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="cp-footer-actions">
        <button className="cp-action-btn outline" onClick={onBack} id="btn-resume-back">Resume</button>
        <button className="cp-action-btn download" id="btn-download-report">📥 Download Report</button>
        <button className="cp-action-btn danger-outline" id="btn-delete-profile">Delete Profile</button>
      </div>
    </div>
  );
}

/* ── Main Profile Modal ── */
export default function CandidateProfile({ applicant, jobTitle, onClose, onStatusChange }) {
  const profile = generateProfile(applicant, jobTitle);
  const [localStatus, setLocalStatus]   = useState(applicant.status);
  const [showReport,  setShowReport]    = useState(applicant.interviewDone);
  const [interviewSent, setInterviewSent] = useState(false);

  const handleShortlist = () => {
    setLocalStatus('Shortlisted');
    onStatusChange(applicant.id, 'Shortlisted');
  };

  const handleReject = () => {
    setLocalStatus('Rejected');
    onStatusChange(applicant.id, 'Rejected');
  };

  const handleStartInterview = () => {
    setInterviewSent(true);
    setTimeout(() => {
      setLocalStatus('Interview Scheduled');
      onStatusChange(applicant.id, 'Interview Scheduled');
    }, 1200);
  };

  const updatedProfile = { ...profile, status: localStatus };

  /* Show post-interview report if done */
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
            { label: 'INTEGRITY',     value: profile.integrity,     color: INTEGRITY_COLOR[profile.integrity] },
            { label: 'TAB SHIFTS',    value: profile.tabShifts,     color: '#0f172a' },
            { label: 'BRIEF MATCH',   value: profile.briefMatch,    color: '#0f172a' },
            { label: 'RESUME REC',    value: profile.resumeRec,     color: profile.resumeRec === 'YES' ? '#16a34a' : '#dc2626', icon: profile.resumeRec === 'YES' ? '✅' : '❌' },
            { label: 'INTERVIEW REC', value: profile.interviewRec,  color: '#d97706' },
          ].map((m, i) => (
            <div key={i} className="cp-metric-card" id={`metric-${m.label.replace(/\s/g,'-')}`}>
              <div className="cp-metric-label">{m.label}</div>
              <div className="cp-metric-value" style={{ color: m.color }}>
                {m.icon && <span>{m.icon} </span>}{m.value}
              </div>
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

        {/* Interview sent banner */}
        {interviewSent && (
          <div className="cp-interview-sent-banner" id="interview-sent-banner">
            <span>📨</span>
            <div>
              <strong>AI Interview invitation sent!</strong>
              <p>The candidate will receive a notification to attend the AI interview. Results will appear here once completed.</p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="cp-footer-actions">
          <button className="cp-action-btn outline" id="btn-view-resume">Resume</button>

          {localStatus === 'Shortlisted' || localStatus === 'Interview Scheduled' ? (
            localStatus === 'Interview Scheduled' ? (
              <button className="cp-action-btn success" disabled id="btn-interview-sent">
                ✅ Interview Scheduled
              </button>
            ) : (
              <button
                className="cp-action-btn primary"
                id="btn-start-interview"
                onClick={handleStartInterview}
              >
                🎙️ Start Interview
              </button>
            )
          ) : (
            <button
              className="cp-action-btn success"
              id="btn-shortlist"
              onClick={handleShortlist}
              disabled={localStatus === 'Rejected'}
            >
              Shortlist
            </button>
          )}

          <button
            className="cp-action-btn danger-outline"
            id="btn-reject"
            onClick={handleReject}
            disabled={localStatus === 'Rejected'}
          >
            {localStatus === 'Rejected' ? 'Rejected' : 'Reject'}
          </button>

          {(profile.interviewDone || localStatus === 'Interview Scheduled') && (
            <button
              className="cp-action-btn report-btn"
              id="btn-view-report"
              onClick={() => setShowReport(true)}
            >
              📊 View Report
            </button>
          )}
          <button className="cp-action-btn ghost" id="btn-delete-profile">Delete Profile</button>
        </div>
      </div>
    </div>
  );
}
