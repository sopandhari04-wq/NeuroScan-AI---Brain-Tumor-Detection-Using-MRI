import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(11,14,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
      {label && <div style={{ color: 'var(--text-3)', marginBottom: '0.3rem' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill || 'var(--teal)', fontWeight: 600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

function StatCard({ val, label, color, sub }) {
  return (
    <div style={{ background: 'rgba(12,15,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.3rem 1rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '2.2rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.35rem' }}>{label}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color, marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  )
}

export default function Statistics() {
  const { username, role } = useAuth()
  const isAdmin = role === 'admin'

  const [scans, setScans]     = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange]     = useState(30) // days

  useEffect(() => {
    async function fetchScans() {
      setLoading(true)
      let query = supabase.from('scans').select('*').order('date', { ascending: true })
      if (!isAdmin) query = query.eq('username', username)
      const { data } = await query
      if (data) setScans(data)
      setLoading(false)
    }
    if (username || isAdmin) fetchScans()
  }, [username, isAdmin])

  // Filter by range
  const cutoff    = new Date(); cutoff.setDate(cutoff.getDate() - range)
  const filtered  = scans.filter(s => new Date(s.date) >= cutoff)

  const total     = filtered.length
  const tumors    = filtered.filter(s => s.prediction !== 'notumor').length
  const normals   = total - tumors
  const avgConf   = total ? Math.round(filtered.reduce((a, s) => a + s.confidence, 0) / total * 100) : 0
  const tumorRate = total ? Math.round(tumors / total * 100) : 0

  // Classification breakdown
  const clsCounts = filtered.reduce((acc, s) => { acc[s.prediction] = (acc[s.prediction] || 0) + 1; return acc }, {})
  const pieData   = Object.entries(clsCounts).map(([k, v]) => ({ name: CLS_LABEL[k] || k, value: v, color: CLS_COLORS[k] || '#888' }))

  // Scans over time
  const daysMap = {}
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    daysMap[key] = { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), total: 0, tumor: 0, normal: 0 }
  }
  filtered.forEach(s => {
    const key = s.date?.split('T')[0]
    if (daysMap[key]) {
      daysMap[key].total++
      if (s.prediction !== 'notumor') daysMap[key].tumor++
      else daysMap[key].normal++
    }
  })
  const timeData = Object.values(daysMap)

  // Confidence trend (weekly avg)
  const weekMap = {}
  filtered.forEach(s => {
    const d    = new Date(s.date)
    const week = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString('en', { month: 'short' })}`
    if (!weekMap[week]) weekMap[week] = { week, total: 0, sumConf: 0 }
    weekMap[week].total++
    weekMap[week].sumConf += s.confidence
  })
  const confTrend = Object.values(weekMap).map(w => ({ week: w.week, avgConf: Math.round(w.sumConf / w.total * 100) }))

  // Mode breakdown
  const modeData = filtered.reduce((acc, s) => {
    const m = s.mode || 'Single MRI'
    acc[m] = (acc[m] || 0) + 1
    return acc
  }, {})
  const modeChartData = Object.entries(modeData).map(([k, v]) => ({ name: k, value: v }))

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-block', background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.75rem' }}>
            📊 {isAdmin ? 'System Statistics' : 'My Statistics'}
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
            Scan <span style={{ color: 'var(--teal)' }}>Analytics</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
            {isAdmin ? 'All users · System-wide data' : `${username} · Personal analytics`}
          </p>
        </div>

        {/* Range selector */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: `1px solid ${range === d ? 'rgba(12,242,200,0.4)' : 'rgba(255,255,255,0.08)'}`, background: range === d ? 'rgba(12,242,200,0.1)' : 'transparent', color: range === d ? 'var(--teal)' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading statistics…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
            <StatCard val={total}       label="Total Scans"    color="#7B82F5" />
            <StatCard val={tumors}      label="Tumor Detected" color="#FF5757" />
            <StatCard val={normals}     label="Normal Scans"   color="#0CF2C8" />
            <StatCard val={`${avgConf}%`}  label="Avg Confidence" color="#FFAD3B" />
            <StatCard val={`${tumorRate}%`} label="Tumor Rate"    color="#FF5757" sub={tumors > 0 ? '⚠ Monitor' : '✓ Low'} />
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

          {total === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>
              No scan data for the selected time range.
            </div>
          ) : (
            <>
              {/* Scans over time */}
              <div className="card" style={{ padding: '1.5rem 1.4rem', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>
                  Scans Over Time — Last {range} days
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timeData} barSize={range > 30 ? 4 : 12}>
                    <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} interval={range > 14 ? Math.floor(range / 7) : 0} />
                    <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                    <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }} />
                    <Bar dataKey="tumor"  fill="#FF5757" radius={[3,3,0,0]} name="Tumor" stackId="a" />
                    <Bar dataKey="normal" fill="rgba(12,242,200,0.6)" radius={[3,3,0,0]} name="Normal" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                {/* Classification pie */}
                <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Classification Breakdown</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ResponsiveContainer width="55%" height={160}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      {pieData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-2)', flex: 1 }}>{d.name}</span>
                          <span style={{ color: d.color, fontWeight: 500 }}>{d.value}</span>
                          <span style={{ color: 'var(--text-3)' }}>({Math.round(d.value / total * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confidence trend */}
                <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Avg Confidence Trend</div>
                  {confTrend.length > 1 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={confTrend}>
                        <XAxis dataKey="week" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={30} />
                        <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="avgConf" stroke="var(--teal)" strokeWidth={2} dot={{ fill: 'var(--teal)', r: 3 }} name="Avg Conf %" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)' }}>
                      Need more data for trend
                    </div>
                  )}
                </div>
              </div>

              {/* Scan mode breakdown */}
              <div className="card" style={{ padding: '1.5rem 1.4rem', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Scan Mode Breakdown</div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {modeChartData.map((m, i) => {
                    const colors = ['#7B82F5', '#00C8B4', '#FFB347']
                    const c = colors[i % colors.length]
                    const pct = Math.round(m.value / total * 100)
                    return (
                      <div key={m.name} style={{ flex: 1, background: `${c}08`, border: `1px solid ${c}22`, borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: c }}>{m.value}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{m.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: c, marginTop: '0.2rem' }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Admin only — per user stats */}
              {isAdmin && (
                <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Per User Scan Count</div>
                  {(() => {
                    const userCounts = filtered.reduce((acc, s) => {
                      acc[s.username] = (acc[s.username] || 0) + 1
                      return acc
                    }, {})
                    const userData = Object.entries(userCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([u, c]) => ({ user: u.split('@')[0], count: c }))
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={userData} barSize={20} layout="vertical">
                          <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="user" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                          <Bar dataKey="count" fill="rgba(12,242,200,0.6)" radius={[0,4,4,0]} name="Scans" />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}