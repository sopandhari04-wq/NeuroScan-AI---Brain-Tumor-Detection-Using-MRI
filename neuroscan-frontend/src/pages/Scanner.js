import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'
import { supabase } from '../lib/supabase'


const API = 'https://neuroscan-ai-brain-tumor-detection-using.onrender.com'

const CLASS_COLORS = {
  glioma:     '#FF6B6B',
  meningioma: '#FFB347',
  notumor:    '#00C8B4',
  pituitary:  '#7B8CDE',
}

const CLS_LABEL = {
  glioma: 'Glioma', meningioma: 'Meningioma', notumor: 'No Tumor', pituitary: 'Pituitary'
}

const GRADCAM_EXPLANATIONS = {
  glioma: {
    red: "Red/yellow zones mark the primary tumor core — the AI detected abnormal glial cell proliferation here. These hyper-intense regions indicate active tumor mass with disrupted blood-brain barrier, consistent with glioma infiltration.",
    blue: "Blue/green zones represent relatively preserved brain parenchyma. However, gliomas are infiltrative — microscopic tumor cells may extend beyond the visible heatmap boundary into these regions.",
    pattern: (a) => `The ${a.pattern.toLowerCase()} attention pattern covering ${a.focus_area_pct}% of the scan suggests ${a.focus_area_pct > 30 ? 'possible high-grade glioma with significant mass effect and edema' : 'a more localized lesion, potentially lower-grade'}.`,
    region: (a) => `${a.region} localization is consistent with supratentorial glioma distribution. Gliomas most commonly arise in the cerebral hemispheres — the frontal and temporal lobes being most frequent.`,
  },
  meningioma: {
    red: "Red/yellow zones highlight the extra-axial mass arising from the meningeal lining. The AI detected the characteristic homogeneous enhancement pattern and well-defined margins typical of meningioma.",
    blue: "Blue/green zones show normal brain parenchyma being displaced (not invaded) by the meningioma. This extra-axial pattern — pushing brain tissue rather than infiltrating it — is a hallmark of benign meningioma.",
    pattern: (a) => `The ${a.pattern.toLowerCase()} heatmap with ${a.activation_intensity}% peak activation suggests a ${a.focus_area_pct < 20 ? 'well-circumscribed, likely WHO Grade I meningioma' : 'larger meningioma with possible dural tail involvement'}.`,
    region: (a) => `${a.region} meningioma location. Meningiomas arise from the arachnoid cap cells and are typically found along the falx cerebri, convexity, sphenoid wing, and posterior fossa.`,
  },
  pituitary: {
    red: "Red/yellow zones identify the sellar/suprasellar mass. The AI detected signal abnormality in the pituitary region, consistent with adenoma expansion beyond the normal pituitary gland boundaries.",
    blue: "Blue/green zones show surrounding structures. Critical anatomy near the pituitary includes the optic chiasm (superiorly), cavernous sinuses (laterally), and sphenoid sinus (inferiorly).",
    pattern: (a) => `The ${a.pattern.toLowerCase()} activation pattern indicates a ${a.focus_area_pct < 15 ? 'microadenoma (<10mm) — confined to the sella turcica' : 'macroadenoma (≥10mm) — extending beyond the sella, possibly compressing the optic chiasm'}.`,
    region: (a) => `Central ${a.region} localization is consistent with pituitary adenoma. Suprasellar extension may cause visual field defects (bitemporal hemianopia) by compressing the optic chiasm.`,
  },
  notumor: {
    red: "Red/yellow zones show areas of AI attention, but no focal pathological signal was identified. These mild activations likely reflect normal anatomical landmarks or image artifacts.",
    blue: "Blue/green zones represent the majority of the scan, indicating preserved normal brain tissue with no significant focal abnormality detected by the model.",
    pattern: (a) => `The ${a.pattern.toLowerCase()} attention pattern with low activation intensity (${a.activation_intensity}%) is consistent with a normal scan — no focal mass lesion, hemorrhage, or abnormal enhancement pattern identified.`,
    region: (a) => `Distributed low-level attention across the ${a.region} region is a normal finding. The AI did not identify any localized area of concern requiring clinical follow-up based on this scan alone.`,
  },
}

const inputStyle = {
  width: '100%',
  background: 'rgba(0,200,180,0.04)',
  border: '1px solid rgba(0,200,180,0.2)',
  borderRadius: '8px',
  color: 'var(--text-1)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.78rem',
  padding: '0.55rem 0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  color: 'var(--text-3)',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  marginBottom: '0.3rem',
  display: 'block',
}

async function fetchRecentScans(username, setRecentScans) {
  if (!username) return
  const { data } = await supabase
    .from('scans')
    .select('*')
    .eq('username', username)
    .order('date', { ascending: false })
    .limit(5)
  if (data) setRecentScans(data)
}

export default function Scanner() {
  const { user, username: authUsername } = useAuth()
  const username = authUsername || user?.email || ''
  const user_name = user?.user_metadata?.full_name || user?.email || 'User'

  // Patient info
  const [patient, setPatient] = useState({ name: '', age: '', gender: 'Not specified' })

  const [activeTab, setActiveTab]           = useState('single')
  const [loading, setLoading]               = useState(false)
  const [result, setResult]                 = useState(null)
  const [error, setError]                   = useState(null)
  const [singleFile, setSingleFile]         = useState(null)
  const [singlePreview, setSinglePreview]   = useState(null)
  const [fusionFiles, setFusionFiles]       = useState({ t1: null, t1ce: null, t2: null, flair: null })
  const [fusionPreviews, setFusionPreviews] = useState({ t1: null, t1ce: null, t2: null, flair: null })
  const [pdfLoading, setPdfLoading]         = useState(false)
  const [recentScans, setRecentScans]       = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const [dicomFile, setDicomFile] = useState(false)
  const [showPreprocessing, setShowPreprocessing] = useState(false)
  const [showAnnotation, setShowAnnotation]   = useState(false)
  const [annotationTool, setAnnotationTool]   = useState('brush')
  const [annotationColor, setAnnotationColor] = useState('#FF5757')
  const [brushSize, setBrushSize]             = useState(8)
  const [annotationNotes, setAnnotationNotes] = useState('')
  const [annotationSaved, setAnnotationSaved] = useState(false)
  const [annotationSaving, setAnnotationSaving] = useState(false)
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)

  useEffect(() => {
    fetchRecentScans(username, setRecentScans)
  }, [username])

  function handleSingleFile(e) {
  const file = e.target.files[0]
  if (!file) return
  setSingleFile(file)
  setResult(null); setError(null)
  if (file.name.toLowerCase().endsWith('.dcm')) {
    setSinglePreview(null)
    setDicomFile(true)
  } else {
    setSinglePreview(URL.createObjectURL(file))
    setDicomFile(false)
  }
}

  function handleFusionFile(key, e) {
    const file = e.target.files[0]
    if (!file) return
    setFusionFiles(prev => ({ ...prev, [key]: file }))
    setFusionPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }))
    setResult(null); setError(null)
  }

  function handlePatient(e) {
    setPatient(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function runSinglePredict() {
    if (!singleFile) return
    setLoading(true); setError(null); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const fd = new FormData()
      fd.append('file', singleFile)
      fd.append('username', username)
      fd.append('gradcam', 'true')
      const res  = await fetch(`${API}/api/predict`, { method: 'POST',  headers: token ? { 'Authorization': `Bearer ${token}` } : {},body: fd })
      const data = await res.json()
      setResult({ ...data, mode: 'Single MRI' })
      console.log('DICOM INFO:', data.dicom_info)
      console.log('PREPROCESSING:', data.preprocessing)
      fetchRecentScans(username, setRecentScans)
    } catch {
      setError('Failed to connect to AI backend. Please try again.')
    } finally { setLoading(false) }
  }

  async function runFusionPredict() {
    const { t1, t1ce, t2, flair } = fusionFiles
    if (!t1 || !t1ce || !t2 || !flair) return
    setLoading(true); setError(null); setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const fd = new FormData()
      fd.append('t1', t1); fd.append('t1ce', t1ce)
      fd.append('t2', t2); fd.append('flair', flair)
      fd.append('username', username)
      fd.append('gradcam', 'true')
      const res  = await fetch(`${API}/api/predict/fusion`, { method: 'POST',  headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: fd })
      const data = await res.json()
      setResult({ ...data, mode: 'Multi-Modal Fusion' })
      fetchRecentScans(username, setRecentScans)
    } catch {
      setError('Failed to connect to AI backend. Please try again.')
    } finally { setLoading(false) }
  }
  
  async function sendChat() {
  if (!chatInput.trim() || !result) return
  const userMsg = chatInput.trim()
  setChatInput('')
  setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
  setChatLoading(true)
  try {
    const scanContext = {
      prediction:          result.prediction,
      display_name:        result.display_name,
      confidence:          result.confidence,
      mode:                result.mode,
      region:              result.gradcam?.region || '',
      pattern:             result.gradcam?.pattern || '',
      activation_intensity: result.gradcam?.activation_intensity || 0,
      focus_area_pct:      result.gradcam?.focus_area_pct || 0,
      et_pct:              result.gradcam?.subregions?.ET?.pct || 0,
      tc_pct:              result.gradcam?.subregions?.TC?.pct || 0,
      wt_pct:              result.gradcam?.subregions?.WT?.pct || 0,
      est_volume_cm3:      result.gradcam?.radiomics?.est_volume_cm3 || 0,
      sphericity:          result.gradcam?.radiomics?.sphericity || 0,
      shape_desc:          result.gradcam?.radiomics?.shape_desc || '',
    }
    const res  = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userMsg, scan_context: scanContext })
    })
    const data = await res.json()
    setChatMessages(prev => [...prev, { role: 'ai', text: data.answer }])
  } catch {
    setChatMessages(prev => [...prev, { role: 'ai', text: 'Failed to get response. Please try again.' }])
  } finally {
    setChatLoading(false)
  }
}

function startDrawing(e) {
  isDrawing.current = true
  const canvas = canvasRef.current
  const rect   = canvas.getBoundingClientRect()
  const ctx    = canvas.getContext('2d')
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e) {
  if (!isDrawing.current) return
  const canvas = canvasRef.current
  const rect   = canvas.getBoundingClientRect()
  const ctx    = canvas.getContext('2d')
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  ctx.lineWidth   = brushSize
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  if (annotationTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = annotationColor
    ctx.globalAlpha = 0.7
  }

  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function stopDrawing() {
  isDrawing.current = false
  const canvas = canvasRef.current
  const ctx    = canvas.getContext('2d')
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function clearCanvas() {
  const canvas = canvasRef.current
  const ctx    = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  setAnnotationSaved(false)
}

async function saveAnnotation() {
  if (!canvasRef.current || !result) return
  setAnnotationSaving(true)
  try {
    // Merge Grad-CAM + annotation canvas into one image
    const mergedCanvas = document.createElement('canvas')
    mergedCanvas.width  = 512
    mergedCanvas.height = 512
    const ctx = mergedCanvas.getContext('2d')

    // Draw Grad-CAM image first
    const gradcamImg = new window.Image()
    gradcamImg.src = `data:image/png;base64,${result.overlay_image}`
    await new Promise(resolve => { gradcamImg.onload = resolve })
    ctx.drawImage(gradcamImg, 0, 0, 512, 512)

    // Draw annotation canvas on top
    ctx.drawImage(canvasRef.current, 0, 0, 512, 512)

    const mergedData = mergedCanvas.toDataURL('image/png')

    const { error } = await supabase.from('annotations').insert({
      scan_username:   username,
      doctor_username: username,
      prediction:      result.prediction,
      annotation_data: mergedData,
      notes:           annotationNotes,
      created_at:      new Date().toISOString(),
    })
    if (error) {
      console.error('Supabase error:', error)
      alert('Save failed: ' + error.message)
    } else {
      setAnnotationSaved(true)
    }
  } catch (err) {
    console.error('Annotation save error:', err)
  } finally {
    setAnnotationSaving(false)
  }
}


  async function downloadPDF() {
    setPdfLoading(true)
    try {
      const fd = new FormData()
      const fileToSend = activeTab === 'single' ? singleFile : fusionFiles.t1
      fd.append('file',           fileToSend)
      fd.append('username',       username)
      fd.append('name',           user_name)
      fd.append('mode',           result.mode)
      fd.append('patient_name',   patient.name   || 'Not provided')
      fd.append('patient_age',    patient.age    || 'Not provided')
      fd.append('patient_gender', patient.gender || 'Not specified')
      const res  = await fetch(`${API}/api/report`, { method: 'POST', body: fd })
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `NeuroScan_${result.mode.replace(' ','_')}_Report.pdf`
      a.click(); URL.revokeObjectURL(url)
    } catch { setError('Failed to generate PDF.') }
    finally { setPdfLoading(false) }
  }

  const accent     = result ? CLASS_COLORS[result.prediction] : 'var(--teal)'
  const gradcamExp = result ? GRADCAM_EXPLANATIONS[result.prediction] : null

  const cardStyle = (mb = '1.5rem') => ({
    border: `1px solid ${accent}22`, borderRadius: '14px',
    background: `${accent}06`, padding: '1.5rem 1.8rem',
    position: 'relative', overflow: 'hidden', marginBottom: mb,
  })
  const topLine  = { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)` }
  const secTitle = (text, emoji) => (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1rem' }}>
      {emoji} <span style={{ color: accent }}>{text}</span>
    </div>
  )

  return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 2rem', background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: error ? '#FF4B4B' : loading ? '#FFAD3B' : 'var(--teal)', animation: loading ? 'blink 1.5s ease-in-out infinite' : 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            {error ? 'Error' : loading ? 'Analysing…' : 'AI Engine Ready'}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '0.25rem 0.75rem', borderRadius: '6px' }}>
          FastAPI · NeuroScan Backend
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '2rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.35em', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Deep Learning · MRI Analysis · Grad-CAM XAI</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 800, color: 'var(--text-1)' }}>
            Neuro<span style={{ color: 'var(--teal)' }}>Scan</span> AI
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>Upload an MRI scan to detect brain tumors instantly</div>
        </div>

        {/* Patient Info */}
        <div style={{ border: '1px solid rgba(0,200,180,0.2)', borderRadius: '14px', background: 'rgba(0,200,180,0.03)', padding: '1.5rem 1.8rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--teal),transparent)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1rem' }}>
            🧑‍⚕️ <span style={{ color: 'var(--teal)' }}>Patient Information</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginLeft: '0.75rem', fontWeight: 400 }}>Optional — appears in PDF report</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Patient Name</label>
              <input style={inputStyle} name="name" value={patient.name} onChange={handlePatient} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label style={labelStyle}>Age</label>
              <input style={inputStyle} name="age" type="number" value={patient.age} onChange={handlePatient} placeholder="e.g. 45" min="1" max="120" />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} name="gender" value={patient.gender} onChange={handlePatient}>
                <option>Not specified</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          {patient.name && (
            <div style={{ marginTop: '0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--teal)' }}>
              ✓ Patient: {patient.name} · Age: {patient.age || 'N/A'} · Gender: {patient.gender}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,200,180,0.04)', border: '1px solid rgba(0,200,180,0.12)', borderRadius: '12px', padding: '4px', marginBottom: '2rem' }}>
          {[['single', '🧠 Single MRI'], ['fusion', '🧬 Multi-Modal Fusion']].map(([key, label]) => (
            <button key={key} onClick={() => { setActiveTab(key); setResult(null); setError(null) }} style={{
              flex: 1, padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              background: activeTab === key ? 'rgba(0,200,180,0.15)' : 'transparent',
              color: activeTab === key ? 'var(--teal)' : 'var(--text-3)', transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        {/* Single MRI Tab */}
        {activeTab === 'single' && (
          <div>
            <label style={{ display: 'block', border: '1px dashed rgba(0,200,180,0.25)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,200,180,0.02)', marginBottom: '1rem' }}>
              <input type="file" accept=".dcm" onChange={handleSingleFile} style={{ display: 'none' }} />
             {singlePreview
  ? <img src={singlePreview} alt="MRI" style={{ maxHeight: 300, borderRadius: 8, maxWidth: '100%' }} />
  : dicomFile
  ? <><div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🏥</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)' }}>DICOM file loaded — ready to analyse</div></>
  : <><div style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '0.8rem' }}>🔬</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Click to upload DICOM (.dcm)</div></>
}
            </label>
            <button onClick={runSinglePredict} disabled={!singleFile || loading} style={{ width: '100%', padding: '0.75rem', background: !singleFile || loading ? 'rgba(0,200,180,0.1)' : 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '10px', cursor: !singleFile || loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: !singleFile || loading ? 'var(--text-3)' : '#000', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {loading ? 'Analysing…' : '🧠 Analyse MRI'}
            </button>
          </div>
        )}

        {/* Fusion Tab */}
        {activeTab === 'fusion' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {[['t1','T1 — Native anatomy'],['t1ce','T1ce — Contrast Enhanced'],['t2','T2 — Fluid / Edema'],['flair','FLAIR — Whole Tumor']].map(([key, label]) => (
                <label key={key} style={{ display: 'block', border: '1px dashed rgba(0,200,180,0.25)', borderRadius: '10px', padding: '1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,200,180,0.02)' }}>
                  <input type="file" accept=".dcm" onChange={(e) => handleFusionFile(key, e)} style={{ display: 'none' }} />
                  {fusionPreviews[key]
                    ? <><img src={fusionPreviews[key]} alt={key} style={{ maxHeight: 120, borderRadius: 6, maxWidth: '100%', marginBottom: '0.4rem' }} /><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div></>
                    : <><div style={{ fontSize: '1.5rem', opacity: 0.3, marginBottom: '0.4rem' }}>🧬</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div></>
                  }
                </label>
              ))}
            </div>
            <button onClick={runFusionPredict} disabled={!Object.values(fusionFiles).every(Boolean) || loading} style={{ width: '100%', padding: '0.75rem', background: !Object.values(fusionFiles).every(Boolean) || loading ? 'rgba(0,200,180,0.1)' : 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '10px', cursor: !Object.values(fusionFiles).every(Boolean) || loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: !Object.values(fusionFiles).every(Boolean) || loading ? 'var(--text-3)' : '#000', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {loading ? 'Analysing…' : '🧬 Run Fusion Analysis'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#FF4B4B' }}>⚠ {error}</div>}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(12,242,200,0.15)', borderTopColor: 'var(--teal)', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Running AI analysis…</div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !loading && (
          <div style={{ marginTop: '2rem' }}>

            {result.prediction === 'invalid' ? (
              <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#FF4B4B', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🚫</div>
                <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Invalid Image</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{result.error}</div>
              </div>
            ) : (
              <>
               
                    {result.dicom_info && (
  <div style={{ padding: '0.8rem 1.2rem', borderRadius: '10px', background: 'rgba(123,130,245,0.05)', border: '1px solid rgba(123,130,245,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
    <div style={{ color: '#7B82F5', fontWeight: 600, marginBottom: '0.5rem' }}>🏥 DICOM Metadata — Anonymized</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
      {[
        ['Modality',        result.dicom_info.modality],
        ['Study Date',      result.dicom_info.study_date],
        ['Manufacturer',    result.dicom_info.manufacturer],
        ['Study Desc',      result.dicom_info.study_desc],
        ['Slice Thickness', result.dicom_info.slice_thickness],
        ['Patient',         'ANONYMIZED ✓'],
      ].map(([label, value]) => (
        <div key={label}>
          <span style={{ color: 'var(--text-3)' }}>{label}: </span>
          <span style={{ color: 'var(--text-1)' }}>{value}</span>
        </div>
      ))}
    </div>
  </div>
)}

 {patient.name && (
                  <div style={{ padding: '0.8rem 1.2rem', borderRadius: '10px', background: 'rgba(0,200,180,0.05)', border: '1px solid rgba(0,200,180,0.15)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-2)', marginBottom: '1rem', display: 'flex', gap: '2rem' }}>
                    <span>🧑‍⚕️ <strong style={{ color: 'var(--teal)' }}>{patient.name}</strong></span>
                    {patient.age && <span>Age: <strong style={{ color: 'var(--text-1)' }}>{patient.age}</strong></span>}
                    <span>Gender: <strong style={{ color: 'var(--text-1)' }}>{patient.gender}</strong></span>
                  </div>
                )}

                {/* Result card */}
            <div style={{ border: `1px solid ${accent}33`, borderRadius: '16px', background: `${accent}08`, padding: '1.8rem 2rem', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, marginBottom: '0.5rem' }}>Classification Result · {result.mode}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: accent, marginBottom: '1rem' }}>{result.display_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', minWidth: 80 }}>Confidence</span>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${accent}88,${accent})`, width: `${Math.round(result.confidence * 100)}%`, transition: 'width 1.2s' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: accent }}>{Math.round(result.confidence * 100)}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem' }}>
                {Object.entries(result.probabilities).map(([cls, prob]) => {
                  const isActive = cls === result.prediction
                  const c = CLASS_COLORS[cls]
                  return (
                    <div key={cls} style={{ background: isActive ? `${c}12` : 'rgba(255,255,255,0.03)', border: isActive ? `1px solid ${c}55` : '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.8rem 0.5rem', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive ? c : 'var(--text-3)', marginBottom: '0.3rem' }}>
                        {cls === 'notumor' ? 'No Tumor' : cls.charAt(0).toUpperCase() + cls.slice(1)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: isActive ? c : 'var(--text-1)' }}>{Math.round(prob * 100)}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Preprocessing Pipeline */}
            {result.preprocessing && (
  <div style={{ marginBottom: '1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
        🔬 Pre-processing Pipeline
      </div>
      <button
        onClick={() => setShowPreprocessing(!showPreprocessing)}
        style={{ background: showPreprocessing ? 'rgba(12,242,200,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showPreprocessing ? 'rgba(12,242,200,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', color: showPreprocessing ? 'var(--teal)' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.3rem 0.8rem', cursor: 'pointer' }}
      >
        {showPreprocessing ? 'Hide Pipeline' : 'Show Pipeline'}
      </button>
    </div>

    {showPreprocessing && (
      <div style={{ border: '1px solid rgba(12,242,200,0.15)', borderRadius: '12px', background: 'rgba(12,242,200,0.02)', padding: '1.2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '1rem', letterSpacing: '0.1em' }}>
          Raw DICOM → Normalized → Skull Stripped → CLAHE Enhanced
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
          {[
            { key: 'raw',            label: '1. Raw DICOM',      color: '#888' },
            { key: 'normalized',     label: '2. Normalized',     color: '#7B82F5' },
            { key: 'skull_stripped', label: '3. Skull Stripped',  color: '#FFAD3B' },
            { key: 'enhanced',       label: '4. CLAHE Enhanced', color: '#0CF2C8' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{label}</div>
              <img
                src={`data:image/png;base64,${result.preprocessing[key]}`}
                alt={label}
                style={{ width: '100%', borderRadius: '8px', border: `1px solid ${color}33` }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', padding: '0.5rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
          Pipeline applied before AI inference · Skull stripping removes non-brain tissue · CLAHE enhances local contrast
        </div>
      </div>
    )}
  </div>
)}

           {/* Grad-CAM Images */}
{result.overlay_image && (
  <div style={{ marginBottom: '1.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-3)' }}>🔥 Grad-CAM · AI Attention Heatmap</div>
      <button
        onClick={() => { setShowAnnotation(!showAnnotation); setAnnotationSaved(false) }}
        style={{ background: showAnnotation ? 'rgba(255,173,59,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showAnnotation ? 'rgba(255,173,59,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', color: showAnnotation ? '#FFAD3B' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', padding: '0.3rem 0.8rem', cursor: 'pointer' }}
      >
        {showAnnotation ? '✏️ Hide Annotation' : '✏️ Annotate'}
      </button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>Original MRI</div>
        {(activeTab === 'single' ? (singlePreview || result.preprocessing?.raw) : fusionPreviews.t1) &&
          <img
            src={activeTab === 'single' ? (singlePreview ? singlePreview : `data:image/png;base64,${result.preprocessing.raw}`) : fusionPreviews.t1}
            alt="Original"
            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        }
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
          {showAnnotation ? 'Grad-CAM · Draw to Annotate' : 'Grad-CAM Overlay'}
        </div>
        <div style={{ position: 'relative' }}>
          <img src={`data:image/png;base64,${result.overlay_image}`} alt="Grad-CAM" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
          {showAnnotation && (
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 8, cursor: annotationTool === 'eraser' ? 'cell' : 'crosshair' }}
            />
          )}
        </div>
      </div>
    </div>

    {/* Annotation Tools */}
    {showAnnotation && (
      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,173,59,0.04)', border: '1px solid rgba(255,173,59,0.15)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>

          {/* Tool selector */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[['brush', '🖌️ Brush'], ['eraser', '⌫ Eraser']].map(([tool, label]) => (
              <button key={tool} onClick={() => setAnnotationTool(tool)} style={{ background: annotationTool === tool ? 'rgba(255,173,59,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${annotationTool === tool ? 'rgba(255,173,59,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: annotationTool === tool ? '#FFAD3B' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Color presets */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>Region:</span>
            {[['#FF5757', 'ET'], ['#FFAD3B', 'TC'], ['#FFE566', 'WT'], ['#00FF00', 'Normal']].map(([color, label]) => (
              <button key={color} onClick={() => { setAnnotationColor(color); setAnnotationTool('brush') }} style={{ background: annotationColor === color ? `${color}33` : 'transparent', border: `2px solid ${color}`, borderRadius: '6px', color, fontFamily: 'var(--font-mono)', fontSize: '0.55rem', padding: '0.2rem 0.5rem', cursor: 'pointer', fontWeight: annotationColor === color ? 700 : 400 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Brush size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>Size:</span>
            <input type="range" min="2" max="20" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} style={{ width: 80 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>{brushSize}px</span>
          </div>

          {/* Clear */}
          <button onClick={clearCanvas} style={{ background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '6px', color: '#FF5757', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
            🗑️ Clear
          </button>
        </div>

        {/* Notes */}
        <input
          value={annotationNotes}
          onChange={e => setAnnotationNotes(e.target.value)}
          placeholder="Add clinical notes about your annotation…"
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', padding: '0.5rem 0.8rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.6rem' }}
        />

        {/* Save */}
        <button onClick={saveAnnotation} disabled={annotationSaving} style={{ background: annotationSaved ? 'rgba(12,242,200,0.12)' : 'linear-gradient(135deg,#FFAD3B,#FF8C00)', border: 'none', borderRadius: '8px', color: annotationSaved ? 'var(--teal)' : '#000', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, padding: '0.5rem 1.2rem', cursor: 'pointer' }}>
          {annotationSaving ? 'Saving…' : annotationSaved ? '✅ Annotation Saved!' : '💾 Save Annotation'}
        </button>
      </div>
    )}
  </div>
)} 

           {/* Grad-CAM XAI */}
{result.gradcam && gradcamExp && (
  <>
    <div style={cardStyle()}>
      <div style={topLine} />
      {secTitle('Grad-CAM XAI Analysis', '🔥')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
        {[['Activation Intensity',`${result.gradcam.activation_intensity}%`],['Primary Region',result.gradcam.region],['Heatmap Coverage',`${result.gradcam.focus_area_pct}%`],['Attention Pattern',result.gradcam.pattern]].map(([label, value]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: accent }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '1.2rem', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Model Confidence</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: accent }}>{result.gradcam.conf_interp} · {result.gradcam.conf_pct}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${result.gradcam.conf_pct}%`, background: `linear-gradient(90deg,${accent}88,${accent})`, borderRadius: 99 }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {[
          { dot: '#FF4444', title: 'Red/Yellow Regions — Primary AI Attention', text: gradcamExp.red },
          { dot: '#4488FF', title: 'Blue/Green Regions — Low Attention Zones',  text: gradcamExp.blue },
          { dot: accent,    title: `Attention Pattern: ${result.gradcam.pattern}`, text: gradcamExp.pattern(result.gradcam) },
          { dot: '#FFB347', title: 'Anatomical Region Analysis', text: gradcamExp.region(result.gradcam) },
        ].map(({ dot, title, text }) => (
          <div key={title} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.3rem' }}>{title}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.67rem', color: 'var(--text-3)', lineHeight: 1.75 }}>{text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Sub-region Segmentation */}
    {result.prediction !== 'notumor' && result.gradcam.subregions && (
      <div style={{ ...cardStyle(), border: '1px solid rgba(255,87,87,0.2)', background: 'rgba(255,87,87,0.03)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#FF5757,transparent)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1rem' }}>
          🧬 <span style={{ color: '#FF5757' }}>Sub-Region Segmentation</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
          Tumor sub-regions derived from Grad-CAM activation thresholds · Total tumor coverage: {result.gradcam.total_tumor_pct}%
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {Object.entries(result.gradcam.subregions).map(([key, sr]) => (
            <div key={key} style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: `${sr.color}08`, border: `1px solid ${sr.color}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ background: sr.color, color: '#000', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>{key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: sr.color, fontWeight: 600 }}>{sr.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: sr.color }}>{sr.pct}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(sr.pct * 2, 100)}%`, background: sr.color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '0.8rem', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', padding: '0.5rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
          ET = Enhancing Tumor (active growth) · TC = Tumor Core (necrotic tissue) · WT = Whole Tumor Edge (edema/infiltration)
        </div>
      </div>
    )}

    {/* Radiomics */}
    {result.gradcam.radiomics && result.prediction !== 'notumor' && (
      <div style={{ ...cardStyle(), border: '1px solid rgba(123,130,245,0.2)', background: 'rgba(123,130,245,0.03)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#7B82F5,transparent)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1rem' }}>
          📐 <span style={{ color: '#7B82F5' }}>Radiomics Features</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.8rem', marginBottom: '1rem' }}>
          {[
            ['Est. Area',     `${result.gradcam.radiomics.est_area_cm2} cm²`],
            ['Est. Volume',   `${result.gradcam.radiomics.est_volume_cm3} cm³`],
            ['Est. Diameter', `${result.gradcam.radiomics.est_diameter_cm} cm`],
            ['Sphericity',    result.gradcam.radiomics.sphericity],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'rgba(123,130,245,0.06)', border: '1px solid rgba(123,130,245,0.15)', borderRadius: '10px', padding: '0.8rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: '#7B82F5' }}>{value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: '0.2rem' }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
          {[
            ['Shape',               result.gradcam.radiomics.shape_desc],
            ['Surface-to-Vol Ratio',result.gradcam.radiomics.svr],
            ['Intensity Mean',      `${result.gradcam.radiomics.intensity_mean}%`],
            ['Intensity Std Dev',   `${result.gradcam.radiomics.intensity_std}%`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontFamily: 'var(--font-mono)', fontSize: '0.63rem' }}>
              <span style={{ color: 'var(--text-3)' }}>{label}</span>
              <span style={{ color: '#7B82F5', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', padding: '0.5rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
          ⚠ Volume estimates are approximations based on 2D slice analysis. True 3D volumetrics require full MRI series.
        </div>
      </div>
    )}
  </>
)}

            {/* AI Radiology Report */}
            {result.tumor_info && (
              <div style={cardStyle()}>
                <div style={topLine} />
                {secTitle('AI Radiology Report', '📋')}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: accent, marginBottom: '0.4rem' }}>{result.tumor_info.full_name}</div>
                <div style={{ display: 'inline-block', background: `${result.tumor_info.urgency_color}22`, color: result.tumor_info.urgency_color, fontSize: '0.62rem', letterSpacing: '0.15em', padding: '0.25rem 0.7rem', borderRadius: '99px', border: `1px solid ${result.tumor_info.urgency_color}55`, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '1.2rem' }}>
                  {result.tumor_info.urgency}
                </div>
                {[['Clinical Description',result.tumor_info.description],['Imaging Characteristics',result.tumor_info.characteristics],['Clinical Note',result.tumor_info.clinical_note],['Recommended Follow-up',result.tumor_info.followup],['Prognosis',result.tumor_info.prognosis]].map(([label, value]) => (
                  <div key={label} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: '0.35rem' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem', color: 'var(--text-2)', lineHeight: 1.8 }}>{value}</div>
                  </div>
                ))}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  ⚠ AI-generated report for research purposes only. Not a clinical diagnosis.
                </div>
              </div>
            )}

            {/* Treatment */}
            {result.tumor_info?.treatments?.length > 0 && (
              <div style={cardStyle()}>
                <div style={topLine} />
                {secTitle('Treatment Recommendations', '💊')}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: '1.2rem' }}>Standard treatment approaches for {result.tumor_info.full_name} — for educational reference only</div>
                {result.tumor_info.treatments.map(([title, desc], i) => {
                  const tc = ['#FF6B6B','#FFB347','#7B8CDE','#00C8B4','#FF8FAB'][i % 5]
                  return (
                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.9rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.6rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${tc}22`, border: `1px solid ${tc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                        {['🔪','☢️','💊','🧬','🔬'][i % 5]}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.3rem' }}>{title}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.75 }}>{desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* PDF Download */}
            <button onClick={downloadPDF} disabled={pdfLoading} style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.3)', borderRadius: '10px', cursor: pdfLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--teal)', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              {pdfLoading ? 'Generating PDF…' : '📄 Download Full Clinical Report (PDF)'}
            </button>

            {/* Alert */}
            {result.prediction !== 'notumor'
              ? <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#FF6B6B' }}>⚠ Anomaly detected. Please consult a qualified radiologist or neurologist for clinical evaluation.</div>
              : <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(0,200,180,0.08)', border: '1px solid rgba(0,200,180,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--teal)' }}>✓ No tumor indicators detected in this scan.</div>
            }
          </>  
        )}
      </div>
        )}  
        {/* AI Chat */}
{result && result.prediction !== 'invalid' && (
  <div style={{ marginTop: '1.5rem', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '14px', background: 'rgba(12,242,200,0.03)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--teal),transparent)' }} />
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '1rem' }}>
      🤖 <span style={{ color: 'var(--teal)' }}>Ask AI About This Scan</span>
    </div>

    {/* Suggested questions */}
    {chatMessages.length === 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          'What does this result mean?',
          'How serious is this finding?',
          'What should I do next?',
          'What does the Grad-CAM show?',
        ].map(q => (
          <button key={q} onClick={() => { setChatInput(q) }} style={{ background: 'rgba(12,242,200,0.06)', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '99px', color: 'var(--teal)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.3rem 0.8rem', cursor: 'pointer', letterSpacing: '0.05em' }}>
            {q}
          </button>
        ))}
      </div>
    )}

    {/* Messages */}
    {chatMessages.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', maxHeight: 300, overflowY: 'auto' }}>
        {chatMessages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '0.7rem 1rem', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: m.role === 'user' ? 'rgba(12,242,200,0.12)' : 'rgba(255,255,255,0.04)', border: m.role === 'user' ? '1px solid rgba(12,242,200,0.25)' : '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: m.role === 'user' ? 'var(--teal)' : 'var(--text-2)', lineHeight: 1.7 }}>
              {m.text}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '0.7rem 1rem', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-3)' }}>
              Thinking…
            </div>
          </div>
        )}
      </div>
    )}

    {/* Input */}
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        value={chatInput}
        onChange={e => setChatInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendChat()}
        placeholder="Ask about this scan…"
        style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(12,242,200,0.2)', borderRadius: '8px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '0.55rem 0.9rem', outline: 'none' }}
      />
      <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ background: chatLoading || !chatInput.trim() ? 'rgba(12,242,200,0.1)' : 'linear-gradient(135deg,#00C8B4,#0097A7)', border: 'none', borderRadius: '8px', color: chatLoading || !chatInput.trim() ? 'var(--text-3)' : '#000', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, padding: '0.55rem 1.2rem', cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer' }}>
        {chatLoading ? '…' : 'Ask →'}
      </button>
    </div>
  </div>
)}

        {recentScans.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(12,242,200,0.12),transparent)', marginBottom: '1.5rem' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.85rem' }}>
              🕒 Recent Scans — Last 5
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentScans.map((s) => {
                const c    = CLASS_COLORS[s.prediction] || '#888'
               const date = new Date(s.date + (s.date.endsWith('Z') ? '' : 'Z')).toLocaleString('en-IN', { 
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', 
  timeZone: 'Asia/Kolkata' 
})
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1.1rem', borderRadius: '9px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.045)', fontFamily: 'var(--font-mono)', fontSize: '0.67rem' }}>
                    <div style={{ color: 'var(--text-3)', minWidth: 130 }}>{date}</div>
                    <span style={{ background: c + '18', color: c, padding: '0.14rem 0.55rem', borderRadius: '99px', fontSize: '0.57rem', border: `1px solid ${c}44`, textTransform: 'uppercase' }}>
                      {CLS_LABEL[s.prediction] || s.prediction}
                    </span>
                    <div style={{ color: 'var(--text-3)' }}>{Math.round(s.confidence * 100)}% conf.</div>
                    <div style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>{s.mode || 'Single MRI'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      <div style={{ padding: '0.65rem 2rem', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', textAlign: 'center', letterSpacing: '0.08em', flexShrink: 0 }}>
        ⚠ Research prototype — Not for clinical use. Results must be verified by a qualified medical professional.
      </div>
    </div>
  )
}