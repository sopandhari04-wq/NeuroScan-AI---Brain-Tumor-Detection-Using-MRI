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
        desc: 'Upload real hospital-format .dcm files with automatic PHI metadata stripping, modality validation (MR-only gate), and anonymized metadata display.',
        bullets: [
          'Automatic PHI stripping (PatientName, DOB, etc.)',
          'Modality validation — rejects non-MR files',
          'Displays: manufacturer, study date, slice thickness',
          'No JPG/PNG accepted — clinical-grade gating',
        ],
      },
      {
        icon: '🔬',
        title: '4-Step Preprocessing Pipeline',
        badge: 'Visualized',
        desc: 'Every scan passes through a transparent 4-step pipeline before reaching the AI — toggle to see exactly what the model sees at each stage.',
        bullets: [
          'Step 1: Raw DICOM pixel array extraction',
          'Step 2: Min-max intensity normalization',
          'Step 3: Skull stripping (morphological erosion)',
          'Step 4: CLAHE contrast enhancement',
        ],
      },
    ],
  },
  {
    category: 'AI Classification & XAI',
    color: '#0CF2C8',
    features: [
      {
        icon: '🧠',
        title: 'CNN Classification',
        badge: '95%+ Accuracy',
        desc: 'MobileNetV2-based classifier trained on 3K+ curated MRI scans, outputting full probability distributions across all 4 tumor classes.',
        bullets: [
          'Glioma · Meningioma · Pituitary · No Tumor',
          'Full probability breakdown per class',
          'High/Moderate/Low certainty interpretation',
          'Majority-vote across slices for 3D mode',
        ],
      },
      {
        icon: '🔥',
        title: 'Grad-CAM XAI',
        badge: 'Explainability',
        desc: 'Gradient-weighted Class Activation Mapping generates visual heatmaps showing precisely which regions drove the classification decision.',
        bullets: [
          'Activation intensity score (0–100%)',
          'Primary focus region localization',
          'Heatmap coverage & attention pattern',
          'Overlay on original MRI for direct comparison',
        ],
      },
      {
        icon: '🎲',
        title: 'AI Epistemic Uncertainty (TTA)',
        badge: 'Research Grade',
        desc: 'Test-Time Augmentation runs 5 variants (flip, rotation, zoom, brightness) through the model to measure prediction stability and flag fragile cases.',
        bullets: [
          'LOW (<3% variance) — stable, robust prediction',
          'MODERATE (3–8%) — acceptable stability',
          'HIGH (>8%) — fragile, manual review advised',
          'Shown in Scanner results and PDF Section 2a',
        ],
      },
      {
        icon: '🧬',
        title: 'Multi-Modal Fusion',
        badge: 'Advanced',
        desc: 'Upload all 4 standard MRI sequences fused into a weighted 4-channel tensor for richer, multi-parametric classification.',
        bullets: [
          'T1 — Native tissue anatomy',
          'T1ce — Blood-brain barrier breakdown',
          'T2 — Fluid, edema, lesion boundaries',
          'FLAIR — Whole-tumor extent',
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
        title: 'Sub-Region Segmentation (ET/TC/WT)',
        badge: 'BraTS Convention',
        desc: 'Nested sub-region masks matching the BraTS challenge convention — Whole Tumor encompasses Tumor Core which encompasses Enhancing Tumor.',
        bullets: [
          'ET (cam > 0.75) — active enhancing region',
          'TC (cam > 0.50) — necrotic core, includes ET',
          'WT (cam > 0.25) — full extent, includes TC',
          'Coverage percentage for each region',
        ],
      },
      {
        icon: '📏',
        title: 'Quantitative Radiomics',
        badge: 'Clinical Metrics',
        desc: 'Derived from Grad-CAM masks at the original DICOM resolution — a standard approximation for single-slice pipelines.',
        bullets: [
          'Estimated volume (cm³) & diameter (cm)',
          'Sphericity — shape regularity index',
          'Surface-to-volume ratio (perimeter/area)',
          'Intensity mean, std dev, shape descriptor',
        ],
      },
      {
        icon: '🎯',
        title: 'WHO Grade Estimation',
        badge: 'Glioma & Meningioma',
        desc: 'Rule-based grading using radiomics features — ET%, sphericity, intensity heterogeneity, and volume — mapped to documented WHO CNS classification criteria.',
        bullets: [
          'Glioma: Grade I–IV with radiomic risk score',
          'Meningioma: Grade I–III (atypical/anaplastic)',
          'Grade-aware urgency (Low/Moderate/High/Critical)',
          'Disclaimer: biopsy required for definitive grade',
        ],
      },
    ],
  },
  {
    category: 'Clinical Decision Support',
    color: '#FFAD3B',
    features: [
      {
        icon: '🩺',
        title: 'Molecular Marker CDSS',
        badge: 'Glioma Only',
        desc: 'A deterministic rules engine (not a trained fusion model) that combines the CNN\'s image output with clinician-provided IDH/MGMT status to refine pathways.',
        bullets: [
          'IDH-Mutant → moderate urgency, IDH inhibitors',
          'IDH-Wildtype → critical, immediate resection',
          'MGMT-Methylated → high TMZ chemo response',
          'Clearly labeled as expert system, not neural fusion',
        ],
      },
      {
        icon: '📈',
        title: 'Longitudinal Volume Tracking',
        badge: 'Trend Analytics',
        desc: 'Stores tumor volume with every scan and computes delta changes across a patient\'s history with clinical alert thresholds.',
        bullets: [
          '>15% increase → "Significant Increase" alert',
          '<−15% decrease → "Possible treatment response"',
          'Mini Recharts line chart across all scans',
          'Same-tumor-type filtering for meaningful comparison',
        ],
      },
    ],
  },
  {
    category: 'Workflow & Collaboration',
    color: '#7B82F5',
    features: [
      {
        icon: '👥',
        title: 'Doctor–Patient Workflow',
        badge: 'Role-Based',
        desc: 'Three-tier role system (Admin/Doctor/Patient) with admin-controlled doctor assignment and dedicated doctor views for patient monitoring.',
        bullets: [
          'Admin assigns doctors to patients inline',
          'Doctor sees all assigned patients with risk badges',
          '🔴 High Risk · 🟡 Monitor · 🟢 Normal',
          'Expandable scan history per patient',
        ],
      },
      {
        icon: '✏️',
        title: 'HITL Annotation',
        badge: 'Human-in-the-Loop',
        desc: 'Doctors draw corrections directly on Grad-CAM overlays using a canvas tool, with color-coded ET/TC/WT/Normal presets and clinical notes.',
        bullets: [
          'Freehand brush and eraser tools',
          'ET/TC/WT/Normal color presets',
          'Adjustable brush size slider',
          'Merged annotation image saved to Supabase',
        ],
      },
      {
        icon: '🔁',
        title: 'Scan Comparison',
        badge: 'Side-by-Side',
        desc: 'Compare any two scans side-by-side to monitor disease progression or treatment response over time.',
        bullets: [
          'Select any two scans from history',
          'Side-by-side result cards',
          'Confidence and prediction comparison',
          'Mode and date displayed for each',
        ],
      },
      {
        icon: '🤖',
        title: 'AI Scan Q&A Chat',
        badge: 'LLM-Powered',
        desc: 'Ask natural-language questions about any scan — the LLM receives full scan context (prediction, confidence, Grad-CAM, radiomics) as its system prompt.',
        bullets: [
          'Powered by Groq llama-3.3-70b-versatile',
          'Full scan context injected per message',
          '8 suggested quick questions',
          'Available in Scanner and dedicated /chat page',
        ],
      },
    ],
  },
  {
    category: '3D Visualization',
    color: '#FF5757',
    features: [
      {
        icon: '🌐',
        title: '3D Brain Visualization (Scanner)',
        badge: 'Interactive',
        desc: 'Three.js procedural brain model with tumor spheres, cortex folds, hemisphere fissure, cerebellum, and brainstem — rendered from radiomics data.',
        bullets: [
          'ET/TC/WT colored nested tumor spheres',
          'Layer toggle (All/ET/TC/WT isolation)',
          'Brain shell opacity slider',
          'Auto-rotate, drag to rotate, scroll to zoom',
        ],
      },
      {
        icon: '🧊',
        title: 'True 3D Volumetric Segmentation',
        badge: 'Research Grade',
        desc: 'Validated MONAI SegResNet model on real BraTS 4-modality data (T1/T1ce/T2/FLAIR) with expert ground-truth Dice scores.',
        bullets: [
          'ET Dice 0.854 · TC Dice 0.936 · WT Dice 0.722',
          'Real BraTS20_Training_001 case',
          'Upload your own DICOM ZIP for live reconstruction',
          'Point-cloud rendering with layer controls',
        ],
      },
    ],
  },
  {
    category: 'Reports & Export',
    color: '#0CF2C8',
    features: [
      {
        icon: '📋',
        title: 'Professional PDF Report',
        badge: '7-Section Clinical',
        desc: 'A comprehensive clinical companion report with unique session IDs, dual MRI/Grad-CAM images, WHO grade, CDSS synthesis, volume trends, and technical architecture.',
        bullets: [
          '2a: AI classification + TTA uncertainty',
          '2b: CDSS synthesis (glioma IDH/MGMT)',
          '2c: Dual-image MRI vs Grad-CAM visual',
          '4a/4b: Sub-region segmentation + radiomics',
        ],
      },
      {
        icon: '📊',
        title: 'Statistics Dashboard',
        badge: 'Analytics',
        desc: 'System-wide analytics including class distribution, confidence trends, scan volume over time, and per-user breakdowns.',
        bullets: [
          'Class distribution pie/bar charts',
          'Confidence trend over time',
          'Scan volume by mode',
          'Admin sees all users; patients see own data',
        ],
      },
      {
        icon: '📅',
        title: 'Longitudinal Timeline',
        badge: 'Patient History',
        desc: 'Visual timeline of a patient\'s scan history with health alerts, confidence trends, and change detection badges.',
        bullets: [
          'New Tumor · Type Changed · Cleared badges',
          'Confidence trend chart with colored dots',
          'Health alert: 3+ consecutive high-confidence tumors',
          'Date, mode, confidence per scan entry',
        ],
      },
    ],
  },
]

export default function Features() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>

      {/* Header */}
      <section style={{ padding: '4rem 2rem 3rem', textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Capabilities</p>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Built for{' '}
          <span style={{ color: 'var(--teal)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300 }}>precision</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.8 }}>
          25+ clinical and AI features — from raw DICOM ingestion to validated 3D volumetric segmentation.
          Every feature designed around interpretability, not just prediction.
        </p>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '0 2rem 4rem' }} />

      {/* Feature categories */}
      <section style={{ padding: '0 2rem 6rem', maxWidth: 1000, margin: '0 auto' }}>
        {FEATURE_CATEGORIES.map((cat) => (
          <div key={cat.category} style={{ marginBottom: '4rem' }}>

            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${cat.color}44, transparent)` }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.2em',
                textTransform: 'uppercase', color: cat.color, fontWeight: 700,
                background: `${cat.color}12`, border: `1px solid ${cat.color}33`,
                padding: '0.25rem 0.8rem', borderRadius: '99px', whiteSpace: 'nowrap',
              }}>{cat.category}</span>
              <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${cat.color}44)` }} />
            </div>

            {/* Feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cat.features.map((f, i) => (
                <div key={f.title} className="card" style={{ padding: '1.8rem 2rem', display: 'flex', gap: '1.8rem', alignItems: 'flex-start' }}>
                  <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: `linear-gradient(90deg, transparent, ${cat.color}55, transparent)` }} />

                  {/* Icon */}
                  <div style={{ flexShrink: 0, textAlign: 'center', paddingTop: '0.2rem' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{f.icon}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-3)', letterSpacing: '0.12em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)', margin: 0 }}>{f.title}</h3>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.14em',
                        padding: '0.16rem 0.55rem', borderRadius: '99px', textTransform: 'uppercase',
                        background: cat.color + '18', color: cat.color, border: `1px solid ${cat.color}44`,
                      }}>{f.badge}</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-2)', lineHeight: 1.8, marginBottom: '0.9rem' }}>{f.desc}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.35rem' }}>
                      {f.bullets.map((b) => (
                        <div key={b} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color, flexShrink: 0, marginTop: '0.38em' }} />
                          {b}
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

      {/* CTA */}
      <section style={{ padding: '4rem 2rem 5rem', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'rgba(12,242,200,0.02)' }}>
        <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>Try it yourself</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          Sign in and upload your first MRI scan in under 30 seconds.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={user ? '/scanner' : '/login'} className="btn btn-primary">
            {user ? 'Open Scanner →' : 'Get Started →'}
          </Link>
          <Link to="/true-3d" className="btn btn-outline">View 3D Demo →</Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--teal)' }}>NeuroScan AI</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Research prototype · Not for clinical use · © 2026
        </div>
      </footer>
    </div>
  )
}