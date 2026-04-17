import './JobCard.css';

const TYPE_COLORS = {
  'Full-time': { bg: '#ecfdf5', text: '#065f46' },
  'Part-time': { bg: '#eff6ff', text: '#1e40af' },
  Contract: { bg: '#fef3c7', text: '#92400e' },
};
const MODE_COLORS = {
  Hybrid: { bg: '#f0f9ff', text: '#0369a1' },
  'On-site': { bg: '#fdf2f8', text: '#86198f' },
  'Remote': { bg: '#f0fdf4', text: '#16a34a' },
  'On-site / Travel': { bg: '#fdf2f8', text: '#86198f' },
};

export default function JobCard({ job, isSelected, onClick }) {
  const tc = TYPE_COLORS[job.type] || { bg: '#f3f4f6', text: '#374151' };
  const mc = MODE_COLORS[job.mode] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <div
      className={`job-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      id={`job-card-${job.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-pressed={isSelected}
    >
      <div className="job-card-header">
        <div className="job-dept-icon">{job.department.charAt(0)}</div>
        <div className="job-card-meta">
          <span className="job-dept">{job.department}</span>
          <span className="job-exp">Exp: {job.experience}</span>
        </div>
      </div>

      <h3 className="job-card-title">{job.title}</h3>
      <p className="job-card-subtitle">{job.subtitle}</p>

      <div className="job-card-location">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        {job.location}
      </div>

      <div className="job-card-badges">
        <span className="badge" style={{ background: tc.bg, color: tc.text }}>{job.type}</span>
        <span className="badge" style={{ background: mc.bg, color: mc.text }}>{job.mode}</span>
      </div>

      <div className="job-card-footer">
        <span className="posted-date">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          {job.posted}
        </span>
        {isSelected && <span className="active-dot" />}
      </div>
    </div>
  );
}
