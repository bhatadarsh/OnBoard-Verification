import './JobDetail.css';

export default function JobDetail({ job, onApply }) {
  if (!job) return (
    <div className="job-detail-empty">
      <div className="empty-icon">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      </div>
      <h3>Select a job to view details</h3>
      <p>Click on any job listing on the left to see the full description.</p>
    </div>
  );

  return (
    <div className="job-detail" key={job.id}>
      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-hero-left">
          <div className="detail-dept-badge">{job.department}</div>
          <h1 className="detail-title">{job.title}</h1>
          <p className="detail-subtitle">{job.subtitle}</p>
          <div className="detail-meta-row">
            <span className="detail-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              {job.location}
            </span>
            <span className="detail-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {job.experience}
            </span>
            <span className="detail-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              {job.type} · {job.mode}
            </span>
          </div>
        </div>
        <button
          className="apply-btn"
          onClick={() => onApply(job)}
          id={`apply-btn-${job.id}`}
        >
          Apply Now
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Tags */}
      <div className="detail-tags">
        {job.tags.map(t => (
          <span key={t} className="detail-tag"># {t}</span>
        ))}
      </div>

      <div className="detail-divider" />

      {/* Summary */}
      <section className="detail-section">
        <h2>Role Overview</h2>
        <p className="detail-para">{job.summary}</p>
      </section>

      {/* Desired Experience */}
      <section className="detail-section">
        <h2>Desired Experience</h2>
        <ul className="detail-list">
          {job.desiredExperience.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Responsibilities */}
      <section className="detail-section">
        <h2>Role &amp; Responsibilities</h2>
        <ul className="detail-list">
          {job.responsibilities.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Primary Skills */}
      <section className="detail-section">
        <h2>Primary Skills <span className="mandatory-badge">Mandatory</span></h2>
        <ul className="detail-list primary">
          {job.primarySkills.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Secondary Skills */}
      {job.secondarySkills?.length > 0 && (
        <section className="detail-section">
          <h2>Secondary Skills <span className="optional-badge">Good to Have</span></h2>
          <ul className="detail-list secondary">
            {job.secondarySkills.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA bottom */}
      <div className="detail-cta-bottom">
        <p>Excited about this role? Let's get started.</p>
        <button
          className="apply-btn"
          onClick={() => onApply(job)}
          id={`apply-btn-bottom-${job.id}`}
        >
          Apply for this Position
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
