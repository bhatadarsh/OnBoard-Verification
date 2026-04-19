import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.register(formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            fontFamily: "'Outfit', sans-serif",
            color: '#e8f0fe',
            backgroundColor: '#020811',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
        },
        bgGlow: {
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '60vw',
            height: '60vw',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
            zIndex: 0,
        },
        nav: {
            padding: '20px 8%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
            position: 'relative',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
        },
        logo: {
            fontSize: '20px',
            fontWeight: '900',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(90deg, #00e5ff, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
        },
        content: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8% 80px',
            zIndex: 1,
        },
        layoutWrapper: {
            width: '100%',
            maxWidth: '1100px',
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '80px',
            alignItems: 'center',
        },
        brandingSide: {
            display: 'flex',
            flexDirection: 'column',
        },
        mainTitle: {
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: '900',
            lineHeight: '1.1',
            letterSpacing: '-2px',
            marginBottom: '24px',
            color: '#ffffff',
        },
        highlight: {
            color: '#818cf8',
        },
        featureList: {
            marginTop: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
        },
        featureItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            fontSize: '16px',
            color: '#94a3b8',
        },
        formSide: {
            background: 'rgba(10,22,40,0.85)',
            backdropFilter: 'blur(24px)',
            padding: '40px',
            borderRadius: '28px',
            border: '1px solid rgba(0,229,255,0.1)',
            boxShadow: '0 32px 64px -16px rgba(0,0,0,0.7), 0 0 40px rgba(0,229,255,0.04)',
            animation: 'enterUp 0.5s cubic-bezier(0.4,0,0.2,1) forwards',
        },
        inputGroup: {
            marginBottom: '20px',
        },
        label: {
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#cbd5e1',
            marginBottom: '8px',
            paddingLeft: '4px',
        },
        input: {
            width: '100%',
            padding: '13px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#e8f0fe',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
        },
        select: {
            width: '100%',
            padding: '13px 16px',
            background: 'rgba(10,22,40,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: '#e8f0fe',
            fontSize: '14px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            outline: 'none',
        },
        button: {
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(99,102,241,0.35)',
            transition: 'all 0.3s ease',
            marginTop: '12px',
            fontFamily: "'Outfit', sans-serif",
        },
        footer: {
            marginTop: '25px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#94a3b8',
        },
        link: {
            color: '#818cf8',
            textDecoration: 'none',
            fontWeight: '600',
            marginLeft: '5px',
        },
        error: {
            color: '#f87171',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '10px',
            borderRadius: '10px',
        }
    };

    return (
        <div style={styles.container}>
            {/* Grid bg */}
            <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0 }} />
            {/* Blobs */}
            <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', bottom: -200, left: -100, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', top: -100, right: -100, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Success Toast */}
            {success && (
                <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'rgba(16,185,129,0.95)', color: '#fff', padding: '14px 32px', borderRadius: 12, fontWeight: 700, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: "'Outfit', sans-serif" }}>
                    ✓ Account created! Redirecting to sign in...
                </div>
            )}

            <nav style={styles.nav}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #00e5ff, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
                    <span style={styles.logo}>AI HirePro</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#00e5ff', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 5, padding: '2px 7px', letterSpacing: '0.1em' }}>ENTERPRISE</span>
                </div>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                    Already joined? <a href="/login" style={{ color: '#00e5ff', textDecoration: 'none', fontWeight: 700 }}>Sign In</a>
                </div>
            </nav>

            <main style={styles.content}>
                <div style={styles.layoutWrapper}>
                    <div style={styles.brandingSide}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00e5ff', letterSpacing: '0.2em', marginBottom: 20 }}>// NEW ACCOUNT</div>
                        <h1 style={styles.mainTitle}>
                            The future of<br />
                            <span style={{ background: 'linear-gradient(135deg, #00e5ff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hiring.</span>
                        </h1>
                        <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: '1.6', marginBottom: '30px' }}>
                            Join thousands of candidates using our advanced AI to find their perfect role.
                            Experience an interview process like never before.
                        </p>

                        <div style={styles.featureList}>
                            <div style={styles.featureItem}>
                                <span style={{ color: '#00e5ff', fontSize: '18px' }}>⚡</span>
                                <div><strong style={{ color: '#e8f0fe' }}>Instant Setup:</strong> <span style={{ color: '#64748b' }}>Create your profile in seconds.</span></div>
                            </div>
                            <div style={styles.featureItem}>
                                <span style={{ color: '#10b981', fontSize: '18px' }}>🛡️</span>
                                <div><strong style={{ color: '#e8f0fe' }}>Fair Evaluation:</strong> <span style={{ color: '#64748b' }}>AI-driven, unbiased technical scoring.</span></div>
                            </div>
                            <div style={styles.featureItem}>
                                <span style={{ color: '#818cf8', fontSize: '18px' }}>📈</span>
                                <div><strong style={{ color: '#e8f0fe' }}>Detailed Analytics:</strong> <span style={{ color: '#64748b' }}>In-depth reports on your performance.</span></div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.formSide}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#475569', marginBottom: 18, letterSpacing: '0.15em' }}>AUTH / CREATE ACCOUNT</div>
                        <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', color: '#ffffff', letterSpacing: '-0.5px' }}>Create Account</h2>
                        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '28px' }}>Start your journey with AI HirePro.</p>

                        {error && <div style={styles.error}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Jane Smith"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(0,229,255,0.04)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@company.com"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(0,229,255,0.04)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    style={styles.input}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(0,229,255,0.5)'; e.target.style.background = 'rgba(0,229,255,0.04)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Your Role</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[{ val: 'user', icon: '🚀', label: 'Candidate' }, { val: 'admin', icon: '🎛️', label: 'Admin / HR' }].map(opt => (
                                        <div key={opt.val} onClick={() => setFormData({ ...formData, role: opt.val })}
                                            style={{ padding: '14px', borderRadius: 12, border: `1px solid ${formData.role === opt.val ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.07)'}`, background: formData.role === opt.val ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                                            <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: formData.role === opt.val ? '#00e5ff' : '#64748b' }}>{opt.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                style={{ ...styles.button, opacity: loading ? 0.7 : 1, transform: loading ? 'scale(0.98)' : 'scale(1)' }}
                            >
                                {loading ? 'Creating Account...' : '→ Get Started'}
                            </button>
                        </form>

                        <p style={styles.footer}>
                            Already have an account?
                            <a href="/login" style={{ color: '#00e5ff', textDecoration: 'none', fontWeight: '700', marginLeft: '5px' }}>Sign In</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
