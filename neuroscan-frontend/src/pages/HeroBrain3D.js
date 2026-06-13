import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function HeroBrain3D() {
  const mountRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0.1, 4.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0x335566, 1.0))
    const dirLight = new THREE.DirectionalLight(0x0CF2C8, 1.6)
    dirLight.position.set(4, 5, 6)
    scene.add(dirLight)
    const dirLight2 = new THREE.DirectionalLight(0xff6633, 0.5)
    dirLight2.position.set(-3, -2, 3)
    scene.add(dirLight2)
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.6)
    rimLight.position.set(-5, 2, -5)
    scene.add(rimLight)

    const brainGroup = new THREE.Group()
    scene.add(brainGroup)

    // ── Brain shape — elongated ellipsoid with frontal/occipital taper ──
    const brainGeo = new THREE.SphereGeometry(1.35, 96, 96)
    const pos = brainGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      // Elongate along Z (front-back), flatten slightly on Y (top-bottom)
      let sx = 1.0, sy = 0.82, sz = 1.25
      // Taper frontal lobe (positive z) narrower, occipital (negative z) rounder
      if (z > 0) sz *= 1 + (z / 1.35) * 0.12
      // Surface noise for cortex bumps
      const noise = Math.sin(x * 6 + y * 3) * 0.03 + Math.cos(y * 7 + z * 2) * 0.025 + Math.sin(z * 5) * 0.025
      const scale = 1 + noise
      pos.setXYZ(i, x * sx * scale, y * sy * scale, z * sz * scale)
    }
    brainGeo.computeVertexNormals()

    const brainMat = new THREE.MeshPhongMaterial({
      color: 0x8aa8a8, specular: 0x0CF2C8, shininess: 45,
      transparent: true, opacity: 0.32, side: THREE.DoubleSide,
    })
    const brainMesh = new THREE.Mesh(brainGeo, brainMat)
    brainGroup.add(brainMesh)

    // Inner solid core (subtle, gives depth)
    const coreGeo = new THREE.SphereGeometry(1.1, 48, 48)
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x224444, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreMesh.scale.set(1.0, 0.82, 1.25)
    brainGroup.add(coreMesh)

    // Hemisphere divide line (longitudinal fissure)
    const fissureCurve = new THREE.EllipseCurve(0, 0, 1.36, 1.4, -Math.PI/2, Math.PI/2, false, 0)
    const fissurePts = fissureCurve.getPoints(40).map(p => new THREE.Vector3(0, p.x * 0.82, p.y * 1.25))
    const fissureGeo = new THREE.BufferGeometry().setFromPoints(fissurePts)
    const fissureMat = new THREE.LineBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.35 })
    brainGroup.add(new THREE.Line(fissureGeo, fissureMat))

    // Cortex fold lines — wrap around surface, denser
    for (let i = 0; i < 22; i++) {
      const angle  = (i / 22) * Math.PI * 2
      const radius = 1.3 + Math.random() * 0.05
      const curve  = new THREE.EllipseCurve(
        Math.cos(angle) * 0.25, Math.sin(angle) * 0.25,
        radius * (0.6 + Math.random() * 0.35),
        radius * (0.4 + Math.random() * 0.35),
        angle, angle + Math.PI * (0.7 + Math.random() * 0.5),
        false, Math.random() * Math.PI
      )
      const pts = curve.getPoints(28).map(p => new THREE.Vector3(p.x, p.y * 0.82, 0))
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.16 })
      const line = new THREE.Line(geo, mat)
      line.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI)
      line.scale.set(1, 1, 1.25)
      brainGroup.add(line)
    }

    // ── Tumor — glowing orange/red mass ──
    const tumorPos = new THREE.Vector3(0.5, 0.25, 0.65)

    const tumorGeo = new THREE.SphereGeometry(0.22, 32, 32)
    // Deform tumor for irregular shape
    const tp = tumorGeo.attributes.position
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i)
      const n = 1 + (Math.sin(x*10)+Math.cos(y*8)+Math.sin(z*9)) * 0.08
      tp.setXYZ(i, x*n, y*n, z*n)
    }
    tumorGeo.computeVertexNormals()

    const tumorMat = new THREE.MeshPhongMaterial({
      color: 0xFF6A33, emissive: 0xFF4500, emissiveIntensity: 0.9,
      transparent: true, opacity: 0.95, shininess: 60,
    })
    const tumorMesh = new THREE.Mesh(tumorGeo, tumorMat)
    tumorMesh.position.copy(tumorPos)
    brainGroup.add(tumorMesh)

    // Outer glow shells
    const glow1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xFF6A33, transparent: true, opacity: 0.2, side: THREE.BackSide })
    )
    glow1.position.copy(tumorPos)
    brainGroup.add(glow1)

    const glow2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xFFAA33, transparent: true, opacity: 0.08, side: THREE.BackSide })
    )
    glow2.position.copy(tumorPos)
    brainGroup.add(glow2)

    const tumorLight = new THREE.PointLight(0xFF6A33, 1.2, 3)
    tumorLight.position.copy(tumorPos)
    brainGroup.add(tumorLight)

    // ── Scan ring sweeping through ──
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0, 1.6, 64),
      new THREE.MeshBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.05, side: THREE.DoubleSide })
    )
    scene.add(ringMesh)
    const ringEdgeMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.57, 1.6, 64),
      new THREE.MeshBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    )
    scene.add(ringEdgeMesh)

    // ── Particle field (subtle depth) ──
    const particleCount = 60
    const particlePos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      particlePos[i*3]   = (Math.random() - 0.5) * 6
      particlePos[i*3+1] = (Math.random() - 0.5) * 6
      particlePos[i*3+2] = (Math.random() - 0.5) * 6 - 1
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
    const particleMat = new THREE.PointsMaterial({ color: 0x0CF2C8, size: 0.02, transparent: true, opacity: 0.4 })
    scene.add(new THREE.Points(particleGeo, particleMat))

    // Animation
    let time = 0
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      time += 0.008

      brainGroup.rotation.y = Math.PI * 0.15 + time * 0.45
      brainGroup.rotation.x = 0.08 + Math.sin(time * 0.3) * 0.04

      const pulse = 1 + Math.sin(time * 3) * 0.12
      tumorMesh.scale.setScalar(pulse)
      glow1.scale.setScalar(pulse * 1.15)
      glow2.scale.setScalar(1 + Math.sin(time * 3 + 0.5) * 0.2)
      tumorLight.intensity = 1.0 + Math.sin(time * 3) * 0.5

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