import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(11,14,24,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
      {label && <div style={{ color: 'var(--text-3)', marginBottom: '0.3rem' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color || 'var(--teal)', fontWeight: 600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

function StatCard({ val, label, color, icon, sub }) {
  return (
    <div style={{ background: 'rgba(12,15,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.3rem 1.2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.4rem' }}>{label}</div>
          {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)', marginTop: '0.25rem', opacity: 0.7 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: '1.4rem', opacity: 0.35 }}>{icon}</div>
      </div>
    </div>
  )
}

export default function Statistics() {
  const { username, role } = useAuth()
  const [scans, setScans]   = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]     = useState('personal') // 'personal' | 'global' (admin only)

  useEffect(() => {
    async function fetchScans() {
      setLoading(true)
      let query = supabase.from('scans').select('*').order('date', { ascending: true })
      if (role !== 'admin' || view === 'personal') {
        query = query.eq('username', username)
      }
      const { data } = await query
      if (data) setScans(data)
      setLoading(false)
    }
    fetchScans()
  }, [username, role, view])

  const total    = scans.length
  const tumors   = scans.filter(s => s.prediction !== 'notumor').length
  const normals  = total - tumors
  const avgConf  = total ? Math.round(scans.reduce((a, s) => a + s.confidence, 0) / total * 100) : 0
  const highConf = scans.filter(s => s.confidence > 0.85).length
  const withVol  = scans.filter(s => s.est_volume_cm3 != null && s.prediction !== 'notumor')

  // Class distribution
  const clsCounts = scans.reduce((acc, s) => { acc[s.prediction] = (acc[s.prediction] || 0) + 1; return acc }, {})
  const pieData   = Object.entries(clsCounts).map(([k, v]) => ({ name: CLS_LABEL[k] || k, value: v, color: CLS_COLORS[k] || '#888' }))
  const barData   = Object.entries(clsCounts).map(([k, v]) => ({ name: CLS_LABEL[k] || k, count: v, fill: CLS_COLORS[k] || '#888' }))

  // Last 30 days daily counts
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().split('T')[0]
    return {
      date:    d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      total:   scans.filter(s => s.date?.startsWith(key)).length,
      tumors:  scans.filter(s => s.date?.startsWith(key) && s.prediction !== 'notumor').length,
      normals: scans.filter(s => s.date?.startsWith(key) && s.prediction === 'notumor').length,
    }
  }).filter(d => d.total > 0 || d.date.includes('1'))

  // Confidence distribution buckets
  const confBuckets = [
    { range: '50–60%', count: scans.filter(s => s.confidence >= 0.5 && s.confidence < 0.6).length },
    { range: '60–70%', count: scans.filter(s => s.confidence >= 0.6 && s.confidence < 0.7).length },
    { range: '70–80%', count: scans.filter(s => s.confidence >= 0.7 && s.confidence < 0.8).length },
    { range: '80–90%', count: scans.filter(s => s.confidence >= 0.8 && s.confidence < 0.9).length },
    { range: '90–100%',count: scans.filter(s => s.confidence >= 0.9).length },
  ]

  // Mode breakdown
  const modeCounts = scans.reduce((acc, s) => { const m = s.mode || 'Single MRI'; acc[m] = (acc[m] || 0) + 1; return acc }, {})
  const modeData   = Object.entries(modeCounts).map(([k, v]) => ({ name: k, value: v }))

  // Only show volume trend for same tumor type — mixing glioma/meningioma volumes is not meaningful
  const latestTumorType = withVol.length ? withVol[withVol.length - 1].prediction : null
  const volTrend = withVol
    .filter(s => s.prediction === latestTumorType)
    .slice(-20)
    .map(s => ({
      date:   new Date(s.date + (s.date.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'Asia/Kolkata' }),
      volume: s.est_volume_cm3,
    }))

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Analytics</p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
            Scan <span style={{ color: 'var(--teal)' }}>Statistics</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
            {view === 'global' ? 'System-wide · All users' : `Personal · ${username}`}
          </p>
        </div>
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['personal', 'global'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                background: view === v ? 'rgba(12,242,200,0.15)' : 'rgba(255,255,255,0.03)',
                border: view === v ? '1px solid rgba(12,242,200,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: view === v ? 'var(--teal)' : 'var(--text-3)',
              }}>{v === 'global' ? '🌐 Global' : '👤 Personal'}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading statistics…</div>
      ) : total === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(12,242,200,0.12)', borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-3)' }}>
          No scan data available yet.
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
            <StatCard val={total}         label="Total Scans"    color="#7B82F5" icon="🗂️" />
            <StatCard val={tumors}        label="Tumor Detected" color="#FF5757" icon="⚠️" sub={`${Math.round(tumors/total*100)}% of all scans`} />
            <StatCard val={normals}       label="Normal Scans"   color="#0CF2C8" icon="✅" sub={`${Math.round(normals/total*100)}% of all scans`} />
            <StatCard val={`${avgConf}%`} label="Avg Confidence" color="#FFAD3B" icon="🎯" />
            <StatCard val={highConf}      label=">85% Confidence" color="#0CF2C8" icon="⭐" sub="High certainty predictions" />
            <StatCard val={withVol.length} label="With Volume Data" color="#7B82F5" icon="📐" sub="Tumor scans with radiomics" />
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

          {/* Row 1: Class distribution + confidence dist */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Classification Distribution</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-2)', flex: 1 }}>{d.name}</span>
                      <span style={{ color: d.color, fontWeight: 600 }}>{d.value}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.56rem' }}>{Math.round(d.value/total*100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Confidence Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={confBuckets} barSize={18}>
                  <XAxis dataKey="range" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} name="Scans">
                    {confBuckets.map((_, i) => <Cell key={i} fill={i >= 3 ? '#0CF2C8' : '#7B82F5'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Scan counts per class bar + mode breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Scans per Tumor Class</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]} name="Scans">
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Scan Mode Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {modeData.map((m, i) => {
                  const colors = ['#0CF2C8', '#7B82F5', '#FFAD3B', '#FF5757']
                  const c = colors[i % colors.length]
                  return (
                    <div key={m.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.63rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-2)' }}>{m.name}</span>
                        <span style={{ color: c, fontWeight: 600 }}>{m.value} ({Math.round(m.value/total*100)}%)</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(m.value/total*100)}%`, background: c, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Daily scan trend */}
          {last30.length > 1 && (
            <div className="card" style={{ padding: '1.5rem 1.4rem', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>Daily Scan Volume — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={last30} barSize={14}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 8, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(12,242,200,0.04)' }} />
                  <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem' }} />
                  <Bar dataKey="tumors"  name="Tumor"  fill="#FF5757" radius={[3,3,0,0]} stackId="a" />
                  <Bar dataKey="normals" name="Normal" fill="#0CF2C8" radius={[3,3,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Volume trend */}
          {volTrend.length >= 2 && (
            <div className="card" style={{ padding: '1.5rem 1.4rem', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7B82F5', opacity: 0.85, marginBottom: '1rem' }}>
                {CLS_LABEL[latestTumorType] || 'Tumor'} Volume Over Time (cm³)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={volTrend}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#3D4E60' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="volume" stroke="#7B82F5" strokeWidth={2} dot={{ r: 4, fill: '#7B82F5' }} name="Volume (cm³)" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)', marginTop: '0.5rem', lineHeight: 1.7 }}>
                ⚠ Volume estimated from a single 2D DICOM slice per scan — dips/spikes may reflect different slice positions or scanner settings rather than true tumor growth/shrinkage. True volumetric tracking requires a full multi-slice DICOM series per session.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}