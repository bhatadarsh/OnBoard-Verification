import { useState } from 'react';
import './StepForms.css';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Other / International',
];

const Field = ({ id, label, required, children, error }) => (
  <div className="form-field">
    <label htmlFor={id}>{label}{required && <span className="req">*</span>}</label>
    {children}
    {error && <span className="field-error">{error}</span>}
  </div>
);

export default function Step1PersonalInfo({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  const set = (field, val) => onChange({ ...data, [field]: val });

  const validate = () => {
    const e = {};
    if (!data.firstName.trim()) e.firstName = 'First name is required';
    if (!data.lastName.trim()) e.lastName = 'Last name is required';
    if (!data.email.trim() || !/\S+@\S+\.\S+/.test(data.email)) e.email = 'Valid email is required';
    if (!data.mobile.trim() || !/^\d{10}$/.test(data.mobile.replace(/\s/g, '')))
      e.mobile = 'Valid 10-digit mobile number required';
    if (!data.gender) e.gender = 'Please select gender';
    if (!data.city.trim()) e.city = 'City is required';
    if (!data.state) e.state = 'Please select state';
    if (!data.address.trim()) e.address = 'Address is required';
    if (!data.pincode.trim() || !/^\d{6}$/.test(data.pincode)) e.pincode = 'Valid 6-digit pincode required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div className="step-container">
      <div className="step-heading">
        <h2>Personal Information</h2>
        <p>Tell us a little about yourself. All fields marked <span className="req">*</span> are required.</p>
      </div>

      <div className="form-grid">
        <Field id="firstName" label="First Name" required error={errors.firstName}>
          <input
            id="firstName"
            type="text"
            placeholder="John"
            value={data.firstName}
            onChange={e => set('firstName', e.target.value)}
            className={errors.firstName ? 'error' : ''}
          />
        </Field>

        <Field id="lastName" label="Last Name" required error={errors.lastName}>
          <input
            id="lastName"
            type="text"
            placeholder="Doe"
            value={data.lastName}
            onChange={e => set('lastName', e.target.value)}
            className={errors.lastName ? 'error' : ''}
          />
        </Field>

        <Field id="email" label="Email Address" required error={errors.email}>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={data.email}
            onChange={e => set('email', e.target.value)}
            className={errors.email ? 'error' : ''}
          />
        </Field>

        <Field id="mobile" label="Mobile Number" required error={errors.mobile}>
          <input
            id="mobile"
            type="tel"
            placeholder="10-digit number"
            value={data.mobile}
            onChange={e => set('mobile', e.target.value)}
            className={errors.mobile ? 'error' : ''}
          />
        </Field>

        <Field id="gender" label="Gender" required error={errors.gender}>
          <select
            id="gender"
            value={data.gender}
            onChange={e => set('gender', e.target.value)}
            className={errors.gender ? 'error' : ''}
          >
            <option value="">Select gender</option>
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>

        <Field id="city" label="City" required error={errors.city}>
          <input
            id="city"
            type="text"
            placeholder="e.g. Mumbai"
            value={data.city}
            onChange={e => set('city', e.target.value)}
            className={errors.city ? 'error' : ''}
          />
        </Field>

        <Field id="state" label="State / Region" required error={errors.state}>
          <select
            id="state"
            value={data.state}
            onChange={e => set('state', e.target.value)}
            className={errors.state ? 'error' : ''}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field id="pincode" label="Pincode" required error={errors.pincode}>
          <input
            id="pincode"
            type="text"
            placeholder="6-digit pincode"
            value={data.pincode}
            onChange={e => set('pincode', e.target.value)}
            className={errors.pincode ? 'error' : ''}
          />
        </Field>
      </div>

      <div className="form-field full-width">
        <label htmlFor="address">Address<span className="req">*</span></label>
        <textarea
          id="address"
          placeholder="Street address, apartment, area..."
          rows="3"
          value={data.address}
          onChange={e => set('address', e.target.value)}
          className={errors.address ? 'error' : ''}
        />
        {errors.address && <span className="field-error">{errors.address}</span>}
      </div>

      <div className="wizard-nav">
        <span />
        <button className="btn-primary" onClick={handleNext} id="btn-step1-next">
          Continue to Experience
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
