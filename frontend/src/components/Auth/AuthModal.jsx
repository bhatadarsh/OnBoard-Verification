import { useState } from 'react';
import { RECRO_API } from '../../config/api';
import sigmoidLogo from '../../assets/sigmoid_logo.jpeg';
import './AuthModal.css';

export default function AuthModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData, setRegData] = useState({
    firstName: '', lastName: '', mobile: '', email: '', password: '', confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setL = (k, v) => setLoginData(p => ({ ...p, [k]: v }));
  const setR = (k, v) => setRegData(p => ({ ...p, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginData.email) errs.email = 'Email is required';
    if (!loginData.password) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${RECRO_API}/api/candidate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (data.status === 'success') {
        localStorage.setItem('candidate_token', data.data.access_token);
        localStorage.setItem('candidate_id', data.data.candidate_id);
        localStorage.setItem('candidate_email', data.data.email);
        
        onSuccess({ 
          name: data.data.email.split('@')[0], 
          email: data.data.email,
          candidate_id: data.data.candidate_id,
          access_token: data.data.access_token 
        });
      } else {
        setErrors({ general: data.message || 'Login failed' });
      }
    } catch (err) {
      setErrors({ general: 'Network error. Is the backend running on port 8000?' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!regData.firstName.trim()) errs.firstName = 'First name is required';
    if (!regData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!regData.mobile.trim() || !/^\d{10}$/.test(regData.mobile.replace(/\s/g, '')))
      errs.mobile = 'Valid 10-digit mobile required';
    if (!regData.email) errs.email = 'Email is required';
    if (!regData.password || regData.password.length < 6) errs.password = 'Min 6 characters';
    if (regData.password !== regData.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    
    setLoading(true);
    try {
      const res = await fetch(`${RECRO_API}/api/candidate/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: regData.firstName,
          last_name: regData.lastName,
          email: regData.email,
          password: regData.password,
          mobile: regData.mobile
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        // After register, you might want to redirect to login or auto-login
        // For simplicity, let's auto-login by just passing data back
        onSuccess({ 
          name: `${regData.firstName} ${regData.lastName}`, 
          email: regData.email,
          candidate_id: data.data.candidate_id
        });
      } else {
        setErrors({ general: data.message || 'Registration failed' });
      }
    } catch (err) {
      setErrors({ general: 'Network error during registration' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target.classList.contains('modal-backdrop') && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Logo */}
        <div className="modal-logo">
          <img src={sigmoidLogo} alt="Sigmoid" className="modal-logo-img" />
          <span className="sigmoid-text-sm">SIGMOID</span>
        </div>

        <h2 className="modal-title">Your next career move starts here</h2>

        {/* Tabs */}
        <div className="auth-tabs">
          <button id="tab-login" className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrors({}); }}>Sign In</button>
          <button id="tab-register" className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrors({}); }}>Create Account</button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form" id="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input id="login-email" type="email" placeholder="you@example.com"
                value={loginData.email} onChange={e => setL('email', e.target.value)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input id="login-password" type="password" placeholder="Enter your password"
                value={loginData.password} onChange={e => setL('password', e.target.value)} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="forgot-link"><a href="#">Forgot password?</a></div>
            <button type="submit" className="btn-primary full-width" disabled={loading} id="btn-login">
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="auth-form" id="register-form">
            {/* Name row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-firstName">First Name<span className="req">*</span></label>
                <input id="reg-firstName" type="text" placeholder="John"
                  value={regData.firstName} onChange={e => setR('firstName', e.target.value)} />
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-lastName">Last Name<span className="req">*</span></label>
                <input id="reg-lastName" type="text" placeholder="Doe"
                  value={regData.lastName} onChange={e => setR('lastName', e.target.value)} />
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>

            {/* Mobile */}
            <div className="form-group">
              <label htmlFor="reg-mobile">Mobile Number<span className="req">*</span></label>
              <input id="reg-mobile" type="tel" placeholder="10-digit mobile number"
                value={regData.mobile} onChange={e => setR('mobile', e.target.value)} />
              {errors.mobile && <span className="field-error">{errors.mobile}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="reg-email">Email Address<span className="req">*</span></label>
              <input id="reg-email" type="email" placeholder="you@example.com"
                value={regData.email} onChange={e => setR('email', e.target.value)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-password">Password<span className="req">*</span></label>
                <input id="reg-password" type="password" placeholder="Min 6 characters"
                  value={regData.password} onChange={e => setR('password', e.target.value)} />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-confirm">Confirm Password<span className="req">*</span></label>
                <input id="reg-confirm" type="password" placeholder="Repeat password"
                  value={regData.confirm} onChange={e => setR('confirm', e.target.value)} />
                {errors.confirm && <span className="field-error">{errors.confirm}</span>}
              </div>
            </div>

            <button type="submit" className="btn-primary full-width" disabled={loading} id="btn-register">
              {loading ? <span className="spinner" /> : 'Create Account & Continue'}
            </button>
          </form>
        )}

        <p className="modal-footer-note">
          By continuing, you agree to Sigmoid's{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
