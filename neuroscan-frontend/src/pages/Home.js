import { Link } from 'react-router-dom'
import { useAuth } from '../App'

const STATS = [
  { val: '4',   label: 'Tumor Classes' },
  { val: '15+', label: 'AI Features' },
  { val: '95%+',label: 'Accuracy' },
  { val: 'XAI', label: 'Explainability' },
]

const TRUST_BADGES = [
  { icon: '🏥', label: 'DICOM Ready',      sub: 'PHI-anonymized ingestion' },
  { icon: '🔒', label: 'Privacy First',    sub: 'Metadata stripped on upload' },
  { icon: '🧠', label: 'XAI Explainable', sub: 'Grad-CAM attention maps' },
  { icon: '📋', label: 'Clinical Reports', sub: 'PDF export with full audit trail' },
  { icon: '🌐', label: '3D Volumetric',   sub: 'Validated MONAI BraTS model' },
]

const SERVICE_CARDS = [
  { icon: '🔬', title: 'Preprocessing',    desc: '4-step pipeline: normalize → skull-strip → CLAHE' },
  { icon: '🧠', title: 'AI Classification',desc: 'Glioma · Meningioma · Pituitary · No Tumor' },
  { icon: '📐', title: 'Radiomics',        desc: 'Volume · diameter · sphericity · surface ratio' },
  { icon: '🩺', title: 'CDSS Engine',      desc: 'IDH/MGMT molecular marker decision support' },
  { icon: '📊', title: 'Longitudinal',     desc: 'Volume trend analytics across patient history' },
]

const TUMOR_CLASSES = [
  { name: 'Glioma',     color: '#FF5757', desc: 'WHO Grade I–IV primary brain tumor', who: 'Grade I–IV' },
  { name: 'Meningioma', color: '#FFAD3B', desc: 'Benign extra-axial meningeal tumor', who: 'Grade I–III' },
  { name: 'Pituitary',  color: '#7B82F5', desc: 'Sellar/suprasellar adenoma',         who: 'Knosp 0–4' },
  { name: 'No Tumor',   color: '#0CF2C8', desc: 'Normal brain parenchyma',            who: 'Clear' },
]

const FEATURES_PREVIEW = [
  { icon: '🏥', title: 'DICOM Support',           desc: 'Upload anonymized .dcm files with automatic PHI stripping, modality validation, and metadata display.' },
  { icon: '🔬', title: 'Preprocessing Pipeline',  desc: 'Raw → Normalized → Skull-Stripped → CLAHE Enhanced — see every step the AI sees before classification.' },
  { icon: '🧠', title: 'Grad-CAM XAI',            desc: 'Visual heatmaps show exactly where the AI is looking — region analysis, intensity mapping, and focus patterns.' },
  { icon: '📐', title: 'Sub-Region Segmentation', desc: 'ET / TC / WT tumor sub-regions with radiomics — volume, diameter, sphericity, surface-to-volume ratio.' },
  { icon: '🧬', title: 'Multi-Modal Fusion',       desc: 'Combine T1, T1ce, T2, and FLAIR sequences into a fused 4-channel tensor for richer classification.' },
  { icon: '🌐', title: '3D Brain Visualization',  desc: 'Interactive rotatable 3D model showing tumor location, ET/TC/WT regions, and radiomics overlay.' },
  { icon: '✏️', title: 'HITL Annotation',          desc: 'Doctors draw corrections directly on Grad-CAM overlays, with notes saved for clinical record.' },
  { icon: '🩺', title: 'AI Scan Q&A Chat',         desc: 'Ask natural-language questions about any scan — powered by an LLM with full scan context.' },
  { icon: '👥', title: 'Doctor–Patient Workflow',  desc: 'Admins assign patients to doctors; doctors track assigned patients with risk badges and scan history.' },
  { icon: '📈', title: 'Longitudinal Timeline',    desc: "Track a patient's scan history over time — confidence trends and classification changes." },
  { icon: '🔁', title: 'Scan Comparison',          desc: 'Side-by-side comparison of two scans to monitor disease progression or treatment response.' },
  { icon: '📊', title: 'Statistics Dashboard',     desc: 'System-wide analytics — class distribution, confidence trends, and scan volume over time.' },
  { icon: '📋', title: 'AI Radiology Report',      desc: 'Auto-generated clinical report with imaging characteristics, urgency assessment, and follow-up recommendations.' },
  { icon: '💊', title: 'Treatment Guide',          desc: 'Tumor-specific treatment options for educational reference.' },
  { icon: '📄', title: 'PDF Export',               desc: 'Download a professional 7-section clinical report with Grad-CAM visuals and scan history.' },
]

const PIPELINE = [
  { tag: 'INPUT',  title: 'DICOM Upload',         desc: 'Anonymized .dcm ingestion with modality validation', color: '#7B82F5', num: '01' },
  { tag: 'PREP',   title: '4-Step Preprocessing', desc: 'Normalize · skull-strip · CLAHE enhance',             color: '#FFAD3B', num: '02' },
  { tag: 'AI',     title: 'CNN Classification',   desc: 'Glioma · meningioma · pituitary · no tumor',          color: '#0CF2C8', num: '03' },
  { tag: 'XAI',    title: 'Grad-CAM + Radiomics', desc: 'Sub-region ET/TC/WT segmentation & volume metrics',   color: '#FF5757', num: '04' },
  { tag: 'VISUAL', title: '3D Brain Render',      desc: 'Interactive rotatable tumor visualization',           color: '#7B82F5', num: '05' },
  { tag: 'REVIEW', title: 'HITL Annotation',      desc: 'Doctors refine AI findings, saved for record',        color: '#0CF2C8', num: '06' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>

      {/* ── Trust Bar ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,13,24,0.95)',
        padding: '0.6rem 2rem',
        display: 'flex', justifyContent: 'center', gap: '0', flexWrap: 'wrap',
      }}>
        {TRUST_BADGES.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 1.4rem',
            borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}>
            <span style={{ fontSize: '0.85rem' }}>{b.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--teal)', fontWeight: 700, letterSpacing: '0.08em' }}>{b.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-3)' }}>{b.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Hero (split layout) ── */}
      <section style={{
        minHeight: '88vh', display: 'flex', alignItems: 'center',
        padding: '4rem 4rem 3rem', position: 'relative', overflow: 'hidden',
        gap: '4rem', maxWidth: 1300, margin: '0 auto',
      }}>
        {/* Background grid */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          backgroundImage: 'linear-gradient(rgba(12,242,200,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(12,242,200,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 30% 50%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 30% 50%, black 0%, transparent 80%)',
        }} />

        {/* Left: text content */}
        <div style={{ flex: '1 1 480px', position: 'relative', zIndex: 1 }}>
          {/* Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.22)',
            color: 'var(--teal)', fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase',
            padding: '0.32rem 0.9rem', borderRadius: '99px', marginBottom: '1.5rem',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)', animation: 'blink 2.4s ease-in-out infinite' }} />
            AI · MRI Analysis · Clinical Decision Support
          </div>

          {/* Headline */}
          <div style={{ marginBottom: '1.2rem' }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)', color: 'rgba(12,242,200,0.55)',
              letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem'
            }}>clinical intelligence</span>
            <h1 style={{
              fontSize: 'clamp(2.8rem, 6vw, 4.8rem)', fontWeight: 700,
              letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--text)',
              margin: 0,
            }}>
              Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI
            </h1>
            <h2 style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', fontWeight: 400,
              letterSpacing: '-0.02em', lineHeight: 1.3, color: 'var(--text-2)',
              margin: '0.5rem 0 0',
            }}>
              Brain Tumor Detection &<br/>Volumetric Segmentation
            </h2>
          </div>

          <p style={{
            fontSize: 'clamp(0.88rem, 1.8vw, 1rem)', color: 'var(--text-3)',
            maxWidth: 460, lineHeight: 1.8, marginBottom: '2rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          }}>
            AI-powered MRI analysis with Grad-CAM explainability, radiomics, WHO grade estimation,
            molecular marker CDSS, and validated 3D volumetric segmentation — all in a single clinical pipeline.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            <Link to={user ? '/scanner' : '/login'} className="btn btn-primary"
              style={{ fontSize: '0.95rem', padding: '0.8rem 2rem' }}>
              {user ? 'Open Scanner →' : 'Get Started →'}
            </Link>
            <Link to="/true-3d" className="btn btn-outline"
              style={{ fontSize: '0.95rem', padding: '0.8rem 2rem' }}>
              View 3D Demo →
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {STATS.map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: scan visual */}
        <div style={{ flex: '1 1 380px', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '100%', maxWidth: 420, aspectRatio: '1',
            border: '1px solid rgba(12,242,200,0.15)', borderRadius: '20px',
            background: 'radial-gradient(ellipse at center, rgba(12,242,200,0.06), transparent 70%)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Animated SVG brain */}
            <svg viewBox="0 0 300 300" style={{ width: '100%', height: '100%' }} aria-hidden="true">
              <defs>
                <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(12,242,200,0.08)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Brain outline */}
              <ellipse cx="150" cy="140" rx="110" ry="95" fill="none" stroke="rgba(12,242,200,0.3)" strokeWidth="1.5" />
              <ellipse cx="150" cy="140" rx="85" ry="72" fill="none" stroke="rgba(12,242,200,0.12)" strokeWidth="1" />

              {/* Cortex folds */}
              {[
                'M70,100 C90,85 120,88 140,100 C155,110 148,128 132,126',
                'M170,88 C195,85 218,100 224,120 C228,138 212,148 198,138',
                'M65,148 C58,168 68,188 90,198 C108,206 122,194 116,178',
                'M200,165 C215,174 218,194 204,204 C190,212 174,206 172,190',
                'M100,224 C120,232 158,232 178,220',
                'M115,138 C130,130 155,132 165,146 C172,156 164,170 150,168',
                'M88,118 C102,108 118,112 124,124',
              ].map((d, i) => (
                <path key={i} d={d} fill="none" stroke="rgba(12,242,200,0.22)" strokeWidth="1.2" />
              ))}

              {/* Hemisphere divider */}
              <path d="M150,50 C152,95 150,140 150,230" fill="none" stroke="rgba(12,242,200,0.25)" strokeWidth="1" strokeDasharray="4,3" />

              {/* Tumor — glowing red */}
              <circle cx="178" cy="130" r="14" fill="rgba(255,87,87,0.18)">
                <animate attributeName="r" values="12;17;12" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.12;0.4" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="178" cy="130" r="6" fill="#FF5757" opacity="0.9" />

              {/* Grad-CAM heatmap overlay (colored zones) */}
              <ellipse cx="178" cy="130" rx="30" ry="24" fill="rgba(255,87,87,0.06)" />
              <ellipse cx="178" cy="130" rx="50" ry="38" fill="rgba(255,173,59,0.04)" />
              <ellipse cx="178" cy="130" rx="72" ry="54" fill="rgba(255,229,102,0.03)" />

              {/* Scan line */}
              <line x1="50" y1="0" x2="50" y2="300" stroke="rgba(12,242,200,0.5)" strokeWidth="1.5">
                <animate attributeName="x1" values="50;250;50" dur="4s" repeatCount="indefinite" />
                <animate attributeName="x2" values="50;250;50" dur="4s" repeatCount="indefinite" />
              </line>
              <rect x="0" y="0" width="300" height="300" fill="rgba(12,242,200,0.04)">
                <animateTransform attributeName="transform" type="translate" values="-250,0;250,0;-250,0" dur="4s" repeatCount="indefinite" />
              </rect>

              {/* HUD labels */}
              <text x="16" y="26" fontFamily="monospace" fontSize="8" fill="rgba(12,242,200,0.5)" letterSpacing="1">SAGITTAL · T1</text>
              <text x="16" y="286" fontFamily="monospace" fontSize="7" fill="rgba(255,87,87,0.7)" letterSpacing="1">● ROI DETECTED</text>
              <text x="180" y="286" fontFamily="monospace" fontSize="7" fill="rgba(12,242,200,0.4)" letterSpacing="1">GRAD-CAM</text>

              {/* Annotation callout */}
              <line x1="184" y1="130" x2="220" y2="100" stroke="rgba(255,87,87,0.5)" strokeWidth="0.8" strokeDasharray="3,2" />
              <rect x="220" y="86" width="66" height="22" rx="4" fill="rgba(10,13,24,0.8)" stroke="rgba(255,87,87,0.35)" strokeWidth="0.8" />
              <text x="227" y="95" fontFamily="monospace" fontSize="6" fill="#FF5757" letterSpacing="0.5">ET Region</text>
              <text x="227" y="104" fontFamily="monospace" fontSize="6" fill="rgba(255,255,255,0.4)">94% conf</text>
            </svg>

            {/* Corner HUD chips */}
            <div style={{ position: 'absolute', top: '5%', right: '5%', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--teal)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Live Render
            </div>
            <div style={{ position: 'absolute', bottom: '4%', left: '5%', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[['ET','#FF5757'],['TC','#FFAD3B'],['WT','#FFE566']].map(([l,c]) => (
                <span key={l} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: c, border: `1px solid ${c}44`, borderRadius: '4px', padding: '0.1rem 0.35rem', background: `${c}11` }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Cards (Delmont-style row) ── */}
      <section style={{ padding: '3rem 2rem', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0' }}>
          {SERVICE_CARDS.map((s, i) => (
            <div key={i} style={{
              padding: '1.6rem 1.4rem', textAlign: 'center',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              transition: 'background 0.2s',
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.7rem' }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)', marginBottom: '0.35rem' }}>{s.title}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tumor Classes ── */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>Classification Targets</p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', letterSpacing: '-0.02em', marginBottom: '2.5rem' }}>
          4 classes, <span style={{ color: 'var(--teal)' }}>instantly classified</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
          {TUMOR_CLASSES.map((t) => (
            <div key={t.name} className="card" style={{ padding: '1.6rem 1.4rem', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: `linear-gradient(90deg, transparent, ${t.color}, transparent)` }} />
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.6rem', fontWeight: 300, color: t.color, marginBottom: '0.3rem' }}>{t.name}</div>
              <div style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: t.color, border: `1px solid ${t.color}44`, borderRadius: '99px', padding: '0.15rem 0.6rem', marginBottom: '0.6rem' }}>{t.who}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: 'var(--text-3)', lineHeight: 1.6 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section style={{ padding: '5rem 2rem', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>The Pipeline</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            From scan to <span style={{ color: 'var(--teal)' }}>insight</span>, in six steps
          </h2>
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '2.5rem', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Every uploaded scan moves through the same clinical-grade pipeline — fully automated, fully explainable.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0', position: 'relative' }}>
            {/* Connecting line */}
            <div aria-hidden="true" style={{ position: 'absolute', top: '2rem', left: '8%', right: '8%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(12,242,200,0.2), transparent)', zIndex: 0 }} />
            {PIPELINE.map((p, i) => (
              <div key={p.title} style={{ padding: '1.4rem 1rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', margin: '0 auto 0.8rem',
                  background: `${p.color}18`, border: `1px solid ${p.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: p.color, fontWeight: 700,
                }}>{p.num}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.18em', color: p.color, textTransform: 'uppercase', marginBottom: '0.3rem' }}>{p.tag}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.3rem' }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{ padding: '5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>What's Inside</p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', letterSpacing: '-0.02em', marginBottom: '2.5rem' }}>
          Everything a <span style={{ color: 'var(--teal)' }}>clinician needs</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
          {FEATURES_PREVIEW.map((f) => (
            <div key={f.title} className="card" style={{ padding: '1.4rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '0.1rem' }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', marginBottom: '0.3rem' }}>{f.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-3)', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '6rem 2rem', textAlign: 'center', background: 'rgba(12,242,200,0.03)', borderTop: '1px solid rgba(12,242,200,0.08)' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Start Now</p>
        <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
          Ready to <span style={{ color: 'var(--teal)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 300 }}>analyse</span> a scan?
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: '2rem', letterSpacing: '0.05em' }}>
          Research prototype · Not for clinical use
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={user ? '/scanner' : '/login'} className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '0.8rem 2.2rem' }}>
            {user ? 'Open Scanner →' : 'Sign in to start →'}
          </Link>
          <Link to="/true-3d" className="btn btn-outline" style={{ fontSize: '0.95rem', padding: '0.8rem 2.2rem' }}>
            View 3D Segmentation →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--teal)' }}>NeuroScan AI</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Research prototype · Not for clinical use · © 2026
        </div>
        <div style={{ display: 'flex', gap: '1.2rem' }}>
          {[['/', 'Home'], ['/features', 'Features'], ['/scanner', 'Scanner'], ['/true-3d', '3D']].map(([to, label]) => (
            <Link key={to} to={to} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textDecoration: 'none', letterSpacing: '0.08em' }}>{label}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}