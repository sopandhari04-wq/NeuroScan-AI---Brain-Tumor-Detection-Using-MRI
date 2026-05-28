import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import About from './pages/About'
import Features from './pages/Features'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Scanner from './pages/Scanner'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(12,242,200,0.15)', borderTopColor: 'var(--teal)', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', letterSpacing: '0.2em' }}>LOADING</span>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, role } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole]       = useState('user')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchRole(u.email)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchRole(u.email)
      else { setRole('user'); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(email) {
    try {
      // Try matching by full email first
      let { data } = await supabase.from('users').select('role, name').eq('username', email).single()
      if (!data) {
        // Fallback: match by email prefix
        const prefix = email.split('@')[0];
        ({ data } = await supabase.from('users').select('role, name').eq('username', prefix).single())
      }
      if (data) {
        setRole(data.role || 'user')
        setUserName(data.name || email)
      } else {
        setRole('user')
        setUserName(email)
      }
    } catch {
      setRole('user')
      setUserName(email)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      role,
      username:  user?.email || 'anonymous',
      user_name: userName || user?.email || 'User',
    }}>
      <Navbar />
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/about"    element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {/* Redirect admin to /admin, user to /dashboard */}
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/scanner"  element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}