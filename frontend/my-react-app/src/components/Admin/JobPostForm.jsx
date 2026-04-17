import { useState } from 'react';
import './JobPostForm.css';

const DEPARTMENTS = [
  'Commercial Analytics', 'Intelligent Automation', 'Data Engineering',
  'AI & Machine Learning', 'Consulting', 'AI Innovation',
  'Data Science', 'Business Intelligence', 'Engineering', 'Product',
];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['Hybrid', 'On-site', 'Remote', 'On-site / Travel'];
const EXP_RANGES = [
  '0–1 Years', '1–2 Years', '2–4 Years', '3–5 Years',
  '4–7 Years', '5–7 Years', '5–8 Years', '6–10 Years',
  '8–12 Years', '10+ Years',
];

const emptyForm = () => ({
  title: '',
  subtitle: '',
  department: '',
  location: '',
  type: 'Full-time',
  mode: 'Hybrid',
  experience: '',
  summary: '',
  desiredExperience: [''],
  responsibilities: [''],
  primarySkills: [''],
  secondarySkills: [''],
  tags: '',
});

function ListEditor({ label, items, onChange, placeholder, required }) {
  const add = () => onChange([...items, '']);
  const update = (i, val) => onChange(items.map((v, idx) => (idx === i ? val : v)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="list-editor">
      <div className="list-editor-header">
        <label className="list-editor-label">
          {label} {required && <span className="req">*</span>}
        </label>
        <button type="button" className="btn-list-add" onClick={add}>
          + Add
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="list-editor-row">
          <span className="list-bullet">•</span>
          <input
            type="text"
            placeholder={placeholder}
            value={item}
            onChange={e => update(i, e.target.value)}
            id={`list-${label.replace(/\s/g, '-').toLowerCase()}-${i}`}
          />
          {items.length > 1 && (
            <button
              type="button"
              className="btn-list-remove"
              onClick={() => remove(i)}
              aria-label="Remove item"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function JobPostForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        ...emptyForm(),
        ...initialData,
        desiredExperience: initialData.desiredExperience?.length ? initialData.desiredExperience : [''],
        responsibilities:  initialData.responsibilities?.length  ? initialData.responsibilities  : [''],
        primarySkills:     initialData.primarySkills?.length     ? initialData.primarySkills     : [''],
        secondarySkills:   initialData.secondarySkills?.length   ? initialData.secondarySkills   : [''],
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
      };
    }
    return emptyForm();
  });
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const validate = () => {
    const e = {};
    if (!form.title.trim())      e.title      = 'Job title is required';
    if (!form.department)        e.department  = 'Department is required';
    if (!form.location.trim())   e.location    = 'Location is required';
    if (!form.experience)        e.experience  = 'Experience range is required';
    if (!form.summary.trim())    e.summary     = 'Role summary is required';
    if (form.responsibilities.every(r => !r.trim()))
      e.responsibilities = 'At least one responsibility is required';
    if (form.primarySkills.every(s => !s.trim()))
      e.primarySkills = 'At least one primary skill is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      setActiveTab('basic');
      return;
    }
    const tagArray = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    onSave({
      ...form,
      tags: tagArray,
      desiredExperience: form.desiredExperience.filter(Boolean),
      responsibilities:  form.responsibilities.filter(Boolean),
      primarySkills:     form.primarySkills.filter(Boolean),
      secondarySkills:   form.secondarySkills.filter(Boolean),
    });
  };

  const TABS = [
    { id: 'basic',       label: '1. Basic Info' },
    { id: 'description', label: '2. Job Details' },
    { id: 'skills',      label: '3. Skills' },
  ];

  return (
    <div className="jpf-root">
      {/* Tab Navigation */}
      <div className="jpf-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`jpf-tab-${tab.id}`}
            className={`jpf-tab ${activeTab === tab.id ? 'active' : ''} ${
              Object.keys(errors).length > 0 && tab.id === 'basic' && (errors.title || errors.department || errors.location || errors.experience) ? 'has-error' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="jpf-body">

        {/* ── TAB 1: BASIC INFO ── */}
        {activeTab === 'basic' && (
          <div className="jpf-tab-content" id="jpf-basic">
            <div className="jpf-section">
              <h3 className="jpf-section-title">Position Details</h3>
              <div className="jpf-grid">
                <div className="jpf-field full">
                  <label htmlFor="jpf-title">Job Title <span className="req">*</span></label>
                  <input
                    id="jpf-title"
                    type="text"
                    placeholder="e.g. Principal Data Scientist"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    className={errors.title ? 'error' : ''}
                  />
                  {errors.title && <span className="field-err">{errors.title}</span>}
                </div>

                <div className="jpf-field full">
                  <label htmlFor="jpf-subtitle">Subtitle / Sub-role</label>
                  <input
                    id="jpf-subtitle"
                    type="text"
                    placeholder="e.g. Senior Lead / Associate Director - Data Science"
                    value={form.subtitle}
                    onChange={e => set('subtitle', e.target.value)}
                  />
                </div>

                <div className="jpf-field">
                  <label htmlFor="jpf-department">Department <span className="req">*</span></label>
                  <select
                    id="jpf-department"
                    value={form.department}
                    onChange={e => set('department', e.target.value)}
                    className={errors.department ? 'error' : ''}
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.department && <span className="field-err">{errors.department}</span>}
                </div>

                <div className="jpf-field">
                  <label htmlFor="jpf-location">Location <span className="req">*</span></label>
                  <input
                    id="jpf-location"
                    type="text"
                    placeholder="e.g. Bengaluru, Karnataka, India"
                    value={form.location}
                    onChange={e => set('location', e.target.value)}
                    className={errors.location ? 'error' : ''}
                  />
                  {errors.location && <span className="field-err">{errors.location}</span>}
                </div>

                <div className="jpf-field">
                  <label htmlFor="jpf-type">Job Type</label>
                  <select id="jpf-type" value={form.type} onChange={e => set('type', e.target.value)}>
                    {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="jpf-field">
                  <label htmlFor="jpf-mode">Work Mode</label>
                  <select id="jpf-mode" value={form.mode} onChange={e => set('mode', e.target.value)}>
                    {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="jpf-field">
                  <label htmlFor="jpf-experience">Experience Required <span className="req">*</span></label>
                  <select
                    id="jpf-experience"
                    value={form.experience}
                    onChange={e => set('experience', e.target.value)}
                    className={errors.experience ? 'error' : ''}
                  >
                    <option value="">Select range</option>
                    {EXP_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {errors.experience && <span className="field-err">{errors.experience}</span>}
                </div>

                <div className="jpf-field">
                  <label htmlFor="jpf-tags">Skill Tags <span className="tags-hint">(comma-separated)</span></label>
                  <input
                    id="jpf-tags"
                    type="text"
                    placeholder="e.g. Python, ML, SQL, Snowflake"
                    value={form.tags}
                    onChange={e => set('tags', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="jpf-nav">
              <button type="button" className="jpf-btn-cancel" onClick={onCancel} id="jpf-cancel">
                Cancel
              </button>
              <button type="button" className="jpf-btn-next" onClick={() => setActiveTab('description')} id="jpf-next-1">
                Next: Job Details →
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: JOB DESCRIPTION ── */}
        {activeTab === 'description' && (
          <div className="jpf-tab-content" id="jpf-description">
            <div className="jpf-section">
              <h3 className="jpf-section-title">Role Description</h3>

              <div className="jpf-field full">
                <label htmlFor="jpf-summary">
                  Role Summary <span className="req">*</span>
                </label>
                <textarea
                  id="jpf-summary"
                  rows={5}
                  placeholder="Provide a compelling overview of the role, its purpose, and the impact the candidate will have..."
                  value={form.summary}
                  onChange={e => set('summary', e.target.value)}
                  className={errors.summary ? 'error' : ''}
                />
                {errors.summary && <span className="field-err">{errors.summary}</span>}
                <span className="char-count">{form.summary.length} characters</span>
              </div>

              <ListEditor
                label="Desired Experience"
                items={form.desiredExperience}
                onChange={val => set('desiredExperience', val)}
                placeholder="e.g. 5+ years in commercial analytics environments"
              />

              <ListEditor
                label="Roles & Responsibilities"
                required
                items={form.responsibilities}
                onChange={val => set('responsibilities', val)}
                placeholder="e.g. Design and develop ML models for pricing analytics"
              />
              {errors.responsibilities && (
                <span className="field-err">{errors.responsibilities}</span>
              )}
            </div>

            <div className="jpf-nav">
              <button type="button" className="jpf-btn-back" onClick={() => setActiveTab('basic')} id="jpf-back-2">
                ← Back
              </button>
              <button type="button" className="jpf-btn-next" onClick={() => setActiveTab('skills')} id="jpf-next-2">
                Next: Skills →
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 3: SKILLS ── */}
        {activeTab === 'skills' && (
          <div className="jpf-tab-content" id="jpf-skills">
            <div className="jpf-section">
              <h3 className="jpf-section-title">Skills &amp; Qualifications</h3>

              <ListEditor
                label="Primary Skills (Mandatory)"
                required
                items={form.primarySkills}
                onChange={val => set('primarySkills', val)}
                placeholder="e.g. Proficiency in Python, SQL and PySpark"
              />
              {errors.primarySkills && (
                <span className="field-err">{errors.primarySkills}</span>
              )}

              <ListEditor
                label="Secondary Skills (Good to Have)"
                items={form.secondarySkills}
                onChange={val => set('secondarySkills', val)}
                placeholder="e.g. Experience with LLMs or Agentic AI"
              />

              {/* Preview Panel */}
              <div className="jpf-preview">
                <div className="jpf-preview-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Job Card Preview
                </div>
                <div className="jpf-preview-card">
                  <div className="preview-dept">{form.department || 'Department'}</div>
                  <div className="preview-title">{form.title || 'Job Title'}</div>
                  <div className="preview-sub">{form.subtitle || 'Sub-role'}</div>
                  <div className="preview-loc">📍 {form.location || 'Location'}</div>
                  <div className="preview-badges">
                    <span className="preview-badge">{form.type}</span>
                    <span className="preview-badge">{form.mode}</span>
                    <span className="preview-badge exp">{form.experience || 'Experience'}</span>
                  </div>
                  {form.tags && (
                    <div className="preview-tags">
                      {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} className="preview-tag">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="jpf-nav">
              <button type="button" className="jpf-btn-back" onClick={() => setActiveTab('description')} id="jpf-back-3">
                ← Back
              </button>
              <button type="button" className="jpf-btn-save" onClick={handleSave} id="jpf-save">
                {initialData ? '💾 Update Job Posting' : '🚀 Publish Job Posting'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
