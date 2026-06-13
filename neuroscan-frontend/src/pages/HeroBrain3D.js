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

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0x335566, 0.9))
    const dirLight = new THREE.DirectionalLight(0x0CF2C8, 1.4)
    dirLight.position.set(4, 5, 6)
    scene.add(dirLight)
    const dirLight2 = new THREE.DirectionalLight(0xff8844, 0.35)
    dirLight2.position.set(-4, -3, -4)
    scene.add(dirLight2)
    const pointLight = new THREE.PointLight(0x0CF2C8, 0.8, 10)
    pointLight.position.set(0, 2, 3)
    scene.add(pointLight)

    const brainGroup = new THREE.Group()
    scene.add(brainGroup)

    // Brain shell (deformed sphere)
    const brainGeo = new THREE.SphereGeometry(1.3, 64, 64)
    const pos = brainGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const noise = Math.sin(x * 4) * 0.045 + Math.cos(y * 5) * 0.035 + Math.sin(z * 3) * 0.045
      const scale = 1 + noise
      pos.setXYZ(i, x * scale, y * (scale * 0.92), z * scale)
    }
    brainGeo.computeVertexNormals()

    const brainMat = new THREE.MeshPhongMaterial({
      color: 0x6a8a8a, specular: 0x0CF2C8, shininess: 35,
      transparent: true, opacity: 0.4, side: THREE.DoubleSide,
    })
    const brainMesh = new THREE.Mesh(brainGeo, brainMat)
    brainGroup.add(brainMesh)

    // Wireframe overlay
    const wireGeo = new THREE.SphereGeometry(1.32, 24, 24)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0CF2C8, wireframe: true, transparent: true, opacity: 0.08 })
    brainGroup.add(new THREE.Mesh(wireGeo, wireMat))

    // Cortex fold lines
    for (let i = 0; i < 14; i++) {
      const angle  = (i / 14) * Math.PI * 2
      const radius = 1.24 + Math.random() * 0.05
      const curve  = new THREE.EllipseCurve(
        Math.cos(angle) * 0.3, Math.sin(angle) * 0.3,
        radius * (0.7 + Math.random() * 0.3),
        radius * (0.5 + Math.random() * 0.3),
        angle, angle + Math.PI * (0.8 + Math.random() * 0.4),
        false, Math.random() * Math.PI
      )
      const pts = curve.getPoints(30)
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.22 })
      const line = new THREE.Line(geo, mat)
      line.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      brainGroup.add(line)
    }

    // Tumor marker (pulsing red sphere)
    const tumorPos = new THREE.Vector3(0.55, 0.35, 0.75)
    const tumorGeo = new THREE.SphereGeometry(0.13, 24, 24)
    const tumorMat = new THREE.MeshPhongMaterial({
      color: 0xFF5757, emissive: 0xFF5757, emissiveIntensity: 0.5,
      transparent: true, opacity: 0.9,
    })
    const tumorMesh = new THREE.Mesh(tumorGeo, tumorMat)
    tumorMesh.position.copy(tumorPos)
    brainGroup.add(tumorMesh)

    const glowGeo = new THREE.SphereGeometry(0.2, 16, 16)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF5757, transparent: true, opacity: 0.18, side: THREE.BackSide })
    const glowMesh = new THREE.Mesh(glowGeo, glowMat)
    glowMesh.position.copy(tumorPos)
    brainGroup.add(glowMesh)

    // Scan ring (rotating disc passing through brain)
    const ringGeo = new THREE.RingGeometry(0, 1.5, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    scene.add(ringMesh)

    const ringEdgeGeo = new THREE.RingGeometry(1.48, 1.5, 64)
    const ringEdgeMat = new THREE.MeshBasicMaterial({ color: 0x0CF2C8, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    const ringEdgeMesh = new THREE.Mesh(ringEdgeGeo, ringEdgeMat)
    scene.add(ringEdgeMesh)

    // Animation
    let time = 0
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      time += 0.008

      brainGroup.rotation.y = time * 0.5
      brainGroup.rotation.x = 0.15 + Math.sin(time * 0.3) * 0.05

      // Pulse tumor
      const pulse = 1 + Math.sin(time * 3) * 0.15
      tumorMesh.scale.setScalar(pulse)
      glowMesh.scale.setScalar(pulse * 1.3)
      glowMat.opacity = 0.1 + Math.sin(time * 3) * 0.08

      // Scan ring sweeps vertically
      const sweep = Math.sin(time * 0.6) * 1.4
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