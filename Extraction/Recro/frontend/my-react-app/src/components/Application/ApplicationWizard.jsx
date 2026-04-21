import { useState, useEffect } from 'react';
import { RECRO_API } from '../../config/api';
import Step1PersonalInfo from './Step1PersonalInfo';
import Step2CareerDetails from './Step2CareerDetails';
import Step3Experience from './Step3Experience';
import Step4Review from './Step4Review';
import './ApplicationWizard.css';

const STEPS = [
  { id: 1, label: 'Personal Info', icon: '👤' },
  { id: 2, label: 'Career Details', icon: '💼' },
  { id: 3, label: 'Experience', icon: '📋' },
  { id: 4, label: 'Review', icon: '✅' },
];

const EMPTY_PERSONAL = {
  firstName: '', lastName: '', email: '', mobile: '',
  gender: '', nationality: '', city: '', state: '', address: '', pincode: '',
};

const EMPTY_CAREER = {
  totalExperience: '', relevantExperience: '', noticePeriod: '',
  currentCtc: '', expectedCtc: '', locationPreference: [],
  linkedinProfile: '', openToRelocate: '',
};

const EMPTY_EXP = {
  workExperiences: [],
  educations: [],
  certifications: [],
  resumeFile: null,
  resumeName: '',
  // Pre-populated from DB — used when an existing resume is on file
  existingResumeUrl: '',
  existingResumeName: '',
};

export default function ApplicationWizard({ job, user, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [personal, setPersonal] = useState({
    ...EMPTY_PERSONAL,
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
  });
  const [careerDetails, setCareerDetails] = useState(EMPTY_CAREER);
  const [experience, setExperience] = useState(EMPTY_EXP);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setSubmitting] = useState(false);
  const [appId, setAppId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('candidate_token');
        if (!token) return;

        const res = await fetch(`${RECRO_API}/api/candidate/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();

        if (json.status === 'success' && json.candidate_data) {
          const d = json.candidate_data;
          const pd = d.profile_details || {};

          setPersonal(prev => ({
            ...prev,
            firstName: d.first_name || prev.firstName,
            lastName: d.last_name || prev.lastName,
            email: d.email || prev.email,
            mobile: d.mobile || prev.mobile,
            gender: pd.gender || prev.gender,
            nationality: pd.nationality || prev.nationality,
            city: pd.city || prev.city,
            state: pd.state || prev.state,
            address: pd.permanent_address || prev.address,
            pincode: pd.pincode || prev.pincode
          }));

          if (d.experience && d.experience.length > 0) {
            const exp = d.experience[0];
            setCareerDetails(prev => ({
              ...prev,
              totalExperience: exp.total_experience?.toString() || prev.totalExperience,
              relevantExperience: exp.relevent_experience?.toString() || prev.relevantExperience,
              noticePeriod: exp.notice_period || prev.noticePeriod,
              currentCtc: exp.current_ctc?.toString() || prev.currentCtc,
              expectedCtc: exp.expected_ctc?.toString() || prev.expectedCtc,
              locationPreference: exp.location_preference ? exp.location_preference.split(', ') : prev.locationPreference,
              openToRelocate: exp.open_to_relocate ? 'Yes' : 'No',
              linkedinProfile: pd.linkedin_url || prev.linkedinProfile
            }));

            setExperience(prev => ({
              ...prev,
              workExperiences: d.experience.map(exp => ({
                company: exp.current_company || '',
                title: exp.current_job_title || '',
                startDate: exp.start_year
                  ? `${exp.start_year}-${String(exp.start_month || 1).padStart(2, '0')}`
                  : '',
                endDate: exp.end_year
                  ? `${exp.end_year}-${String(exp.end_month || 12).padStart(2, '0')}`
                  : '',
                current: exp.is_current_designation || false,
                description: '',
              })),
              educations: (d.education || []).map(e => ({
                school: e.highest_qualification || '',
                degree: e.degree_name || '',
                discipline: e.university || '',
                startDate: e.start_year
                  ? `${e.start_year}-${String(e.start_month || 1).padStart(2, '0')}`
                  : '',
                endDate: e.end_year
                  ? `${e.end_year}-${String(e.end_month || 12).padStart(2, '0')}`
                  : '',
                score: e.score?.toString() || '',
              })),
              // Pre-populate certifications with existing file URLs from DB/uploads
              certifications: (d.certificates || []).map(c => ({
                name: c.name || '',
                issuer: c.provider || '',
                date: c.year
                  ? `${c.year}-${String(c.month || 1).padStart(2, '0')}`
                  : '',
                file: null,
                fileName: '',
                // These two fields tell Step3 that a file is already on file in DB
                existingFileUrl: c.file_url || '',       // URL/path from DB (e.g. uploads/<filename>)
                existingFileName: c.file_name || c.name || 'Certificate on file',
              })),
              // Pre-populate existing resume from DB/uploads
              existingResumeUrl: d.resume_url || '',          // e.g. uploads/resume_<id>.pdf
              existingResumeName: d.resume_name || (d.resume_url ? 'Resume on file' : ''),
            }));
          } else {
            // No experience — still pre-fill education / certs / resume / linkedin
            setExperience(prev => ({
              ...prev,
              educations: (d.education || []).map(e => ({
                school: e.highest_qualification || '',
                degree: e.degree_name || '',
                discipline: e.university || '',
                startDate: e.start_year
                  ? `${e.start_year}-${String(e.start_month || 1).padStart(2, '0')}`
                  : '',
                endDate: e.end_year
                  ? `${e.end_year}-${String(e.end_month || 12).padStart(2, '0')}`
                  : '',
                score: e.score?.toString() || '',
              })),
              certifications: (d.certificates || []).map(c => ({
                name: c.name || '',
                issuer: c.provider || '',
                date: c.year
                  ? `${c.year}-${String(c.month || 1).padStart(2, '0')}`
                  : '',
                file: null,
                fileName: '',
                existingFileUrl: c.file_url || '',
                existingFileName: c.file_name || c.name || 'Certificate on file',
              })),
              existingResumeUrl: d.resume_url || '',
              existingResumeName: d.resume_name || (d.resume_url ? 'Resume on file' : ''),
            }));
            if (pd.linkedin_url) {
              setCareerDetails(prev => ({ ...prev, linkedinProfile: pd.linkedin_url }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load candidate profile:", err);
      }
    };
    fetchProfile();
  }, [job.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();

      const payload = {
        first_name: personal.firstName,
        last_name: personal.lastName,
        mobile: personal.mobile,
        profile_details: {
          gender: personal.gender || '',
          city: personal.city || '',
          state: personal.state || '',
          permanent_address: personal.address || '',
          pincode: personal.pincode || '',
          nationality: personal.nationality || '',
          linkedin_url: careerDetails.linkedinProfile || ''
        },
        education: experience.educations.map(edu => ({
          highest_qualification: edu.school || '',
          degree_name: edu.degree || '',
          university: edu.discipline || '',
          start_month: parseInt((edu.startDate || '').split('-')[1]) || 1,
          start_year: parseInt((edu.startDate || '').split('-')[0]) || 2020,
          end_month: parseInt((edu.endDate || '').split('-')[1]) || 12,
          end_year: parseInt((edu.endDate || '').split('-')[0]) || 2024,
          score: parseFloat(edu.score) || 0,
        })),
        certificates: experience.certifications.map(c => ({
          name: c.name || '',
          provider: c.issuer || '',
          year: parseInt((c.date || '').split('-')[0]) || 2024,
          month: parseInt((c.date || '').split('-')[1]) || null,
          // Pass existing URL so backend can retain it if no new file is sent
          existing_file_url: c.file ? null : (c.existingFileUrl || null),
        })),
        experiences: experience.workExperiences.length > 0
          ? experience.workExperiences.map(w => ({
            total_experience: parseFloat(careerDetails.totalExperience) || 0,
            relevent_experience: parseFloat(careerDetails.relevantExperience) || 0,
            current_company: w.company || 'N/A',
            current_job_title: w.title || 'N/A',
            notice_period: careerDetails.noticePeriod || '',
            current_ctc: parseFloat(careerDetails.currentCtc) || 0,
            expected_ctc: parseFloat(careerDetails.expectedCtc) || 0,
            location_preference: Array.isArray(careerDetails.locationPreference)
              ? careerDetails.locationPreference.join(', ')
              : (careerDetails.locationPreference || ''),
            open_to_relocate: careerDetails.openToRelocate === 'Yes',
            start_date: w.startDate || null,
            end_date: w.endDate || null,
            is_current: w.current || false,
          }))
          : [{
            total_experience: parseFloat(careerDetails.totalExperience) || 0,
            relevent_experience: parseFloat(careerDetails.relevantExperience) || 0,
            current_company: 'N/A',
            current_job_title: 'N/A',
            notice_period: careerDetails.noticePeriod || '',
            current_ctc: parseFloat(careerDetails.currentCtc) || 0,
            expected_ctc: parseFloat(careerDetails.expectedCtc) || 0,
            location_preference: Array.isArray(careerDetails.locationPreference)
              ? careerDetails.locationPreference.join(', ')
              : (careerDetails.locationPreference || ''),
            open_to_relocate: careerDetails.openToRelocate === 'Yes',
          }],
        // Tell backend to keep existing resume if candidate didn't re-upload
        existing_resume_url: experience.resumeFile ? null : (experience.existingResumeUrl || null),
      };

      formData.append('payload', JSON.stringify(payload));

      // Append new resume file only if re-uploaded
      if (experience.resumeFile) {
        formData.append('resume', experience.resumeFile);
      }

      // Append new cert files only (existing ones are referenced via existing_file_url in payload)
      experience.certifications.forEach(cert => {
        if (cert.file) {
          formData.append('certificates', cert.file);
        }
      });

      const token = localStorage.getItem('candidate_token');

      const res = await fetch(`${RECRO_API}/api/candidate/apply/${job.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.status === 'success') {
        setAppId(data.application_id);
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('Network error. Application could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-container">
          <div className="success-screen">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Application Submitted!</h2>
            <p>
              Thank you, <strong>{personal.firstName}</strong>! Your application for{' '}
              <strong>{job.title}</strong> has been received. Our team will review
              and reach out to you at <strong>{personal.email}</strong>.
            </p>
            <div className="success-reference">
              Application ID: <strong>{appId || `SGMD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`}</strong>
            </div>
            <button className="btn-primary" onClick={onSuccess} id="btn-done">
              Go to Candidate Portal
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
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
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
                    <polyline points="20 6 9 17 4 12" />
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
            <Step2CareerDetails
              data={careerDetails}
              onChange={setCareerDetails}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Experience
              data={experience}
              onChange={setExperience}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step4Review
              personal={personal}
              careerDetails={careerDetails}
              experience={experience}
              job={job}
              onBack={() => setStep(3)}
              onEdit={(s) => setStep(s)}
              onSubmit={handleSubmit}
              isSubmitting={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}