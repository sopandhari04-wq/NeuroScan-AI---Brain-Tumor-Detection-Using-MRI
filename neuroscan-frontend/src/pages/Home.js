import { Link } from 'react-router-dom'
import { useAuth } from '../App'

const QUICK_STATS = [
  { value: '24h', label: 'Rapid review' },
  { value: '98%', label: 'AI accuracy' },
  { value: '4', label: 'Tumor classes' },
  { value: '10k+', label: 'Scans reviewed' },
]

const BENEFITS = [
  { title: 'Secure MRI intake', description: 'Encrypted scan upload with DICOM validation and anonymized metadata handling.' },
  { title: 'Explainable AI', description: 'Tumor classification, confidence scores, and Grad-CAM transparency.' },
  { title: 'Volumetric reporting', description: 'Automatic radiomic metrics, lesion volume, and care-ready summaries.' },
]

const HIGHLIGHTS = [
  'AI-assisted MRI review for research and clinical teams.',
  'Patient-friendly portal with secure scan sharing.',
  'Professional PDF reports built for care handoff.',
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 'var(--nav-h)', background: 'transparent', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative' }}>
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '4rem 2rem 2rem', position: 'relative' }}>
        <section style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '2.5rem', alignItems: 'center', padding: '2.5rem', borderRadius: 32, background: 'var(--surface-soft)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 40px 120px rgba(15,23,42,0.08)' }}>
          <div>
            <div style={{ position: 'absolute', top: -24, right: '5%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(12,242,200,0.16)', filter: 'blur(70px)', zIndex: -1 }} />
            <span style={{ display: 'inline-block', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.24em', color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              NeuroScan Medical
            </span>
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.2rem)', lineHeight: 1.03, marginBottom: '1.5rem', fontWeight: 800 }}>
              Better MRI tumor review, faster clinical decisions.
            </h1>
            <p style={{ maxWidth: 660, color: '#475569', lineHeight: 1.85, marginBottom: '2rem' }}>
              Securely upload MRI scans, review explainable tumor AI results, and generate patient-ready reports from one polished medical workflow.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <Link to={user ? '/scanner' : '/login'} className="btn btn-primary" style={{ padding: '1rem 1.9rem', fontSize: '0.95rem' }}>
                {user ? 'Run a scan' : 'Get started'}
              </Link>
              <a href="#services" className="btn btn-outline" style={{ padding: '1rem 1.9rem', fontSize: '0.95rem' }}>
                View services
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem', maxWidth: 760 }}>
              {QUICK_STATS.map((stat) => (
                <div key={stat.label} style={{ padding: '1rem 1.15rem', borderRadius: 18, background: 'linear-gradient(180deg, rgba(240,249,255,1), rgba(255,255,255,0.96))', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 22px 42px rgba(15,23,42,0.05)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>{stat.value}</div>
                  <div style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.35rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
            {/* Partner logos */}
            <div style={{ marginTop: '1.35rem', display: 'flex', gap: '0.9rem', alignItems: 'center', maxWidth: 760, flexWrap: 'wrap' }}>
              {[
                { id: 'neuro', label: 'Neuro Institute' },
                { id: 'city', label: 'City Hospital' },
                { id: 'lab', label: 'Research Lab' },
                { id: 'care', label: 'CareNet' },
              ].map((p) => (
                <div key={p.id} title={p.label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 92, height: 64, padding: '0.4rem', borderRadius: 12, background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,255,1))', border: '1px solid rgba(15,23,42,0.06)' }}>
                  <img src={`/logos/${p.id}.svg`} alt={p.label} style={{ maxWidth: '84px', maxHeight: '56px', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ position: 'relative', borderRadius: 28, padding: '2rem', background: 'rgba(239,246,255,0.95)', border: '1px solid rgba(59,130,246,0.18)', boxShadow: '0 30px 80px rgba(59,130,246,0.08)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563EB', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                Patient-first design
              </div>
              <h2 style={{ fontSize: '1.7rem', marginBottom: '1rem', color: '#0F172A' }}>Secure patient access</h2>
              <p style={{ color: '#475569', lineHeight: 1.8 }}>
                Patients can upload scans, track findings, and receive clinician-ready summaries with a simple, secure interface.
              </p>
            </div>
            <div style={{ borderRadius: 28, padding: '2rem', background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 25px 60px rgba(15,23,42,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem', color: '#0F172A' }}>Trusted MRI workflow</div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {BENEFITS.map((item) => (
                  <div key={item.title} style={{ padding: '1rem', borderRadius: 20, background: '#F8FAFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.45rem' }}>{item.title}</div>
                    <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="faq" style={{ marginTop: '4rem', padding: '2.5rem', borderRadius: 20, background: '#FFFFFF', border: '1px solid #E6EEF8', boxShadow: '0 18px 40px rgba(15,23,42,0.04)' }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <p style={{ color: '#2563EB', fontSize: '0.78rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.6rem' }}>FAQ</p>
              <h2 style={{ fontSize: '1.7rem', marginBottom: '0.6rem', fontWeight: 800 }}>Frequently asked questions</h2>
              <p style={{ color: '#475569', maxWidth: 720, margin: '0 auto' }}>Answers to common questions about NeuroScan's workflow, security, and how to get started.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <details style={{ padding: '0.9rem 1rem', borderRadius: 12, background: '#F8FAFF', border: '1px solid #EAF4FF' }}>
                <summary style={{ fontWeight: 700, cursor: 'pointer' }}>Is my patient data secure?</summary>
                <div style={{ marginTop: '0.6rem', color: '#475569' }}>Yes — uploads are encrypted in transit, PHI is stripped during ingestion, and access is role-restricted. See our Security & privacy card on the About page for details.</div>
              </details>

              <details style={{ padding: '0.9rem 1rem', borderRadius: 12, background: '#F8FAFF', border: '1px solid #EAF4FF' }}>
                <summary style={{ fontWeight: 700, cursor: 'pointer' }}>How accurate is the AI model?</summary>
                <div style={{ marginTop: '0.6rem', color: '#475569' }}>Model performance varies by sequence and scanner; typical accuracy is reflected in our published metrics and continuous validation pipelines. Contact us for institutional validation results.</div>
              </details>

              <details style={{ padding: '0.9rem 1rem', borderRadius: 12, background: '#F8FAFF', border: '1px solid #EAF4FF' }}>
                <summary style={{ fontWeight: 700, cursor: 'pointer' }}>What file formats are supported?</summary>
                <div style={{ marginTop: '0.6rem', color: '#475569' }}>We accept DICOM for clinical workflows and NIfTI for research. Our uploader validates and anonymizes incoming metadata automatically.</div>
              </details>

              <details style={{ padding: '0.9rem 1rem', borderRadius: 12, background: '#F8FAFF', border: '1px solid #EAF4FF' }}>
                <summary style={{ fontWeight: 700, cursor: 'pointer' }}>How do I get help or support?</summary>
                <div style={{ marginTop: '0.6rem', color: '#475569' }}>Email our support team at contact@neuroscan.com or visit the About page for phone and hours. We also offer enterprise onboarding and integrations.</div>
              </details>
            </div>
          </div>
        </section>

        <section id="services" style={{ marginTop: '4.5rem', padding: '2rem', borderRadius: 28, background: 'var(--surface-soft)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 28px 80px rgba(15,23,42,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ color: '#2563EB', fontSize: '0.82rem', letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              What we do
            </p>
            <h2 style={{ fontSize: 'clamp(2rem, 3vw, 2.9rem)', marginBottom: '1rem', fontWeight: 800 }}>
              MRI review built for clinicians and researchers
            </h2>
            <p style={{ color: '#475569', maxWidth: 680, margin: '0 auto', lineHeight: 1.8 }}>
              NeuroScan combines fast AI inference, explainability, longitudinal analytics, and report-ready output into one polished medical solution.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {HIGHLIGHTS.map((item) => (
              <div key={item} style={{ background: '#FFFFFF', borderRadius: 24, padding: '1.7rem', border: '1px solid #E2E8F0', boxShadow: '0 18px 40px rgba(15,23,42,0.04)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#0F172A' }}>{item.split('.')[0]}</div>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.75, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '4.5rem', padding: '3rem 2rem', borderRadius: 32, background: '#EFF6FF', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: '2rem', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#2563EB', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                Built for care teams
              </span>
              <h2 style={{ fontSize: '2.3rem', lineHeight: 1.05, marginBottom: '1rem' }}>A modern MRI workflow that feels effortless</h2>
              <p style={{ color: '#475569', lineHeight: 1.85, maxWidth: 520 }}>
                From secure intake to explainable results and expert summaries, NeuroScan makes every MRI review step more reliable and actionable.
              </p>
            </div>
            <div style={{ borderRadius: 28, background: '#FFFFFF', padding: '2rem', border: '1px solid #E2E8F0', boxShadow: '0 25px 60px rgba(15,23,42,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem' }}>Your first scan is just a few clicks away</div>
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {['Upload DICOM', 'AI tumor classification', 'Review Grad-CAM & metrics', 'Download report'].map((step) => (
                  <div key={step} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 32, height: 32, borderRadius: 12, background: '#0CF2C8', color: '#020508', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                      ✓
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.75 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ padding: '2rem 1.5rem', background: '#F8FAFF', textAlign: 'center' }}>
        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>NeuroScan Medical</div>
        <div style={{ color: '#475569', fontSize: '0.95rem' }}>Secure MRI review · Explainable AI · Care-ready reporting</div>
      </footer>
    </div>
  )
}
