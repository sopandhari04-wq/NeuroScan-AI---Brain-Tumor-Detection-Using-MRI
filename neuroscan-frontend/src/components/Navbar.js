import { Link, useLocation, useNavigate } from 'react-router-dom'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user, role } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [open, setOpen] = useState(false)

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  const links = [
    { to: '/',         label: 'Home' },
    { to: '/features', label: 'Features' },
    { to: '/about',    label: 'About' },
  ]

  const authLinks = user ? [
    role === 'admin'  ? { to: '/admin',     label: 'Dashboard' } :
    role === 'doctor' ? { to: '/dashboard', label: 'Dashboard' } :
                        { to: '/patient',   label: 'Dashboard' },
    { to: '/scanner',     label: 'Scanner' },
    { to: '/true-3d',     label: 'True 3D' },
    { to: '/compare',     label: 'Compare' },
    ...(role === 'doctor' ? [{ to: '/my-patients', label: 'My Patients' }] : []),
    { to: '/timeline',    label: 'Timeline' },
    { to: '/statistics',  label: 'Statistics' },
    { to: '/chat',        label: 'AI Chat' },
    { to: '/annotations', label: 'Annotations' },
  ] : []

  const allLinks = [...links, ...authLinks]

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
    setOpen(false)
  }

  const active = (path) => location.pathname === path

  const linkStyle = (to) => ({
    fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '0.4rem 0.85rem', borderRadius: '7px',
    color: active(to) ? 'var(--teal)' : 'var(--text-3)',
    background: active(to) ? 'rgba(12,242,200,0.08)' : 'transparent',
    border: active(to) ? '1px solid rgba(12,242,200,0.18)' : '1px solid transparent',
    transition: 'all 0.15s', textDecoration: 'none', whiteSpace: 'nowrap',
  })

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        minHeight: 'var(--nav-h)',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 22px 68px rgba(15,23,42,0.09)',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', gap: '1rem',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(12,242,200,0.6)', letterSpacing: '0.04em' }}>neuro</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Scan<span style={{ color: 'var(--teal)' }}>AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {allLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={linkStyle(to)}>{label}</Link>
          ))}
        </div>

        {/* Desktop auth + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Desktop auth */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user ? (
              <>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '0.1em' }}>
                  {user.email?.split('@')[0]}
                </span>
                <button onClick={handleSignOut} className="btn btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.72rem' }}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary" style={{ padding: '0.45rem 1.2rem', fontSize: '0.76rem' }}>
                Sign in →
              </Link>
            )}
          </div>

          {/* Hamburger button — mobile only */}
          <button
            className="nav-hamburger"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            style={{
              display: 'none', // shown via CSS media query
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.4rem', color: 'var(--text-3)',
            }}
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          position: 'fixed', top: 'var(--nav-h)', left: 0, right: 0, bottom: 0,
          zIndex: 99, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)',
          overflowY: 'auto', padding: '1.5rem',
          borderTop: '1px solid rgba(15,23,42,0.06)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {allLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} style={{
                ...linkStyle(to),
                display: 'block', padding: '0.75rem 1rem', fontSize: '0.82rem',
                borderRadius: '10px',
                border: active(to) ? '1px solid rgba(12,242,200,0.18)' : '1px solid rgba(0,0,0,0.06)',
              }}>{label}</Link>
            ))}

            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0.5rem 0' }} />

            {user ? (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', padding: '0.5rem 1rem' }}>
                  Signed in as {user.email}
                </div>
                <button onClick={handleSignOut} style={{
                  background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)',
                  borderRadius: '10px', color: '#CC2222', fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem', padding: '0.75rem 1rem', cursor: 'pointer', textAlign: 'left',
                }}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="btn btn-primary" style={{ textAlign: 'center', padding: '0.75rem' }}>
                Sign in →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}