import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Navigate } from 'react-router-dom'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

const QUICK_LINKS = [
  { to: '/scanner',     icon: '🧠', label: 'New Scan',      desc: 'Run AI analysis',         color: '#0CF2C8' },
  { to: '/true-3d',     icon: '🧊', label: '3D Volume',     desc: 'Volumetric segmentation', color: '#FF5757' },
  { to: '/compare',     icon: '🔁', label: 'Compare Scans', desc: 'Side-by-side analysis',   color: '#7B82F5' },
  { to: '/timeline',    icon: '📈', label: 'Timeline',      desc: 'Longitudinal history',    color: '#FFAD3B' },
  { to: '/chat',        icon: '🤖', label: 'AI Chat',       desc: 'Ask about your scans',    color: '#0CF2C8' },
  { to: '/annotations', icon: '✏️', label: 'Annotations',   desc: 'Saved doctor notes',       color: '#7B82F5' },
]

function StatCard({ val, label, color, icon }) {
  return (
    <div style={{ background: 'rgba(12,15,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.3rem 1.2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.4rem' }}>{label}</div>
        </div>
        <div style={{ fontSize: '1.4rem', opacity: 0.4 }}>{icon}</div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(11,14,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '0.2rem' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].fill || 'var(--teal)', fontWeight: 600 }}>{payload[0].value}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, role } = useAuth()

  const [scans, setScans]     = useState([])
  const [loading, setLoading] = useState(true)

  const username = user?.email || ''

  useEffect(() => {
    async function fetchScans() {
      if (!user) return
      const { data: dataFull } = await supabase
        .from('scans')
        .select('*')
        .eq('username', username)
        .order('date', { ascending: false })

      if (dataFull && dataFull.length > 0) {
        setScans(dataFull)
      } else {
        const prefix = username.split('@')[0]
        const { data: dataPrefix } = await supabase
          .from('scans')
          .select('*')
          .eq('username', prefix)
          .order('date', { ascending: false })
        if (dataPrefix) setScans(dataPrefix)
      }
      setLoading(false)
    }
    fetchScans()
    const interval = setInterval(fetchScans, 30000)
    return () => clearInterval(interval)
  /* eslint-disable-next-line */
  }, [])

  if (role === 'admin') return <Navigate to="/admin" replace />

  const total   = scans.length
  const tumors  = scans.filter(s => s.prediction !== 'notumor').length
  const normals = total - tumors
  const avgConf = total ? Math.round(scans.reduce((a, s) => a + s.confidence, 0) / total * 100) : 0

  const clsCounts = scans.reduce((acc, s) => { acc[s.prediction] = (acc[s.prediction] || 0) + 1; return acc }, {})
  const pieData   = Object.entries(clsCounts).map(([k, v]) => ({ name: CLS_LABEL[k] || k, value: v, color: CLS_COLORS[k] || '#888' }))

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: scans.filter(s => s.date?.startsWith(key)).length }
  })

  // Confidence trend across all scans (most recent 15, oldest to newest)
  const confTrend = [...scans].slice(0, 15).reverse().map((s, i) => ({
    idx: i + 1,
    conf: Math.round(s.confidence * 100),
    color: CLS_COLORS[s.prediction] || '#888',
  }))

  const latestScan = scans[0]

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Personal Analytics</p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
            My <span style={{ color: 'var(--teal)' }}>Dashboard</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>{username}</p>
        </div>
        {latestScan && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.5rem 0.9rem',
            background: 'rgba(255,255,255,0.02)',
          }}>
            Last scan: <span style={{ color: CLS_COLORS[latestScan.prediction] || 'var(--teal)', fontWeight: 700 }}>
              {CLS_LABEL[latestScan.prediction] || latestScan.prediction}
            </span> · {Math.round(latestScan.confidence * 100)}% confidence
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.7rem', marginBottom: '2rem' }}>
        {QUICK_LINKS.map((q) => (
          <Link key={q.to} to={q.to} style={{
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.7rem',
            padding: '0.9rem 1rem', borderRadius: '10px',
            background: `${q.color}08`, border: `1px solid ${q.color}22`,
            transition: 'border-color 0.2s',
          }}>
            <span style={{ fontSize: '1.3rem' }}>{q.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-1)' }}>{q.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)' }}>{q.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
        <StatCard val={total}         label="Total Scans"     color="#7B82F5" icon="🗂️" />
        <StatCard val={tumors}        label="Tumor Detected"  color="#FF5757" icon="⚠️" />
        <StatCard val={normals}       label="Normal Scans"    color="#0CF2C8" icon="✅" />
        <StatCard val={`${avgConf}%`} label="Avg Confidence"  color="#FFAD3B" icon="🎯" />
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Scans — last 7 days</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last7} barSize={16}>
                <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                <Bar dataKey="count" fill="rgba(12,242,200,0.6)" radius={[4,4,0,0]} name="Scans" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Classification breakdown</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ResponsiveContainer width="60%" height={150}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.64rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-2)', flex: 1 }}>{d.name}</span>
                    <span style={{ color: d.color, fontWeight: 500 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {confTrend.length > 1 && (
            <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Confidence trend</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={confTrend}>
                  <XAxis dataKey="idx" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: 'rgba(11,14,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="conf" stroke="#0CF2C8" strokeWidth={2} dot={{ r: 3, fill: '#0CF2C8' }} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
                Last {confTrend.length} scans, oldest → newest
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>Scan history</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading…</div>
        ) : scans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px dashed rgba(12,242,200,0.12)', borderRadius: '12px', background: 'rgba(12,242,200,0.012)' }}>
            <div style={{ fontSize: '1.8rem', opacity: 0.2, marginBottom: '0.75rem' }}>🔬</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)' }}>No scans yet</div>
            <Link to="/scanner" className="btn btn-outline" style={{ marginTop: '1.2rem', display: 'inline-flex', fontSize: '0.76rem', padding: '0.5rem 1.4rem' }}>Run first scan →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {scans.map((s) => {
              const c    = CLS_COLORS[s.prediction] || '#888'
              const date = new Date(s.date + (s.date.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                timeZone: 'Asia/Kolkata'
              })
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1.1rem', borderRadius: '9px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.045)', fontFamily: 'var(--font-mono)', fontSize: '0.67rem' }}>
                  <div style={{ color: 'var(--text-3)', minWidth: 130 }}>{date}</div>
                  <span style={{ background: c + '18', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${c}44`, textTransform: 'uppercase' }}>
                    {CLS_LABEL[s.prediction] || s.prediction}
                  </span>
                  <div style={{ color: 'var(--text-3)' }}>{Math.round(s.confidence * 100)}% conf.</div>
                  {s.est_volume_cm3 != null && (
                    <div style={{ color: 'var(--text-3)' }}>{s.est_volume_cm3} cm³</div>
                  )}
                  <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.mode || 'Single MRI'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => window.location.reload()} style={{
          background: 'rgba(0,200,180,0.08)',
          border: '1px solid rgba(0,200,180,0.3)',
          borderRadius: '8px', color: 'var(--teal)',
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          padding: '0.5rem 1.2rem', cursor: 'pointer'
        }}>
          ↺ Refresh
        </button>
        <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>Run new scan →</Link>
      </div>
    </div>
  )
}