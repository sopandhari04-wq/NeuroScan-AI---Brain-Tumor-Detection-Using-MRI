import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import About from './pages/About'
import Features from './pages/Features'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientDashboard from './pages/PatientDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Scanner from './pages/Scanner'
import True3DPage from './pages/True3DPage'
import ScanComparison from './pages/ScanComparison'
import Statistics from './pages/Statistics'
import PatientTimeline from './pages/PatientTimeline'
import ChatPage from './pages/ChatPage'
import MyPatients from './pages/MyPatients'
import AnnotationsViewer from './pages/AnnotationsViewer'

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

function DoctorRoute({ children }) {
  const { user, loading, role } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'doctor' && role !== 'admin') return <Navigate to="/patient" replace />
  return children
}

function PatientRoute({ children }) {
  const { user, loading, role } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'doctor') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [role, setRole]         = useState('patient')
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
      else { setRole('patient'); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(email) {
    try {
      const { data } = await supabase
        .from('users')
        .select('role, name')
        .eq('username', email)
        .single()
      if (data) {
        setRole(data.role || 'patient')
        setUserName(data.name || email)
      } else {
        setRole('patient')
        setUserName(email)
      }
    } catch {
      setRole('patient')
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
      username:  user?.email || '',
      user_name: userName || user?.email || 'User',
    }}>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/about"     element={<About />} />
        <Route path="/features"  element={<Features />} />
        <Route path="/login"     element={<Login />} />

        {/* Doctor dashboard — full stats + charts */}
        <Route path="/dashboard" element={<DoctorRoute><Dashboard /></DoctorRoute>} />

        {/* Patient dashboard — scan history only */}
        <Route path="/patient"   element={<PatientRoute><PatientDashboard /></PatientRoute>} />

        {/* Admin dashboard */}
        <Route path="/admin"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* Scanner — all roles */}
        <Route path="/scanner"   element={<ProtectedRoute><Scanner /></ProtectedRoute>} />

        <Route path="/true-3d" element={<ProtectedRoute><True3DPage /></ProtectedRoute>} />

        {/* Scan Comparison — all roles */}
        <Route path="/compare"   element={<ProtectedRoute><ScanComparison /></ProtectedRoute>} />

        {/* Statistics — all roles (admin sees all, others see own) */}
        <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />

        {/* Patient Timeline — longitudinal tracking */}
        <Route path="/timeline" element={<ProtectedRoute><PatientTimeline /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/my-patients" element={<DoctorRoute><MyPatients /></DoctorRoute>} />
        <Route path="/annotations" element={<ProtectedRoute><AnnotationsViewer /></ProtectedRoute>} />

        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}
