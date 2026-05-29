import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const API = 'https://neuroscan-ai-brain-tumor-detection-using.onrender.com'

const CLASS_COLORS = {
  glioma: '#FF6B6B', meningioma: '#FFB347', notumor: '#00C8B4', pituitary: '#7B8CDE'
}
const CLS_LABEL = {
  glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary'
}

function ScanSlot({ index, file, preview, result, loading, onFile }) {
  const accent = result ? (CLASS_COLORS[result.prediction] || '#888') : 'var(--teal)'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
        Scan {index}
      </div>

      {/* Upload */}
      <label style={{  border: `1px dashed ${preview ? accent : 'rgba(0,200,180,0.25)'}`, borderRadius: '12px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,200,180,0.02)', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input type="file" accept=".jpg,.jpeg,.png" onChange={onFile} style={{ display: 'none' }} />
        {preview
          ? <img src={preview} alt={`Scan ${index}`} style={{ maxHeight: 200, borderRadius: 8, maxWidth: '100%' }} />
          : <div>
              <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '0.6rem' }}>🔬</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Upload MRI scan {index}</div>
            </div>
        }
      </label>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(12,242,200,0.15)', borderTopColor: 'var(--teal)', animation: 'spin 0.8s linear infinite' }} />
          Analysing…
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{ border: `1px solid ${accent}33`, borderRadius: '14px', background: `${accent}06`, padding: '1.2rem 1.4rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />

          {result.prediction === 'invalid' ? (
            <div style={{ textAlign: 'center', color: '#FF4B4B', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
              🚫 Invalid image — please upload a brain MRI scan
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: accent, marginBottom: '0.4rem' }}>
                {CLS_LABEL[result.prediction] || result.prediction}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(result.confidence * 100)}%`, background: `linear-gradient(90deg,${accent}88,${accent})`, borderRadius: 99 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: accent }}>{Math.round(result.confidence * 100)}%</span>
              </div>

              {/* Probabilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.8rem' }}>
                {Object.entries(result.probabilities).map(([cls, prob]) => {
                  const c = CLASS_COLORS[cls]
                  const isActive = cls === result.prediction
                  return (
                    <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      <span style={{ color: isActive ? c : 'var(--text-3)', flex: 1 }}>{CLS_LABEL[cls]}</span>
                      <span style={{ color: isActive ? c : 'var(--text-3)', fontWeight: isActive ? 700 : 400 }}>{Math.round(prob * 100)}%</span>
                    </div>
                  )
                })}
              </div>

              {/* Grad-CAM */}
              {result.overlay_image && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.4rem' }}>Grad-CAM Overlay</div>
                  <img src={`data:image/png;base64,${result.overlay_image}`} alt="Grad-CAM" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)' }} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function ScanComparison() {
  const { user, username: authUsername } = useAuth()
  const username = user?.email || authUsername || ''

  const [file1, setFile1]       = useState(null)
  const [file2, setFile2]       = useState(null)
  const [preview1, setPreview1] = useState(null)
  const [preview2, setPreview2] = useState(null)
  const [result1, setResult1]   = useState(null)
  const [result2, setResult2]   = useState(null)
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [error, setError]       = useState(null)
  const [compared, setCompared] = useState(false)

  function handleFile1(e) {
    const f = e.target.files[0]; if (!f) return
    setFile1(f); setPreview1(URL.createObjectURL(f)); setResult1(null); setCompared(false)
  }
  function handleFile2(e) {
    const f = e.target.files[0]; if (!f) return
    setFile2(f); setPreview2(URL.createObjectURL(f)); setResult2(null); setCompared(false)
  }

  async function runPredict(file, setLoading, setResult) {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const fd = new FormData()
      fd.append('file', file)
      fd.append('username', username)
      fd.append('gradcam', 'true')
      const res  = await fetch(`${API}/api/predict`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: fd })
      const data = await res.json()
      setResult({ ...data, mode: 'Single MRI' })
    } catch {
      setError('Failed to connect to AI backend.')
    } finally {
      setLoading(false)
    }
  }

  async function runComparison() {
    if (!file1 || !file2) return
    setError(null); setResult1(null); setResult2(null); setCompared(false)
    await Promise.all([
      runPredict(file1, setLoading1, setResult1),
      runPredict(file2, setLoading2, setResult2),
    ])
    setCompared(true)
  }

  // Comparison summary
  const showSummary = compared && result1 && result2 && result1.prediction !== 'invalid' && result2.prediction !== 'invalid'
  const sameResult  = result1?.prediction === result2?.prediction
  const conf1       = result1 ? Math.round(result1.confidence * 100) : 0
  const conf2       = result2 ? Math.round(result2.confidence * 100) : 0
  const confDiff    = Math.abs(conf1 - conf2)

  return (
    <div style={{ padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(123,130,245,0.08)', border: '1px solid rgba(123,130,245,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7B82F5', marginBottom: '0.75rem' }}>
          🔍 Scan Comparison
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          Compare <span style={{ color: 'var(--teal)' }}>MRI Scans</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
          Upload two MRI scans to compare AI predictions side by side
        </p>
      </div>

      {/* Scan slots */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <ScanSlot index={1} file={file1} preview={preview1} result={result1} loading={loading1} onFile={handleFile1} />

        {/* Divider */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', paddingTop: '2rem' }}>
          <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', padding: '0.3rem 0.6rem' }}>VS</div>
          <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <ScanSlot index={2} file={file2} preview={preview2} result={result2} loading={loading2} onFile={handleFile2} />
      </div>

      {/* Error */}
      {error && <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#FF4B4B', marginBottom: '1rem' }}>⚠ {error}</div>}

      {/* Compare button */}
      <button
        onClick={runComparison}
        disabled={!file1 || !file2 || loading1 || loading2}
        style={{ width: '100%', padding: '0.85rem', background: !file1 || !file2 || loading1 || loading2 ? 'rgba(0,200,180,0.1)' : 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '10px', cursor: !file1 || !file2 || loading1 || loading2 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: !file1 || !file2 || loading1 || loading2 ? 'var(--text-3)' : '#000', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2rem' }}>
        {loading1 || loading2 ? 'Analysing both scans…' : '🔍 Run Comparison'}
      </button>

      {/* Comparison Summary */}
      {showSummary && (
        <div style={{ border: '1px solid rgba(123,130,245,0.3)', borderRadius: '14px', background: 'rgba(123,130,245,0.05)', padding: '1.5rem 1.8rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#7B82F5,transparent)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1.2rem' }}>
            📊 <span style={{ color: '#7B82F5' }}>Comparison Summary</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {/* Diagnosis match */}
            <div style={{ background: sameResult ? 'rgba(255,107,107,0.08)' : 'rgba(12,242,200,0.08)', border: `1px solid ${sameResult ? 'rgba(255,107,107,0.2)' : 'rgba(12,242,200,0.2)'}`, borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{sameResult ? '⚠️' : '✅'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: sameResult ? '#FF6B6B' : 'var(--teal)', marginBottom: '0.25rem' }}>
                {sameResult ? 'Same Diagnosis' : 'Different Diagnosis'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }}>
                {sameResult ? 'Both scans show the same condition' : 'Scans show different conditions'}
              </div>
            </div>

            {/* Confidence comparison */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>📈</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>
                {confDiff}% Difference
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }}>
                Scan 1: {conf1}% · Scan 2: {conf2}%
              </div>
            </div>

            {/* Higher confidence */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🏆</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--teal)', marginBottom: '0.25rem' }}>
                Scan {conf1 >= conf2 ? 1 : 2} Higher Confidence
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }}>
                {Math.max(conf1, conf2)}% vs {Math.min(conf1, conf2)}%
              </div>
            </div>
          </div>

          {/* Side by side predictions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            {[result1, result2].map((r, i) => {
              const c = CLASS_COLORS[r.prediction] || '#888'
              return (
                <div key={i} style={{ background: `${c}08`, border: `1px solid ${c}22`, borderRadius: '10px', padding: '0.8rem 1rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Scan {i + 1}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: c }}>{CLS_LABEL[r.prediction]}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{Math.round(r.confidence * 100)}% confidence</div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)' }}>
            ⚠ AI comparison for research purposes only. Not a clinical diagnosis. Consult a qualified medical professional.
          </div>
        </div>
      )}
    </div>
  )
}