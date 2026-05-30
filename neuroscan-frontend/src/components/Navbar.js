import { Link, useLocation, useNavigate } from 'react-router-dom'
import React from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const links = [
    { to: '/', label: 'Home' },
    { to: '/features', label: 'Features' },
    { to: '/about', label: 'About' },
  ]
 const { role } = useAuth()

const authLinks = user
    ? [
        role === 'admin' ? { to: '/admin', label: 'Dashboard' } :
        role === 'doctor' ? { to: '/dashboard', label: 'Dashboard' } :
        { to: '/patient', label: 'Dashboard' },
        { to: '/scanner', label: 'Scanner' },
        { to: '/compare', label: 'Compare' },
        { to: '/statistics', label: 'Statistics' },
        { to: '/timeline', label: 'Timeline' },
        { to: '/chat', label: 'AI Chat' },
      ]
    : []

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const active = (path) => location.pathname === path

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 'var(--nav-h)',
      background: 'rgba(6,8,16,0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 2rem',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        display: 'flex', alignItems: 'baseline', gap: '0.25rem',
        textDecoration: 'none', marginRight: '2.5rem'
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.75rem', color: 'rgba(12,242,200,0.6)', letterSpacing: '0.04em'
        }}>
          neuro
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '1.1rem',
          fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em'
        }}>
          Scan<span style={{ color: 'var(--teal)' }}>AI</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
        {[...links, ...authLinks].map(({ to, label }) => (
          <Link key={to} to={to} style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.4rem 0.85rem', borderRadius: '7px',
            color: active(to) ? 'var(--teal)' : 'var(--text-3)',
            background: active(to) ? 'rgba(12,242,200,0.08)' : 'transparent',
            border: active(to) ? '1px solid rgba(12,242,200,0.18)' : '1px solid transparent',
            transition: 'all 0.15s', textDecoration: 'none',
          }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user ? (
          <>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
              color: 'var(--text-3)', letterSpacing: '0.1em'
            }}>
              {user.email?.split('@')[0]}
            </span>
            <button onClick={handleSignOut} className="btn btn-ghost"
              style={{ padding: '0.4rem 1rem', fontSize: '0.72rem' }}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary"
            style={{ padding: '0.45rem 1.2rem', fontSize: '0.76rem' }}>
            Sign in →
          </Link>
        )}
      </div>
    </nav>
  )
}