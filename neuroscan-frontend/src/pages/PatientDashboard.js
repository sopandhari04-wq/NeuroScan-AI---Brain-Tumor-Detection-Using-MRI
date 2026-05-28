import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

function StatCard({ val, label, color }) {
  return (
    <div style={{ background: 'rgba(12,15,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.3rem 1rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '2.2rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.35rem' }}>{label}</div>
    </div>
  )
}

export default function PatientDashboard() {
  const { user, username, user_name } = useAuth()
  const [scans, setScans]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScans() {
      if (!username) return
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('username', username)
        .order('date', { ascending: false })
      if (data) setScans(data)
      setLoading(false)
    }
    fetchScans()
  }, [username])

  const total   = scans.length
  const tumors  = scans.filter(s => s.prediction !== 'notumor').length
  const normals = total - tumors

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.75rem' }}>
          🧑 Patient Portal
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          My <span style={{ color: 'var(--teal)' }}>Scan Results</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
          {user_name} · {username}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
        <StatCard val={total}   label="Total Scans"    color="#7B82F5" />
        <StatCard val={tumors}  label="Tumor Detected" color="#FF5757" />
        <StatCard val={normals} label="Normal Scans"   color="#0CF2C8" />
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {/* Info banner */}
      <div style={{ padding: '0.8rem 1.2rem', borderRadius: '10px', background: 'rgba(0,200,180,0.04)', border: '1px solid rgba(0,200,180,0.12)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ color: 'var(--teal)' }}>ℹ</span>
        These are AI-assisted results only. Always consult a qualified medical professional for diagnosis.
      </div>

      {/* Scan History */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>Scan History</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading…</div>
        ) : scans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px dashed rgba(12,242,200,0.12)', borderRadius: '12px', background: 'rgba(12,242,200,0.012)' }}>
            <div style={{ fontSize: '1.8rem', opacity: 0.2, marginBottom: '0.75rem' }}>🔬</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)' }}>No scans yet</div>
            <Link to="/scanner" className="btn btn-outline" style={{ marginTop: '1.2rem', display: 'inline-flex', fontSize: '0.76rem', padding: '0.5rem 1.4rem' }}>Run first scan →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {scans.map((s) => {
              const c    = CLS_COLORS[s.prediction] || '#888'
              const date = new Date(s.date + (s.date.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
              const isTumor = s.prediction !== 'notumor'
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', borderRadius: '10px', background: isTumor ? 'rgba(255,87,87,0.03)' : 'rgba(12,242,200,0.02)', border: `1px solid ${c}22`, fontFamily: 'var(--font-mono)', fontSize: '0.67rem' }}>
                  <div style={{ color: 'var(--text-3)', minWidth: 130 }}>{date}</div>
                  <span style={{ background: c + '18', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${c}44`, textTransform: 'uppercase' }}>
                    {CLS_LABEL[s.prediction] || s.prediction}
                  </span>
                  <div style={{ color: 'var(--text-3)' }}>{Math.round(s.confidence * 100)}% conf.</div>
                  <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.mode || 'Single MRI'}</div>
                  {isTumor && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#FF5757', background: 'rgba(255,87,87,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,87,87,0.2)' }}>
                      ⚠ Consult doctor
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>Run new scan →</Link>
    </div>
  )
}