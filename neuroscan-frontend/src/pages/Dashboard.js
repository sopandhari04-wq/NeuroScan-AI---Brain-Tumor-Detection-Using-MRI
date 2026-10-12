import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

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
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '1.35rem 1.4rem', boxShadow: '0 30px 65px rgba(15,23,42,0.08)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 56, height: 4, borderRadius: '0 0 18px 18px', background: color }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{val}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748B', marginTop: '0.45rem' }}>{label}</div>
        </div>
        <div style={{ fontSize: '1.5rem', color: color, opacity: 0.9 }}>{icon}</div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#0F172A', boxShadow: '0 20px 40px rgba(15,23,42,0.08)' }}>
      <div style={{ color: '#64748B', marginBottom: '0.25rem' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].fill || '#0F172A', fontWeight: 700 }}>{payload[0].value}</div>
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

  const confTrend = [...scans].slice(0, 15).reverse().map((s, i) => ({
    idx: i + 1,
    conf: Math.round(s.confidence * 100),
    color: CLS_COLORS[s.prediction] || '#888',
  }))

  const latestScan = scans[0]

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 1.5rem 4rem', background: 'transparent', minHeight: '100vh', color: '#0F172A' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Personal analytics</p>
            <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              My <span style={{ color: 'var(--teal)' }}>Dashboard</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#475569', marginTop: '0.75rem', maxWidth: 640 }}>
              Track tumor findings, scan trends, and actionable insights from your MRI review workflow.
            </p>
          </div>

          {latestScan && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '1rem 1.2rem', boxShadow: '0 24px 50px rgba(15,23,42,0.08)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#475569' }}>
              <div style={{ marginBottom: '0.55rem', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748B' }}>Latest scan</div>
              <div style={{ fontWeight: 700, color: CLS_COLORS[latestScan.prediction] || 'var(--teal)', marginBottom: '0.2rem' }}>{CLS_LABEL[latestScan.prediction] || latestScan.prediction}</div>
              <div>{Math.round(latestScan.confidence * 100)}% confidence</div>
            </div>
          )}
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
          {QUICK_LINKS.map((q) => (
            <Link key={q.to} to={q.to} style={{
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.85rem',
              padding: '1rem 1.1rem', borderRadius: '18px', background: '#FFFFFF',
              border: `1px solid ${q.color}22`, boxShadow: '0 24px 50px rgba(15,23,42,0.08)', transition: 'transform 0.2s',
              color: '#0F172A'
            }}>
              <span style={{ fontSize: '1.3rem' }}>{q.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.88rem' }}>{q.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#64748B' }}>{q.desc}</div>
              </div>
            </Link>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard val={total}         label="Total scans"     color="#7B82F5" icon="🗂️" />
          <StatCard val={tumors}        label="Tumor detected"  color="#FF5757" icon="⚠️" />
          <StatCard val={normals}       label="Normal scans"    color="#0CF2C8" icon="✅" />
          <StatCard val={`${avgConf}%`} label="Avg confidence"  color="#FFAD3B" icon="🎯" />
        </section>

        {total > 0 && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem 1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '1rem' }}>Scans — last 7 days</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={last7} barSize={18}>
                  <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)' }} />
                  <Bar dataKey="count" fill="rgba(37,99,235,0.65)" radius={[6,6,0,0]} name="Scans" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.5rem 1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '1rem' }}>Classification breakdown</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ResponsiveContainer width="55%" height={170}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'grid', gap: '0.65rem', flex: 1 }}>
                  {pieData.map((d) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span>{d.name}</span>
                      </div>
                      <div style={{ color: d.color, fontWeight: 700 }}>{d.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {confTrend.length > 1 && (
              <div className="card" style={{ padding: '1.5rem 1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '1rem' }}>Confidence trend</div>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={confTrend}>
                    <XAxis dataKey="idx" tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0F172A' }} />
                    <Line type="monotone" dataKey="conf" stroke="#0CF2C8" strokeWidth={3} dot={{ r: 4, fill: '#0CF2C8' }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#64748B', marginTop: '0.65rem' }}>
                  Last {confTrend.length} scans — oldest to newest
                </div>
              </div>
            )}
          </section>
        )}

        <section style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#64748B', marginBottom: '1rem' }}>Scan history</div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#64748B', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18 }}>
              Loading latest scan history…
            </div>
          ) : scans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '18px', background: '#FFFFFF', border: '1px dashed #D1E8FF' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.9rem' }}>🔬</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.18em', color: '#64748B', marginBottom: '1rem' }}>No scans yet</div>
              <Link to="/scanner" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.8rem 1.4rem' }}>Run first scan →</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {scans.map((s) => {
                const c = CLS_COLORS[s.prediction] || '#888'
                const date = new Date(s.date + (s.date.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                })
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', padding: '1rem 1rem', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 20px 45px rgba(15,23,42,0.06)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#475569' }}>
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                      <div style={{ color: '#64748B' }}>{date}</div>
                      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span style={{ color: c, fontWeight: 700 }}>{CLS_LABEL[s.prediction] || s.prediction}</span>
                        <span>{Math.round(s.confidence * 100)}% confidence</span>
                        {s.est_volume_cm3 != null && <span>{s.est_volume_cm3} cm³</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#64748B', fontSize: '0.78rem' }}>{s.mode || 'Single MRI'}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => window.location.reload()} style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A',
            fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '0.85rem 1.3rem', cursor: 'pointer'
          }}>
            ↺ Refresh data
          </button>
          <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>Run new scan →</Link>
        </div>
      </div>
    </div>
  )
}
