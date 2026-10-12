import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

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
    <div style={{ background: 'rgba(11,14,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: '0.2rem' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].fill || 'var(--teal)', fontWeight: 600 }}>{payload[0].value}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user_name } = useAuth()
  const [scans, setScans]     = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'patient' })
  const [addMsg, setAddMsg]   = useState('')
  const [tab, setTab]         = useState('overview')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: scansData } = await supabase.from('scans').select('*').order('date', { ascending: false })
    const { data: usersData } = await supabase.from('users').select('*').order('created', { ascending: false })
    if (scansData) setScans(scansData)
    if (usersData) setUsers(usersData)
    setLoading(false)
  }

  async function assignDoctor(patientUsername, doctorUsername) {
    await supabase.from('users').update({ doctor_username: doctorUsername || null }).eq('username', patientUsername)
    fetchAll()
  }

  async function handleAddUser() {
    if (!newUser.username || !newUser.password || !newUser.name) { setAddMsg('Fill all fields.'); return }
    const { error } = await supabase.from('users').insert([{ ...newUser, created: new Date().toISOString().split('T')[0] }])
    if (error) setAddMsg(`Error: ${error.message}`)
    else { setAddMsg(`✅ User "${newUser.name}" added!`); setNewUser({ username: '', password: '', name: '', role: 'patient' }); fetchAll() }
  }

  const total      = scans.length
  const tumors     = scans.filter(s => s.prediction !== 'notumor').length
  const normals    = total - tumors
  const totalUsers = users.length
  const docCount   = users.filter(u => u.role === 'doctor').length
  const patCount   = users.filter(u => u.role === 'patient').length

  const clsCounts = scans.reduce((acc, s) => { acc[s.prediction] = (acc[s.prediction] || 0) + 1; return acc }, {})
  const pieData   = Object.entries(clsCounts).map(([k, v]) => ({ name: CLS_LABEL[k] || k, value: v, color: CLS_COLORS[k] || '#888' }))

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: scans.filter(s => s.date?.startsWith(key)).length }
  })

  const inputStyle = { width: '100%', background: 'rgba(0,200,180,0.04)', border: '1px solid rgba(0,200,180,0.2)', borderRadius: '8px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '0.55rem 0.9rem', outline: 'none', boxSizing: 'border-box' }

  const filteredUsers = users.filter(u => {
    const matchesSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase())
    const matchesRole   = userRoleFilter === 'all' || u.role === userRoleFilter
    return matchesSearch && matchesRole
  })

  const TABS = [
    ['overview', '📊 Overview'],
    ['users',    `👥 Users (${totalUsers})`],
    ['scans',    `📋 Scan Records (${total})`],
  ]

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>👑 System Overview · Real-time Analytics</p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
            Admin <span style={{ color: 'var(--teal)' }}>Dashboard</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>Welcome, {user_name}</p>
        </div>
        <button onClick={fetchAll} style={{ background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.3)', borderRadius: '8px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '0.5rem 1.1rem', cursor: 'pointer' }}>
          ↺ Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
        <StatCard val={totalUsers} label="Total Users"    color="#00C8B4" icon="👥" />
        <StatCard val={docCount}   label="Doctors"        color="#7B82F5" icon="👨‍⚕️" />
        <StatCard val={patCount}   label="Patients"       color="#0CF2C8" icon="🧑" />
        <StatCard val={total}      label="Total Scans"    color="#FFAD3B" icon="🗂️" />
        <StatCard val={tumors}     label="Tumor Detected" color="#FF5757" icon="⚠️" />
        <StatCard val={normals}    label="Normal Scans"   color="#0CF2C8" icon="✅" />
      </div>

      {/* Tab navigator */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,200,180,0.04)', border: '1px solid rgba(0,200,180,0.12)', borderRadius: '12px', padding: '4px', marginBottom: '2rem' }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.08em',
            background: tab === key ? 'rgba(0,200,180,0.15)' : 'transparent',
            color: tab === key ? 'var(--teal)' : 'var(--text-3)', transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div>
          {total > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
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

          {/* Add User */}
          <div className="card" style={{ padding: '1.5rem 1.6rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '1rem' }}>➕ Add New User</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.7rem', alignItems: 'end', marginBottom: '0.6rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Username</div>
                <input style={inputStyle} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} placeholder="username" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Password</div>
                <input style={inputStyle} type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="password" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Full Name</div>
                <input style={inputStyle} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Full Name" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginBottom: '0.3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Role</div>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={handleAddUser} style={{ background: 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '8px', color: '#000', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, padding: '0.6rem 1.2rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Add User
              </button>
            </div>
            {addMsg && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: addMsg.startsWith('✅') ? 'var(--teal)' : '#FF6B6B' }}>{addMsg}</div>}
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === 'users' && (
        <div>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 200 }}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or username…"
            />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['all', 'admin', 'doctor', 'patient'].map(r => (
                <button key={r} onClick={() => setUserRoleFilter(r)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                  background: userRoleFilter === r ? 'rgba(12,242,200,0.15)' : 'rgba(255,255,255,0.03)',
                  border: userRoleFilter === r ? '1px solid rgba(12,242,200,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: userRoleFilter === r ? 'var(--teal)' : 'var(--text-3)',
                }}>{r}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredUsers.map(u => {
              const rc = u.role === 'admin' ? '#FFB347' : u.role === 'doctor' ? '#7B82F5' : '#00C8B4'
              const userScans = scans.filter(s => s.username === u.username)
              const lastScan  = userScans[0]
              return (
                <div key={u.username} className="card" style={{ padding: '1rem 1.3rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                    background: `${rc}15`, border: `1px solid ${rc}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: rc,
                  }}>{u.name?.charAt(0) || '?'}</div>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{u.name}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: '0.6rem' }}>@{u.username}</div>
                  </div>
                  <span style={{ background: `${rc}22`, color: rc, fontSize: '0.56rem', letterSpacing: '0.12em', padding: '0.2rem 0.6rem', borderRadius: '99px', border: `1px solid ${rc}55`, textTransform: 'uppercase' }}>{u.role}</span>
                  <div style={{ color: 'var(--text-3)' }}>
                    📋 {userScans.length} scans
                    {lastScan ? ` · Last: ${new Date(lastScan.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : ' · No scans yet'}
                  </div>
                  {u.role === 'patient' && (
                    <select
                      value={u.doctor_username || ''}
                      onChange={e => assignDoctor(u.username, e.target.value)}
                      style={{ ...inputStyle, width: 'auto', fontSize: '0.62rem', padding: '0.3rem 0.6rem', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      <option value=''>Assign Doctor</option>
                      {users.filter(d => d.role === 'doctor').map(d => (
                        <option key={d.username} value={d.username}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
            {filteredUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>No users match your search.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Scan Records Tab ── */}
      {tab === 'scans' && (
        <div>
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
                    {s.est_volume_cm3 != null && <div style={{ color: 'var(--text-3)' }}>{s.est_volume_cm3} cm³</div>}
                    <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.mode || 'Single MRI'}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2.5rem' }}>
        <Link to="/scanner" className="btn btn-primary" style={{ display: 'inline-flex' }}>Go to Scanner →</Link>
      </div>
    </div>
  )
}