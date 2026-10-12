import { Link } from 'react-router-dom'
import { useAuth } from '../App'

const FEATURE_CATEGORIES = [
  {
    category: 'Input & Preprocessing',
    color: '#7B82F5',
    features: [
      {
        icon: '🏥',
        title: 'DICOM Support',
        badge: 'Clinical Grade',
        desc: 'Upload hospital-format .dcm files with automatic PHI stripping and MR-only validation.',
        bullets: [
          'Automatic PHI removal',
          'Modality gating for MRI scans only',
          'Displays vendor, study date, slice thickness',
          'Clinical-grade upload verification',
        ],
      },
      {
        icon: '🔬',
        title: 'Preprocessing pipeline',
        badge: 'Transparent',
        desc: 'Each scan passes through a clear preprocessing flow before AI classification.',
        bullets: [
          'Pixel normalization',
          'Skull stripping and contrast enhancement',
          'Standardized input for the model',
          'Preview each transformation stage',
        ],
      },
    ],
  },
  {
    category: 'AI & Explainability',
    color: '#0CF2C8',
    features: [
      {
        icon: '🧠',
        title: 'Tumor classification',
        badge: '95%+',
        desc: 'MobileNetV2-based AI predicts four tumor classes with confidence scores and probability breakdowns.',
        bullets: [
          'Glioma, meningioma, pituitary, no tumor',
          'Full probability distribution',
          'Confidence guidance for each scan',
          'Slice-level decision support',
        ],
      },
      {
        icon: '🔥',
        title: 'Grad-CAM transparency',
        badge: 'Explainable',
        desc: 'Generate attention heatmaps to show which image regions drove the model prediction.',
        bullets: [
          'Visual attention overlays',
          'Attention coverage and hotspot tracking',
          'Side-by-side MRI comparison',
          'Support for clinician review',
        ],
      },
      {
        icon: '🎲',
        title: 'Uncertainty analysis',
        badge: 'Research Grade',
        desc: 'Test-time augmentation measures prediction stability and flags fragile cases.',
        bullets: [
          'Stability score across augmentations',
          'Low / moderate / high uncertainty alert',
          'Shown in scan summary cards',
          'Research-level confidence reporting',
        ],
      },
    ],
  },
  {
    category: 'Segmentation & Radiomics',
    color: '#FF5757',
    features: [
      {
        icon: '📐',
        title: 'Sub-region masks',
        badge: 'BraTS Style',
        desc: 'ET/TC/WT segmentation overlays mirror standard tumor region conventions.',
        bullets: [
          'Enhancing tumor (ET)',
          'Tumor core (TC)',
          'Whole tumor (WT)',
          'Quantitative coverage metrics',
        ],
      },
      {
        icon: '📏',
        title: 'Radiomic features',
        badge: 'Quantitative',
        desc: 'Extract image-derived metrics for tumor volume, shape, and intensity.',
        bullets: [
          'Estimated volume (cm³)',
          'Sphericity & shape index',
          'Intensity mean and variance',
          'Surface-area ratio',
        ],
      },
      {
        icon: '🎯',
        title: 'WHO grade support',
        badge: 'Glioma & Meningioma',
        desc: 'A deterministic grading assistant guides users toward likely tumor grade categories.',
        bullets: [
          'Glioma I–IV suggestions',
          'Meningioma I–III support',
          'Risk category guidance',
          'Clinician review recommended',
        ],
      },
    ],
  },
  {
    category: 'Clinical workflow',
    color: '#FFAD3B',
    features: [
      {
        icon: '🩺',
        title: 'Role-based access',
        badge: 'Doctor / Patient',
        desc: 'Separate Admin, Doctor, and Patient views with assignment and monitoring controls.',
        bullets: [
          'Doctor assignment workflows',
          'Patient scan dashboards',
          'Admin oversight controls',
          'Clinical risk badges',
        ],
      },
      {
        icon: '✏️',
        title: 'Annotation tools',
        badge: 'HITL',
        desc: 'Doctors annotate Grad-CAM overlays with color-coded edits and notes.',
        bullets: [
          'Freehand drawing tools',
          'ET / TC / WT color presets',
          'Annotation history saved',
          'Clinician notes included',
        ],
      },
      {
        icon: '🔁',
        title: 'Scan comparison',
        badge: 'Side-by-side',
        desc: 'Compare two scans directly to monitor progression or treatment response.',
        bullets: [
          'Select any two scan records',
          'Prediction and confidence comparison',
          'Date and modality side-by-side',
          'Track tumor change over time',
        ],
      },
      {
        icon: '🤖',
        title: 'AI chat',
        badge: 'LLM-powered',
        desc: 'Ask natural language questions about scans, findings, and recommendations.',
        bullets: [
          'Context-aware scan Q&A',
          'Suggested prompt cards',
          'Scan metadata included in prompts',
          'Integrated clinician context',
        ],
      },
    ],
  },
  {
    category: '3D & reporting',
    color: '#7B82F5',
    features: [
      {
        icon: '🌐',
        title: '3D brain visualizer',
        badge: 'Interactive',
        desc: 'View tumor volume in an interactive three-dimensional model with adjustable layers.',
        bullets: [
          'Rotate, zoom, and inspect',
          'Layer isolation controls',
          'Tumor volume spheres',
          'Smooth medical rendering',
        ],
      },
      {
        icon: '📋',
        title: 'PDF reporting',
        badge: 'Export-ready',
        desc: 'Generate a seven-section clinical companion report with summary, images, and metrics.',
        bullets: [
          'AI findings and confidence',
          'Grad-CAM and MRI imagery',
          'Radiomics summaries',
          'Session metadata and IDs',
        ],
      },
      {
        icon: '📊',
        title: 'Dashboard analytics',
        badge: 'Insights',
        desc: 'Track class distribution, confidence trends, and scan volume across your patient history.',
        bullets: [
          'Pie and line charts',
          'Longitudinal trend tracking',
          'Per-role analytics',
          'Actionable scan summaries',
        ],
      },
    ],
  },
]

const CALL_TO_ACTION = [
  'Secure upload and verification.',
  'Explainable tumor predictions.',
  '3D visualization and reporting.',
]

export default function Features() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 'var(--nav-h)', background: 'transparent', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section style={{ padding: '4rem 2rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', display: 'grid', gap: '1.15rem' }}>
          <span style={{ color: '#2563EB', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
            Product capabilities
          </span>
          <h1 style={{ fontSize: 'clamp(2.6rem, 4vw, 3.6rem)', lineHeight: 1.02, fontWeight: 800, color: '#0F172A', margin: '0 auto', maxWidth: 780 }}>
            The features that make MRI review faster, safer, and more transparent
          </h1>
          <p style={{ color: '#475569', fontFamily: 'var(--font-mono)', lineHeight: 1.85, maxWidth: 720, margin: '0 auto', fontSize: '0.95rem' }}>
            Explore the medical-grade capabilities behind NeuroScan’s tumor classification, explainability, segmentation, and clinical workflow.
          </p>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', margin: '2rem 0 1rem' }}>
            {CALL_TO_ACTION.map((item) => (
              <div key={item} style={{ borderRadius: 22, padding: '1.35rem 1.5rem', background: 'linear-gradient(180deg, rgba(240,249,255,1), rgba(255,255,255,0.96))', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 22px 42px rgba(15,23,42,0.05)' }}>
                <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#0F172A' }}>{item}</p>
                <p style={{ color: '#64748B', lineHeight: 1.75, fontSize: '0.92rem', margin: 0 }}>Designed for clinicians, researchers, and care teams that need trustworthy MRI insights.</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={user ? '/scanner' : '/login'} className="btn btn-primary" style={{ padding: '1rem 1.8rem', fontSize: '0.95rem' }}>
              {user ? 'Open Scanner' : 'Get started'}
            </Link>
            <Link to="/true-3d" className="btn btn-outline" style={{ padding: '1rem 1.8rem', fontSize: '0.95rem' }}>
              View 3D demo
            </Link>
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '0 2rem 3.5rem' }} />

      <section style={{ padding: '0 2rem 5rem', maxWidth: 1040, margin: '0 auto' }}>
        {FEATURE_CATEGORIES.map((category) => (
          <div key={category.category} style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${category.color}44, transparent)` }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: category.color, fontWeight: 700,
                background: `${category.color}12`, border: `1px solid ${category.color}33`,
                padding: '0.25rem 0.8rem', borderRadius: '999px', whiteSpace: 'nowrap',
              }}>{category.category}</span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${category.color}44)` }} />
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {category.features.map((feature, idx) => (
                <div key={feature.title} style={{ display: 'flex', gap: '1.6rem', alignItems: 'flex-start', borderRadius: 24, padding: '1.75rem', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 20px 45px rgba(15,23,42,0.04)' }}>
                  <div style={{ minWidth: 68, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.45rem' }}>{feature.icon}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#94A3B8', letterSpacing: '0.12em' }}>{String(idx + 1).padStart(2, '0')}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: '#0F172A' }}>{feature.title}</h3>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.56rem', letterSpacing: '0.14em',
                        padding: '0.18rem 0.6rem', borderRadius: '999px', textTransform: 'uppercase',
                        background: `${category.color}18`, color: category.color, border: `1px solid ${category.color}44`,
                      }}>{feature.badge}</span>
                    </div>
                    <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.8, margin: '0 0 1rem' }}>{feature.desc}</p>
                    <div style={{ display: 'grid', gap: '0.7rem', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                      {feature.bullets.map((bullet) => (
                        <div key={bullet} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', color: '#64748B', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.7 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: category.color, marginTop: '0.35rem' }} />
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={{ padding: '4rem 2rem 5rem', background: '#F8FAFF', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#0F172A' }}>Ready to unlock clinical MRI insights?</h2>
          <p style={{ color: '#475569', fontFamily: 'var(--font-mono)', lineHeight: 1.85, maxWidth: 680, margin: '0 auto 1.75rem' }}>
            Start using NeuroScan to review scans, compare volumetric tumor metrics, and generate export-ready summaries for your care team.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to={user ? '/scanner' : '/login'} className="btn btn-primary" style={{ padding: '1rem 1.8rem', fontSize: '0.95rem' }}>
              {user ? 'Open Scanner' : 'Get started'}
            </Link>
            <Link to="/true-3d" className="btn btn-outline" style={{ padding: '1rem 1.8rem', fontSize: '0.95rem' }}>
              View 3D demo
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>NeuroScan AI</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#64748B', letterSpacing: '0.15em' }}>
          Research prototype · Not for clinical use
        </div>
      </footer>
    </div>
  )
}
