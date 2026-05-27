import { useState } from 'react'
import { useAuth } from '../App'

export default function Scanner() {
  const { streamlitUrl } = useAuth()
  const [loaded, setLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <div style={{
      paddingTop: 'var(--nav-h)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.75rem 2rem',
        background: 'rgba(6,8,16,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: loaded ? 'var(--teal)' : '#FFAD3B',
            animation: loaded ? 'none' : 'blink 1.5s ease-in-out infinite'
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
            letterSpacing: '0.15em', color: 'var(--text-3)', textTransform: 'uppercase'
          }}>
            {loaded ? 'AI Engine Ready' : 'Loading Engine…'}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* URL display */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
          color: 'var(--text-3)', letterSpacing: '0.1em',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          padding: '0.25rem 0.75rem', borderRadius: '6px',
          maxWidth: 320, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {streamlitUrl}
        </div>

        {/* Fullscreen toggle */}
        <button onClick={() => setFullscreen(!fullscreen)} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: '7px', color: 'var(--text-2)',
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '0.3rem 0.75rem', cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          {fullscreen ? '⊡ Restore' : '⊞ Fullscreen'}
        </button>

        {/* Open direct link */}
        <a href={streamlitUrl} target="_blank" rel="noopener noreferrer" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: '7px', color: 'var(--text-2)',
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '0.3rem 0.75rem', cursor: 'pointer',
          textDecoration: 'none', display: 'inline-block',
        }}>
          ↗ Open direct
        </a>
      </div>

      {/* Cold start warning */}
      {!loaded && (
        <div style={{
          padding: '0.65rem 2rem',
          background: 'rgba(12,242,200,0.04)',
          borderBottom: '1px solid rgba(12,242,200,0.10)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.64rem',
            color: 'rgba(12,242,200,0.5)', letterSpacing: '0.08em'
          }}>
            The AI scanner is loading. Cold starts may take 30–60 seconds on Streamlit Cloud.
          </span>
        </div>
      )}

      {/* iframe wrapper */}
      <div style={{
        flex: 1,
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : 'auto',
        zIndex: fullscreen ? 200 : 1,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        minHeight: fullscreen ? '100vh' : 'calc(100vh - var(--nav-h) - 50px)',
      }}>

        {/* Loading overlay */}
        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '1.2rem',
            zIndex: 10, background: 'var(--bg)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '2px solid rgba(12,242,200,0.15)',
              borderTopColor: 'var(--teal)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase'
            }}>
              Starting AI engine…
            </div>
            <a href={streamlitUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.45rem 1.2rem' }}>
              Open in new tab ↗
            </a>
          </div>
        )}

        {/* Streamlit iframe */}
        <iframe
          src={streamlitUrl}
          title="NeuroScan AI Scanner"
          onLoad={() => setLoaded(true)}
          style={{
            flex: 1, width: '100%',
            height: fullscreen
              ? '100vh'
              : 'calc(100vh - var(--nav-h) - 50px)',
            border: 'none',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
          allow="camera; microphone"
        />
      </div>

      {/* Disclaimer bar */}
      <div style={{
        padding: '0.65rem 2rem',
        borderTop: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
        color: 'var(--text-3)', textAlign: 'center',
        letterSpacing: '0.08em', flexShrink: 0,
      }}>
        ⚠ Research prototype — Not for clinical use. Results must be verified by a qualified medical professional.
      </div>
    </div>
  )
}