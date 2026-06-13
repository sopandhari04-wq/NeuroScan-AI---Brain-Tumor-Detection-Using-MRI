import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Builds a wrinkled hemisphere mesh (half-ellipsoid with gyri/sulci bumps)
function buildHemisphere(side) {
  const geo = new THREE.SphereGeometry(1.15, 96, 96, 0, Math.PI) // half sphere (0 to PI = one hemisphere)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)

    // Shape into a brain hemisphere: flatten the flat (medial) face on x=0,
    // elongate front-back (z), slightly flatten top-bottom (y)
    let sx = 0.95, sy = 0.78, sz = 1.3

    // Frontal lobe taper (positive z narrower & rounder), occipital wider
    if (z > 0.3) sz *= 1 - (z / 1.15) * 0.08

    // Temporal lobe bulge (lower-front region)
    if (y < -0.1 && z > -0.2) {
      const bulge = Math.max(0, 1 - Math.abs(y + 0.4) * 1.5) * Math.max(0, 1 - Math.abs(z - 0.2))
      sx *= 1 + bulge * 0.15
      sy *= 1 + bulge * 0.1
    }

    // Gyri/sulci wrinkles - layered noise at multiple frequencies
    const wrinkle =
      Math.sin(x * 9 + y * 4) * 0.022 +
      Math.cos(y * 11 + z * 6) * 0.02 +
      Math.sin(z * 8 + x * 5) * 0.022 +
      Math.cos(x * 16 + z * 13) * 0.012 +
      Math.sin(y * 18 + x * 9) * 0.01

    const scale = 1 + wrinkle
    let nx = x * sx * scale
    let ny = y * sy * scale
    let nz = z * sz * scale

    // Flatten medial face (the side facing the other hemisphere) near x=0
    if (x < 0.15) {
      const flatten = Math.max(0, (0.15 - x) / 0.15)
      nx = nx * (1 - flatten * 0.7)
    }

    pos.setXYZ(i, nx * side, ny, nz)
  }
  geo.computeVertexNormals()
  return geo
}

// Sulci groove lines following the hemisphere surface
function buildSulci(side, count) {
  const group = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const baseAngle = Math.random() * Math.PI * 2
    const r = 1.05 + Math.random() * 0.08
    const curve = new THREE.EllipseCurve(
      0, 0,
      r * (0.5 + Math.random() * 0.4),
      r * (0.35 + Math.random() * 0.35),
      baseAngle, baseAngle + Math.PI * (0.5 + Math.random() * 0.6),
      false, 0
    )
    const pts2d = curve.getPoints(24)
    const pts = pts2d.map(p => new THREE.Vector3(
      Math.abs(p.x) * side * 0.85 + (0.35 * side),
      p.y * 0.78,
      p.x * 1.3 * Math.sign(Math.random() - 0.5) * 0.6 + p.y
    ))
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.14 })
    group.add(new THREE.Line(geo, mat))
  }
  return group
}

export default function HeroBrain3D() {
  const mountRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0.3, 0.6, 4.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x445566, 0.9))
    const keyLight = new THREE.DirectionalLight(0x0CF2C8, 1.5)
    keyLight.position.set(4, 5, 6)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5)
    fillLight.position.set(-5, 1, -4)
    scene.add(fillLight)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4)
    rimLight.position.set(0, -4, 3)
    scene.add(rimLight)

    const brainGroup = new THREE.Group()
    scene.add(brainGroup)

    // ── Cerebral hemispheres ──
    const brainMat = new THREE.MeshPhongMaterial({
      color: 0xaec8c8, specular: 0x0CF2C8, shininess: 50,
      transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      flatShading: false,
    })

    const leftHemi  = new THREE.Mesh(buildHemisphere(1), brainMat)
    const rightHemi = new THREE.Mesh(buildHemisphere(-1), brainMat)
    brainGroup.add(leftHemi)
    brainGroup.add(rightHemi)

    // Sulci grooves on each hemisphere
    brainGroup.add(buildSulci(1, 16))
    brainGroup.add(buildSulci(-1, 16))

    // Longitudinal fissure line (gap between hemispheres, top arc)
    // simple straight fissure along z at x=0, y top
    const fissureGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.85, -1.2),
      new THREE.Vector3(0, 0.92, -0.4),
      new THREE.Vector3(0, 0.95, 0.4),
      new THREE.Vector3(0, 0.88, 1.1),
    ])
    brainGroup.add(new THREE.Line(fissureGeo, new THREE.LineBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.4 })))

    // ── Cerebellum (textured sphere, back-bottom) ──
    const cerebellumGeo = new THREE.SphereGeometry(0.5, 48, 48)
    const cp = cerebellumGeo.attributes.position
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i)
      const ridges = Math.sin(y * 30) * 0.025 + Math.cos(x * 20 + z * 20) * 0.015
      const sc = 1 + ridges
      cp.setXYZ(i, x * sc * 1.1, y * sc * 0.75, z * sc * 0.85)
    }
    cerebellumGeo.computeVertexNormals()
    const cerebellumMesh = new THREE.Mesh(cerebellumGeo, new THREE.MeshPhongMaterial({
      color: 0x9ec4c4, specular: 0x0CF2C8, shininess: 40,
      transparent: true, opacity: 0.5, side: THREE.DoubleSide,
    }))
    cerebellumMesh.position.set(0, -0.85, -1.05)
    brainGroup.add(cerebellumMesh)

    // ── Brainstem ──
    const stemGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.7, 16)
    const stemMesh = new THREE.Mesh(stemGeo, new THREE.MeshPhongMaterial({
      color: 0x9ec4c4, specular: 0x0CF2C8, shininess: 40,
      transparent: true, opacity: 0.5,
    }))
    stemMesh.position.set(0, -1.05, -0.55)
    stemMesh.rotation.x = 0.5
    brainGroup.add(stemMesh)

    // ── Tumor — glowing orange/red mass ──
    const tumorPos = new THREE.Vector3(0.55, 0.35, 0.55)

    const tumorGeo = new THREE.SphereGeometry(0.24, 32, 32)
    const tp = tumorGeo.attributes.position
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i)
      const n = 1 + (Math.sin(x*10)+Math.cos(y*8)+Math.sin(z*9)) * 0.08
      tp.setXYZ(i, x*n, y*n, z*n)
    }
    tumorGeo.computeVertexNormals()

    const tumorMesh = new THREE.Mesh(tumorGeo, new THREE.MeshPhongMaterial({
      color: 0xFF6A33, emissive: 0xFF4500, emissiveIntensity: 1.0,
      transparent: true, opacity: 0.95, shininess: 60,
    }))
    tumorMesh.position.copy(tumorPos)
    brainGroup.add(tumorMesh)

    const glow1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xFF6A33, transparent: true, opacity: 0.22, side: THREE.BackSide })
    )
    glow1.position.copy(tumorPos)
    brainGroup.add(glow1)

    const glow2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xFFAA33, transparent: true, opacity: 0.09, side: THREE.BackSide })
    )
    glow2.position.copy(tumorPos)
    brainGroup.add(glow2)

    const tumorLight = new THREE.PointLight(0xFF6A33, 1.3, 4)
    tumorLight.position.copy(tumorPos)
    brainGroup.add(tumorLight)

    // ── Scan ring sweeping through ──
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0, 1.7, 64),
      new THREE.MeshBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.05, side: THREE.DoubleSide })
    )
    scene.add(ringMesh)
    const ringEdgeMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.67, 1.7, 64),
      new THREE.MeshBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    )
    scene.add(ringEdgeMesh)

    // ── Particle field ──
    const particleCount = 50
    const particlePos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      particlePos[i*3]   = (Math.random() - 0.5) * 6
      particlePos[i*3+1] = (Math.random() - 0.5) * 6
      particlePos[i*3+2] = (Math.random() - 0.5) * 6 - 1
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
    scene.add(new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x0CF2C8, size: 0.02, transparent: true, opacity: 0.35 })))

    // ── Animation ──
    let time = 0
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      time += 0.008

      brainGroup.rotation.y = Math.PI * 0.2 + time * 0.4
      brainGroup.rotation.x = 0.1 + Math.sin(time * 0.3) * 0.04

      const pulse = 1 + Math.sin(time * 3) * 0.12
      tumorMesh.scale.setScalar(pulse)
      glow1.scale.setScalar(pulse * 1.15)
      glow2.scale.setScalar(1 + Math.sin(time * 3 + 0.5) * 0.2)
      tumorLight.intensity = 1.1 + Math.sin(time * 3) * 0.5

      const sweep = Math.sin(time * 0.6) * 1.5
      ringMesh.position.y     = sweep
      ringEdgeMesh.position.y = sweep
      ringMesh.rotation.x     = Math.PI / 2
      ringEdgeMesh.rotation.x = Math.PI / 2

      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}