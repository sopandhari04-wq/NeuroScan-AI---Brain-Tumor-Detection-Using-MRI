import { Link } from 'react-router-dom'

const TECH_STACK = [
  { cat: 'AI / ML', items: ['TensorFlow Lite', 'MobileNetV2', 'Grad-CAM', 'NumPy', 'OpenCV'] },
  { cat: 'Backend', items: ['Python 3.11', 'Streamlit', 'ReportLab', 'PIL / Pillow'] },
  { cat: 'Frontend', items: ['React 18', 'React Router v6', 'Recharts'] },
  { cat: 'Infrastructure', items: ['Supabase (Auth + DB)', 'Vercel (Frontend)', 'Streamlit Cloud (AI)'] },
]

const TIMELINE = [
  { phase: '01', title: 'Data & Training', desc: 'CNN model trained on 3,000+ labelled MRI scans across 4 tumor classes. Converted to TFLite for fast inference.' },
  { phase: '02', title: 'Explainability', desc: 'Grad-CAM implemented on MobileNetV2 feature layers to generate class-discriminative heatmaps per prediction.' },
  { phase: '03', title: 'Clinical Layer', desc: 'Knowledge base built with WHO classifications, treatment protocols, and prognosis data for each tumor type.' },
  { phase: '04', title: 'Multi-Modal', desc: 'Four-channel fusion pipeline combining T1, T1ce, T2, FLAIR into a weighted RGB representation for inference.' },
  { phase: '05', title: 'Web Platform', desc: 'Streamlit backend + React frontend with Supabase auth, scan history, admin dashboard, and PDF export.' },
]

export default function About() {
  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>

      {/* Header */}
      <section style={{
        padding: '4rem 2rem 3rem', textAlign: 'center',
        maxWidth: 640, margin: '0 auto'
      }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>About the project</p>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          letterSpacing: '-0.03em', marginBottom: '1rem'
        }}>
          What is{' '}
          <span style={{
            color: 'var(--teal)', fontFamily: 'var(--font-serif)',
            fontStyle: 'italic', fontWeight: 300
          }}>NeuroScan AI?</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.76rem',
          color: 'var(--text-3)', lineHeight: 1.9
        }}>
          NeuroScan AI is a deep learning research prototype for MRI-based brain tumor
          classification. It combines a CNN inference engine, Grad-CAM visual explainability,
          structured clinical reporting, and multi-modal MRI fusion into a single web platform.
        </p>
      </section>

      <div style={{
        height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)',
        margin: '0 2rem 4rem'
      }} />

      {/* Disclaimer */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 3rem' }}>
        <div style={{
          background: 'rgba(255,173,59,0.06)',
          border: '1px solid rgba(255,173,59,0.22)',
          borderRadius: '12px', padding: '1.2rem 1.6rem',
          display: 'flex', gap: '1rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontWeight: 600,
              fontSize: '0.85rem', color: 'var(--amber)', marginBottom: '0.3rem'
            }}>
              Research Prototype — Not for Clinical Use
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.67rem',
              color: 'rgba(255,173,59,0.6)', lineHeight: 1.75
            }}>
              NeuroScan AI is developed for educational and research purposes only.
              It is not a certified medical device and must not be used to make clinical
              decisions. All results must be verified by a qualified radiologist or neurologist.
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Development</p>
        <h2 style={{
          fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '2.5rem'
        }}>
          How it was <span style={{ color: 'var(--teal)' }}>built</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {TIMELINE.map((t, i) => (
            <div key={t.phase} style={{
              display: 'flex', gap: '1.5rem',
              paddingBottom: i < TIMELINE.length - 1 ? '2rem' : 0
            }}>
              {/* Circle + line */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', flexShrink: 0
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(12,242,200,0.08)',
                  border: '1px solid rgba(12,242,200,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                  color: 'var(--teal)', fontWeight: 500,
                }}>{t.phase}</div>
                {i < TIMELINE.length - 1 && (
                  <div style={{
                    width: 1, flex: 1,
                    background: 'rgba(12,242,200,0.10)',
                    margin: '4px 0'
                  }} />
                )}
              </div>
              {/* Text */}
              <div style={{ paddingTop: '0.5rem' }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontWeight: 600,
                  fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.3rem'
                }}>{t.title}</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.69rem',
                  color: 'var(--text-3)', lineHeight: 1.8
                }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Technology</p>
        <h2 style={{
          fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '2rem'
        }}>
          Tech <span style={{ color: 'var(--teal)' }}>stack</span>
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem'
        }}>
          {TECH_STACK.map((s) => (
            <div key={s.cat} className="card" style={{ padding: '1.3rem 1.4rem' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.56rem',
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'var(--teal)', marginBottom: '0.75rem', opacity: 0.8
              }}>{s.cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {s.items.map((item) => (
                  <div key={item} style={{
                    display: 'flex', gap: '0.55rem', alignItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                    color: 'var(--text-2)'
                  }}>
                    <span style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'var(--teal)', opacity: 0.5, flexShrink: 0
                    }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Architecture</p>
        <h2 style={{
          fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '2rem'
        }}>
          System <span style={{ color: 'var(--teal)' }}>design</span>
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { layer: 'Frontend', color: '#0CF2C8', items: ['React 18', 'Hosted on Vercel', 'Supabase Auth', 'All 6 pages'] },
            { layer: 'Backend / AI', color: '#7B82F5', items: ['Python + Streamlit', 'TFLite inference', 'Grad-CAM XAI', 'Streamlit Cloud'] },
            { layer: 'Database', color: '#FFAD3B', items: ['Supabase PostgreSQL', 'User profiles', 'Scan history', 'Row-level security'] },
          ].map((a) => (
            <div key={a.layer} className="card" style={{ padding: '1.4rem' }}>
              <div style={{
                position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
                background: `linear-gradient(90deg, transparent, ${a.color}88, transparent)`
              }} />
              <div style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: '1.4rem', fontWeight: 300, color: a.color, marginBottom: '0.8rem'
              }}>{a.layer}</div>
              {a.items.map((item) => (
                <div key={item} style={{
                  display: 'flex', gap: '0.55rem', alignItems: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.67rem',
                  color: 'var(--text-3)', lineHeight: 1.8
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: a.color, flexShrink: 0
                  }} />
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
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