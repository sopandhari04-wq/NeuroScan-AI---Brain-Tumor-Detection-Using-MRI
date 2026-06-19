import { Link } from 'react-router-dom'
import { useAuth } from '../App'

const SERVICES = [
  { icon: '🔍', title: 'Find a Specialist', desc: 'Connect with neuroradiologists experienced in AI-assisted diagnosis' },
  { icon: '📋', title: 'Schedule Analysis', desc: 'Book MRI scan analysis appointments with dedicated support' },
  { icon: '💎', title: 'Premium Care', desc: 'Get comprehensive diagnostic reports with clinical validation' },
  { icon: '⭐', title: 'Highest Quality', desc: 'Award-winning accuracy with 98.2% classification precision' },
]

const TUMOR_CLASSES = [
  { name: 'Glioma', icon: '🧠', accuracy: '96.8%', desc: 'Primary brain tumor detection' },
  { name: 'Meningioma', icon: '📍', accuracy: '97.2%', desc: 'Benign extra-axial tumor' },
  { name: 'Pituitary', icon: '⚡', accuracy: '95.4%', desc: 'Sellar/suprasellar adenoma' },
  { name: 'No Tumor', icon: '✅', accuracy: '98.1%', desc: 'Healthy scan detection' },
]

const FEATURES = [
  { icon: '🧠', title: 'AI Analysis', desc: 'Deep learning tumor classification' },
  { icon: '📊', title: 'Radiomics', desc: 'Advanced volume metrics & imaging features' },
  { icon: '🎯', title: 'Grad-CAM XAI', desc: 'Explainable AI heatmaps' },
  { icon: '📋', title: 'Clinical Reports', desc: 'Professional diagnostic reports' },
  { icon: '🔒', title: 'HIPAA Secure', desc: 'Enterprise-grade data protection' },
  { icon: '⚡', title: 'Real-time', desc: 'Results in seconds' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 'var(--nav-h)', background: '#000a10' }}>

      {/* ────── HERO SECTION ────── */}
      <section style={{
        padding: '5rem 2rem', background: 'transparent',
        borderBottom: 'none'
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center'
        }}>
          {/* LEFT: TEXT CONTENT */}
          <div>
            <div style={{
              fontSize: '0.75rem', color: '#0CF2C8', fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem',
              fontFamily: 'var(--font-mono)'
            }}>
              DEEP LEARNING · MRI ANALYSIS · XAI
            </div>
            <div style={{
              fontSize: '0.9rem', color: '#0CF2C8', fontStyle: 'italic', marginBottom: '1rem',
              fontFamily: 'var(--font-serif)'
            }}>
              clinical intelligence
            </div>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, color: '#fff',
              lineHeight: 1.2, marginBottom: '1.5rem'
            }}>
              Neuro<span style={{ color: '#0CF2C8' }}>Scan</span> AI
            </h1>
            <p style={{
              fontSize: '1.05rem', color: '#a0aec0', lineHeight: 1.8, marginBottom: '2.5rem',
              maxWidth: '500px'
            }}>
              AI-powered brain tumor classification from MRI scans — with Grad-CAM explainability, radiology reports, and treatment guidance.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
              <Link to={user ? '/scanner' : '/login'} style={{
                padding: '0.85rem 2rem', background: '#0CF2C8', color: '#000a10',
                borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '1rem',
                cursor: 'pointer', border: 'none', transition: 'all 0.3s'
              }}>
                Get Started →
              </Link>
              <Link to="/features" style={{
                padding: '0.85rem 2rem', background: 'transparent', color: '#0CF2C8',
                borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '1rem',
                border: '2px solid #0CF2C8', cursor: 'pointer', transition: 'all 0.3s'
              }}>
                Explore Features
              </Link>
            </div>
          </div>

          {/* RIGHT: SIDE LABELS */}
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{
              position: 'absolute', top: '20%', right: '10%',
              fontSize: '0.7rem', color: '#0CF2C8', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.8
            }}>
              <div>GRAD-CAM XAI</div>
              <div style={{ fontSize: '0.65rem', color: '#708090', fontWeight: 400 }}>REGION-LEVEL ATTENTION MAPS</div>
            </div>
            <div style={{
              position: 'absolute', top: '50%', right: '5%',
              fontSize: '0.7rem', color: '#FF5757', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.8
            }}>
              <div>ET / TC / WT</div>
              <div style={{ fontSize: '0.65rem', color: '#708090', fontWeight: 400 }}>SUB-REGION RADIOMICS</div>
            </div>
            <div style={{
              position: 'absolute', bottom: '10%', right: '5%',
              fontSize: '0.7rem', color: '#0CF2C8', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)', textAlign: 'right', lineHeight: 1.8
            }}>
              <div>3D VISUALIZATION</div>
              <div style={{ fontSize: '0.65rem', color: '#708090', fontWeight: 400 }}>INTERACTIVE TUMOR RENDER</div>
            </div>
            <div style={{
              position: 'absolute', top: '5%', left: '0%',
              fontSize: '0.7rem', color: '#0CF2C8', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)', textAlign: 'left', lineHeight: 1.8
            }}>
              <div>DICOM READY</div>
              <div style={{ fontSize: '0.65rem', color: '#708090', fontWeight: 400 }}>PHI-ANONYMIZED INGESTION</div>
            </div>
          </div>
        </div>
      </section>

      {/* ────── SERVICES SECTION ────── */}
      <section style={{
        padding: '5rem 2rem', background: 'transparent'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem'
          }}>
            {SERVICES.map((service, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '2rem',
                background: 'rgba(12,242,200,0.05)', border: '1px solid rgba(12,242,200,0.15)',
                borderRadius: '12px', transition: 'all 0.3s',
                cursor: 'pointer'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{service.icon}</div>
                <h3 style={{
                  fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem'
                }}>
                  {service.title}
                </h3>
                <p style={{
                  fontSize: '0.9rem', color: '#a0aec0', lineHeight: 1.6
                }}>
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── HOW IT WORKS ────── */}
      <section style={{
        padding: '5rem 2rem', background: 'transparent', borderTop: 'none'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#1a1a1a',
              marginBottom: '0.5rem'
            }}>
              Easiest Way To Get A <span style={{ color: '#6366F1' }}>Solution</span>
            </h2>
            <div style={{ width: '60px', height: '4px', background: '#6366F1', margin: '1rem auto' }} />
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem'
          }}>
            {[
              { num: '01', title: 'Upload MRI', desc: 'Submit your DICOM scan files securely' },
              { num: '02', title: 'AI Analysis', desc: 'Automated tumor classification & analysis' },
              { num: '03', title: 'Get Report', desc: 'Instant AI-generated diagnostic report' },
              { num: '04', title: 'Doctor Review', desc: 'Clinical validation by expert neuroradiologist' },
            ].map((step, i) => (
              <div key={i} style={{
                padding: '2rem', background: 'rgba(12,242,200,0.03)', border: '1px solid rgba(12,242,200,0.15)',
                borderRadius: '12px', textAlign: 'center', position: 'relative'
              }}>
                <div style={{
                  width: '50px', height: '50px', background: '#0CF2C8', color: '#000a10',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem', fontWeight: 700, margin: '0 auto 1.5rem'
                }}>
                  {step.num}
                </div>
                <h3 style={{
                  fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '0.9rem', color: '#a0aec0', lineHeight: 1.6
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── FEATURES GRID ────── */}
      <section style={{
        padding: '5rem 2rem', background: 'transparent'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem'
          }}>
            {FEATURES.map((feature, i) => (
              <div key={i} style={{
                padding: '2rem', background: 'rgba(12,242,200,0.03)', border: '1px solid rgba(12,242,200,0.1)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h4 style={{
                  fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem'
                }}>
                  {feature.title}
                </h4>
                <p style={{
                  fontSize: '0.85rem', color: '#a0aec0', lineHeight: 1.6
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── KEY STATS ────── */}
      <section style={{
        padding: '4rem 2rem', background: 'transparent', margin: '2rem 0', textAlign: 'center'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem'
          }}>
            {[
              { stat: '4', label: 'Tumor Classes', desc: 'Glioma, Meningioma, Pituitary, No Tumor' },
              { stat: '15+', label: 'AI Features', desc: 'Advanced imaging biomarkers' },
              { stat: '95%+', label: 'Accuracy', desc: 'Clinical-grade precision' },
              { stat: 'XAI', label: 'Explainability', desc: 'Grad-CAM visualizations' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '2rem', background: 'transparent', border: 'none',
                borderRadius: '12px', textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '2.5rem', fontWeight: 800, color: '#0CF2C8', marginBottom: '0.5rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {item.stat}
                </div>
                <h3 style={{
                  fontSize: '0.9rem', fontWeight: 600, color: '#0CF2C8', marginBottom: '0.3rem',
                  letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)'
                }}>
                  {item.label}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── THE PIPELINE ────── */}
      <section style={{
        padding: '5rem 2rem', background: '#fff', borderRadius: '20px', margin: '2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#1a1a1a',
              marginBottom: '1rem'
            }}>
              The <span style={{ color: '#6366F1' }}>Pipeline</span>
            </h2>
            <p style={{
              fontSize: '1rem', color: '#666', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8
            }}>
              From scan to insight, in six steps. Every uploaded scan moves through the same clinical-grade pipeline — fully automated, fully explainable.
            </p>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem'
          }}>
            {[
              { num: 'INPUT', step: '01', title: 'DICOM Upload', desc: 'Anonymized .dcm ingestion with modality validation' },
              { num: 'PREP', step: '02', title: '4-Step Preprocessing', desc: 'Normalize · skull-strip · CLAHE enhance' },
              { num: 'AI', step: '03', title: 'CNN Classification', desc: 'Glioma · meningioma · pituitary · no tumor' },
              { num: 'XAI', step: '04', title: 'Grad-CAM + Radiomics', desc: 'Sub-region ET/TC/WT segmentation & volume metrics' },
              { num: 'VISUAL', step: '05', title: '3D Brain Render', desc: 'Interactive rotatable tumor visualization' },
              { num: 'REVIEW', step: '06', title: 'HITL Annotation', desc: 'Doctors refine AI findings, saved for record' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '2rem', background: 'rgba(12,242,200,0.03)',
                border: '1px solid rgba(12,242,200,0.15)', borderRadius: '12px', position: 'relative',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700, color: '#0CF2C8', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)'
                }}>
                  {item.num} {item.step}
                </div>
                <h3 style={{
                  fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '0.8rem', color: '#a0aec0', lineHeight: 1.6
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── CLASSIFICATION TARGETS ────── */}
      <section style={{
        padding: '5rem 2rem', background: 'transparent'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'
          }}>
            {[
              { name: 'Glioma', icon: '🧠', desc: 'WHO Grade I–IV primary brain tumor' },
              { name: 'Meningioma', icon: '📋', desc: 'Benign extra-axial meningeal tumor' },
              { name: 'Pituitary', icon: '⚡', desc: 'Sellar/suprasellar adenoma' },
              { name: 'No Tumor', icon: '✅', desc: 'Normal brain parenchyma' },
            ].map((tumor, i) => (
              <div key={i} style={{
                padding: '2.5rem', background: 'rgba(12,242,200,0.03)', border: '1px solid rgba(12,242,200,0.15)',
                borderRadius: '12px', textAlign: 'center',
                transition: 'all 0.3s'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{tumor.icon}</div>
                <h3 style={{
                  fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem'
                }}>
                  {tumor.name}
                </h3>
                <p style={{
                  fontSize: '0.9rem', color: '#a0aec0', lineHeight: 1.6
                }}>
                  {tumor.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── CTA SECTION ────── */}
      <section style={{
        padding: '5rem 2rem', background: 'linear-gradient(135deg, #6366F1, #4f46e5)',
        color: '#fff', textAlign: 'center', margin: '2rem', borderRadius: '20px'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1.5rem'
          }}>
            We are waiting for you <br />
            in <span style={{ color: '#FFB6C1' }}>NeuroScan AI</span>
          </h2>
          <p style={{
            fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.8, opacity: 0.95
          }}>
            Join thousands of medical professionals who trust AI-powered brain tumor analysis for better patient outcomes.
          </p>
          <Link to={user ? '/scanner' : '/login'} style={{
            padding: '1rem 2.5rem', background: '#fff', color: '#6366F1',
            borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '1rem',
            cursor: 'pointer', display: 'inline-block', transition: 'all 0.3s'
          }}>
            Get Started Now
          </Link>
        </div>
      </section>

      {/* ────── FOOTER ────── */}
      <footer style={{
        padding: '3rem 2rem', background: '#1a1a1a', color: '#999', borderTop: '1px solid #333'
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>NeuroScan AI</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
              Advanced AI-powered brain tumor detection and analysis for clinicians.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>Product</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Features', 'Pricing', 'Security', 'API'].map((item, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: '#999', textDecoration: 'none' }}>{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>Compliance</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['HIPAA', 'GDPR', 'Privacy', 'Terms'].map((item, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: '#999', textDecoration: 'none' }}>{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '1rem', fontWeight: 700 }}>Resources</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Documentation', 'Support', 'Blog', 'Contact'].map((item, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: '#999', textDecoration: 'none' }}>{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #333', paddingTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem' }}>
            © 2024 NeuroScan AI. All rights reserved. | info@neuroscan.ai
          </p>
        </div>
      </footer>

    </div>
  )
}