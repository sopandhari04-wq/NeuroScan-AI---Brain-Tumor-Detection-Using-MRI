import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(11,14,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '0.2rem' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].fill || 'var(--teal)', fontWeight: 600 }}>{payload[0].value}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user_name } = useAuth()
  const [scans, setScans]   = useState([])
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'user' })
  const [addMsg, setAddMsg]   = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: scansData } = await supabase.from('scans').select('*').order('date', { ascending: false })
    const { data: usersData } = await supabase.from('users').select('*').order('created', { ascending: false })
    if (scansData) setScans(scansData)
    if (usersData) setUsers(usersData)
    setLoading(false)
  }

  async function handleAddUser() {
    if (!newUser.username || !newUser.password || !newUser.name) { setAddMsg('Fill all fields.'); return }
    const { error } = await supabase.from('users').insert([{ ...newUser, created: new Date().toISOString().split('T')[0] }])
    if (error) setAddMsg(`Error: ${error.message}`)
    else { setAddMsg(`✅ User "${newUser.name}" added!`); setNewUser({ username: '', password: '', name: '', role: 'user' }); fetchAll() }
  }

  const total       = scans.length
  const tumors      = scans.filter(s => s.prediction !== 'notumor').length
  const normals     = total - tumors
  const totalUsers  = users.length

  const clsCounts = scans.reduce((acc, s) => { acc[s.prediction] = (acc[s.prediction] || 0) + 1; return acc }, {})
  const pieData   = Object.entries(clsCounts).map(([k, v]) => ({ name: CLS_LABEL[k] || k, value: v, color: CLS_COLORS[k] || '#888' }))

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: scans.filter(s => s.date?.startsWith(key)).length }
  })

  const inputStyle = { width: '100%', background: 'rgba(0,200,180,0.04)', border: '1px solid rgba(0,200,180,0.2)', borderRadius: '8px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '0.55rem 0.9rem', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>👑 System Overview · Real-time Analytics</p>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          Admin <span style={{ color: 'var(--teal)' }}>Dashboard</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>Welcome, {user_name}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.85rem', marginBottom: '2rem' }}>
        <StatCard val={totalUsers} label="Total Users"    color="#00C8B4" />
        <StatCard val={total}      label="Total Scans"    color="#7B82F5" />
        <StatCard val={tumors}     label="Tumor Detected" color="#FF5757" />
        <StatCard val={normals}    label="Normal Scans"   color="#0CF2C8" />
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {/* Charts */}
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--teal)', opacity: 0.8, marginBottom: '1rem' }}>All Scans — last 7 days</div>
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
        </div>
      )}

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {/* Add User */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>➕ Add New User</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) auto', gap: '0.6rem', alignItems: 'end' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Username</div>
            <input style={inputStyle} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} placeholder="username" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Password</div>
            <input style={inputStyle} type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="password" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Full Name</div>
            <input style={inputStyle} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Full Name" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Role</div>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={handleAddUser} style={{ background: 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '8px', color: '#000', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, padding: '0.55rem 1.2rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Add User
          </button>
        </div>
        {addMsg && <div style={{ marginTop: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: addMsg.startsWith('✅') ? 'var(--teal)' : '#FF6B6B' }}>{addMsg}</div>}
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {/* All Users */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>All Users</div>
        {users.map(u => {
          const rc = u.role === 'admin' ? '#FFB347' : '#00C8B4'
          const userScans = scans.filter(s => s.username === u.username)
          const lastScan  = userScans[0]
          return (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', minWidth: 140 }}>{u.name}</div>
              <div style={{ color: 'var(--text-3)', minWidth: 120 }}>@{u.username}</div>
              <span style={{ background: `${rc}22`, color: rc, fontSize: '0.58rem', letterSpacing: '0.15em', padding: '0.2rem 0.6rem', borderRadius: '99px', border: `1px solid ${rc}55`, textTransform: 'uppercase' }}>{u.role}</span>
              <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>📋 {userScans.length} scans{lastScan ? ` · Last: ${new Date(lastScan.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : ' · No scans yet'}</div>
            </div>
          )
        })}
      </div>

      <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', margin: '1.5rem 0' }} />

      {/* All Scan Records */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>All Scan Records — Today & Recent</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading…</div>
        ) : scans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>No scan records yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {scans.map((s) => {
              const c    = CLS_COLORS[s.prediction] || '#888'
             const date = new Date(s.date + (s.date.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', { 
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', 
  timeZone: 'Asia/Kolkata' 
})
              const isToday = new Date(s.date).toDateString() === new Date().toDateString()
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1.1rem', borderRadius: '9px', background: isToday ? 'rgba(0,200,180,0.04)' : 'rgba(255,255,255,0.015)', border: isToday ? '1px solid rgba(0,200,180,0.15)' : '1px solid rgba(255,255,255,0.045)', fontFamily: 'var(--font-mono)', fontSize: '0.67rem' }}>
                  <div style={{ color: 'var(--text-3)', minWidth: 130 }}>{date}{isToday && <span style={{ marginLeft: '0.4rem', color: 'var(--teal)', fontSize: '0.55rem' }}>TODAY</span>}</div>
                  <div style={{ color: 'var(--text-2)', minWidth: 140 }}>@{s.username}</div>
                  <span style={{ background: c + '18', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${c}44`, textTransform: 'uppercase' }}>
                    {CLS_LABEL[s.prediction] || s.prediction}
                  </span>
                  <div style={{ color: 'var(--text-3)' }}>{Math.round(s.confidence * 100)}% conf.</div>
                  <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.mode || 'Single MRI'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={fetchAll} style={{ background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.3)', borderRadius: '8px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
          ↺ Refresh
        </button>
        <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>Go to Scanner →</Link>
      </div>
    </div>
  )
}