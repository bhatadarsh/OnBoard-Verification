import { useState } from 'react';
import './StepForms.css';

const NOTICE_PERIOD_OPTIONS = [
  'Immediate', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'More than 90 Days',
];

const LOCATION_OPTIONS = [
  'Bangalore', 'Mumbai', 'Delhi / NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Chandigarh', 'Kochi', 'Bhubaneswar', 'Remote', 'Any Location',
];

const RELOCATE_OPTIONS = ['Yes', 'No', 'Maybe'];

const Field = ({ id, label, required, hint, children, error }) => (
  <div className="form-field">
    <label htmlFor={id}>
      {label}{required && <span className="req">*</span>}
      {hint && <span className="field-hint"> ({hint})</span>}
    </label>
    {children}
    {error && <span className="field-error">{error}</span>}
  </div>
);

export default function Step2CareerDetails({ data, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    onChange({ ...data, [k]: v });
    if (errors[k]) {
      setErrors({ ...errors, [k]: '' });
    }
  };

  const toggleLocation = (loc) => {
    const curr = data.locationPreference || [];
    const next = curr.includes(loc) ? curr.filter(l => l !== loc) : [...curr, loc];
    set('locationPreference', next);
  };

  const validate = () => {
    const e = {};
    if (!data.totalExperience || data.totalExperience < 0) e.totalExperience = 'Total experience is required';
    if (!data.relevantExperience || data.relevantExperience < 0) e.relevantExperience = 'Relevant experience is required';
    if (!data.noticePeriod) e.noticePeriod = 'Please select notice period';
    if (!data.openToRelocate) e.openToRelocate = 'Please select relocation status';
    if (!data.currentCtc || data.currentCtc < 0) e.currentCtc = 'Current CTC is required';
    if (!data.expectedCtc || data.expectedCtc < 0) e.expectedCtc = 'Expected CTC is required';
    if (!data.linkedinProfile || !data.linkedinProfile.trim()) e.linkedinProfile = 'LinkedIn profile is required';
    if (!data.locationPreference || data.locationPreference.length === 0) e.locationPreference = 'Please select at least one location';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="step-container">
      <div className="step-heading">
        <h2>Career Details</h2>
        <p>Help us understand your professional preferences and availability. All fields marked <span className="req">*</span> are required.</p>
      </div>

      <div className="form-grid">
        {/* Total Experience */}
        <Field id="totalExperience" label="Total Experience" required hint="in years" error={errors.totalExperience}>
          <input
            id="totalExperience"
            type="number"
            min="0"
            max="50"
            step="0.5"
            placeholder="e.g. 4.5"
            value={data.totalExperience || ''}
            onChange={e => set('totalExperience', e.target.value)}
            className={errors.totalExperience ? 'error' : ''}
          />
        </Field>

        {/* Relevant Experience */}
        <Field id="relevantExperience" label="Relevant Experience" required hint="in years" error={errors.relevantExperience}>
          <input
            id="relevantExperience"
            type="number"
            min="0"
            max="50"
            step="0.5"
            placeholder="e.g. 2.5"
            value={data.relevantExperience || ''}
            onChange={e => set('relevantExperience', e.target.value)}
            className={errors.relevantExperience ? 'error' : ''}
          />
        </Field>

        {/* Notice Period */}
        <Field id="noticePeriod" label="Notice Period" required error={errors.noticePeriod}>
          <select id="noticePeriod" value={data.noticePeriod || ''}
            onChange={e => set('noticePeriod', e.target.value)}
            className={errors.noticePeriod ? 'error' : ''}>
            <option value="">Select notice period</option>
            {NOTICE_PERIOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        {/* Open to Relocate */}
        <Field id="openToRelocate" label="Open to Relocate" required error={errors.openToRelocate}>
          <select id="openToRelocate" value={data.openToRelocate || ''}
            onChange={e => set('openToRelocate', e.target.value)}
            className={errors.openToRelocate ? 'error' : ''}>
            <option value="">Select</option>
            {RELOCATE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        {/* Current CTC */}
        <Field id="currentCtc" label="Current CTC" required hint="LPA" error={errors.currentCtc}>
          <input
            id="currentCtc"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 8.5"
            value={data.currentCtc || ''}
            onChange={e => set('currentCtc', e.target.value)}
            className={errors.currentCtc ? 'error' : ''}
          />
        </Field>

        {/* Expected CTC */}
        <Field id="expectedCtc" label="Expected CTC" required hint="LPA" error={errors.expectedCtc}>
          <input
            id="expectedCtc"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 12"
            value={data.expectedCtc || ''}
            onChange={e => set('expectedCtc', e.target.value)}
            className={errors.expectedCtc ? 'error' : ''}
          />
        </Field>
      </div>

      {/* LinkedIn */}
      <div className={`form-field full-width ${errors.linkedinProfile ? 'error' : ''}`}>
        <Field id="linkedinProfile" label="LinkedIn Profile" required error={errors.linkedinProfile}>
          <div className="input-with-icon">
            <span className="input-prefix">🔗</span>
            <input
              id="linkedinProfile"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={data.linkedinProfile || ''}
              onChange={e => set('linkedinProfile', e.target.value)}
              style={{ paddingLeft: '36px' }}
              className={errors.linkedinProfile ? 'error' : ''}
            />
          </div>
        </Field>
      </div>

      {/* Location Preference — multi-select chips */}
      <div className="form-field full-width">
        <label>Location Preference <span className="req">*</span> <span className="field-hint">(select all that apply)</span></label>
        <div className={`chip-grid ${errors.locationPreference ? 'error-grid' : ''}`} id="location-chip-grid">
          {LOCATION_OPTIONS.map(loc => {
            const selected = (data.locationPreference || []).includes(loc);
            return (
              <button
                key={loc}
                type="button"
                className={`location-chip ${selected ? 'selected' : ''}`}
                id={`chip-${loc.replace(/\s/g, '-')}`}
                onClick={() => toggleLocation(loc)}
              >
                {selected && <span className="chip-check">✓ </span>}
                {loc}
              </button>
            );
          })}
        </div>
        {errors.locationPreference && <span className="field-error">{errors.locationPreference}</span>}
      </div>

      <div className="wizard-nav">
        <button className="btn-back" onClick={onBack} id="btn-step2-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <button className="btn-primary" onClick={handleNext} id="btn-step2-next">
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
