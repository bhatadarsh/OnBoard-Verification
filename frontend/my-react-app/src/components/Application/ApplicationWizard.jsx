import { useState } from 'react';
import Step1PersonalInfo from './Step1PersonalInfo';
import Step2Experience from './Step2Experience';
import Step3Review from './Step3Review';
import './ApplicationWizard.css';

const STEPS = [
  { id: 1, label: 'Personal Info', icon: '👤' },
  { id: 2, label: 'Experience',    icon: '💼' },
  { id: 3, label: 'Review',        icon: '✅' },
];

const EMPTY_PERSONAL = {
  firstName: '', lastName: '', email: '', mobile: '',
  gender: '', city: '', state: '', address: '', pincode: '',
};

const EMPTY_EXP = {
  workExperiences: [],
  educations: [],
  certifications: [],
  resumeFile: null,
  resumeName: '',
};

export default function ApplicationWizard({ job, user, onClose }) {
  const [step, setStep] = useState(1);
  const [personal, setPersonal] = useState({
    ...EMPTY_PERSONAL,
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
  });
  const [experience, setExperience] = useState(EMPTY_EXP);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-container">
          <div className="success-screen">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2>Application Submitted!</h2>
            <p>
              Thank you, <strong>{personal.firstName}</strong>! Your application for{' '}
              <strong>{job.title}</strong> has been received. Our team will review
              and reach out to you at <strong>{personal.email}</strong>.
            </p>
            <div className="success-reference">
              Application ID: <strong>SGMD-{Math.random().toString(36).substr(2, 8).toUpperCase()}</strong>
            </div>
            <button className="btn-primary" onClick={onClose} id="btn-done">
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-overlay" onClick={e => e.target.classList.contains('wizard-overlay') && onClose()}>
      <div className="wizard-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-job-info">
            <div className="wizard-job-dept">{job.department}</div>
            <h2 className="wizard-job-title">{job.title}</h2>
            <span className="wizard-job-loc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              {job.location}
            </span>
          </div>
          <button className="wizard-close" onClick={onClose} aria-label="Close wizard">✕</button>
        </div>

        {/* Stepper */}
        <div className="wizard-stepper">
          {STEPS.map((s, idx) => (
            <div key={s.id} className={`stepper-item ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}>
              <div className="stepper-circle" onClick={() => step > s.id && setStep(s.id)}>
                {step > s.id ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span>{s.icon}</span>
                )}
              </div>
              <div className="stepper-label">
                <span className="step-num">Step {s.id}</span>
                <span className="step-name">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className="stepper-line" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="wizard-body">
          {step === 1 && (
            <Step1PersonalInfo
              data={personal}
              onChange={setPersonal}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Experience
              data={experience}
              onChange={setExperience}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Review
              personal={personal}
              experience={experience}
              job={job}
              onBack={() => setStep(2)}
              onEdit={(s) => setStep(s)}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
