import { useRef } from 'react';
import './StepForms.css';

/* ── helpers ── */
const emptyWork = () => ({ company: '', title: '', startDate: '', endDate: '', current: false, description: '' });
const emptyEdu  = () => ({ institution: '', degree: '', field: '', year: '' });
const emptyCert = () => ({ name: '', issuer: '', date: '' });

function SectionHeader({ icon, title, count, onAdd, addLabel }) {
  return (
    <div className="section-header">
      <div className="section-title-row">
        <span className="section-icon">{icon}</span>
        <h3>{title}</h3>
        {count > 0 && <span className="section-count">{count}</span>}
      </div>
      <button type="button" className="btn-add" onClick={onAdd} id={`btn-add-${title.toLowerCase().replace(/\s/g,'-')}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
      Remove
    </button>
  );
}

export default function Step2Experience({ data, onChange, onBack, onNext }) {
  const fileRef = useRef();

  const setWork = (list) => onChange({ ...data, workExperiences: list });
  const setEdu  = (list) => onChange({ ...data, educations: list });
  const setCert = (list) => onChange({ ...data, certifications: list });

  /* Work Experience */
  const addWork = () => setWork([...data.workExperiences, emptyWork()]);
  const updateWork = (i, field, val) => {
    const list = data.workExperiences.map((w, idx) => idx === i ? { ...w, [field]: val } : w);
    setWork(list);
  };
  const removeWork = (i) => setWork(data.workExperiences.filter((_, idx) => idx !== i));

  /* Education */
  const addEdu = () => setEdu([...data.educations, emptyEdu()]);
  const updateEdu = (i, field, val) => {
    const list = data.educations.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    setEdu(list);
  };
  const removeEdu = (i) => setEdu(data.educations.filter((_, idx) => idx !== i));

  /* Certifications */
  const addCert = () => setCert([...data.certifications, emptyCert()]);
  const updateCert = (i, field, val) => {
    const list = data.certifications.map((c, idx) => idx === i ? { ...c, [field]: val } : c);
    setCert(list);
  };
  const removeCert = (i) => setCert(data.certifications.filter((_, idx) => idx !== i));

  /* Resume */
  const handleFile = (file) => {
    if (file) onChange({ ...data, resumeFile: file, resumeName: file.name });
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="step-container">
      <div className="step-heading">
        <h2>Experience &amp; Background</h2>
        <p>Add your work history, education, certifications, and upload your resume.</p>
      </div>

      {/* ── Work Experience ── */}
      <div className="exp-section">
        <SectionHeader
          icon="💼"
          title="Work Experience"
          count={data.workExperiences.length}
          onAdd={addWork}
          addLabel="Add Experience"
        />
        {data.workExperiences.length === 0 && (
          <div className="empty-section-hint">
            No work experience added yet. Click "Add Experience" to get started.
          </div>
        )}
        {data.workExperiences.map((w, i) => (
          <div className="exp-card" key={i} id={`work-card-${i}`}>
            <div className="exp-card-header">
              <span className="exp-card-num">Experience #{i + 1}</span>
              <RemoveBtn onClick={() => removeWork(i)} id={`remove-work-${i}`} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor={`work-company-${i}`}>Company Name</label>
                <input id={`work-company-${i}`} type="text" placeholder="e.g. Google Inc."
                  value={w.company} onChange={e => updateWork(i, 'company', e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`work-title-${i}`}>Job Title</label>
                <input id={`work-title-${i}`} type="text" placeholder="e.g. Senior Data Scientist"
                  value={w.title} onChange={e => updateWork(i, 'title', e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`work-start-${i}`}>Start Date</label>
                <input id={`work-start-${i}`} type="month" value={w.startDate}
                  onChange={e => updateWork(i, 'startDate', e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`work-end-${i}`}>End Date</label>
                <input id={`work-end-${i}`} type="month" value={w.endDate}
                  disabled={w.current}
                  onChange={e => updateWork(i, 'endDate', e.target.value)} />
                <label className="checkbox-label" htmlFor={`work-current-${i}`}>
                  <input id={`work-current-${i}`} type="checkbox" checked={w.current}
                    onChange={e => updateWork(i, 'current', e.target.checked)} />
                  Currently working here
                </label>
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
        <SectionHeader
          icon="🎓"
          title="Education"
          count={data.educations.length}
          onAdd={addEdu}
          addLabel="Add Education"
        />
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
                <label htmlFor={`edu-inst-${i}`}>Institution</label>
                <input id={`edu-inst-${i}`} type="text" placeholder="University / College name"
                  value={e.institution} onChange={ev => updateEdu(i, 'institution', ev.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`edu-degree-${i}`}>Degree</label>
                <input id={`edu-degree-${i}`} type="text" placeholder="e.g. B.Tech, M.Sc, MBA"
                  value={e.degree} onChange={ev => updateEdu(i, 'degree', ev.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`edu-field-${i}`}>Field of Study</label>
                <input id={`edu-field-${i}`} type="text" placeholder="e.g. Computer Science"
                  value={e.field} onChange={ev => updateEdu(i, 'field', ev.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`edu-year-${i}`}>Graduation Year</label>
                <input id={`edu-year-${i}`} type="number" placeholder="e.g. 2022" min="1980" max="2030"
                  value={e.year} onChange={ev => updateEdu(i, 'year', ev.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Certifications ── */}
      <div className="exp-section">
        <SectionHeader
          icon="🏅"
          title="Certifications"
          count={data.certifications.length}
          onAdd={addCert}
          addLabel="Add Certification"
        />
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
                <label htmlFor={`cert-name-${i}`}>Certification Name</label>
                <input id={`cert-name-${i}`} type="text" placeholder="e.g. AWS Solutions Architect"
                  value={c.name} onChange={e => updateCert(i, 'name', e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`cert-issuer-${i}`}>Issuing Organization</label>
                <input id={`cert-issuer-${i}`} type="text" placeholder="e.g. Amazon Web Services"
                  value={c.issuer} onChange={e => updateCert(i, 'issuer', e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor={`cert-date-${i}`}>Issue Date</label>
                <input id={`cert-date-${i}`} type="month" value={c.date}
                  onChange={e => updateCert(i, 'date', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Resume Upload ── */}
      <div className="exp-section">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-icon">📄</span>
            <h3>Resume</h3>
          </div>
        </div>
        <div
          className={`resume-drop ${data.resumeName ? 'uploaded' : ''}`}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          id="resume-drop-zone"
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
            id="resume-input"
          />
          {data.resumeName ? (
            <>
              <div className="resume-uploaded-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span className="resume-filename">{data.resumeName}</span>
              <span className="resume-change">Click to change file</span>
            </>
          ) : (
            <>
              <div className="resume-upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <span className="resume-prompt">Drag & drop your resume here, or click to browse</span>
              <span className="resume-hint">Supports PDF, DOC, DOCX · Max 10MB</span>
            </>
          )}
        </div>
      </div>

      <div className="wizard-nav">
        <button className="btn-back" onClick={onBack} id="btn-step2-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <button className="btn-primary" onClick={onNext} id="btn-step2-next">
          Review Application
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
