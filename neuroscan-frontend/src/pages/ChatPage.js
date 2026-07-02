import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const API = 'https://neuroscan-ai-brain-tumor-detection-using.onrender.com'

const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }
const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }

const SUGGESTED_QUESTIONS = [
  'What does my latest scan result mean?',
  'How serious is my current finding?',
  'What are the next steps I should take?',
  'What does the Grad-CAM heatmap indicate?',
  'How has my condition changed over time?',
  'What is WHO Grade and how does it apply to me?',
  'What is the difference between ET, TC, and WT regions?',
  'Should I be concerned about my confidence score?',
]

export default function ChatPage() {
  const { username, user_name } = useAuth()
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [scanCtx, setScanCtx]     = useState(null)
  const [ctxLoading, setCtxLoading] = useState(true)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    async function loadContext() {
      if (!username) return
      setCtxLoading(true)
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('username', username)
        .order('date', { ascending: false })
        .limit(1)
      if (data?.[0]) {
        setScanCtx(data[0])
        const s = data[0]
        const c = CLS_COLORS[s.prediction] || 'var(--teal)'
        setMessages([{
          role: 'assistant',
          content: `Hello${user_name ? `, ${user_name}` : ''}! I'm your NeuroScan AI assistant. I can see your latest scan result: **${CLS_LABEL[s.prediction] || s.prediction}** with ${Math.round(s.confidence * 100)}% confidence. I'm here to help you understand your results, explain the AI's findings, and answer any questions about your brain MRI analysis. What would you like to know?`,
          color: c,
        }])
      } else {
        setMessages([{
          role: 'assistant',
          content: `Hello${user_name ? `, ${user_name}` : ''}! I'm your NeuroScan AI assistant. I don't see any scan results yet — head to the Scanner to run your first MRI analysis, then come back here to ask questions about your results.`,
          color: 'var(--teal)',
        }])
      }
      setCtxLoading(false)
    }
    loadContext()
  }, [username, user_name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, username }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Sorry, I could not generate a response.', color: 'var(--teal)' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error — please try again.', color: '#FF5757' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function clearChat() {
    if (scanCtx) {
      const c = CLS_COLORS[scanCtx.prediction] || 'var(--teal)'
      setMessages([{
        role: 'assistant',
        content: `Chat cleared. I'm ready for your next question about your **${CLS_LABEL[scanCtx.prediction]}** scan result.`,
        color: c,
      }])
    } else {
      setMessages([])
    }
  }

  function formatContent(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
  }

  const accent = scanCtx ? (CLS_COLORS[scanCtx.prediction] || 'var(--teal)') : 'var(--teal)'

  return (
    <div style={{ paddingTop: 'var(--nav-h)', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header bar */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.85rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        background: 'rgba(10,13,24,0.95)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '1.3rem' }}>🤖</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-1)' }}>
              AI Scan <span style={{ color: 'var(--teal)' }}>Assistant</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)' }}>
              Powered by Groq llama-3.3-70b · Scan context injected
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {scanCtx && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em',
              padding: '0.3rem 0.75rem', borderRadius: '99px',
              background: `${accent}15`, border: `1px solid ${accent}33`, color: accent,
            }}>
              📋 Latest: {CLS_LABEL[scanCtx.prediction]} · {Math.round(scanCtx.confidence * 100)}%
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={clearChat} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.35rem 0.8rem', cursor: 'pointer' }}>
              Clear
            </button>
            <Link to="/scanner" style={{ background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.25)', borderRadius: '7px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.35rem 0.8rem', textDecoration: 'none' }}>
              Scanner →
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', maxWidth: 860, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {ctxLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>
            Loading your scan context…
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === 'user'
            const initial = user_name?.charAt(0)?.toUpperCase() || 'U'
            return (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                {!isUser && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,242,200,0.12)', border: '1px solid rgba(12,242,200,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0, marginTop: '0.2rem' }}>
                    🤖
                  </div>
                )}
                <div style={{
                  maxWidth: '72%', padding: '0.85rem 1.1rem', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isUser ? 'rgba(12,242,200,0.1)' : 'rgba(255,255,255,0.03)',
                  border: isUser ? '1px solid rgba(12,242,200,0.2)' : '1px solid rgba(255,255,255,0.07)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-1)', lineHeight: 1.75,
                }} dangerouslySetInnerHTML={{ __html: formatContent(m.content) }} />
                {isUser && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,242,200,0.1)', border: '1px solid rgba(12,242,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--teal)', flexShrink: 0, marginTop: '0.2rem' }}>
                    {initial}
                  </div>
                )}
              </div>
            )
          })
        )}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,242,200,0.12)', border: '1px solid rgba(12,242,200,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🤖</div>
            <div style={{ padding: '0.85rem 1.1rem', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', opacity: 0.6, animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && !loading && (
        <div style={{ padding: '0 2rem 1rem', maxWidth: 860, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.6rem' }}>
            Suggested questions
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {SUGGESTED_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '99px', color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.35rem 0.75rem',
                cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
              }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem',
        background: 'rgba(10,13,24,0.95)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask about your scan results… (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem', padding: '0.75rem 1rem', outline: 'none', resize: 'none',
              lineHeight: 1.6, boxSizing: 'border-box',
            }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              background: !input.trim() || loading ? 'rgba(0,200,180,0.1)' : 'linear-gradient(135deg,#00C8B4,#0097A7)',
              border: 'none', borderRadius: '10px', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              padding: '0.75rem 1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700,
              color: !input.trim() || loading ? 'var(--text-3)' : '#000',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {loading ? '…' : 'Send →'}
          </button>
        </div>
        <div style={{ maxWidth: 860, margin: '0.5rem auto 0', fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)', textAlign: 'center' }}>
          AI responses are for educational purposes only · Not medical advice · Always consult your doctor
        </div>
      </div>
    </div>
  )
}