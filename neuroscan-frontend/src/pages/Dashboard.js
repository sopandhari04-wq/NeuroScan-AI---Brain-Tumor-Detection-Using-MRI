import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

function StatCard({ val, label, color }) {
  return (
    <div style={{
      background: 'rgba(12,15,26,0.85)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px', padding: '1.3rem 1rem',
      textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`
      }} />
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: '2.2rem',
        fontWeight: 700, color: color, lineHeight: 1
      }}>{val}</div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.54rem',
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--text-3)', marginTop: '0.35rem'
      }}>{label}</div>
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(11,14,24,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px', padding: '0.6rem 0.9rem',
      fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text)'
    }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '0.2rem' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].fill || 'var(--teal)', fontWeight: 600 }}>{payload[0].value}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScans() {
    const username = user.email?.split('@')[0]
const { data, error } = await supabase
  .from('scans')
  .select('*')
  .eq('username', username)
  .order('date', { ascending: false })  
      if (!error && data) setScans(data)
      setLoading(false)
    }
    fetchScans()
  }, [user.id])

  const total   = scans.length
  const tumors  = scans.filter(s => s.prediction !== 'notumor').length
  const normals = total - tumors
  const avgConf = total
    ? Math.round(scans.reduce((a, s) => a + s.confidence, 0) / total * 100)
    : 0

  // Pie chart data
  const clsCounts = scans.reduce((acc, s) => {
    acc[s.prediction] = (acc[s.prediction] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(clsCounts).map(([k, v]) => ({
    name: CLS_LABEL[k] || k, value: v, color: CLS_COLORS[k] || '#888'
  }))

  // Bar chart — last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      count: scans.filter(s => s.date?.startsWith(key)).length
    }
  })

  return (
    <div style={{
      padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem',
      maxWidth: 900, margin: '0 auto'
    }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Personal Analytics</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', letterSpacing: '-0.03em' }}>
          My <span style={{ color: 'var(--teal)' }}>Dashboard</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
          color: 'var(--text-3)', marginTop: '0.3rem'
        }}>
          {user.email}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.85rem', marginBottom: '2rem'
      }}>
        <StatCard val={total}       label="Total Scans"     color="#7B82F5" />
        <StatCard val={tumors}      label="Tumor Detected"  color="#FF5757" />
        <StatCard val={normals}     label="Normal Scans"    color="#0CF2C8" />
        <StatCard val={`${avgConf}%`} label="Avg Confidence" color="#FFAD3B" />
      </div>

      <div style={{
        height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)',
        margin: '1.5rem 0'
      }} />

      {/* Charts */}
      {total > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1rem', marginBottom: '2rem'
        }}>
          {/* Bar chart */}
          <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem'
            }}>
              Scans — last 7 days
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last7} barSize={16}>
                <XAxis dataKey="date"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }}
                  axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false}
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3D4E60' }}
                  axisLine={false} tickLine={false} width={20} />
                <Tooltip content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                <Bar dataKey="count" fill="rgba(12,242,200,0.6)"
                  radius={[4, 4, 0, 0]} name="Scans" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem'
            }}>
              Classification breakdown
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ResponsiveContainer width="60%" height={150}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontFamily: 'var(--font-mono)', fontSize: '0.64rem'
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: d.color, flexShrink: 0
                    }} />
                    <span style={{ color: 'var(--text-2)', flex: 1 }}>{d.name}</span>
                    <span style={{ color: d.color, fontWeight: 500 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan history */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: '0.85rem'
        }}>
          Scan history
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center', padding: '3rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)'
          }}>Loading…</div>

        ) : scans.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 1.5rem',
            border: '1px dashed rgba(12,242,200,0.12)',
            borderRadius: '12px', background: 'rgba(12,242,200,0.012)'
          }}>
            <div style={{ fontSize: '1.8rem', opacity: 0.2, marginBottom: '0.75rem' }}>🔬</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.64rem',
              letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)'
            }}>No scans yet</div>
            <Link to="/scanner" className="btn btn-outline" style={{
              marginTop: '1.2rem', display: 'inline-flex',
              fontSize: '0.76rem', padding: '0.5rem 1.4rem'
            }}>
              Run first scan →
            </Link>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {scans.map((s) => {
              const c = CLS_COLORS[s.prediction] || '#888'
              const date = new Date(s.date).toLocaleString('en', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.7rem 1.1rem', borderRadius: '9px',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.045)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.67rem',
                }}>
                  <div style={{ color: 'var(--text-3)', minWidth: 130 }}>{date}</div>
                  <span style={{
                    background: c + '18', color: c,
                    padding: '0.14rem 0.55rem', borderRadius: '99px',
                    fontSize: '0.57rem', border: `1px solid ${c}44`,
                    textTransform: 'uppercase'
                  }}>
                    {CLS_LABEL[s.prediction] || s.prediction}
                  </span>
                  <div style={{ color: 'var(--text-3)' }}>
                    {Math.round(s.confidence * 100)}% conf.
                  </div>
                  <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>
                    {s.mode || 'Single MRI'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>
        Run new scan →
      </Link>
    </div>
  )
}