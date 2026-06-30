import { Link } from 'react-router-dom'

const TECH_STACK = [
  { cat: 'AI / ML', color: '#FF5757', items: ['TensorFlow Lite', 'MobileNetV2', 'Grad-CAM', 'MONAI SegResNet', 'NumPy', 'OpenCV', 'SciPy'] },
  { cat: 'Backend', color: '#FFAD3B', items: ['Python 3.11', 'FastAPI', 'PyDICOM', 'ReportLab', 'PIL / Pillow', 'Groq API (LLM)'] },
  { cat: 'Frontend', color: '#0CF2C8', items: ['React 18', 'React Router v6', 'Three.js', 'Recharts', 'Supabase JS'] },
  { cat: 'Infrastructure', color: '#7B82F5', items: ['Supabase (Auth + DB)', 'Vercel (Frontend)', 'Render (Backend API)'] },
]

const TIMELINE = [
  { phase: '01', color: '#7B82F5', title: 'Data & Training',        desc: 'CNN model trained on 3,000+ labelled MRI scans across 4 tumor classes. MobileNetV2 backbone, converted to TFLite for fast CPU inference on free-tier hosting.' },
  { phase: '02', color: '#0CF2C8', title: 'Explainability (XAI)',   desc: 'Grad-CAM implemented on MobileNetV2 feature layers to generate class-discriminative heatmaps. Sub-region segmentation (ET/TC/WT) with quantitative radiomics derived from Grad-CAM masks.' },
  { phase: '03', color: '#FFAD3B', title: 'Clinical Intelligence',  desc: 'WHO grade estimation (glioma I–IV, meningioma I–III), rule-based CDSS with IDH/MGMT molecular markers, longitudinal volume tracking, and AI epistemic uncertainty via Test-Time Augmentation.' },
  { phase: '04', color: '#FF5757', title: 'Multi-Modal & 3D',       desc: '4-channel fusion pipeline (T1/T1ce/T2/FLAIR). Three.js procedural 3D brain with radiomics-driven tumor render. Validated MONAI SegResNet 3D segmentation on real BraTS data (ET Dice 0.85).' },
  { phase: '05', color: '#7B82F5', title: 'Clinical Workflow',      desc: 'Role-based auth (Admin/Doctor/Patient), doctor-patient assignment, HITL annotation canvas, AI chat powered by Groq LLM, scan comparison, longitudinal timeline, and statistics dashboard.' },
  { phase: '06', color: '#0CF2C8', title: 'Reporting & Export',     desc: '7-section professional PDF report: patient metadata, TTA uncertainty, CDSS synthesis, dual MRI/Grad-CAM images, radiomics, volume trends, scan history with unique session IDs.' },
]

const ARCHITECTURE = [
  {
    layer: 'Frontend',
    color: '#0CF2C8',
    host: 'Vercel',
    items: ['React 18 + React Router v6', 'Three.js (3D visualization)', 'Recharts (analytics charts)', 'Supabase JS (auth + data)', '15+ pages/routes'],
  },
  {
    layer: 'Backend API',
    color: '#7B82F5',
    host: 'Render',
    items: ['FastAPI (Python 3.11)', 'TFLite inference (MobileNetV2)', 'Grad-CAM + radiomics pipeline', 'ReportLab PDF generation', 'PyDICOM + OpenCV'],
  },
  {
    layer: 'Database',
    color: '#FFAD3B',
    host: 'Supabase',
    items: ['PostgreSQL (users, scans, annotations)', 'Row-level security policies', 'Real-time subscriptions', 'Auth with JWT tokens'],
  },
]

const KEY_METRICS = [
  { val: '4',    label: 'Tumor Classes',       sub: 'Glioma · Meningioma · Pituitary · No Tumor', color: '#FF5757' },
  { val: '95%+', label: 'Classification Accuracy', sub: 'On held-out test set',                  color: '#0CF2C8' },
  { val: '0.94', label: 'Dice Score (TC)',      sub: 'MONAI 3D segmentation validation',          color: '#FFAD3B' },
  { val: '25+',  label: 'Clinical Features',   sub: 'End-to-end pipeline',                        color: '#7B82F5' },
]

export default function About() {
  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>

      {/* Header */}
      <section style={{ padding: '4rem 2rem 3rem', textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>About the project</p>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          What is{' '}
          <span style={{ color: 'var(--teal)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300 }}>NeuroScan AI?</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.9 }}>
          NeuroScan AI is a deep learning research prototype for MRI-based brain tumor classification.
          It combines a CNN inference engine, Grad-CAM explainability, quantitative radiomics,
          WHO grade estimation, molecular marker CDSS, validated 3D volumetric segmentation,
          and a professional clinical reporting pipeline — all in a single web platform.
        </p>
      </section>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '0 2rem 3rem' }} />

      {/* Disclaimer */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 3rem' }}>
        <div style={{ background: 'rgba(255,173,59,0.06)', border: '1px solid rgba(255,173,59,0.22)', borderRadius: '12px', padding: '1.2rem 1.6rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.85rem', color: '#FFAD3B', marginBottom: '0.3rem' }}>
              Research Prototype — Not for Clinical Use
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.67rem', color: 'rgba(255,173,59,0.6)', lineHeight: 1.75 }}>
              NeuroScan AI is developed for educational and research purposes only. It is not a certified
              medical device and must not be used to make clinical decisions. All results must be verified
              by a qualified radiologist or neurologist.
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
          {KEY_METRICS.map((m) => (
            <div key={m.label} className="card" style={{ padding: '1.4rem', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: `linear-gradient(90deg,transparent,${m.color},transparent)` }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: '0.3rem' }}>{m.val}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-1)', marginBottom: '0.2rem' }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)' }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Development</p>
        <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '2.5rem' }}>
          How it was <span style={{ color: 'var(--teal)' }}>built</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {TIMELINE.map((t, i) => (
            <div key={t.phase} style={{ display: 'flex', gap: '1.5rem', paddingBottom: i < TIMELINE.length - 1 ? '2rem' : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `${t.color}12`, border: `1px solid ${t.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: t.color, fontWeight: 700,
                }}>{t.phase}</div>
                {i < TIMELINE.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: 'rgba(12,242,200,0.10)', margin: '4px 0' }} />
                )}
              </div>
              <div style={{ paddingTop: '0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.3rem' }}>{t.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.69rem', color: 'var(--text-3)', lineHeight: 1.8 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Technology</p>
        <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '2rem' }}>
          Tech <span style={{ color: 'var(--teal)' }}>stack</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          {TECH_STACK.map((s) => (
            <div key={s.cat} className="card" style={{ padding: '1.3rem 1.4rem' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg,transparent,${s.color}66,transparent)` }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: s.color, marginBottom: '0.75rem' }}>{s.cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {s.items.map((item) => (
                  <div key={item} style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.67rem', color: 'var(--text-2)' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, opacity: 0.6, flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Architecture</p>
        <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '2rem' }}>
          System <span style={{ color: 'var(--teal)' }}>design</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem' }}>
          {ARCHITECTURE.map((a) => (
            <div key={a.layer} className="card" style={{ padding: '1.4rem' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: `linear-gradient(90deg,transparent,${a.color},transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.3rem', fontWeight: 300, color: a.color }}>{a.layer}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: a.color, background: `${a.color}12`, border: `1px solid ${a.color}33`, borderRadius: '99px', padding: '0.1rem 0.5rem' }}>{a.host}</div>
              </div>
              {a.items.map((item) => (
                <div key={item} style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.67rem', color: 'var(--text-3)', lineHeight: 1.8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '4rem 2rem 5rem', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'rgba(12,242,200,0.02)' }}>
        <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>Explore the project</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          Try the Scanner, see the 3D demo, or read the full feature documentation.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/scanner" className="btn btn-primary">Open Scanner →</Link>
          <Link to="/true-3d" className="btn btn-outline">View 3D Demo →</Link>
          <Link to="/features" className="btn btn-outline">All Features →</Link>
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