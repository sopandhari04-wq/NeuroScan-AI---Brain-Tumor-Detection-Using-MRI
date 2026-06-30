import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const SHOWCASE_FEATURES = [
  { icon: '🧠', label: 'Grad-CAM XAI',        desc: 'Visual attention heatmaps' },
  { icon: '📐', label: 'WHO Grade Estimation', desc: 'Radiomics-driven grading' },
  { icon: '🧊', label: 'True 3D Segmentation', desc: 'Validated MONAI BraTS model' },
  { icon: '🩺', label: 'Molecular CDSS',       desc: 'IDH/MGMT decision support' },
]

export default function Login() {
  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const navigate  = useNavigate()
  const { user, role } = useAuth()

  if (user) {
    if (role === 'admin')   { navigate('/admin');     return null }
    if (role === 'doctor')  { navigate('/dashboard'); return null }
    if (role === 'patient') { navigate('/patient');   return null }
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
      if (r === 'admin')   navigate('/admin')
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
          name:     name,
          role:     'patient',
          password: password,
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
    flex: 1, padding: '0.55rem', textAlign: 'center',
    fontFamily: 'var(--font-mono)', fontSize: '0.66rem',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    cursor: 'pointer', border: 'none', borderRadius: '6px',
    transition: 'all 0.15s',
    background: mode === m ? 'rgba(12,242,200,0.12)' : 'transparent',
    color: mode === m ? 'var(--teal)' : 'var(--text-3)',
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'stretch',
      paddingTop: 'var(--nav-h)',
    }}>

      {/* ── Left: Brand showcase panel (hidden on small screens) ── */}
      <div className="login-showcase" style={{
        flex: '1 1 45%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem 3.5rem', position: 'relative', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: 'radial-gradient(ellipse at 30% 30%, rgba(12,242,200,0.05), transparent 60%)',
      }}>
        {/* Background grid */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          backgroundImage: 'linear-gradient(rgba(12,242,200,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(12,242,200,0.04) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 30% 40%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 30% 40%, black 0%, transparent 80%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.95rem', color: 'rgba(12,242,200,0.55)',
            letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem'
          }}>clinical intelligence</span>
          <h1 style={{ fontSize: 'clamp(2.2rem,4vw,3rem)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.8, marginBottom: '2.2rem' }}>
            AI-powered brain tumor classification with explainability, radiomics, molecular
            decision support, and validated 3D volumetric segmentation.
          </p>

          {/* Feature showcase list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2.2rem' }}>
            {SHOWCASE_FEATURES.map((f) => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-1)' }}>{f.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Role badges */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[['👨‍⚕️ Doctor', '#7B82F5'], ['🧑‍💼 Admin', '#FF6B6B'], ['🧑 Patient', '#00C8B4']].map(([label, color]) => (
              <div key={label} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                letterSpacing: '0.12em', padding: '0.25rem 0.7rem',
                borderRadius: '99px', border: `1px solid ${color}44`,
                background: `${color}11`, color,
              }}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div style={{
        flex: '1 1 55%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}>
        {/* Mobile-only header (shown when showcase panel is hidden) */}
        <div className="login-mobile-header" style={{ display: 'none', textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'rgba(12,242,200,0.55)', display: 'block' }}>clinical intelligence</span>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI</h1>
        </div>

        {/* Card */}
        <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2.2rem 2.2rem 2rem' }}>
          <div style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(12,242,200,0.55), transparent)'
          }} />

          {mode !== 'reset' && (
            <div style={{
              display: 'flex', gap: '4px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: '8px', padding: '4px', marginBottom: '1.8rem',
            }}>
              <button style={tabStyle('signin')} onClick={() => { setMode('signin'); setError(''); setSuccess('') }}>Sign in</button>
              <button style={tabStyle('signup')} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Sign up</button>
            </div>
          )}

          {mode === 'reset' && (
            <button onClick={() => setMode('signin')} style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)', fontSize: '0.66rem',
              letterSpacing: '0.1em', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem'
            }}>← Back to sign in</button>
          )}

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.56rem',
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--text-3)', marginBottom: '0.3rem'
          }}>
            {mode === 'signin' ? 'Authorized access only' : mode === 'signup' ? 'Create your account' : 'Reset password'}
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '1.6rem' }}>
            {mode === 'signin' ? 'Secure Sign In' : mode === 'signup' ? 'Join NeuroScan AI' : 'Forgot password?'}
          </h2>

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
              <div style={{
                padding: '0.6rem 0.9rem', borderRadius: '8px',
                background: 'rgba(0,200,180,0.05)', border: '1px solid rgba(0,200,180,0.15)',
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)'
              }}>
                ℹ New accounts are created as <span style={{ color: 'var(--teal)' }}>Patient</span> by default. Contact admin to change your role.
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.25)', borderRadius: '8px', padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--red)' }}>{error}</div>
            )}
            {success && (
              <div style={{ background: 'rgba(12,242,200,0.06)', border: '1px solid rgba(12,242,200,0.22)', borderRadius: '8px', padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--teal)' }}>{success}</div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset email →'}
            </button>
          </form>

          {mode === 'signin' && (
            <button onClick={() => { setMode('reset'); setError(''); setSuccess('') }} style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
              letterSpacing: '0.08em', cursor: 'pointer',
              marginTop: '1.2rem', width: '100%', textAlign: 'center'
            }}>Forgot password?</button>
          )}
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginTop: '1.5rem', letterSpacing: '0.08em', textAlign: 'center' }}>
          Research prototype · Not for clinical use
        </p>
      </div>
    </div>
  )
}