const TECH_STACK = [
  { cat: 'AI / ML', color: '#FF5757', items: ['TensorFlow Lite', 'MobileNetV2', 'Grad-CAM', 'MONAI SegResNet', 'NumPy', 'OpenCV', 'SciPy'] },
  { cat: 'Backend', color: '#FFAD3B', items: ['Python 3.11', 'FastAPI', 'PyDICOM', 'ReportLab', 'PIL / Pillow', 'Groq API (LLM)'] },
  { cat: 'Frontend', color: '#0CF2C8', items: ['React 18', 'React Router v6', 'Three.js', 'Recharts', 'Supabase JS'] },
  { cat: 'Infrastructure', color: '#7B82F5', items: ['Supabase (Auth + DB)', 'Vercel (Frontend)', 'Render (Backend API)'] },
]

const TIMELINE = [
  { phase: '01', color: '#7B82F5', title: 'Data & Training', desc: 'CNN model trained on 3,000+ labelled MRI scans across 4 tumor classes, converted to TFLite for fast web inference.' },
  { phase: '02', color: '#0CF2C8', title: 'Explainable AI', desc: 'Grad-CAM heatmaps and segmentation-driven radiomics provide transparency for every tumor prediction.' },
  { phase: '03', color: '#FFAD3B', title: 'Clinical intelligence', desc: 'Rule-based CDSS combines tumor features with molecular context for more informed review.' },
  { phase: '04', color: '#FF5757', title: '3D visualization', desc: 'Interactive brain rendering with volumetric tumor overlays and longitudinal trend comparisons.' },
]

const KEY_METRICS = [
  { val: '4', label: 'Tumor classes', sub: 'Glioma · Meningioma · Pituitary · No Tumor', color: '#FF5757' },
  { val: '95%+', label: 'Classification accuracy', sub: 'Hold-out validation', color: '#0CF2C8' },
  { val: '0.94', label: 'Dice score', sub: 'MONAI segmentation validation', color: '#FFAD3B' },
  { val: '25+', label: 'Clinical features', sub: 'AI, reports, workflow, analytics', color: '#7B82F5' },
]

export default function About() {
  return (
    <div style={{ paddingTop: 'var(--nav-h)', background: 'transparent', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '4rem 2rem 4rem' }}>
        <section style={{ textAlign: 'center', padding: '4rem 0 2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.3em', color: '#2563EB', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
              About NeuroScan
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.8rem, 4vw, 3.8rem)', lineHeight: 1.04, maxWidth: 760, margin: '0 auto 1rem', fontWeight: 800 }}>
            AI-powered MRI tumor review with explainability, volumetrics, and care-ready reporting.
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', color: '#475569', fontSize: '1rem', lineHeight: 1.85, maxWidth: 720, margin: '0 auto' }}>
            NeuroScan helps research and clinical teams review MRI scans with confidence by combining secure intake, tumor classification, Grad-CAM clarity, and longitudinal analytics.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(235px,1fr))', gap: '1rem', margin: '2.5rem 0', padding: '1.5rem', borderRadius: 28, background: 'var(--surface-soft)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 24px 65px rgba(15,23,42,0.06)' }}>
          {[
            { title: 'Secure intake', desc: 'MRI validation, anonymized metadata, and encrypted upload handling.' },
            { title: 'Explainable imaging', desc: 'AI prediction scores, Grad-CAM visibility, and uncertainty guidance.' },
            { title: 'Tumor analytics', desc: 'ET/TC/WT volumetrics, radiomics, and scan-to-scan comparison.' },
            { title: 'Professional reports', desc: 'Downloadable PDF summaries with images, metrics, and findings.' },
          ].map((item) => (
            <div key={item.title} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 22, padding: '1.35rem 1.4rem', boxShadow: '0 20px 35px rgba(15,23,42,0.04)' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.55rem' }}>{item.title}</div>
              <div style={{ color: '#64748B', fontSize: '0.93rem', lineHeight: 1.7 }}>{item.desc}</div>
            </div>
          ))}
        </section>

        <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 0 4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
            {KEY_METRICS.map((m) => (
              <div key={m.label} style={{ position: 'relative', background: '#FFFFFF', borderRadius: 22, border: '1px solid #E2E8F0', padding: '1.5rem 1.4rem', boxShadow: '0 24px 50px rgba(15,23,42,0.05)', minHeight: 180 }}>
                <div style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: 3, background: `linear-gradient(90deg, transparent, ${m.color}, transparent)` }} />
                <div style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: '0.4rem' }}>{m.val}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.55rem' }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#64748B', lineHeight: 1.7 }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 1040, margin: '0 auto 2rem', padding: '1.25rem', borderRadius: 18, background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,255,1))', border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 20px 50px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--teal)', display: 'grid', placeItems: 'center', color: '#021012', fontWeight: 700 }}>🔒</div>
            <div>
              <div style={{ fontWeight: 800, marginBottom: '0.25rem', color: '#0F172A' }}>Security & privacy</div>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                We prioritize patient data protection: encrypted uploads in transit and at rest, automatic DICOM PHI stripping, and short-term retention for research prototypes. For production deployments, NeuroScan supports strict access controls, role-based permissions, and audit logging.
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 0 4rem' }}>
          <div style={{ background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '1.5rem 1.6rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.25rem' }}>
                Research prototype — not for clinical use
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#475569', lineHeight: 1.75 }}>
                NeuroScan is a research and educational demonstration. It is not a certified medical device and should not be used as the sole basis for clinical decisions.
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 0 4rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {TIMELINE.map((item) => (
              <div key={item.phase} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.2rem', alignItems: 'start', background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', padding: '1.4rem', boxShadow: '0 20px 40px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${item.color}14`, border: `1px solid ${item.color}44`, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: item.color }}>
                    {item.phase}
                  </div>
                  <div style={{ width: 2, background: 'rgba(37,99,235,0.15)', flex: 1, minHeight: 60 }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.45rem' }}>{item.title}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#64748B', lineHeight: 1.75 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 1040, margin: '0 auto', padding: '0 0 4rem' }}>
          <p style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#2563EB', marginBottom: '0.85rem', fontSize: '0.8rem' }}>Technology</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
            {TECH_STACK.map((stack) => (
              <div key={stack.cat} style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', padding: '1.4rem', boxShadow: '0 20px 40px rgba(15,23,42,0.04)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: stack.color, marginBottom: '1rem' }}>{stack.cat}</div>
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {stack.items.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#475569' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: stack.color, flexShrink: 0 }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" style={{ maxWidth: 1040, margin: '2.25rem auto', padding: '2.25rem', borderRadius: 22, background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 25px 60px rgba(15,23,42,0.06)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', fontWeight: 800, color: '#0F172A' }}>Contact & Support</h2>
          <p style={{ color: '#475569', marginBottom: '1rem' }}>For partnership inquiries, research access, or technical support, reach out to our team using the channels below. We aim to respond within one business day.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Email</div>
              <a href="mailto:neuroscanai@gmail.com" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>neuroscanai@gmail.com</a>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Phone</div>
              <div style={{ color: '#475569' }}>+1 (555) 123-4567</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Address</div>
              <div style={{ color: '#475569' }}>123 Neuro Ave, Suite 400, Neurocity, NY 10001</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Support hours</div>
              <div style={{ color: '#475569' }}>Mon–Fri, 09:00–17:00 (EST)</div>
            </div>
          </div>
        </section>

      </main>

      <footer style={{ background: '#F8FAFF', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>NeuroScan Medical</div>
        <div style={{ color: '#475569', fontSize: '0.95rem' }}>Secure MRI review · Explainable AI · Care-ready reporting</div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748B' }}>Research prototype — not for clinical use</div>
      </footer>
    </div>
  )
}
