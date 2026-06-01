import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const CLS_COLORS = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }
const CLS_LABEL  = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }

export default function AnnotationsViewer() {
  const { username, role } = useAuth()
  const [annotations, setAnnotations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('all')
  const [selected, setSelected]       = useState(null)

  useEffect(() => {
    async function fetchAnnotations() {
      setLoading(true)
      let query = supabase
        .from('annotations')
        .select('*')
        .order('created_at', { ascending: false })

      if (role !== 'admin') {
        query = query.eq('doctor_username', username)
      }

      const { data } = await query
      if (data) setAnnotations(data)
      setLoading(false)
    }
    fetchAnnotations()
  }, [username, role])

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  })

  const filtered = filter === 'all' ? annotations : annotations.filter(a => a.prediction === filter)

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,173,59,0.08)', border: '1px solid rgba(255,173,59,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FFAD3B', marginBottom: '0.75rem' }}>
          ✏️ Annotations
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          Saved <span style={{ color: 'var(--teal)' }}>Annotations</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
          {role === 'admin' ? 'All annotations — system wide' : `${username} · ${annotations.length} annotations`}
        </p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'glioma', 'meningioma', 'notumor', 'pituitary'].map(f => {
          const c = f === 'all' ? 'var(--teal)' : CLS_COLORS[f]
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? `${c}18` : 'transparent', border: `1px solid ${filter === f ? c : 'rgba(255,255,255,0.08)'}`, borderRadius: '99px', color: filter === f ? c : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.3rem 0.75rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {f === 'all' ? 'All' : CLS_LABEL[f]}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>Loading annotations…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,173,59,0.15)', borderRadius: '12px' }}>
          <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '0.75rem' }}>✏️</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: 'var(--text-3)' }}>No annotations yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
          {filtered.map(a => {
            const c = CLS_COLORS[a.prediction] || '#888'
            return (
              <div
                key={a.id}
                onClick={() => setSelected(a)}
                style={{ border: `1px solid ${c}22`, borderRadius: '12px', background: `${c}04`, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}
              >
                {/* Annotation image */}
                <div style={{ position: 'relative', background: '#000' }}>
                  <img
                    src={a.annotation_data}
                    alt="Annotation"
                    style={{ width: '100%', height: 180, objectFit: 'cover', opacity: 0.9 }}
                  />
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span style={{ background: c + '22', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.55rem', border: `1px solid ${c}44`, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      {CLS_LABEL[a.prediction] || a.prediction}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)' }}>{formatDate(a.created_at)}</div>
                    {role === 'admin' && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)' }}>@{a.doctor_username}</div>
                    )}
                  </div>
                  {a.notes && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-2)', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                      💬 {a.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — full view */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(11,14,24,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', maxWidth: 700, width: '100%', overflow: 'hidden' }}
          >
            <img src={selected.annotation_data} alt="Annotation" style={{ width: '100%' }} />
            <div style={{ padding: '1.2rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ background: `${CLS_COLORS[selected.prediction] || '#888'}22`, color: CLS_COLORS[selected.prediction] || '#888', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.6rem', border: `1px solid ${CLS_COLORS[selected.prediction] || '#888'}44`, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  {CLS_LABEL[selected.prediction] || selected.prediction}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)' }}>{formatDate(selected.created_at)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)' }}>@{selected.doctor_username}</span>
              </div>
              {selected.notes && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-2)', lineHeight: 1.7, padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  💬 {selected.notes}
                </div>
              )}
              <button onClick={() => setSelected(null)} style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}