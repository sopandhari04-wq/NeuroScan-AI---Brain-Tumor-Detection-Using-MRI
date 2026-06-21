import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const REGION_COLORS = {
  brain: 0x4a6a6a,
  wt:    0xFFE566,  // Whole Tumor — yellow (outermost)
  tc:    0xFFAD3B,  // Tumor Core — orange
  et:    0xFF5757,  // Enhancing Tumor — red (innermost, most critical)
}

export default function True3DViewer({ volumeData }) {
  const mountRef    = useRef(null)
  const frameRef    = useRef(null)
  const isDragging  = useRef(false)
  const lastMouse   = useRef({ x: 0, y: 0 })
  const rotRef      = useRef({ x: 0.3, y: 0.4 })

  const [autoRotate, setAutoRotate]   = useState(true)
  const [activeLayer, setActiveLayer] = useState('all')
  const [brainOpacity, setBrainOpacity] = useState(0.12)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !volumeData) return

    const { shape, brain_points, et_points, tc_points, wt_points } = volumeData
    const [sx, sy, sz] = shape
    const center = [sx / 2, sy / 2, sz / 2]
    const normScale = 2.2 / Math.max(sx, sy, sz) // fit roughly into a 2.2-unit cube

    // ── Scene ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x080c14)

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 4.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x334466, 0.9))
    const dirLight = new THREE.DirectionalLight(0x88ccff, 1.0)
    dirLight.position.set(5, 5, 5)
    scene.add(dirLight)
    const pointLight = new THREE.PointLight(0xFF5757, 0.8, 6)
    scene.add(pointLight)

    const rootGroup = new THREE.Group()
    scene.add(rootGroup)

    // ── Convert voxel point arrays into normalized Three.js point clouds ──
    function pointsToGeometry(points) {
      const positions = new Float32Array(points.length * 3)
      points.forEach((p, i) => {
        positions[i * 3]     = (p[0] - center[0]) * normScale
        positions[i * 3 + 1] = (p[1] - center[1]) * normScale
        positions[i * 3 + 2] = (p[2] - center[2]) * normScale
      })
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      return geo
    }

    // Brain shell — sparse, translucent
    const brainGeo = pointsToGeometry(brain_points)
    const brainMat = new THREE.PointsMaterial({
      color: REGION_COLORS.brain, size: 0.035, transparent: true,
      opacity: brainOpacity, sizeAttenuation: true,
    })
    const brainPoints = new THREE.Points(brainGeo, brainMat)
    brainPoints.name = 'brain'
    rootGroup.add(brainPoints)

    // WT — outermost tumor region
    const wtGeo = pointsToGeometry(wt_points)
    const wtMat = new THREE.PointsMaterial({
      color: REGION_COLORS.wt, size: 0.045, transparent: true,
      opacity: 0.5, sizeAttenuation: true,
    })
    const wtPoints = new THREE.Points(wtGeo, wtMat)
    wtPoints.name = 'wt'
    rootGroup.add(wtPoints)

    // TC — tumor core
    const tcGeo = pointsToGeometry(tc_points)
    const tcMat = new THREE.PointsMaterial({
      color: REGION_COLORS.tc, size: 0.05, transparent: true,
      opacity: 0.7, sizeAttenuation: true,
    })
    const tcPoints = new THREE.Points(tcGeo, tcMat)
    tcPoints.name = 'tc'
    rootGroup.add(tcPoints)

    // ET — enhancing tumor, brightest/densest
    const etGeo = pointsToGeometry(et_points)
    const etMat = new THREE.PointsMaterial({
      color: REGION_COLORS.et, size: 0.06, transparent: true,
      opacity: 0.95, sizeAttenuation: true,
    })
    const etPoints = new THREE.Points(etGeo, etMat)
    etPoints.name = 'et'
    rootGroup.add(etPoints)

    // Position point light near tumor centroid for glow effect
    if (et_points.length > 0) {
      const avgEt = et_points.reduce((acc, p) => [acc[0]+p[0], acc[1]+p[1], acc[2]+p[2]], [0,0,0]).map(v => v / et_points.length)
      pointLight.position.set(
        (avgEt[0] - center[0]) * normScale,
        (avgEt[1] - center[1]) * normScale,
        (avgEt[2] - center[2]) * normScale
      )
    }

    // ── Grid floor ──
    const gridHelper = new THREE.GridHelper(4, 10, 0x112233, 0x112233)
    gridHelper.position.y = -1.4
    scene.add(gridHelper)

    // ── Animation ──
    let time = 0
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      time += 0.01

      if (autoRotate && !isDragging.current) {
        rotRef.current.y += 0.004
      }
      rootGroup.rotation.x = rotRef.current.x
      rootGroup.rotation.y = rotRef.current.y

      // Pulse ET
      const pulse = 1 + Math.sin(time * 2.5) * 0.08
      etMat.size = 0.06 * pulse

      renderer.render(scene, camera)
    }
    animate()

    // ── Mouse controls ──
    function onMouseDown(e) { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY } }
    function onMouseMove(e) {
      if (!isDragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      rotRef.current.y += dx * 0.01
      rotRef.current.x += dy * 0.01
      rotRef.current.x  = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotRef.current.x))
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    function onMouseUp() { isDragging.current = false }
    function onWheel(e) { camera.position.z = Math.max(2.5, Math.min(8, camera.position.z + e.deltaY * 0.005)) }

    mount.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    mount.addEventListener('wheel', onWheel)

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Store refs for layer toggle effect
    mount._layers = { brainPoints, wtPoints, tcPoints, etPoints }

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
  }, [volumeData])

  // Layer visibility toggle
  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !mount._layers) return
    const { wtPoints, tcPoints, etPoints } = mount._layers
    wtPoints.visible = activeLayer === 'all' || activeLayer === 'wt'
    tcPoints.visible = activeLayer === 'all' || activeLayer === 'tc'
    etPoints.visible = activeLayer === 'all' || activeLayer === 'et'
  }, [activeLayer])

  // Brain opacity slider
  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !mount._layers) return
    mount._layers.brainPoints.material.opacity = brainOpacity
  }, [brainOpacity])

  if (!volumeData) return null

  const { dice_scores, volumes_voxels, case_id, model } = volumeData

  return (
    <div style={{ border: '1px solid rgba(255,87,87,0.2)', borderRadius: '16px', background: 'rgba(8,12,20,0.9)', overflow: 'hidden', marginBottom: '1.5rem', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.2rem', borderBottom: '1px solid rgba(255,87,87,0.15)', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1rem' }}>🧠</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)' }}>
            True 3D <span style={{ color: '#FF5757' }}>Volumetric Segmentation</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
            REAL MONAI BraTS MODEL · {case_id}
          </span>
        </div>
        <button onClick={() => setAutoRotate(!autoRotate)} style={{ background: autoRotate ? 'rgba(255,87,87,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${autoRotate ? 'rgba(255,87,87,0.44)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: autoRotate ? '#FF5757' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
          {autoRotate ? '⏸ Pause' : '▶ Rotate'}
        </button>
      </div>

      {/* 3D Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: 420, cursor: 'grab' }} />

      {/* Controls */}
      <div style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid rgba(255,87,87,0.15)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Layer:</span>
          {[['all', 'All', '#FF5757'], ['et', 'ET', '#FF5757'], ['tc', 'TC', '#FFAD3B'], ['wt', 'WT', '#FFE566']].map(([key, label, color]) => (
            <button key={key} onClick={() => setActiveLayer(key)} style={{ background: activeLayer === key ? `${color}22` : 'transparent', border: `1px solid ${activeLayer === key ? color : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', color: activeLayer === key ? color : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>Brain shell:</span>
          <input type="range" min="0" max="0.4" step="0.02" value={brainOpacity} onChange={e => setBrainOpacity(Number(e.target.value))} style={{ width: 80 }} />
        </div>
      </div>

      {/* Validation metrics */}
      <div style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid rgba(255,87,87,0.15)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['ET', dice_scores.et, volumes_voxels.et, '#FF5757'],
          ['TC', dice_scores.tc, volumes_voxels.tc, '#FFAD3B'],
          ['WT', dice_scores.wt, volumes_voxels.wt, '#FFE566'],
        ].map(([label, dice, voxels, color]) => (
          <div key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color, fontWeight: 700 }}>{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>
              Dice {dice}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)' }}>
              {voxels.toLocaleString()} voxels
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', maxWidth: 260, textAlign: 'right' }}>
          Validated against expert ground-truth annotation · {model}
        </div>
      </div>
    </div>
  )
}