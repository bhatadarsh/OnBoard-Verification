import { useRef, useState } from 'react';
import './StepForms.css';

/* ── helpers ── */
const emptyWork = () => ({ company: '', title: '', startDate: '', endDate: '', current: false, description: '' });
const emptyEdu = () => ({ school: '', degree: '', discipline: '', startDate: '', endDate: '', score: '' });
const emptyCert = () => ({ name: '', issuer: '', date: '', file: null, fileName: '', existingFileUrl: '' });

/* ── Searchable dropdown ── */
const SCHOOLS = [
  'IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kharagpur', 'IIT Kanpur', 'IIT Roorkee', 'IIT Guwahati',
  'BITS Pilani', 'BITS Goa', 'BITS Hyderabad',
  'NIT Trichy', 'NIT Warangal', 'NIT Surathkal', 'NIT Calicut', 'NIT Rourkela',
  'VIT Vellore', 'VIT Chennai', 'Amity University Delhi', 'Amity University Noida',
  'SRM Institute of Science and Technology', 'Manipal Institute of Technology',
  'Pune University', 'Mumbai University', 'Delhi University', 'Anna University',
  'Jadavpur University', 'Calcutta University', 'Osmania University',
  'Bangalore University', 'Visvesvaraya Technological University (VTU)',
  'Christ University Bangalore', 'PES University', 'RV College of Engineering',
  'IISC Bangalore', 'IIIT Hyderabad', 'IIIT Allahabad', 'IIIT Delhi',
  'Symbiosis International University', 'Thapar Institute of Engineering & Technology',
  'Kalinga Institute of Industrial Technology (KIIT)', 'Lovely Professional University (LPU)',
  'Chandigarh University', 'Shoolini University', 'Bennett University', 'Ashoka University',
  'Other',
];

const DEGREES = [
  'B.Tech / B.E.', 'M.Tech / M.E.', 'B.Sc', 'M.Sc', 'BCA', 'MCA',
  'BBA', 'MBA', 'B.Com', 'M.Com', 'B.A.', 'M.A.',
  'Diploma', 'PhD / Doctorate', 'MBBS', 'B.Pharm', 'M.Pharm',
  '12th (Higher Secondary)', '10th (Secondary)', 'Other',
];

const DISCIPLINES = [
  'Computer Science & Engineering', 'Information Technology', 'Software Engineering',
  'Electronics & Communication Engineering', 'Electrical Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Chemical Engineering', 'Biotechnology', 'Biomedical Engineering',
  'Aerospace Engineering', 'Automobile Engineering', 'Data Science & AI',
  'Artificial Intelligence & Machine Learning', 'Cybersecurity', 'Cloud Computing',
  'Physics', 'Chemistry', 'Mathematics', 'Statistics', 'Economics',
  'Finance & Accounting', 'Marketing', 'Human Resources', 'Business Administration',
  'Operations Management', 'Supply Chain Management',
  'Commerce', 'Arts & Humanities', 'Psychology', 'Law', 'Architecture', 'Other',
];

function SearchableDropdown({ id, placeholder, options, value, onChange, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (opt) => {
    onChange(opt);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`searchable-dd ${hasError ? 'field-error' : ''}`} id={id}>
      <div className="searchable-dd-trigger" onClick={() => setOpen(o => !o)}>
        <span className={value ? 'dd-value' : 'dd-placeholder'}>{value || placeholder}</span>
        <span className="dd-arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="searchable-dd-panel">
          <input
            type="text"
            className="dd-search-input"
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <ul className="dd-list">
            {filtered.length === 0
              ? <li className="dd-no-result">No results</li>
              : filtered.map(opt => (
                <li key={opt}
                  className={`dd-item ${opt === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt)}
                >{opt}</li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, count, onAdd, addLabel }) {
  return (
    <div className="section-header">
      <div className="section-title-row">
        <span className="section-icon">{icon}</span>
        <h3>{title}</h3>
        {count > 0 && <span className="section-count">{count}</span>}
      </div>
      <button type="button" className="btn-add" onClick={onAdd}
        id={`btn-add-${title.toLowerCase().replace(/\s/g, '-')}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {addLabel}
      </button>
    </div>
  );
}

function RemoveBtn({ onClick, id }) {
  return (
    <button type="button" className="btn-remove" onClick={onClick} id={id} aria-label="Remove">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
      </svg>
      Remove
    </button>
  );
}

/* ── Field-level error message ── */
function FieldError({ msg }) {
  if (!msg) return null;
  return <span className="field-error-msg">{msg}</span>;
}

/* ── Existing file badge (pre-populated from DB) ── */
function ExistingFileBadge({ label, onReplace, onRemoveExisting }) {
  return (
    <div className="existing-file-badge">
      <span className="existing-file-icon">📎</span>
      <span className="existing-file-label">{label}</span>
      <button type="button" className="existing-file-action" onClick={onReplace}>Replace</button>
      {onRemoveExisting && (
        <button type="button" className="existing-file-remove" onClick={onRemoveExisting}>✕</button>
      )}
    </div>
  );
}

/* ── Validation ── */
function validateStep3(data) {
  const errors = { works: [], edus: [], certs: [], resume: '' };
  let hasError = false;

  // Work experience — each entry must be fully filled
  data.workExperiences.forEach((w, i) => {
    const e = {};
    if (!w.company.trim()) { e.company = 'Company name is required'; hasError = true; }
    if (!w.title.trim()) { e.title = 'Job title is required'; hasError = true; }
    if (!w.startDate) { e.startDate = 'Start date is required'; hasError = true; }
    if (!w.current && !w.endDate) { e.endDate = 'End date is required (or check "Currently working here")'; hasError = true; }
    errors.works[i] = e;
  });

  // Education — each entry must be fully filled
  data.educations.forEach((edu, i) => {
    const e = {};
    if (!edu.school) { e.school = 'School / University is required'; hasError = true; }
    if (!edu.degree) { e.degree = 'Degree is required'; hasError = true; }
    if (!edu.discipline) { e.discipline = 'Discipline is required'; hasError = true; }
    if (!edu.startDate) { e.startDate = 'Start date is required'; hasError = true; }
    if (!edu.endDate) { e.endDate = 'End date is required'; hasError = true; }
    errors.edus[i] = e;
  });

  // Certifications — each entry: all metadata fields + file (new or existing) required
  data.certifications.forEach((c, i) => {
    const e = {};
    if (!c.name.trim()) { e.name = 'Certification name is required'; hasError = true; }
    if (!c.issuer.trim()) { e.issuer = 'Issuing organization is required'; hasError = true; }
    if (!c.date) { e.date = 'Issue date is required'; hasError = true; }
    // File required: must have a new file uploaded OR an existing pre-populated file
    if (!c.file && !c.existingFileUrl) {
      e.file = 'Certificate file is required (PDF, JPG, PNG)';
      hasError = true;
    }
    errors.certs[i] = e;
  });

  // Resume — required always
  if (!data.resumeFile && !data.existingResumeUrl) {
    errors.resume = 'Resume is required. Please upload your resume.';
    hasError = true;
  }

  return { errors, hasError };
}

export default function Step3Experience({ data, onChange, onBack, onNext }) {
  const fileRef = useRef();
  const certFileRefs = useRef({});
  const [touched, setTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({ works: [], edus: [], certs: [], resume: '' });

  const setWork = (list) => onChange({ ...data, workExperiences: list });
  const setEdu = (list) => onChange({ ...data, educations: list });
  const setCert = (list) => onChange({ ...data, certifications: list });

  /* Work Experience */
  const addWork = () => setWork([...data.workExperiences, emptyWork()]);
  const updateWork = (i, field, val) =>
    setWork(data.workExperiences.map((w, idx) => idx === i ? { ...w, [field]: val } : w));
  const removeWork = (i) => setWork(data.workExperiences.filter((_, idx) => idx !== i));

  /* Education */
  const addEdu = () => setEdu([...data.educations, emptyEdu()]);
  const updateEdu = (i, field, val) =>
    setEdu(data.educations.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  const removeEdu = (i) => setEdu(data.educations.filter((_, idx) => idx !== i));

  /* Certifications */
  const addCert = () => setCert([...data.certifications, emptyCert()]);
  const updateCert = (i, field, val) =>
    setCert(data.certifications.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  const removeCert = (i) => setCert(data.certifications.filter((_, idx) => idx !== i));

  const handleCertFile = (i, file) => {
    if (file) {
      setCert(data.certifications.map((c, idx) =>
        idx === i ? { ...c, file, fileName: file.name } : c
      ));
    }
  };

  // Clear existing cert file (user wants to replace/remove)
  const clearExistingCertFile = (i) => {
    updateCert(i, 'existingFileUrl', '');
  };

  /* Resume */
  const handleFile = (file) => {
    if (file) onChange({ ...data, resumeFile: file, resumeName: file.name });
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Clear existing resume (user wants to replace)
  const clearExistingResume = () => {
    onChange({ ...data, existingResumeUrl: '', existingResumeName: '' });
  };

  /* Next with validation */
  const handleNext = () => {
    setTouched(true);
    const { errors, hasError } = validateStep3(data);
    setValidationErrors(errors);
    if (!hasError) {
      onNext();
    } else {
      // Scroll to first error
      setTimeout(() => {
        const firstErr = document.querySelector('.field-error-msg, .resume-drop.has-error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // Re-validate on data change if already touched
  const revalidate = (newData) => {
    if (touched) {
      const { errors } = validateStep3(newData);
      setValidationErrors(errors);
    }
  };

  const wE = touched ? validationErrors.works : [];
  const eE = touched ? validationErrors.edus : [];
  const cE = touched ? validationErrors.certs : [];
  const resumeErr = touched ? validationErrors.resume : '';

  return (
    <div className="step-container">
      <div className="step-heading">
        <h2>Experience &amp; Background</h2>
        <p>Add your work history, education, certifications, and upload your resume.</p>
      </div>

      {/* ── Work Experience ── */}
      <div className="exp-section">
        <SectionHeader icon="💼" title="Work Experience"
          count={data.workExperiences.length} onAdd={addWork} addLabel="Add Experience" />
        {data.workExperiences.length === 0 && (
          <div className="empty-section-hint">No work experience added yet. Click "Add Experience" to get started.</div>
        )}
        {data.workExperiences.map((w, i) => (
          <div className="exp-card" key={i} id={`work-card-${i}`}>
            <div className="exp-card-header">
              <span className="exp-card-num">Experience #{i + 1}</span>
              <RemoveBtn onClick={() => removeWork(i)} id={`remove-work-${i}`} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor={`work-company-${i}`}>Company Name <span className="required-star">*</span></label>
                <input
                  id={`work-company-${i}`} type="text" placeholder="e.g. Google Inc."
                  value={w.company}
                  className={wE[i]?.company ? 'input-error' : ''}
                  onChange={e => {
                    updateWork(i, 'company', e.target.value);
                    revalidate({ ...data, workExperiences: data.workExperiences.map((x, xi) => xi === i ? { ...x, company: e.target.value } : x) });
                  }}
                />
                <FieldError msg={wE[i]?.company} />
              </div>
              <div className="form-field">
                <label htmlFor={`work-title-${i}`}>Job Title <span className="required-star">*</span></label>
                <input
                  id={`work-title-${i}`} type="text" placeholder="e.g. Senior Data Scientist"
                  value={w.title}
                  className={wE[i]?.title ? 'input-error' : ''}
                  onChange={e => {
                    updateWork(i, 'title', e.target.value);
                    revalidate({ ...data, workExperiences: data.workExperiences.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x) });
                  }}
                />
                <FieldError msg={wE[i]?.title} />
              </div>
              <div className="form-field">
                <label htmlFor={`work-start-${i}`}>Start Date <span className="required-star">*</span></label>
                <input
                  id={`work-start-${i}`} type="month" value={w.startDate}
                  className={wE[i]?.startDate ? 'input-error' : ''}
                  onChange={e => updateWork(i, 'startDate', e.target.value)}
                />
                <FieldError msg={wE[i]?.startDate} />
              </div>
              <div className="form-field">
                <label htmlFor={`work-end-${i}`}>End Date <span className="required-star">*</span></label>
                <input
                  id={`work-end-${i}`} type="month" value={w.endDate}
                  disabled={w.current}
                  className={wE[i]?.endDate ? 'input-error' : ''}
                  onChange={e => updateWork(i, 'endDate', e.target.value)}
                />
                <label className="checkbox-label" htmlFor={`work-current-${i}`}>
                  <input id={`work-current-${i}`} type="checkbox" checked={w.current}
                    onChange={e => updateWork(i, 'current', e.target.checked)} />
                  Currently working here
                </label>
                <FieldError msg={wE[i]?.endDate} />
              </div>
            </div>
            <div className="form-field full-width">
              <label htmlFor={`work-desc-${i}`}>Description</label>
              <textarea id={`work-desc-${i}`} rows="3"
                placeholder="Describe your key responsibilities and achievements..."
                value={w.description} onChange={e => updateWork(i, 'description', e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Education ── */}
      <div className="exp-section">
        <SectionHeader icon="🎓" title="Education"
          count={data.educations.length} onAdd={addEdu} addLabel="Add Education" />
        {data.educations.length === 0 && (
          <div className="empty-section-hint">No education added yet.</div>
        )}
        {data.educations.map((e, i) => (
          <div className="exp-card" key={i} id={`edu-card-${i}`}>
            <div className="exp-card-header">
              <span className="exp-card-num">Education #{i + 1}</span>
              <RemoveBtn onClick={() => removeEdu(i)} id={`remove-edu-${i}`} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>School / University <span className="required-star">*</span></label>
                <SearchableDropdown
                  id={`edu-school-${i}`}
                  placeholder="Select school..."
                  options={SCHOOLS}
                  value={e.school}
                  hasError={!!eE[i]?.school}
                  onChange={val => updateEdu(i, 'school', val)}
                />
                <FieldError msg={eE[i]?.school} />
              </div>

              <div className="form-field">
                <label htmlFor={`edu-degree-${i}`}>Degree <span className="required-star">*</span></label>
                <select
                  id={`edu-degree-${i}`} value={e.degree}
                  className={eE[i]?.degree ? 'input-error' : ''}
                  onChange={ev => updateEdu(i, 'degree', ev.target.value)}
                >
                  <option value="">Select degree</option>
                  {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <FieldError msg={eE[i]?.degree} />
              </div>

              <div className="form-field">
                <label>Discipline / Field of Study <span className="required-star">*</span></label>
                <SearchableDropdown
                  id={`edu-discipline-${i}`}
                  placeholder="Select discipline..."
                  options={DISCIPLINES}
                  value={e.discipline}
                  hasError={!!eE[i]?.discipline}
                  onChange={val => updateEdu(i, 'discipline', val)}
                />
                <FieldError msg={eE[i]?.discipline} />
              </div>

              <div className="form-field" />
            </div>

            <div className="form-grid" style={{ marginTop: 8 }}>
              <div className="form-field">
                <label htmlFor={`edu-sd-${i}`}>Start Date <span className="required-star">*</span></label>
                <input
                  id={`edu-sd-${i}`} type="month" value={e.startDate}
                  className={eE[i]?.startDate ? 'input-error' : ''}
                  onChange={ev => updateEdu(i, 'startDate', ev.target.value)}
                />
                <FieldError msg={eE[i]?.startDate} />
              </div>
              <div className="form-field">
                <label htmlFor={`edu-ed-${i}`}>End Date <span className="required-star">*</span></label>
                <input
                  id={`edu-ed-${i}`} type="month" value={e.endDate}
                  className={eE[i]?.endDate ? 'input-error' : ''}
                  onChange={ev => updateEdu(i, 'endDate', ev.target.value)}
                />
                <FieldError msg={eE[i]?.endDate} />
              </div>
              <div className="form-field">
                <label htmlFor={`edu-score-${i}`}>CGPA / Marks <span className="field-hint">(e.g. 8.5 or 85%)</span></label>
                <input id={`edu-score-${i}`} type="number" step="0.01" placeholder="e.g. 8.5"
                  value={e.score} onChange={ev => updateEdu(i, 'score', ev.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Certifications ── */}
      <div className="exp-section">
        <SectionHeader icon="🏅" title="Certifications"
          count={data.certifications.length} onAdd={addCert} addLabel="Add Certification" />
        {data.certifications.length === 0 && (
          <div className="empty-section-hint">No certifications added yet.</div>
        )}
        {data.certifications.map((c, i) => (
          <div className="exp-card" key={i} id={`cert-card-${i}`}>
            <div className="exp-card-header">
              <span className="exp-card-num">Certification #{i + 1}</span>
              <RemoveBtn onClick={() => removeCert(i)} id={`remove-cert-${i}`} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor={`cert-name-${i}`}>Certification Name <span className="required-star">*</span></label>
                <input
                  id={`cert-name-${i}`} type="text" placeholder="e.g. AWS Solutions Architect"
                  value={c.name}
                  className={cE[i]?.name ? 'input-error' : ''}
                  onChange={e => updateCert(i, 'name', e.target.value)}
                />
                <FieldError msg={cE[i]?.name} />
              </div>
              <div className="form-field">
                <label htmlFor={`cert-issuer-${i}`}>Issuing Organization <span className="required-star">*</span></label>
                <input
                  id={`cert-issuer-${i}`} type="text" placeholder="e.g. Amazon Web Services"
                  value={c.issuer}
                  className={cE[i]?.issuer ? 'input-error' : ''}
                  onChange={e => updateCert(i, 'issuer', e.target.value)}
                />
                <FieldError msg={cE[i]?.issuer} />
              </div>
              <div className="form-field">
                <label htmlFor={`cert-date-${i}`}>Issue Date <span className="required-star">*</span></label>
                <input
                  id={`cert-date-${i}`} type="month" value={c.date}
                  className={cE[i]?.date ? 'input-error' : ''}
                  onChange={e => updateCert(i, 'date', e.target.value)}
                />
                <FieldError msg={cE[i]?.date} />
              </div>
            </div>

            {/* Certificate file upload — required, supports existing pre-populated file */}
            <div className="form-field full-width cert-upload-field">
              <label>
                Upload Certificate <span className="required-star">*</span>{' '}
                <span className="field-hint">(PDF, JPG, PNG · max 5MB)</span>
              </label>
              <input
                ref={el => certFileRefs.current[i] = el}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                id={`cert-file-${i}`}
                onChange={e => handleCertFile(i, e.target.files[0])}
              />

              {/* Priority: new uploaded file > existing DB file > upload prompt */}
              {c.fileName ? (
                /* Newly uploaded file this session */
                <div className="cert-file-uploaded">
                  <span className="cert-file-icon">📄</span>
                  <span className="cert-file-name">{c.fileName}</span>
                  <button type="button" className="cert-file-change"
                    onClick={() => certFileRefs.current[i]?.click()}>
                    Change
                  </button>
                </div>
              ) : c.existingFileUrl ? (
                /* Pre-populated from DB */
                <ExistingFileBadge
                  label={c.existingFileName || 'Existing certificate on file'}
                  onReplace={() => certFileRefs.current[i]?.click()}
                  onRemoveExisting={() => clearExistingCertFile(i)}
                />
              ) : (
                /* No file yet */
                <button
                  type="button"
                  className={`cert-upload-btn ${cE[i]?.file ? 'upload-btn-error' : ''}`}
                  id={`btn-upload-cert-${i}`}
                  onClick={() => certFileRefs.current[i]?.click()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Click to upload certificate
                </button>
              )}
              <FieldError msg={cE[i]?.file} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Resume Upload ── */}
      <div className="exp-section">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-icon">📄</span>
            <h3>Resume <span className="required-star">*</span></h3>
          </div>
        </div>

        {/* Case 1: existing resume from DB, not yet replaced */}
        {!data.resumeFile && data.existingResumeUrl ? (
          <div className="existing-resume-wrapper">
            <ExistingFileBadge
              label={data.existingResumeName || 'Existing resume on file'}
              onReplace={() => {
                clearExistingResume();
                setTimeout(() => fileRef.current?.click(), 50);
              }}
            />
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx"
              style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} id="resume-input" />
          </div>
        ) : (
          /* Case 2: drop zone for new upload */
          <div
            className={`resume-drop ${data.resumeName ? 'uploaded' : ''} ${resumeErr ? 'has-error' : ''}`}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            id="resume-drop-zone"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx"
              style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} id="resume-input" />
            {data.resumeName ? (
              <>
                <div className="resume-uploaded-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span className="resume-filename">{data.resumeName}</span>
                <span className="resume-change">Click to change file</span>
              </>
            ) : (
              <>
                <div className="resume-upload-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span className="resume-prompt">Drag &amp; drop your resume here, or click to browse</span>
                <span className="resume-hint">Supports PDF, DOC, DOCX · Max 10MB</span>
              </>
            )}
          </div>
        )}
        {resumeErr && <FieldError msg={resumeErr} />}
      </div>

      <div className="wizard-nav">
        <button className="btn-back" onClick={onBack} id="btn-step3-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button className="btn-primary" onClick={handleNext} id="btn-step3-next">
          Review Application
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}