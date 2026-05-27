import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  if (user) { navigate('/dashboard'); return null }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/dashboard')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then sign in.')
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
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'calc(var(--nav-h) + 2rem) 1.5rem 3rem',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.9rem', color: 'rgba(12,242,200,0.55)',
          letterSpacing: '0.06em', display: 'block', marginBottom: '-0.05rem'
        }}>
          clinical intelligence
        </span>
        <h1 style={{ fontSize: '2.2rem', letterSpacing: '-0.03em' }}>
          Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI
        </h1>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2.2rem 2.2rem 2rem' }}>
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(12,242,200,0.55), transparent)'
        }} />

        {/* Tabs */}
        {mode !== 'reset' && (
          <div style={{
            display: 'flex', gap: '4px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: '8px', padding: '4px', marginBottom: '1.8rem',
          }}>
            <button style={tabStyle('signin')}
              onClick={() => { setMode('signin'); setError(''); setSuccess('') }}>
              Sign in
            </button>
            <button style={tabStyle('signup')}
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>
              Sign up
            </button>
          </div>
        )}

        {/* Back button for reset mode */}
        {mode === 'reset' && (
          <button onClick={() => setMode('signin')} style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)', fontSize: '0.66rem',
            letterSpacing: '0.1em', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            marginBottom: '1.5rem'
          }}>
            ← Back to sign in
          </button>
        )}

        {/* Subtitle */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.56rem',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: '0.3rem'
        }}>
          {mode === 'signin' ? 'Authorized access only'
            : mode === 'signup' ? 'Create your account'
            : 'Reset password'}
        </div>
        <h2 style={{
          fontSize: '1.1rem', fontWeight: 600,
          letterSpacing: '-0.01em', marginBottom: '1.6rem'
        }}>
          {mode === 'signin' ? 'Secure Sign In'
            : mode === 'signup' ? 'Join NeuroScan AI'
            : 'Forgot password?'}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {mode === 'signup' && (
            <div>
              <label className="input-label">Full name</label>
              <input className="input" type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Jane Smith" required />
            </div>
          )}

          <div>
            <label className="input-label">Email address</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@hospital.com" required />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••" required minLength={6} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(255,87,87,0.08)',
              border: '1px solid rgba(255,87,87,0.25)',
              borderRadius: '8px', padding: '0.7rem 1rem',
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--red)'
            }}>{error}</div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              background: 'rgba(12,242,200,0.06)',
              border: '1px solid rgba(12,242,200,0.22)',
              borderRadius: '8px', padding: '0.7rem 1rem',
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--teal)'
            }}>{success}</div>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}
            disabled={loading}>
            {loading ? 'Please wait…'
              : mode === 'signin' ? 'Sign in →'
              : mode === 'signup' ? 'Create account →'
              : 'Send reset email →'}
          </button>
        </form>

        {/* Forgot password link */}
        {mode === 'signin' && (
          <button onClick={() => { setMode('reset'); setError(''); setSuccess('') }} style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
            letterSpacing: '0.08em', cursor: 'pointer',
            marginTop: '1.2rem', width: '100%', textAlign: 'center'
          }}>
            Forgot password?
          </button>
        )}
      </div>

      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
        color: 'var(--text-3)', marginTop: '1.5rem',
        letterSpacing: '0.08em', textAlign: 'center'
      }}>
        Research prototype · Not for clinical use
      </p>
    </div>
  )
}