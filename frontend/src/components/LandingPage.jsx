import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const styles = {
        container: {
            fontFamily: "'Outfit', sans-serif",
            color: '#e2e8f0',
            backgroundColor: '#050505',
            minHeight: '100vh',
            overflowX: 'hidden',
        },
        nav: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: scrolled ? '15px 8%' : '30px 8%',
            background: scrolled ? 'rgba(5, 5, 5, 0.9)' : 'transparent',
            backdropFilter: 'blur(15px)',
            position: 'fixed',
            top: 0,
            width: '100%',
            zIndex: 1000,
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            boxSizing: 'border-box',
            borderBottom: scrolled ? '1px solid rgba(0, 255, 242, 0.1)' : '1px solid transparent',
        },
        logo: {
            fontSize: '26px',
            fontWeight: '900',
            letterSpacing: '-1px',
            background: 'linear-gradient(90deg, #818cf8 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
        },
        ctaBtn: {
            padding: '12px 32px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.4s ease',
        },
        hero: {
            position: 'relative',
            padding: '220px 8% 140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '60px',
            background: 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.1) 0%, transparent 60%)',
        },
        heroContent: {
            flex: 1.2,
            zIndex: 1,
        },
        title: {
            fontSize: 'clamp(48px, 6vw, 92px)',
            fontWeight: '900',
            lineHeight: '0.9',
            letterSpacing: '-4px',
            marginBottom: '32px',
            color: '#ffffff',
        },
        highlight: {
            color: '#818cf8',
            textShadow: '0 0 30px rgba(99, 102, 241, 0.3)',
        },
        subtitle: {
            fontSize: '22px',
            color: '#94a3b8',
            lineHeight: '1.6',
            maxWidth: '600px',
            marginBottom: '48px',
        },
        imageContainer: {
            flex: 1,
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        mainImg: {
            width: '110%',
            height: 'auto',
            borderRadius: '40px',
            filter: 'drop-shadow(0 0 50px rgba(0, 242, 254, 0.2))',
            animation: 'float 8s ease-in-out infinite',
        },
        statsSection: {
            padding: '80px 8%',
            background: 'linear-gradient(to right, transparent, rgba(0, 242, 254, 0.05), transparent)',
            display: 'flex',
            justifyContent: 'space-between',
            borderY: '1px solid rgba(255, 255, 255, 0.05)',
        },
        statCard: {
            textAlign: 'center',
        },
        statVal: {
            fontSize: '56px',
            fontWeight: '900',
            color: '#ffffff',
            marginBottom: '10px',
            fontFamily: "'Inter', sans-serif",
        },
        statLabel: {
            fontSize: '14px',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontWeight: '700',
        },
        featuresSection: {
            padding: '140px 8%',
            textAlign: 'center',
        },
        featureGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            marginTop: '80px',
        },
        featureCard: {
            padding: '50px',
            borderRadius: '32px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            textAlign: 'left',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        },
        icon: {
            fontSize: '48px',
            marginBottom: '30px',
            display: 'inline-block',
        }
    };

    return (
        <div style={styles.container}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Outfit:wght@700;900&display=swap');
                
                body { margin: 0; background: #050505; }
                
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-30px) rotate(2deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }

                .f-card:hover {
                    background: rgba(0, 242, 254, 0.05);
                    border-color: rgba(0, 242, 254, 0.3);
                    transform: scale(1.03);
                }

                .btn-main:hover {
                    box-shadow: 0 15px 40px rgba(0, 242, 254, 0.5);
                    transform: translateY(-3px);
                }

                @media (max-width: 1024px) {
                    .hero { flex-direction: column; text-align: center; }
                    .image-container { width: 100%; }
                    .subtitle { margin: 0 auto 40px; }
                }
            `}</style>

            <nav style={styles.nav}>
                <div style={styles.logo} onClick={() => navigate('/')}>AI HirePro.</div>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', cursor: 'pointer', fontWeight: '600' }} onClick={() => navigate('/login')}>Sign In</span>
                    <button className="btn-main" style={styles.ctaBtn} onClick={() => navigate('/register')}>Start Evaluation</button>
                </div>
            </nav>

            <main>
                <section style={styles.hero} className="hero">
                    <div style={styles.heroContent}>
                        <h1 style={styles.title}>
                            Hire Smarter.<br />
                            Not <span style={styles.highlight}>Harder.</span>
                        </h1>
                        <p style={styles.subtitle}>
                            Unleash the power of Neural Interviewing. AI HirePro evaluates candidates with microscopic precision while guaranteeing 100% integrity.
                        </p>
                        <button className="btn-main" style={{ ...styles.ctaBtn, padding: '20px 50px', fontSize: '18px' }} onClick={() => navigate('/register')}>Launch Your AI Assistant</button>
                    </div>
                    <div style={styles.imageContainer} className="image-container">
                        <img
                            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200"
                            style={styles.mainImg}
                            alt="AI Intelligence Global Network"
                        />
                    </div>
                </section>

                <section style={styles.statsSection}>
                    <div style={styles.statCard}>
                        <div style={styles.statVal}>99%</div>
                        <div style={styles.statLabel}>Bias Reduction</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statVal}>4HR</div>
                        <div style={styles.statLabel}>Saved per Interview</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statVal}>FAST</div>
                        <div style={styles.statLabel}>Instant Evaluation</div>
                    </div>
                </section>

                <section style={styles.featuresSection}>
                    <h2 style={{ fontSize: '52px', fontWeight: '900', marginBottom: '24px' }}>Precision Engineering for HR.</h2>
                    <p style={{ color: '#94a3b8', fontSize: '19px' }}>Next-generation tools for the world's most innovative recruitment teams.</p>

                    <div style={styles.featureGrid}>
                        <div className="f-card" style={styles.featureCard}>
                            <span style={styles.icon}>🔬</span>
                            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>Blind Scoring</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>Anonymized evaluation removes subconscious bias, focusing purely on technical depth and reasoning.</p>
                        </div>
                        <div className="f-card" style={styles.featureCard}>
                            <span style={styles.icon}>🛰️</span>
                            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>Anti-Cheat Shield</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>Active monitoring of tab switches, copy-pasting, and AI-assistance patterns in real-time.</p>
                        </div>
                        <div className="f-card" style={styles.featureCard}>
                            <span style={styles.icon}>🧬</span>
                            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>Semantic Logic</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>Our LLM evaluators understand the 'Why' behind the answer, not just the keywords.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer style={{ padding: '100px 8%', borderTop: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                <div style={{ ...styles.logo, marginBottom: '30px', fontSize: '32px' }}>AI HirePro.</div>
                <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', fontSize: '15px' }}>Built to empower the next generation of global engineering teams.</p>
                <div style={{ marginTop: '40px', color: '#475569', fontSize: '13px' }}>© 2026 AI HirePro Intelligence.</div>
            </footer>
        </div>
    );
};

export default LandingPage;
