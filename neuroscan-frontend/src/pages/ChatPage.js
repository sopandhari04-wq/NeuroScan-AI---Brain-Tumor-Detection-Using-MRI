import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const API = 'https://neuroscan-ai-brain-tumor-detection-using.onrender.com'

const CLS_LABEL = {
  glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary'
}
const CLS_COLORS = {
  glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5'
}

const SUGGESTED_QUESTIONS = [
  'What does my latest scan result mean?',
  'How serious is my current finding?',
  'What are the next steps I should take?',
  'What does the Grad-CAM heatmap indicate?',
  'How has my condition changed over time?',
  'What is the difference between ET, TC and WT regions?',
  'What does sphericity mean for my tumor?',
  'Should I be concerned about my confidence score?',
]

export default function ChatPage() {
  const { username, user_name, role } = useAuth()
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [latestScan, setLatestScan]   = useState(null)
  const [loadingScans, setLoadingScans] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function fetchLatestScan() {
      if (!username) return
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('username', username)
        .order('date', { ascending: false })
        .limit(1)
      if (data && data.length > 0) setLatestScan(data[0])
      setLoadingScans(false)
    }
    fetchLatestScan()
  }, [username])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Welcome message on load
  useEffect(() => {
    if (!loadingScans) {
      const welcomeText = latestScan
        ? `Hello ${user_name?.split(' ')[0] || 'there'}! I'm your NeuroScan AI assistant. I can see your latest scan shows **${CLS_LABEL[latestScan.prediction] || latestScan.prediction}** with ${Math.round(latestScan.confidence * 100)}% confidence. Feel free to ask me anything about your scan results, what they mean, or what steps to take next.`
        : `Hello ${user_name?.split(' ')[0] || 'there'}! I'm your NeuroScan AI assistant. I don't see any scan history yet. Run a scan first, then come back to ask questions about your results.`
      setMessages([{ role: 'ai', text: welcomeText, isWelcome: true }])
    }
  }, [loadingScans, latestScan, user_name])

  async function sendMessage(text) {
    const userText = text || input.trim()
    if (!userText) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setLoading(true)

    try {
      const scanContext = latestScan ? {
        prediction:   latestScan.prediction,
        display_name: CLS_LABEL[latestScan.prediction] || latestScan.prediction,
        confidence:   latestScan.confidence,
        mode:         latestScan.mode,
        date:         latestScan.date,
        region:       '',
        pattern:      '',
        activation_intensity: 0,
        focus_area_pct: 0,
        et_pct: 0, tc_pct: 0, wt_pct: 0,
        est_volume_cm3: 0, sphericity: 0, shape_desc: '',
      } : {}

      const res  = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, scan_context: scanContext })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', text: data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Failed to get response. Please check your connection and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([{ role: 'ai', text: 'Chat cleared. How can I help you?', isWelcome: true }])
  }

  const accentColor = latestScan ? (CLS_COLORS[latestScan.prediction] || 'var(--teal)') : 'var(--teal)'

  return (
    <div style={{ paddingTop: 'var(--nav-h)', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '1rem 2rem', background: 'rgba(6,8,16,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--text-1)' }}>
                NeuroScan <span style={{ color: 'var(--teal)' }}>AI Assistant</span>
              </span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal)', animation: 'blink 2s ease-in-out infinite' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.1em' }}>
              {user_name} · {latestScan ? `Latest: ${CLS_LABEL[latestScan.prediction]} · ${Math.round(latestScan.confidence * 100)}% conf` : 'No scans yet'}
            </div>
          </div>

          {/* Latest scan badge */}
          {latestScan && (
            <div style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}33`, borderRadius: '10px', padding: '0.5rem 0.9rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>Latest Scan</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: accentColor }}>{CLS_LABEL[latestScan.prediction]}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: accentColor }}>{Math.round(latestScan.confidence * 100)}%</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={clearChat} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
              Clear
            </button>
            <Link to="/scanner" style={{ background: 'rgba(12,242,200,0.08)', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '8px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.4rem 0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Scanner →
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.75rem', alignItems: 'flex-end' }}>
              {m.role === 'ai' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(12,242,200,0.1)', border: '1px solid rgba(12,242,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>🤖</div>
              )}
              <div style={{ maxWidth: '75%', padding: '0.9rem 1.1rem', borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px', background: m.role === 'user' ? 'rgba(12,242,200,0.1)' : 'rgba(255,255,255,0.04)', border: m.role === 'user' ? '1px solid rgba(12,242,200,0.25)' : '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: m.role === 'user' ? 'var(--teal)' : 'var(--text-2)', lineHeight: 1.8 }}>
                {m.text}
              </div>
              {m.role === 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(12,242,200,0.1)', border: '1px solid rgba(12,242,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                  {user_name?.[0]?.toUpperCase() || '👤'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(12,242,200,0.1)', border: '1px solid rgba(12,242,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🤖</div>
              <div style={{ padding: '0.9rem 1.1rem', borderRadius: '16px 16px 16px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <span style={{ animation: 'blink 1s ease-in-out infinite' }}>●</span>
                <span style={{ animation: 'blink 1s ease-in-out 0.2s infinite' }}>●</span>
                <span style={{ animation: 'blink 1s ease-in-out 0.4s infinite' }}>●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && !loading && (
        <div style={{ padding: '0 2rem 1rem', flexShrink: 0 }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.6rem' }}>Suggested questions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{ background: 'rgba(12,242,200,0.05)', border: '1px solid rgba(12,242,200,0.15)', borderRadius: '99px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '0.3rem 0.75rem', cursor: 'pointer', letterSpacing: '0.05em' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '1rem 2rem', background: 'rgba(6,8,16,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: '0.75rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about your scan results…"
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '10px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '0.7rem 1rem', outline: 'none' }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ background: loading || !input.trim() ? 'rgba(12,242,200,0.1)' : 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '10px', color: loading || !input.trim() ? 'var(--text-3)' : '#000', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, padding: '0.7rem 1.5rem', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            {loading ? '…' : 'Send →'}
          </button>
        </div>
        <div style={{ maxWidth: 800, margin: '0.5rem auto 0', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', textAlign: 'center' }}>
          ⚠ AI responses are for informational purposes only. Always consult a qualified medical professional.
        </div>
      </div>
    </div>
  )
}