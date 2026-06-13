import { Link } from 'react-router-dom'
import { useAuth } from '../App'


const STATS = [
  { val: '4', label: 'Tumor Classes' },
  { val: '3K+', label: 'Training Scans' },
  { val: '95%+', label: 'Accuracy' },
  { val: 'XAI', label: 'Explainability' },
]

const TUMOR_CLASSES = [
  { name: 'Glioma', color: '#FF5757', desc: 'WHO Grade I–IV primary brain tumor' },
  { name: 'Meningioma', color: '#FFAD3B', desc: 'Benign extra-axial meningeal tumor' },
  { name: 'Pituitary', color: '#7B82F5', desc: 'Sellar/suprasellar adenoma' },
  { name: 'No Tumor', color: '#0CF2C8', desc: 'Normal brain parenchyma' },
]

const FEATURES_PREVIEW = [
  { icon: '🧠', title: 'Grad-CAM XAI', desc: 'Visual heatmaps show exactly where the AI is looking — region analysis, intensity mapping, and focus patterns.' },
  { icon: '🧬', title: 'Multi-Modal Fusion', desc: 'Combine T1, T1ce, T2, and FLAIR sequences into a fused 4-channel tensor for richer classification.' },
  { icon: '📋', title: 'AI Radiology Report', desc: 'Auto-generated clinical report with imaging characteristics, urgency assessment, and follow-up recommendations.' },
  { icon: '💊', title: 'Treatment Guide', desc: 'Tumor-specific treatment options for educational reference.' },
  { icon: '📄', title: 'PDF Export', desc: 'Download a professional clinical report with all findings and scan history.' },
  { icon: '📊', title: 'Scan Dashboard', desc: 'Track your scan history, confidence trends, and classification analytics.' },
]

const PIPELINE = [
  { tag: 'INPUT',    title: 'DICOM Upload',          desc: 'Anonymized .dcm ingestion with modality validation', color: '#7B82F5' },
  { tag: 'PREP',     title: '4-Step Preprocessing',  desc: 'Normalize · skull-strip · CLAHE enhance',             color: '#FFAD3B' },
  { tag: 'AI',       title: 'CNN Classification',    desc: 'Glioma · meningioma · pituitary · no tumor',          color: '#0CF2C8' },
  { tag: 'XAI',      title: 'Grad-CAM + Radiomics',  desc: 'Sub-region ET/TC/WT segmentation & volume metrics',   color: '#FF5757' },
  { tag: 'VISUAL',   title: '3D Brain Render',       desc: 'Interactive rotatable tumor visualization',           color: '#7B82F5' },
  { tag: 'REVIEW',   title: 'HITL Annotation',       desc: 'Doctors refine AI findings, saved for record',        color: '#0CF2C8' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '92vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 1.5rem 3rem', position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient scan grid background */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          backgroundImage: 'linear-gradient(rgba(12,242,200,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(12,242,200,0.05) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 35%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 35%, black 0%, transparent 75%)',
        }} />

        {/* Pill */}
        <div className="fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
          background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.22)',
          color: 'var(--teal)', fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase',
          padding: '0.32rem 0.9rem', borderRadius: '99px', marginBottom: '2rem',
          position: 'relative', zIndex: 1,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)',
            animation: 'blink 2.4s ease-in-out infinite', flexShrink: 0
          }} />
          Deep Learning · MRI Analysis · XAI
        </div>

        {/* Headline */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '0.4rem', position: 'relative', zIndex: 1 }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(12,242,200,0.55)',
            letterSpacing: '0.06em', display: 'block', marginBottom: '-0.1rem'
          }}>
            clinical intelligence
          </span>
          <h1 style={{
            fontSize: 'clamp(3.2rem, 8vw, 5.5rem)', fontWeight: 700,
            letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--text)'
          }}>
            Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI
          </h1>
        </div>

        <p className="fade-up fade-up-2" style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', color: 'var(--text-2)',
          maxWidth: 520, margin: '1rem auto 2.5rem', lineHeight: 1.75,
          position: 'relative', zIndex: 1,
        }}>
          AI-powered brain tumor classification from MRI scans — with Grad-CAM
          explainability, radiology reports, and treatment guidance.
        </p>

        {/* CTA */}
        <div className="fade-up fade-up-3" style={{
          display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
          justifyContent: 'center', marginBottom: '3rem', position: 'relative', zIndex: 1,
        }}>
          <Link to={user ? '/scanner' : '/login'} className="btn btn-primary"
            style={{ fontSize: '0.9rem', padding: '0.75rem 2rem' }}>
            {user ? 'Open Scanner →' : 'Get Started →'}
          </Link>
          <Link to="/features" className="btn btn-outline"
            style={{ fontSize: '0.9rem', padding: '0.75rem 2rem' }}>
            Explore Features
          </Link>
        </div>

        {/* Stats */}
        <div className="fade-up fade-up-4" style={{
          display: 'flex', gap: '1px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', overflow: 'hidden',
          maxWidth: 480, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1,
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '1rem 0.5rem', textAlign: 'center',
              background: 'rgba(10,13,24,0.85)',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '1.4rem',
                fontWeight: 700, color: 'var(--teal)', lineHeight: 1
              }}>{s.val}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                letterSpacing: '0.16em', color: 'var(--text-3)',
                textTransform: 'uppercase', marginTop: '0.3rem'
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section style={{ padding: '4rem 2rem', maxWidth: 1000, margin: '0 auto' }}>
        <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>The Pipeline</p>
        <h2 style={{
          textAlign: 'center', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
          letterSpacing: '-0.02em', marginBottom: '0.75rem'
        }}>
          From scan to <span style={{ color: 'var(--teal)' }}>insight</span>, in six steps
        </h2>
        <p style={{
          textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
          color: 'var(--text-3)', marginBottom: '2.5rem', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Every uploaded scan moves through the same clinical-grade pipeline — fully automated, fully explainable.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {PIPELINE.map((p, i) => (
            <div key={p.title} className="card" style={{ padding: '1.4rem 1.2rem', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
                background: `linear-gradient(90deg, transparent, ${p.color}88, transparent)`
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.2em',
                  color: p.color, textTransform: 'uppercase', fontWeight: 700,
                }}>{p.tag}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)',
                }}>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontWeight: 600,
                fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.4rem'
              }}>{p.title}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                color: 'var(--text-3)', lineHeight: 1.7
              }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tumor Classes ── */}
      <section style={{ padding: '4rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Classification Targets</p>
        <h2 style={{
          textAlign: 'center', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
          letterSpacing: '-0.02em', marginBottom: '2.5rem'
        }}>
          4 classes, <span style={{ color: 'var(--teal)' }}>instantly classified</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {TUMOR_CLASSES.map((t) => (
            <div key={t.name} className="card" style={{ padding: '1.4rem 1.2rem' }}>
              <div style={{
                position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
                background: `linear-gradient(90deg, transparent, ${t.color}88, transparent)`
              }} />
              <div style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: '1.5rem', fontWeight: 300, color: t.color, marginBottom: '0.4rem'
              }}>{t.name}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.64rem',
                color: 'var(--text-3)', lineHeight: 1.6
              }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ padding: '4rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>What's Inside</p>
        <h2 style={{
          textAlign: 'center', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
          letterSpacing: '-0.02em', marginBottom: '2.5rem'
        }}>
          Everything a <span style={{ color: 'var(--teal)' }}>clinician needs</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {FEATURES_PREVIEW.map((f) => (
            <div key={f.title} className="card" style={{ padding: '1.4rem' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontWeight: 600,
                fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.4rem'
              }}>{f.title}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.67rem',
                color: 'var(--text-3)', lineHeight: 1.75
              }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
          letterSpacing: '-0.02em', marginBottom: '1rem'
        }}>
          Ready to <span style={{
            color: 'var(--teal)', fontFamily: 'var(--font-serif)',
            fontStyle: 'italic', fontWeight: 300
          }}>analyse</span> a scan?
        </h2>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.76rem',
          color: 'var(--text-3)', marginBottom: '2rem', letterSpacing: '0.05em'
        }}>
          Research prototype · Not for clinical use
        </p>
        <Link to={user ? '/scanner' : '/login'} className="btn btn-primary"
          style={{ fontSize: '0.95rem', padding: '0.8rem 2.2rem' }}>
          {user ? 'Open Scanner →' : 'Sign in to start →'}
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
        color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        NeuroScan AI · Research prototype · Not for clinical use · © 2026
      </footer>
    </div>
  )
}