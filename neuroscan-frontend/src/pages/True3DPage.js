import { useState } from 'react'
import { useAuth } from '../App'
import True3DViewer from './True3DViewer'
import demoVolumeData from '../data/brats_3d_volume.json'

const API = process.env.REACT_APP_API_URL || 'https://neuroscan-ai-brain-tumor-detection-using.onrender.com'

const CLASS_DISPLAY = { glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary' }
const CLASS_COLORS  = { glioma: '#FF5757', meningioma: '#FFAD3B', notumor: '#0CF2C8', pituitary: '#7B82F5' }

export default function True3DPage() {
  const { username } = useAuth()

  const [mode, setMode]       = useState('demo') // 'demo' | 'upload' | 'result'
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [result, setResult]   = useState(null)

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('username', username || 'anonymous')
      const res = await fetch(`${API}/api/predict/volume3d`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to reconstruct volume')
      }
      const data = await res.json()
      setResult(data)
      setMode('result')
    } catch (err) {
      setError(err.message || 'Failed to build 3D volume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const accent = result ? (CLASS_COLORS[result.prediction] || '#FF5757') : '#FF5757'

  return (
    <div style={{ paddingTop: 'calc(var(--nav-h) + 2.5rem)', padding: 'calc(var(--nav-h) + 2.5rem) 2rem 4rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '99px', padding: '0.2rem 0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF5757', marginBottom: '0.75rem' }}>
          🧠 True 3D · Volumetric Segmentation
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', letterSpacing: '-0.03em' }}>
          3D Brain <span style={{ color: '#FF5757' }}>Volume Reconstruction</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.6rem', lineHeight: 1.7, maxWidth: 680 }}>
          Unlike the single-slice 2D Grad-CAM analysis in the standard Scanner, this page builds an actual
          rotatable 3D reconstruction — either from a validated research-grade model on real BraTS data,
          or live from your own multi-slice DICOM upload.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,87,87,0.04)', border: '1px solid rgba(255,87,87,0.12)', borderRadius: '12px', padding: '4px', marginBottom: '2rem' }}>
        {[['demo', '🔬 Validated Example'], ['upload', '🧊 Upload Your Own']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key === 'upload' && result ? 'result' : key)}
            style={{
              flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: (mode === key || (key === 'upload' && mode === 'result')) ? 'linear-gradient(135deg,#FF5757,#CC2222)' : 'transparent',
              color: (mode === key || (key === 'upload' && mode === 'result')) ? '#fff' : 'var(--text-3)',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Demo mode ── */}
      {mode === 'demo' && (
        <>
          <True3DViewer volumeData={demoVolumeData} />
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem 1.4rem', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.6rem' }}>
              About This Example
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
              This reconstruction uses a pretrained MONAI SegResNet model run against a real, properly
              co-registered 4-modality BraTS case (T1, T1ce, T2, FLAIR) — validated against expert
              ground-truth annotation with real Dice coefficients (ET 0.85, TC 0.94, WT 0.72). It represents
              what full volumetric segmentation looks like when complete multi-modal imaging is available.
            </p>
          </div>
        </>
      )}

      {/* ── Upload mode ── */}
      {mode === 'upload' && (
        <div>
          <label style={{ display: 'block', border: '1px dashed rgba(255,87,87,0.25)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,87,87,0.02)', marginBottom: '1rem' }}>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setError(null) } }}
              style={{ display: 'none' }}
            />
            {file ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🧊</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: '#FF5757' }}>{file.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>Ready to reconstruct</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '0.8rem' }}>🧊</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                  Click to upload ZIP of DICOM slices
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '0.5rem', opacity: 0.7 }}>
                  Minimum 3 slices · .dcm files inside a .zip · up to 60 slices used
                </div>
              </>
            )}
          </label>

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
              cursor: !file || loading ? 'not-allowed' : 'pointer',
              background: !file || loading ? 'rgba(255,87,87,0.1)' : 'linear-gradient(135deg,#FF5757,#CC2222)',
              fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              color: !file || loading ? 'var(--text-3)' : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            {loading ? 'Reconstructing 3D Volume…' : '🧊 Build 3D Reconstruction'}
          </button>

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '10px', color: '#FF5757', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem 1.4rem', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.6rem' }}>
              How This Differs From The Validated Example
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
              Your uploaded scan runs through NeuroScan's existing 2D classifier and Grad-CAM pipeline on every
              individual slice, then stacks the per-slice attention maps into a 3D volume — not a true
              volumetric model. This means it's fully live and works with whatever single-sequence DICOM
              series you have, but with lower spatial fidelity than the MONAI example, which requires
              4 co-registered MRI sequences (T1/T1ce/T2/FLAIR) of the same patient.
            </p>
          </div>
        </div>
      )}

      {/* ── Result mode (after upload + analysis) ── */}
      {mode === 'result' && result && (
        <div>
          {/* Top result summary */}
          <div style={{ border: `1px solid ${accent}33`, borderRadius: '14px', padding: '1.4rem', marginBottom: '1.5rem', background: `${accent}08` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
              Volumetric Classification Result
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: accent }}>
                {result.display_name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                {result.tumor_slices} / {result.total_slices} slices flagged ({Math.round(result.tumor_slices / result.total_slices * 100)}%)
              </div>
            </div>

            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.6rem' }}>
              <div style={{ height: '100%', width: `${Math.round(result.tumor_slices / result.total_slices * 100)}%`, background: accent, borderRadius: 99 }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.7 }}>
              The overall prediction is determined by majority vote across all analyzed slices. Individual slices may
              classify differently near the tumor boundary — this is expected and reflects real anatomical variation
              through the scan, not model instability.
            </div>
          </div>

          {/* 3D Viewer */}
          <True3DViewer volumeData={result.volume_data} />

          {/* Voxel breakdown explanation */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.2rem 1.4rem', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.8rem' }}>
              What You're Looking At
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
              {[
                ['ET', 'Enhancing Tumor', 'The most active, contrast-enhancing region — typically the highest-grade, fastest-growing tissue.', '#FF5757', result.volume_data.volumes_voxels.et],
                ['TC', 'Tumor Core', 'The combined enhancing tumor plus necrotic/dense tissue — the structural mass of the lesion.', '#FFAD3B', result.volume_data.volumes_voxels.tc],
                ['WT', 'Whole Tumor', 'The full extent including surrounding edema — used for surgical planning margins.', '#FFE566', result.volume_data.volumes_voxels.wt],
              ].map(([key, label, desc, color, voxels]) => (
                <div key={key} style={{ padding: '0.8rem', background: `${color}0A`, border: `1px solid ${color}33`, borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color, fontWeight: 700 }}>{key} — {label}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.6, marginBottom: '0.4rem' }}>{desc}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{voxels.toLocaleString()} voxels</div>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology disclaimer */}
          <div style={{ border: '1px solid rgba(255,173,59,0.2)', borderRadius: '12px', padding: '1rem 1.2rem', background: 'rgba(255,173,59,0.04)', marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#FFAD3B', lineHeight: 1.7 }}>
              ⚠ <b>Methodology:</b> {result.volume_data.model}. This reconstruction is built from your existing
              2D classification model applied slice-by-slice, not a dedicated 3D segmentation network — useful for
              spatial visualization, but should not be treated as having the same accuracy as the validated example.
            </div>
          </div>

          <button
            onClick={() => { setMode('upload'); setResult(null); setFile(null) }}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', padding: '0.6rem 1.4rem', cursor: 'pointer' }}
          >
            ← Upload a different scan
          </button>
        </div>
      )}
    </div>
  )
}