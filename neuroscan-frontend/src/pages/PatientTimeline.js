import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const c = CLS_COLORS[p?.payload?.prediction] || 'var(--teal)'
  return (
    <div style={{ background: 'rgba(11,14,24,0.97)', border: `1px solid ${c}44`, borderRadius: '10px', padding: '0.7rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: c, fontWeight: 700, marginBottom: '0.15rem' }}>{CLS_LABEL[p?.payload?.prediction] || p?.payload?.prediction}</div>
      <div style={{ color: 'var(--text-2)' }}>Confidence: {p?.value}%</div>
    </div>
  )
}

function AlertBanner({ type, message }) {
  const styles = {
    critical: { bg: 'rgba(255,87,87,0.08)', border: 'rgba(255,87,87,0.3)', color: '#FF5757', icon: '🚨' },
    warning:  { bg: 'rgba(255,173,59,0.08)', border: 'rgba(255,173,59,0.3)', color: '#FFAD3B', icon: '⚠️' },
    good:     { bg: 'rgba(12,242,200,0.08)', border: 'rgba(12,242,200,0.3)', color: '#0CF2C8', icon: '✅' },
  }
  const s = styles[type] || styles.warning
  return (
    <div style={{ padding: '0.8rem 1.2rem', borderRadius: '10px', background: s.bg, border: `1px solid ${s.border}`, fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: s.color, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '1rem' }}>{s.icon}</span>
      {message}
    </div>
  )
}

export default function PatientTimeline() {
  const { username, user_name } = useAuth()
  const [scans, setScans]       = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function fetchScans() {
      if (!username) return
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('username', username)
        .order('date', { ascending: true })
      if (data) setScans(data)
      setLoading(false)
    }
    fetchScans()
  }, [username])

  const formatDate = (d) => new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata'
  })

  const formatShort = (d) => new Date(d + (d.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata'
  })

  // Chart data
  const chartData = scans.map(s => ({
    date:       formatShort(s.date),
    confidence: Math.round(s.confidence * 100),
    prediction: s.prediction,
  }))

  // Detect changes between consecutive scans
  function getChange(prev, curr) {
    if (!prev) return null
    const prevTumor = prev.prediction !== 'notumor'
    const currTumor = curr.prediction !== 'notumor'
    if (!prevTumor && currTumor) return 'new_tumor'
    if (prevTumor && !currTumor) return 'cleared'
    if (prevTumor && currTumor && prev.prediction !== curr.prediction) return 'type_changed'
    if (prevTumor && currTumor && curr.confidence > prev.confidence + 0.1) return 'worsening'
    if (prevTumor && currTumor && curr.confidence < prev.confidence - 0.1) return 'improving'
    return null
  }

  // Generate alerts based on scan history
  const alerts = []
  if (scans.length >= 2) {
    const latest  = scans[scans.length - 1]
    const prev    = scans[scans.length - 2]
    const change  = getChange(prev, latest)

    if (change === 'new_tumor') {
      alerts.push({ type: 'critical', message: `New tumor detected in latest scan (${CLS_LABEL[latest.prediction]}) — previous scan was normal. Immediate medical consultation recommended.` })
    } else if (change === 'worsening') {
      alerts.push({ type: 'warning', message: `Confidence increased from ${Math.round(prev.confidence * 100)}% to ${Math.round(latest.confidence * 100)}% — possible worsening. Consult your doctor.` })
    } else if (change === 'type_changed') {
      alerts.push({ type: 'warning', message: `Tumor classification changed from ${CLS_LABEL[prev.prediction]} to ${CLS_LABEL[latest.prediction]}. Follow up with a specialist.` })
    } else if (change === 'cleared') {
      alerts.push({ type: 'good', message: `Latest scan shows no tumor detected — improvement from previous ${CLS_LABEL[prev.prediction]} result. Continue monitoring.` })
    } else if (change === 'improving') {
      alerts.push({ type: 'good', message: `Confidence decreased from ${Math.round(prev.confidence * 100)}% to ${Math.round(latest.confidence * 100)}% — possible improvement. Continue scheduled follow-ups.` })
    }

    // Check for consistently high tumor confidence
    const lastThree = scans.slice(-3).filter(s => s.prediction !== 'notumor' && s.confidence > 0.85)
    if (lastThree.length === 3) {
      alerts.push({ type: 'critical', message: 'High confidence tumor detected in last 3 consecutive scans. Urgent medical evaluation recommended.' })
    }
  }

  if (scans.length > 0 && scans[scans.length - 1].prediction !== 'notumor') {
    const tumorCount = scans.filter(s => s.prediction !== 'notumor').length
    if (tumorCount === scans.length && scans.length >= 3) {
      alerts.push({ type: 'warning', message: `All ${scans.length} scans show tumor indicators. Regular monitoring is essential.` })
    }
  }

  const latestScan   = scans[scans.length - 1]
  const totalTumors  = scans.filter(s => s.prediction !== 'notumor').length
  const totalNormals = scans.length - totalTumors
  const avgConf      = scans.length ? Math.round(scans.reduce((a, s) => a + s.confidence, 0) / scans.length * 100) : 0

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(123,130,245,0.08)', border: '1px solid rgba(123,130,245,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7B82F5', marginBottom: '0.75rem' }}>
          📈 Longitudinal Tracking
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          My <span style={{ color: 'var(--teal)' }}>Health Timeline</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
          {user_name} · {username} · {scans.length} total scans
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading timeline…</div>
      ) : scans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px dashed rgba(12,242,200,0.12)', borderRadius: '12px' }}>
          <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '0.75rem' }}>📈</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '1rem' }}>No scan history yet</div>
          <Link to="/scanner" className="btn btn-outline" style={{ display: 'inline-flex', fontSize: '0.76rem', padding: '0.5rem 1.4rem' }}>Run first scan →</Link>
        </div>
      ) : (
        <>
          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
                Health Alerts
              </div>
              {alerts.map((a, i) => <AlertBanner key={i} type={a.type} message={a.message} />)}
            </div>
          )}

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
            {[
              { val: scans.length,  label: 'Total Scans',    color: '#7B82F5' },
              { val: totalTumors,   label: 'Tumor Detected', color: '#FF5757' },
              { val: totalNormals,  label: 'Normal Scans',   color: '#0CF2C8' },
              { val: `${avgConf}%`, label: 'Avg Confidence', color: '#FFAD3B' },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ background: 'rgba(12,15,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.1rem 1rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.35rem' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

          {/* Confidence trend chart */}
          {scans.length >= 2 && (
            <div className="card" style={{ padding: '1.5rem 1.4rem', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>
                Confidence Trend Over Time
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={30} />
                  <ReferenceLine y={60} stroke="rgba(255,87,87,0.3)" strokeDasharray="4 4" label={{ value: '60% threshold', fill: '#FF5757', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="confidence" stroke="var(--teal)" strokeWidth={2} dot={(props) => {
                    const { cx, cy, payload } = props
                    const c = CLS_COLORS[payload.prediction] || 'var(--teal)'
                    return <circle key={payload.date} cx={cx} cy={cy} r={5} fill={c} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
                  }} name="Confidence %" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {Object.entries(CLS_COLORS).map(([k, c]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                    {CLS_LABEL[k]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline list */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>
              Scan Timeline — Chronological
            </div>
            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.06)' }} />

              {[...scans].reverse().map((s, i) => {
                const prev   = i < scans.length - 1 ? [...scans].reverse()[i + 1] : null
                const change = getChange(prev, s)
                const c      = CLS_COLORS[s.prediction] || '#888'
                const isTumor = s.prediction !== 'notumor'

                const changeBadge = {
                  new_tumor:    { label: '↑ New Tumor',      color: '#FF5757' },
                  worsening:    { label: '↑ Worsening',      color: '#FFAD3B' },
                  type_changed: { label: '⇄ Type Changed',   color: '#FFAD3B' },
                  cleared:      { label: '↓ Cleared',        color: '#0CF2C8' },
                  improving:    { label: '↓ Improving',      color: '#0CF2C8' },
                }[change]

                return (
                  <div key={s.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', paddingLeft: '2.5rem', position: 'relative' }}>
                    {/* Timeline dot */}
                    <div style={{ position: 'absolute', left: 10, top: 16, width: 14, height: 14, borderRadius: '50%', background: c, border: '2px solid rgba(0,0,0,0.4)', flexShrink: 0, zIndex: 1 }} />

                    {/* Card */}
                    <div style={{ flex: 1, background: isTumor ? `${c}06` : 'rgba(255,255,255,0.015)', border: `1px solid ${isTumor ? c + '22' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '1rem 1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)' }}>{formatDate(s.date)}</div>
                        <span style={{ background: c + '18', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${c}44`, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                          {CLS_LABEL[s.prediction] || s.prediction}
                        </span>
                        {changeBadge && (
                          <span style={{ background: `${changeBadge.color}18`, color: changeBadge.color, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${changeBadge.color}44`, fontFamily: 'var(--font-mono)' }}>
                            {changeBadge.label}
                          </span>
                        )}
                        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)' }}>{s.mode || 'Single MRI'}</div>
                      </div>

                      {/* Confidence bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(s.confidence * 100)}%`, background: `linear-gradient(90deg,${c}88,${c})`, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: c, minWidth: 36 }}>{Math.round(s.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Latest scan summary */}
          {latestScan && (
            <div style={{ marginTop: '2rem', padding: '1rem 1.2rem', borderRadius: '10px', background: 'rgba(0,200,180,0.04)', border: '1px solid rgba(0,200,180,0.12)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)' }}>
              ⚠ This timeline is for personal reference only. All AI results must be verified by a qualified medical professional. If you notice worsening trends, consult your doctor immediately.
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>Run new scan →</Link>
            <Link to="/statistics" className="btn btn-outline" style={{ display: 'inline-flex' }}>View statistics →</Link>
          </div>
        </>
      )}
    </div>
  )
}