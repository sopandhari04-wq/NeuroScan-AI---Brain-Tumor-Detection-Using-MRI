import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const SHOWCASE_FEATURES = [
  { icon: '🧠', label: 'Grad-CAM XAI', desc: 'Visual attention heatmaps' },
  { icon: '📐', label: 'WHO Grade Estimation', desc: 'Radiomics-driven grading' },
  { icon: '🧊', label: 'True 3D Segmentation', desc: 'Validated MONAI BraTS model' },
  { icon: '🩺', label: 'Molecular CDSS', desc: 'IDH/MGMT decision support' },
]

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { user, role } = useAuth()

  if (user) {
    if (role === 'admin') { navigate('/admin'); return null }
    if (role === 'doctor') { navigate('/dashboard'); return null }
    if (role === 'patient') { navigate('/patient'); return null }
    navigate('/patient'); return null
  }

  async function getRoleAndRedirect(email) {
    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('username', email)
        .single()
      const r = data?.role || 'patient'
      if (r === 'admin') navigate('/admin')
      else if (r === 'doctor') navigate('/dashboard')
      else navigate('/patient')
    } catch {
      navigate('/patient')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        await getRoleAndRedirect(email)
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        await supabase.from('users').insert({
          username: email,
          name,
          role: 'patient',
          password,
        })
        setSuccess('Account created! You can now sign in.')
        setMode('signin')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Password reset email sent. Check your inbox.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabStyle = (m) => ({
    flex: 1,
    padding: '0.55rem',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.66rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '6px',
    transition: 'all 0.15s',
    background: mode === m ? 'rgba(12,242,200,0.12)' : 'transparent',
    color: mode === m ? 'var(--teal)' : 'var(--text-3)',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', paddingTop: 'var(--nav-h)', background: '#F8FAFF', color: '#0F172A' }}>
      <div className="login-showcase" style={{ flex: '1 1 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem 3.5rem', position: 'relative', overflow: 'hidden', background: '#FFFFFF', borderRight: '1px solid #E2E8F0' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.18, backgroundImage: 'linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 440 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.95rem', color: '#2563EB', letterSpacing: '0.08em', display: 'block', marginBottom: '1rem' }}>
            Secure research access
          </span>
          <h1 style={{ fontSize: 'clamp(2.4rem,4vw,3.4rem)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1.25rem', lineHeight: 1.03 }}>
            MRI tumor review for teams who need clarity and confidence.
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.98rem', color: '#475569', lineHeight: 1.9, maxWidth: 500, marginBottom: '2rem' }}>
            Access NeuroScan AI for explainable MRI classification, Grad-CAM transparency, validated 3D segmentation, and export-ready reporting in one polished interface.
          </p>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {SHOWCASE_FEATURES.map((f) => (
              <div key={f.label} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', borderRadius: 18, border: '1px solid rgba(37,99,235,0.12)', background: '#F8FBFF' }}>
                <div style={{ width: 38, height: 38, borderRadius: '12px', flexShrink: 0, background: 'rgba(37,99,235,0.12)', display: 'grid', placeItems: 'center', fontSize: '1rem' }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{f.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {[['Clinical teams', '#7B82F5'], ['Care reviews', '#0CF2C8'], ['Research access', '#FFAD3B']].map(([label, color]) => (
              <div key={label} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.16em', padding: '0.35rem 0.9rem', borderRadius: '999px', border: `1px solid ${color}33`, background: `${color}12`, color }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: '1 1 58%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
        <div className="login-mobile-header" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: '#2563EB', display: 'block', marginBottom: '0.5rem' }}>Secure access</span>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI</h1>
        </div>

        <div style={{ width: '100%', maxWidth: 460, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 28, boxShadow: '0 35px 80px rgba(15,23,42,0.12)', padding: '2.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 4, borderRadius: 999, background: 'linear-gradient(90deg, rgba(12,242,200,0.75), rgba(37,99,235,0.75))' }} />

          {mode !== 'reset' && (
            <div style={{ display: 'flex', gap: '4px', background: '#F8FAFF', border: '1px solid #DCEFFE', borderRadius: '10px', padding: '5px', marginBottom: '1.8rem' }}>
              <button style={tabStyle('signin')} onClick={() => { setMode('signin'); setError(''); setSuccess('') }}>Sign in</button>
              <button style={tabStyle('signup')} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Sign up</button>
            </div>
          )}

          {mode === 'reset' && (
            <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.12em', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
              ← Back to sign in
            </button>
          )}

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.35rem' }}>
            {mode === 'signin' ? 'Secure sign in' : mode === 'signup' ? 'Welcome to NeuroScan' : 'Password reset'}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            {mode === 'signin' ? 'Access your dashboard' : mode === 'signup' ? 'Create your account' : 'Recover your login'}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', color: '#64748B', fontSize: '0.95rem', lineHeight: 1.75, marginBottom: '1.8rem' }}>
            {mode === 'signin'
              ? 'Sign in with your registered email and password to continue.'
              : mode === 'signup'
                ? 'Start with a patient account to explore NeuroScan research features.'
                : 'Enter your email and we’ll send a password reset link.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'signup' && (
              <div>
                <label className="input-label">Full name</label>
                <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" required />
              </div>
            )}
            <div>
              <label className="input-label">Email address</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hospital.com" required />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="input-label">Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" required minLength={6} />
              </div>
            )}
            {mode === 'signup' && (
              <div style={{ padding: '0.7rem 1rem', borderRadius: '12px', background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.18)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#0F172A' }}>
                New accounts are created as <strong style={{ color: 'var(--teal)' }}>Patient</strong> by default.
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.25)', borderRadius: '12px', padding: '0.9rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: 'var(--red)' }}>{error}</div>
            )}
            {success && (
              <div style={{ background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.22)', borderRadius: '12px', padding: '0.9rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.84rem', color: 'var(--teal)' }}>{success}</div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', opacity: loading ? 0.75 : 1 }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset link →'}
            </button>
          </form>

          {mode === 'signin' && (
            <button onClick={() => { setMode('reset'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: '#64748B', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.12em', cursor: 'pointer', marginTop: '1.4rem', width: '100%', textAlign: 'center' }}>
              Forgot password?
            </button>
          )}
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#64748B', marginTop: '1.5rem', letterSpacing: '0.12em', textAlign: 'center' }}>
          Research prototype · Not for clinical use
        </p>
      </div>
    </div>
  )
}
