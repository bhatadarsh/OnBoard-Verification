import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = '/api/v1';

const SECTIONS = [
  { id: 1, label: 'Personal Details',   icon: '👤' },
  { id: 2, label: 'Current Address',    icon: '📍' },
  { id: 3, label: 'Permanent Address',  icon: '🏠' },
  { id: 4, label: '10th Education',     icon: '📗' },
  { id: 5, label: '12th Education',     icon: '📘' },
  { id: 6, label: 'Graduation',         icon: '🎓' },
  { id: 7, label: 'Work Experience',    icon: '💼' },
  { id: 8, label: 'Government IDs',     icon: '🪪' },
  { id: 9, label: 'Signature',          icon: '✍️' },
];

const Field = ({ label, name, value, onChange, type = 'text', required = false, placeholder = '' }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
      {label}{required && <span className="text-rose-400 ml-1">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder || label}
      required={required}
      className="bg-slate-800 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all"
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, options, required = false }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
      {label}{required && <span className="text-rose-400 ml-1">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="bg-slate-800 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none transition-all cursor-pointer"
    >
      <option value="">Select {label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SectionCard = ({ section, active, onClick, completed }) => (
  <button
    onClick={() => onClick(section.id)}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left cursor-pointer ${
      active
        ? 'bg-cyan-600/20 border border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
        : completed
        ? 'bg-emerald-900/20 border border-emerald-600/40 text-emerald-400'
        : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
    }`}
  >
    <span className="text-lg">{section.icon}</span>
    <span className="flex-1">{section.id}. {section.label}</span>
    {completed && <span className="text-emerald-400 text-xs">✓</span>}
  </button>
);

export default function OnboardingForm({ show }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(new Set());

  // All form field state
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', dob: '', gender: '',
    current_address: '',
    permanent_address: '',
    school_10th: '', percentage_10th: '', year_10th: '', board_10th: '',
    school_12th: '', percentage_12th: '', year_12th: '', board_12th: '',
    graduation_degree: '', graduation_college: '', graduation_year: '',
    current_company: '', current_role: '', experience: '', current_ctc: '', notice_period: '',
    aadhar_number: '', pan_number: '',
    bank_account_number: '', ifsc_code: '', bank_name: '',
  });

  // Signature state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' | 'upload'
  const [signatureFile, setSignatureFile] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef(null);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const markComplete = (id) => setCompleted(prev => new Set([...prev, id]));

  const nextSection = () => {
    markComplete(step);
    if (step < 9) setStep(s => s + 1);
  };
  const prevSection = () => { if (step > 1) setStep(s => s - 1); };

  // ---- Canvas Signature Logic ----
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setHasDrawn(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = (e) => { e.preventDefault(); setIsDrawing(false); };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const getSignatureBlob = () =>
    new Promise(resolve => canvasRef.current?.toBlob(resolve, 'image/png'));

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.phone) {
      show?.('Name, Email, and Phone are required', 'error');
      return;
    }
    setLoading(true);

    try {
      // Step 1: Submit form data
      const r = await fetch(`${API}/onboarding/form-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Form submission failed');

      const candidateId = d.candidate_id;
      show?.(`Candidate profile ${d.status}!`, 'success');

      // Step 2: Upload signature if provided
      const hasSignatureFile = signatureFile || (signatureMode === 'draw' && hasDrawn);
      if (hasSignatureFile) {
        const fd = new FormData();
        if (signatureMode === 'upload' && signatureFile) {
          fd.append('signature', signatureFile);
        } else if (signatureMode === 'draw' && hasDrawn) {
          const blob = await getSignatureBlob();
          if (blob) fd.append('signature', blob, 'signature.png');
        }
        await fetch(`${API}/documents/${candidateId}`, { method: 'POST', body: fd });
        show?.('Signature uploaded for verification', 'success');
      }

      navigate(`/docs`);
    } catch (err) {
      show?.(err.message || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full Name"  name="full_name" value={form.full_name} onChange={handleChange} required placeholder="As per government ID" />
            <Field label="Email"      name="email"     value={form.email}     onChange={handleChange} required type="email" />
            <Field label="Phone"      name="phone"     value={form.phone}     onChange={handleChange} required type="tel" />
            <Field label="Date of Birth" name="dob"   value={form.dob}       onChange={handleChange} type="date" />
            <SelectField label="Gender" name="gender" value={form.gender} onChange={handleChange}
              options={['Male', 'Female', 'Other', 'Prefer not to say']} />
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 gap-5">
            <Field label="Current Address (Street, City, State, PIN)" name="current_address"
              value={form.current_address} onChange={handleChange} placeholder="House/Flat No, Street, City, State - PIN" />
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 gap-5">
            <Field label="Permanent Address (Street, City, State, PIN)" name="permanent_address"
              value={form.permanent_address} onChange={handleChange} placeholder="Same as current or native address" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Field label="School Name (10th)" name="school_10th" value={form.school_10th} onChange={handleChange} />
            </div>
            <Field label="Board (10th)"             name="board_10th"      value={form.board_10th}      onChange={handleChange} placeholder="e.g. CBSE, ICSE, State Board" />
            <Field label="Percentage / CGPA (10th)" name="percentage_10th" value={form.percentage_10th} onChange={handleChange} placeholder="e.g. 87.5%" />
            <Field label="Year of Passing (10th)"   name="year_10th"       value={form.year_10th}       onChange={handleChange} placeholder="e.g. 2018" />
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Field label="School / College Name (12th)" name="school_12th" value={form.school_12th} onChange={handleChange} />
            </div>
            <Field label="Board (12th)"             name="board_12th"      value={form.board_12th}      onChange={handleChange} placeholder="e.g. CBSE, ICSE, State Board" />
            <Field label="Percentage / CGPA (12th)" name="percentage_12th" value={form.percentage_12th} onChange={handleChange} placeholder="e.g. 82.4%" />
            <Field label="Year of Passing (12th)"   name="year_12th"       value={form.year_12th}       onChange={handleChange} placeholder="e.g. 2020" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Degree Name"         name="graduation_degree"  value={form.graduation_degree}  onChange={handleChange} placeholder="e.g. B.Tech, B.E., BCA, MCA" />
            <Field label="Year of Passing"     name="graduation_year"    value={form.graduation_year}    onChange={handleChange} placeholder="e.g. 2024" />
            <div className="md:col-span-2">
              <Field label="College / University" name="graduation_college" value={form.graduation_college} onChange={handleChange} />
            </div>
          </div>
        );
      case 7:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Current Company"   name="current_company" value={form.current_company} onChange={handleChange} />
            <Field label="Current Role"      name="current_role"    value={form.current_role}    onChange={handleChange} />
            <Field label="Total Experience"  name="experience"      value={form.experience}      onChange={handleChange} placeholder="e.g. 2 years 3 months" />
            <Field label="Current CTC"       name="current_ctc"     value={form.current_ctc}     onChange={handleChange} placeholder="e.g. 8 LPA" />
            <Field label="Notice Period"     name="notice_period"   value={form.notice_period}   onChange={handleChange} placeholder="e.g. 30 days" />
          </div>
        );
      case 8:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Aadhar Number"       name="aadhar_number"      value={form.aadhar_number}      onChange={handleChange} placeholder="XXXX XXXX XXXX" />
            <Field label="PAN Number"          name="pan_number"         value={form.pan_number}         onChange={handleChange} placeholder="AAAAA9999A" />
            <Field label="Bank Account Number" name="bank_account_number" value={form.bank_account_number} onChange={handleChange} />
            <Field label="IFSC Code"           name="ifsc_code"          value={form.ifsc_code}          onChange={handleChange} />
            <div className="md:col-span-2">
              <Field label="Bank Name"         name="bank_name"          value={form.bank_name}          onChange={handleChange} />
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-6">
            <p className="text-slate-400 text-sm">
              Provide your signature — this will be verified using AI Vision to confirm authenticity.
              You can either <strong className="text-cyan-400">draw</strong> your signature directly
              or <strong className="text-cyan-400">upload</strong> a scanned physical signature image.
            </p>

            {/* Mode Toggle */}
            <div className="flex gap-3">
              {['draw', 'upload'].map(m => (
                <button
                  key={m}
                  onClick={() => setSignatureMode(m)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer capitalize ${
                    signatureMode === m
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {m === 'draw' ? '✏️ Draw Signature' : '📎 Upload Image'}
                </button>
              ))}
            </div>

            {signatureMode === 'draw' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Draw inside the box below</p>
                <div className="relative border-2 border-dashed border-cyan-600/40 rounded-xl overflow-hidden bg-slate-950">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={200}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-slate-700 text-sm font-medium tracking-widest">Sign here</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={clearCanvas}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors cursor-pointer underline underline-offset-2"
                >
                  Clear & Redo
                </button>
                {hasDrawn && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span>✓</span> Signature captured — will be verified by Groq Vision during extraction
                  </div>
                )}
              </div>
            )}

            {signatureMode === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  id="sig-upload"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={e => setSignatureFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="sig-upload"
                  className={`block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                    signatureFile
                      ? 'border-cyan-500 bg-cyan-500/5 text-cyan-300'
                      : 'border-slate-700 hover:border-cyan-500/50 text-slate-500'
                  }`}
                >
                  {signatureFile
                    ? <span>✓ {signatureFile.name}</span>
                    : <span>Click to select signature image (PNG / JPG)</span>}
                </label>
                {signatureFile && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span>✓</span> Signature image selected — will be verified by Groq Vision during extraction
                  </div>
                )}
              </div>
            )}

            {/* AI verification info box */}
            <div className="bg-slate-900 border-l-4 border-cyan-500 p-4 rounded-r-lg text-sm text-slate-300 flex items-start gap-3">
              <span className="text-cyan-400 text-lg mt-0.5">🤖</span>
              <div>
                <p className="font-semibold text-cyan-300 mb-1">Groq Vision Signature Verification</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your signature will be analysed using the <strong>meta-llama/llama-4-scout Vision</strong> model.
                  It checks for genuine ink strokes, flow patterns, and the presence of a real handwritten mark.
                  The result (<span className="text-emerald-400">VERIFIED</span>, <span className="text-amber-400">SUSPICIOUS</span>,
                  or <span className="text-rose-400">NOT_FOUND</span>) is stored in the validation report.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-wide">Candidate Onboarding Form</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Fill in all 9 sections. Your data will be saved and used for document validation.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="hidden lg:flex flex-col gap-2 w-60 flex-shrink-0">
          {SECTIONS.map(s => (
            <SectionCard
              key={s.id}
              section={s}
              active={step === s.id}
              onClick={setStep}
              completed={completed.has(s.id)}
            />
          ))}
        </div>

        {/* Main Form Panel */}
        <div className="flex-1 min-w-0">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Section {step} of 9 — {SECTIONS[step - 1].label}
              </span>
              <span className="text-xs text-cyan-400 font-semibold">{Math.round((step / 9) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(step / 9) * 100}%` }}
              />
            </div>
          </div>

          {/* Section Content */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-8 mb-6 min-h-[300px]">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-2xl">{SECTIONS[step - 1].icon}</span>
              <span>{SECTIONS[step - 1].id}. {SECTIONS[step - 1].label}</span>
            </h2>
            {renderSection()}
          </div>

          {/* Nav Buttons */}
          <div className="flex gap-4 items-center justify-between">
            <button
              onClick={prevSection}
              disabled={step === 1}
              className="px-6 py-3 rounded-lg border border-slate-700 text-slate-400 text-sm font-semibold hover:border-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              ← Previous
            </button>

            <span className="text-slate-600 text-xs hidden sm:block">
              {SECTIONS.map(s => (
                <span key={s.id} className={`inline-block w-2 h-2 rounded-full mx-0.5 ${
                  step === s.id ? 'bg-cyan-400' : completed.has(s.id) ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
              ))}
            </span>

            {step < 9 ? (
              <button
                onClick={nextSection}
                className="px-6 py-3 rounded-lg bg-cyan-600/20 border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/30 hover:text-white text-sm font-semibold transition-all cursor-pointer"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-8 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  loading
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-cyan-600/20 border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/30 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Form'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
