import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🔥',
    title: 'Grad-CAM XAI',
    color: '#FF5757',
    badge: 'Explainability',
    desc: 'Gradient-weighted Class Activation Mapping generates visual heatmaps overlaid on the MRI scan, showing precisely which regions drove the classification decision.',
    bullets: [
      'Activation intensity score (0–100%)',
      'Primary focus region (Superior/Inferior Left/Right)',
      'Heatmap coverage & attention pattern analysis',
      'Red/yellow = high attention · Blue/green = low attention',
    ],
  },
  {
    icon: '🧬',
    title: 'Multi-Modal Fusion',
    color: '#7B82F5',
    badge: 'Advanced',
    desc: 'Upload all 4 standard MRI sequences — T1, T1-contrast enhanced, T2, and FLAIR — which are fused into a weighted 4-channel RGB tensor before classification.',
    bullets: [
      'T1 — Native tissue anatomy',
      'T1ce — Blood-brain barrier breakdown (contrast)',
      'T2 — Fluid, edema, and lesion boundaries',
      'FLAIR — Whole-tumor extent suppressing CSF',
    ],
  },
  {
    icon: '📋',
    title: 'AI Radiology Report',
    color: '#0CF2C8',
    badge: 'Clinical',
    desc: 'Each scan generates a structured report covering diagnosis, imaging characteristics, clinical notes, urgency assessment, follow-up protocol, and prognosis.',
    bullets: [
      'WHO classification & tumor description',
      'Urgency level: High / Moderate / Low',
      'Recommended follow-up imaging protocol',
      'Prognosis summary with survival data',
    ],
  },
  {
    icon: '💊',
    title: 'Treatment Guide',
    color: '#FFAD3B',
    badge: 'Educational',
    desc: 'For each tumor type, the system presents standard-of-care treatment options including surgical, radiological, and pharmacological approaches.',
    bullets: [
      'Surgical resection options & approaches',
      'Radiation therapy protocols (SRS, IMRT)',
      'Chemotherapy regimens (TMZ, Bevacizumab)',
      'Targeted therapy & emerging treatments',
    ],
  },
  {
    icon: '📊',
    title: 'Personal Dashboard',
    color: '#7B82F5',
    badge: 'Analytics',
    desc: 'Track your complete scan history with confidence scores, classification outcomes, and analytics charts showing trends across all your sessions.',
    bullets: [
      'Scan count, tumor detection rate',
      'Average confidence per classification',
      'Historical record with date, mode, confidence',
      'Admin view with all-user analytics',
    ],
  },
  {
    icon: '📄',
    title: 'PDF Report Export',
    color: '#0CF2C8',
    badge: 'Export',
    desc: 'Download a professional multi-page PDF containing the full radiology report, Grad-CAM analysis metrics, treatment guide, and scan history table.',
    bullets: [
      'Patient & session metadata header',
      'Classification result with confidence bar',
      'Full Grad-CAM XAI metrics section',
      'Complete scan history table (last 10)',
    ],
  },
]

export default function Features() {
  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>

      {/* Header */}
      <section style={{
        padding: '4rem 2rem 3rem', textAlign: 'center',
        maxWidth: 640, margin: '0 auto'
      }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Capabilities</p>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          letterSpacing: '-0.03em', marginBottom: '1rem'
        }}>
          Built for{' '}
          <span style={{
            color: 'var(--teal)', fontFamily: 'var(--font-serif)',
            fontStyle: 'italic', fontWeight: 300
          }}>precision</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          color: 'var(--text-3)', lineHeight: 1.8
        }}>
          Every feature is designed around clinical interpretability — not just prediction, but explanation.
        </p>
      </section>

      <div style={{
        height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)',
        margin: '0 2rem 4rem'
      }} />

      {/* Features list */}
      <section style={{ padding: '0 2rem 6rem', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card" style={{
              padding: '2rem 2.2rem',
              display: 'flex', gap: '2rem', alignItems: 'flex-start'
            }}>
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                background: `linear-gradient(90deg, transparent, ${f.color}66, transparent)`
              }} />

              {/* Icon + number */}
              <div style={{ flexShrink: 0, textAlign: 'center', paddingTop: '0.2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{f.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                  color: 'var(--text-3)', letterSpacing: '0.15em'
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '0.5rem', flexWrap: 'wrap'
                }}>
                  <h3 style={{
                    fontSize: '1.1rem', fontWeight: 600,
                    letterSpacing: '-0.01em', color: 'var(--text)'
                  }}>{f.title}</h3>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.56rem',
                    letterSpacing: '0.14em', padding: '0.18rem 0.6rem',
                    borderRadius: '99px', textTransform: 'uppercase',
                    background: f.color + '18', color: f.color,
                    border: `1px solid ${f.color}44`,
                  }}>{f.badge}</span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                  color: 'var(--text-2)', lineHeight: 1.8, marginBottom: '1rem'
                }}>{f.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {f.bullets.map((b) => (
                    <div key={b} style={{
                      display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                      fontFamily: 'var(--font-mono)', fontSize: '0.67rem',
                      color: 'var(--text-3)', lineHeight: 1.6
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: f.color, flexShrink: 0, marginTop: '0.38em'
                      }} />
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '2rem 2rem 5rem', textAlign: 'center',
        borderTop: '1px solid var(--border)'
      }}>
        <h2 style={{
          fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '0.75rem'
        }}>Try it yourself</h2>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--text-3)', marginBottom: '1.5rem'
        }}>
          Sign in and upload your first MRI scan in under 30 seconds.
        </p>
        <Link to="/login" className="btn btn-primary">Get started →</Link>
      </section>

      <footer style={{
        borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
        color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase'
      }}>
        NeuroScan AI · Research prototype · Not for clinical use · © 2026
      </footer>
    </div>
  )
}