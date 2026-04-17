import './StepForms.css';

function ReviewBlock({ title, icon, onEdit, editStep, children }) {
  return (
    <div className="review-block">
      <div className="review-block-header">
        <div className="review-block-title">
          <span className="review-icon">{icon}</span>
          <h3>{title}</h3>
        </div>
        <button className="btn-edit" onClick={() => onEdit(editStep)} id={`edit-step-${editStep}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
      </div>
      <div className="review-block-body">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="review-row">
      <span className="review-label">{label}</span>
      <span className="review-value">{value}</span>
    </div>
  );
}

function EmptyState({ msg }) {
  return <p className="review-empty">{msg}</p>;
}

export default function Step3Review({ personal, experience, job, onBack, onEdit, onSubmit }) {
  const { workExperiences, educations, certifications, resumeName } = experience;

  return (
    <div className="step-container">
      <div className="step-heading">
        <h2>Review Your Application</h2>
        <p>Please review all your details before submitting. You can go back and edit any section.</p>
      </div>

      {/* Job Info */}
      <div className="review-job-banner">
        <div>
          <div className="review-job-dept">{job.department}</div>
          <div className="review-job-title">{job.title}</div>
          <div className="review-job-loc">{job.location}</div>
        </div>
        <div className="review-job-badges">
          <span>{job.type}</span>
          <span>{job.mode}</span>
        </div>
      </div>

      {/* Personal Info */}
      <ReviewBlock title="Personal Information" icon="👤" onEdit={onEdit} editStep={1}>
        <div className="review-grid">
          <ReviewRow label="First Name" value={personal.firstName} />
          <ReviewRow label="Last Name" value={personal.lastName} />
          <ReviewRow label="Email" value={personal.email} />
          <ReviewRow label="Mobile" value={personal.mobile} />
          <ReviewRow label="Gender" value={personal.gender} />
          <ReviewRow label="City" value={personal.city} />
          <ReviewRow label="State" value={personal.state} />
          <ReviewRow label="Pincode" value={personal.pincode} />
        </div>
        {personal.address && (
          <div className="review-address">
            <span className="review-label">Address</span>
            <span className="review-value">{personal.address}</span>
          </div>
        )}
      </ReviewBlock>

      {/* Work Experience */}
      <ReviewBlock title="Work Experience" icon="💼" onEdit={onEdit} editStep={2}>
        {workExperiences.length === 0 ? (
          <EmptyState msg="No work experience added." />
        ) : (
          workExperiences.map((w, i) => (
            <div key={i} className="review-exp-item">
              <div className="review-exp-title">{w.title || '—'}</div>
              <div className="review-exp-company">{w.company}</div>
              <div className="review-exp-dates">
                {w.startDate} → {w.current ? 'Present' : w.endDate}
              </div>
              {w.description && <p className="review-exp-desc">{w.description}</p>}
            </div>
          ))
        )}
      </ReviewBlock>

      {/* Education */}
      <ReviewBlock title="Education" icon="🎓" onEdit={onEdit} editStep={2}>
        {educations.length === 0 ? (
          <EmptyState msg="No education added." />
        ) : (
          educations.map((e, i) => (
            <div key={i} className="review-exp-item">
              <div className="review-exp-title">{e.degree} in {e.field || '—'}</div>
              <div className="review-exp-company">{e.institution}</div>
              {e.year && <div className="review-exp-dates">Class of {e.year}</div>}
            </div>
          ))
        )}
      </ReviewBlock>

      {/* Certifications */}
      <ReviewBlock title="Certifications" icon="🏅" onEdit={onEdit} editStep={2}>
        {certifications.length === 0 ? (
          <EmptyState msg="No certifications added." />
        ) : (
          <div className="review-certs">
            {certifications.map((c, i) => (
              <div key={i} className="review-cert-tag">
                <strong>{c.name}</strong>
                {c.issuer && <span> · {c.issuer}</span>}
                {c.date && <span> · {c.date}</span>}
              </div>
            ))}
          </div>
        )}
      </ReviewBlock>

      {/* Resume */}
      <ReviewBlock title="Resume" icon="📄" onEdit={onEdit} editStep={2}>
        {resumeName ? (
          <div className="review-resume">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CC1B1B" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>{resumeName}</span>
          </div>
        ) : (
          <EmptyState msg="No resume uploaded." />
        )}
      </ReviewBlock>

      {/* Disclaimer */}
      <div className="review-disclaimer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        By submitting, you confirm that the information provided is accurate. Sigmoid will
        use your data only for recruitment purposes.
      </div>

      <div className="wizard-nav">
        <button className="btn-back" onClick={onBack} id="btn-step3-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <button className="btn-primary btn-submit" onClick={onSubmit} id="btn-submit-application">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Submit Application
        </button>
      </div>
    </div>
  );
}
