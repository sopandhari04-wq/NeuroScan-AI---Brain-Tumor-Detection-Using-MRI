import { useState, useEffect } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

function RiskBadge({ scans }) {
  if (!scans.length) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>No scans</span>
  const latest     = scans[0]
  const tumorScans = scans.filter(s => s.prediction !== 'notumor')
  
  if (latest.prediction !== 'notumor' && latest.confidence > 0.85) {
    return <span style={{ background: 'rgba(255,87,87,0.12)', color: '#FF5757', border: '1px solid rgba(255,87,87,0.3)', borderRadius: '99px', padding: '0.15rem 0.55rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem' }}>🔴 High Risk</span>
  } else if (latest.prediction !== 'notumor') {
    return <span style={{ background: 'rgba(255,173,59,0.12)', color: '#FFAD3B', border: '1px solid rgba(255,173,59,0.3)', borderRadius: '99px', padding: '0.15rem 0.55rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem' }}>🟡 Monitor</span>
  } else {
    return <span style={{ background: 'rgba(12,242,200,0.08)', color: '#0CF2C8', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '99px', padding: '0.15rem 0.55rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem' }}>🟢 Normal</span>
  }
}

export default function MyPatients() {
  const { username, user_name } = useAuth()
  const [patients, setPatients] = useState([])
  const [scansMap, setScansMap] = useState({})
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function fetchPatients() {
      if (!username) return
      setLoading(true)

      // Get all patients assigned to this doctor
      const { data: patientData } = await supabase
        .from('users')
        .select('*')
        .eq('doctor_username', username)
        .order('created', { ascending: false })

      if (!patientData) { setLoading(false); return }
      setPatients(patientData)

      // Get scans for all patients
      const map = {}
      for (const p of patientData) {
        const { data: scanData } = await supabase
          .from('scans')
          .select('*')
          .eq('username', p.username)
          .order('date', { ascending: false })
        map[p.username] = scanData || []
      }
      setScansMap(map)
      setLoading(false)
    }
    fetchPatients()
  }, [username])

  const formatDate = (d) => new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })

  const totalPatients = patients.length
  const highRisk      = patients.filter(p => {
    const scans  = scansMap[p.username] || []
    const latest = scans[0]
    return latest && latest.prediction !== 'notumor' && latest.confidence > 0.85
  }).length
  const needsMonitor = patients.filter(p => {
    const scans  = scansMap[p.username] || []
    const latest = scans[0]
    return latest && latest.prediction !== 'notumor' && latest.confidence <= 0.85
  }).length

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(123,130,245,0.08)', border: '1px solid rgba(123,130,245,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7B82F5', marginBottom: '0.75rem' }}>
          👨‍⚕️ My Patients
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          Patient <span style={{ color: 'var(--teal)' }}>Overview</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
          Dr. {user_name} · {totalPatients} assigned patients
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
        {[
          { val: totalPatients, label: 'Total Patients',  color: '#7B82F5' },
          { val: highRisk,      label: 'High Risk',       color: '#FF5757' },
          { val: needsMonitor,  label: 'Needs Monitoring', color: '#FFAD3B' },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ background: 'rgba(12,15,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.1rem 1rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.35rem' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading patients…</div>
      ) : patients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px dashed rgba(12,242,200,0.12)', borderRadius: '12px' }}>
          <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '0.75rem' }}>👥</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>No patients assigned yet</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)' }}>Ask your admin to assign patients to you.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {patients.map(p => {
            const scans      = scansMap[p.username] || []
            const latest     = scans[0]
            const isExpanded = expanded === p.username
            const c          = latest ? (CLS_COLORS[latest.prediction] || '#888') : 'rgba(255,255,255,0.1)'

            return (
              <div key={p.username} style={{ border: `1px solid ${latest ? c + '22' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', background: latest ? `${c}04` : 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>

                {/* Patient row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : p.username)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', cursor: 'pointer' }}
                >
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${c}18`, border: `1px solid ${c}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: c, flexShrink: 0 }}>
                    {p.name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>{p.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }}>{p.username}</div>
                  </div>

                  {/* Latest result */}
                  {latest && (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ background: c + '18', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${c}44`, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        {CLS_LABEL[latest.prediction] || latest.prediction}
                      </span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{Math.round(latest.confidence * 100)}% conf</div>
                    </div>
                  )}

                  {/* Risk badge */}
                  <RiskBadge scans={scans} />

                  {/* Scan count */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'right' }}>
                    <div>{scans.length} scans</div>
                    {latest && <div style={{ fontSize: '0.55rem' }}>{formatDate(latest.date)}</div>}
                  </div>

                  {/* Expand arrow */}
                  <div style={{ color: 'var(--text-3)', fontSize: '0.7rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▼</div>
                </div>

                {/* Expanded scan history */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem 1.2rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
                      Scan History
                    </div>
                    {scans.length === 0 ? (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', padding: '0.5rem 0' }}>No scans yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {scans.slice(0, 5).map(s => {
                          const sc = CLS_COLORS[s.prediction] || '#888'
                          return (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-mono)', fontSize: '0.63rem' }}>
                              <div style={{ color: 'var(--text-3)', minWidth: 120 }}>{formatDate(s.date)}</div>
                              <span style={{ background: sc + '18', color: sc, padding: '0.1rem 0.45rem', borderRadius: '99px', fontSize: '0.55rem', border: `1px solid ${sc}44`, textTransform: 'uppercase' }}>
                                {CLS_LABEL[s.prediction] || s.prediction}
                              </span>
                              <div style={{ color: 'var(--text-3)' }}>{Math.round(s.confidence * 100)}% conf</div>
                              <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.mode || 'Single MRI'}</div>
                            </div>
                          )
                        })}
                        {scans.length > 5 && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textAlign: 'center', padding: '0.3rem' }}>
                            +{scans.length - 5} more scans
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}