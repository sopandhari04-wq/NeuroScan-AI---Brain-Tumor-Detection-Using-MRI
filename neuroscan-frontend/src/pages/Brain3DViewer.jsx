import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const CLS_COLORS = {
  glioma:     { et: 0xFF3333, tc: 0xFF6644, wt: 0xFF9944, brain: 0x886655 },
  meningioma: { et: 0xFFAA22, tc: 0xFFCC44, wt: 0xFFDD88, brain: 0x886655 },
  pituitary:  { et: 0x7766FF, tc: 0x9988FF, wt: 0xBBAAFF, brain: 0x886655 },
  notumor:    { et: 0x00CC88, tc: 0x00AA66, wt: 0x008844, brain: 0x886655 },
}

const REGION_MAP = {
  'Superior Left':   { theta: -0.6, phi: 0.8 },
  'Superior Right':  { theta: 0.6,  phi: 0.8 },
  'Middle Left':     { theta: -0.6, phi: 0.0 },
  'Middle Right':    { theta: 0.6,  phi: 0.0 },
  'Inferior Left':   { theta: -0.6, phi: -0.8 },
  'Inferior Right':  { theta: 0.6,  phi: -0.8 },
}

export default function Brain3DViewer({ result }) {
  const mountRef    = useRef(null)
  const sceneRef    = useRef(null)
  const rendererRef = useRef(null)
  const frameRef    = useRef(null)
  const isDragging  = useRef(false)
  const lastMouse   = useRef({ x: 0, y: 0 })
  const rotRef      = useRef({ x: 0.3, y: 0 })

  const [autoRotate, setAutoRotate] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [opacity, setOpacity]       = useState(0.35)
  const [activeLayer, setActiveLayer] = useState('all')

  const prediction = result?.prediction || 'notumor'
  const gradcam    = result?.gradcam
  const radiomics  = gradcam?.radiomics
  const subregions = gradcam?.subregions
  const colors     = CLS_COLORS[prediction] || CLS_COLORS.notumor
  const isTumor    = prediction !== 'notumor'

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Scene
    const scene    = new THREE.Scene()
    scene.background = new THREE.Color(0x080c14)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    // Lights
    const ambientLight = new THREE.AmbientLight(0x334466, 0.8)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0x88ccff, 1.2)
    dirLight1.position.set(5, 5, 5)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0xff8844, 0.4)
    dirLight2.position.set(-5, -3, -5)
    scene.add(dirLight2)

    const pointLight = new THREE.PointLight(0x00c8b4, 0.6, 10)
    pointLight.position.set(0, 3, 3)
    scene.add(pointLight)

    // Brain group
    const brainGroup = new THREE.Group()
    scene.add(brainGroup)

    // ── Brain outer shell ──
    const brainGeo = new THREE.SphereGeometry(1.2, 64, 64)
    // Deform to look more brain-like
    const pos = brainGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const noise = Math.sin(x * 4) * 0.04 + Math.cos(y * 5) * 0.03 + Math.sin(z * 3) * 0.04
      const scale = 1 + noise
      pos.setXYZ(i, x * scale, y * (scale * 0.9), z * scale)
    }
    brainGeo.computeVertexNormals()

    const brainMat = new THREE.MeshPhongMaterial({
      color:       0x886655,
      specular:    0x334422,
      shininess:   30,
      transparent: true,
      opacity:     opacity,
      side:        THREE.DoubleSide,
    })
    const brainMesh = new THREE.Mesh(brainGeo, brainMat)
    brainMesh.name = 'brain'
    brainGroup.add(brainMesh)

    // ── Brain hemisphere split line ──
    const splitCurve = new THREE.EllipseCurve(0, 0, 1.21, 1.05, 0, Math.PI * 2, false, 0)
    const splitPoints = splitCurve.getPoints(80)
    const splitGeo  = new THREE.BufferGeometry().setFromPoints(splitPoints)
    const splitMat  = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.4 })
    const splitLine = new THREE.Line(splitGeo, splitMat)
    splitLine.rotation.x = Math.PI / 2
    brainGroup.add(splitLine)

    // ── Brain cortex folds (gyri) ──
    for (let i = 0; i < 12; i++) {
      const angle  = (i / 12) * Math.PI * 2
      const radius = 1.15 + Math.random() * 0.05
      const curve  = new THREE.EllipseCurve(
        Math.cos(angle) * 0.3, Math.sin(angle) * 0.3,
        radius * (0.7 + Math.random() * 0.3),
        radius * (0.5 + Math.random() * 0.3),
        angle, angle + Math.PI * (0.8 + Math.random() * 0.4),
        false, Math.random() * Math.PI
      )
      const foldPoints = curve.getPoints(30)
      const foldGeo    = new THREE.BufferGeometry().setFromPoints(foldPoints)
      const foldMat    = new THREE.LineBasicMaterial({ color: 0x775544, transparent: true, opacity: 0.25 })
      const fold       = new THREE.Line(foldGeo, foldMat)
      fold.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      brainGroup.add(fold)
    }

    // ── Tumor regions ──
    if (isTumor) {
      const regionKey = gradcam?.region || 'Middle Right'
      const regionPos = REGION_MAP[regionKey] || REGION_MAP['Middle Right']
      const r = 0.85

      const tumorX = r * Math.cos(regionPos.phi) * Math.sin(regionPos.theta)
      const tumorY = r * Math.sin(regionPos.phi)
      const tumorZ = r * Math.cos(regionPos.phi) * Math.cos(regionPos.theta)

      const etPct = subregions?.ET?.pct || 20
      const tcPct = subregions?.TC?.pct || 15
      const wtPct = subregions?.WT?.pct || 25

      const volScale = Math.max(0.08, Math.min(0.35, (radiomics?.est_volume_cm3 || 1) / 8))

      // WT — Whole Tumor (outermost, largest)
      if (activeLayer === 'all' || activeLayer === 'wt') {
        const wtGeo = new THREE.SphereGeometry(volScale * 1.6, 32, 32)
        const wtMat = new THREE.MeshPhongMaterial({
          color: colors.wt, transparent: true, opacity: 0.25,
          wireframe: false, side: THREE.DoubleSide
        })
        const wtMesh = new THREE.Mesh(wtGeo, wtMat)
        wtMesh.position.set(tumorX, tumorY, tumorZ)
        wtMesh.name = 'wt'
        brainGroup.add(wtMesh)

        // WT wireframe
        const wtWire = new THREE.Mesh(wtGeo, new THREE.MeshBasicMaterial({ color: colors.wt, wireframe: true, transparent: true, opacity: 0.15 }))
        wtWire.position.copy(wtMesh.position)
        brainGroup.add(wtWire)
      }

      // TC — Tumor Core
      if (activeLayer === 'all' || activeLayer === 'tc') {
        const tcGeo = new THREE.SphereGeometry(volScale * 1.1, 32, 32)
        const tcMat = new THREE.MeshPhongMaterial({
          color: colors.tc, transparent: true, opacity: 0.5,
          specular: 0x222222, shininess: 40
        })
        const tcMesh = new THREE.Mesh(tcGeo, tcMat)
        tcMesh.position.set(tumorX, tumorY, tumorZ)
        tcMesh.name = 'tc'
        brainGroup.add(tcMesh)
      }

      // ET — Enhancing Tumor (innermost, brightest)
      if (activeLayer === 'all' || activeLayer === 'et') {
        const etGeo = new THREE.SphereGeometry(volScale * 0.65, 32, 32)
        const etMat = new THREE.MeshPhongMaterial({
          color: colors.et, transparent: true, opacity: 0.85,
          specular: 0x444444, shininess: 80, emissive: colors.et, emissiveIntensity: 0.3
        })
        const etMesh = new THREE.Mesh(etGeo, etMat)
        etMesh.position.set(tumorX, tumorY, tumorZ)
        etMesh.name = 'et'
        brainGroup.add(etMesh)

        // Pulsing glow
        const glowGeo = new THREE.SphereGeometry(volScale * 0.9, 16, 16)
        const glowMat = new THREE.MeshBasicMaterial({ color: colors.et, transparent: true, opacity: 0.08, side: THREE.BackSide })
        const glowMesh = new THREE.Mesh(glowGeo, glowMat)
        glowMesh.position.copy(etMesh.position)
        glowMesh.name = 'glow'
        brainGroup.add(glowMesh)
      }

      // Location pin
      const pinGeo = new THREE.ConeGeometry(0.025, 0.12, 8)
      const pinMat = new THREE.MeshBasicMaterial({ color: colors.et })
      const pin    = new THREE.Mesh(pinGeo, pinMat)
      pin.position.set(tumorX * 1.35, tumorY * 1.35 + 0.06, tumorZ * 1.35)
      pin.rotation.z = Math.PI
      brainGroup.add(pin)

      // Connection line from pin to tumor
      const linePts = [
        new THREE.Vector3(tumorX * 1.35, tumorY * 1.35, tumorZ * 1.35),
        new THREE.Vector3(tumorX, tumorY, tumorZ)
      ]
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts)
      const lineMat = new THREE.LineBasicMaterial({ color: colors.et, transparent: true, opacity: 0.6 })
      brainGroup.add(new THREE.Line(lineGeo, lineMat))
    }

    // ── Coordinate axes (subtle) ──
    const axisLen = 1.6
    ;[
      [axisLen, 0, 0, 0xFF4444],
      [0, axisLen, 0, 0x44FF44],
      [0, 0, axisLen, 0x4444FF],
    ].forEach(([x, y, z, color]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(x,y,z)])
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 })
      scene.add(new THREE.Line(geo, mat))
    })

    // ── Grid ──
    const gridHelper = new THREE.GridHelper(4, 10, 0x112233, 0x112233)
    gridHelper.position.y = -1.4
    scene.add(gridHelper)

    // ── Animation loop ──
    let time = 0
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      time += 0.01

      // Auto rotate
      if (autoRotate && !isDragging.current) {
        rotRef.current.y += 0.005
      }

      brainGroup.rotation.x = rotRef.current.x
      brainGroup.rotation.y = rotRef.current.y

      // Pulse glow
      const glow = brainGroup.getObjectByName('glow')
      if (glow) {
        glow.material.opacity = 0.05 + Math.sin(time * 2) * 0.04
        glow.scale.setScalar(1 + Math.sin(time * 2) * 0.05)
      }

      // Update brain opacity
      const brain = brainGroup.getObjectByName('brain')
      if (brain) brain.material.opacity = opacity

      renderer.render(scene, camera)
    }
    animate()

    // ── Mouse controls ──
    function onMouseDown(e) {
      isDragging.current = true
      lastMouse.current  = { x: e.clientX, y: e.clientY }
    }
    function onMouseMove(e) {
      if (!isDragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      rotRef.current.y += dx * 0.01
      rotRef.current.x += dy * 0.01
      rotRef.current.x  = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotRef.current.x))
      lastMouse.current  = { x: e.clientX, y: e.clientY }
    }
    function onMouseUp() { isDragging.current = false }
    function onWheel(e) {
      camera.position.z = Math.max(2.5, Math.min(8, camera.position.z + e.deltaY * 0.005))
    }

    mount.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    mount.addEventListener('wheel', onWheel)

    // ── Resize ──
    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      mount.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      mount.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [prediction, activeLayer, isTumor])

  const accentColor = {
    glioma: '#FF5757', meningioma: '#FFAD3B', pituitary: '#7B82F5', notumor: '#0CF2C8'
  }[prediction] || '#0CF2C8'

  return (
    <div style={{ border: `1px solid ${accentColor}22`, borderRadius: '16px', background: 'rgba(8,12,20,0.9)', overflow: 'hidden', marginBottom: '1.5rem', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.2rem', borderBottom: `1px solid ${accentColor}18` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>🧠</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)' }}>
            3D <span style={{ color: accentColor }}>Brain Visualization</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
            INTERACTIVE · DRAG TO ROTATE · SCROLL TO ZOOM
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => setAutoRotate(!autoRotate)} style={{ background: autoRotate ? `${accentColor}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${autoRotate ? accentColor + '44' : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: autoRotate ? accentColor : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
            {autoRotate ? '⏸ Pause' : '▶ Rotate'}
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: 420, cursor: 'grab' }} />

      {/* Controls */}
      <div style={{ padding: '0.9rem 1.2rem', borderTop: `1px solid ${accentColor}18`, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

        {/* Layer toggle */}
        {isTumor && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Layer:</span>
            {[['all', 'All', accentColor], ['et', 'ET', '#FF5757'], ['tc', 'TC', '#FFAD3B'], ['wt', 'WT', '#FFE566']].map(([key, label, color]) => (
              <button key={key} onClick={() => setActiveLayer(key)} style={{ background: activeLayer === key ? `${color}22` : 'transparent', border: `1px solid ${activeLayer === key ? color : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', color: activeLayer === key ? color : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Opacity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>Brain opacity:</span>
          <input type="range" min="0.1" max="0.8" step="0.05" value={opacity} onChange={e => setOpacity(Number(e.target.value))} style={{ width: 80 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>{Math.round(opacity * 100)}%</span>
        </div>

        {/* Stats */}
        {isTumor && radiomics && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
            {[
              ['Volume', `${radiomics.est_volume_cm3} cm³`],
              ['Diameter', `${radiomics.est_diameter_cm} cm`],
              ['Location', gradcam?.region || 'Unknown'],
            ].map(([label, value]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, color: accentColor }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {isTumor && (
        <div style={{ padding: '0.6rem 1.2rem', borderTop: `1px solid ${accentColor}18`, display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
          {[
            ['ET', 'Enhancing Tumor', '#FF5757', 'Active growing region'],
            ['TC', 'Tumor Core', '#FFAD3B', 'Necrotic tissue'],
            ['WT', 'Whole Tumor', '#FFE566', 'Surrounding edema'],
          ].map(([key, label, color, desc]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color, fontWeight: 600 }}>{key}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-3)', marginLeft: '0.3rem' }}>{desc}</span>
              </div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>
            ⚠ 3D model based on 2D Grad-CAM analysis · Not a true volumetric reconstruction
          </div>
        </div>
      )}
    </div>
  )
}