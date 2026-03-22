import * as THREE from 'three'

export class SkyRenderer {
  readonly root = new THREE.Group()
  private readonly sunMesh: THREE.Mesh
  private readonly moonMesh: THREE.Mesh
  private readonly starField: THREE.Points

  constructor() {
    this.root.name = 'sky'

    const sunGeo = new THREE.CircleGeometry(8, 16)
    const sunMat = new THREE.MeshBasicMaterial({ color: '#fff8d0', side: THREE.DoubleSide, fog: false, depthWrite: false })
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat)
    this.sunMesh.renderOrder = -10
    this.root.add(this.sunMesh)

    const moonGeo = new THREE.CircleGeometry(5, 16)
    const moonMat = new THREE.MeshBasicMaterial({ color: '#d4dae8', side: THREE.DoubleSide, fog: false, depthWrite: false })
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat)
    this.moonMesh.renderOrder = -10
    this.root.add(this.moonMesh)

    const starCount = 300
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 0.8)
      const r = 180
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.cos(phi)
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.8, fog: false, depthWrite: false, transparent: true })
    this.starField = new THREE.Points(starGeo, starMat)
    this.starField.renderOrder = -11
    this.root.add(this.starField)
  }

  update(playerPosition: THREE.Vector3, dayNightTime: number): void {
    this.root.position.copy(playerPosition)

    const sunAngle = dayNightTime * Math.PI * 2
    const sunDist = 140
    this.sunMesh.position.set(Math.cos(sunAngle) * sunDist, Math.sin(sunAngle) * sunDist, 0)
    this.sunMesh.lookAt(playerPosition)

    this.moonMesh.position.set(-Math.cos(sunAngle) * sunDist, -Math.sin(sunAngle) * sunDist, 0)
    this.moonMesh.lookAt(playerPosition)

    const sunHeight = Math.sin(sunAngle)
    const nightFactor = Math.max(0, Math.min(1, (-sunHeight + 0.1) / 0.4))
    const starMat = this.starField.material as THREE.PointsMaterial
    starMat.opacity = nightFactor * 0.9
  }

  dispose(): void {
    this.root.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.Points) {
        node.geometry.dispose()
        if (node.material instanceof THREE.Material) node.material.dispose()
      }
    })
  }
}
