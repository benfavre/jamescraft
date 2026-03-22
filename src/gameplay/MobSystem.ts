import * as THREE from 'three'
import type { World } from '../world/World'

export const enum MobType {
  Pig = 0,
  Cow = 1,
  Zombie = 2,
  Skeleton = 3,
  Creeper = 4,
}

interface MobDef {
  type: MobType
  health: number
  speed: number
  attackDamage: number
  hostile: boolean
  bodyColor: string
  headColor: string
  legColor: string
  width: number
  height: number
  eyeH: number
  drops: { id: number; min: number; max: number }[]
}

const DEFS: Record<MobType, MobDef> = {
  [MobType.Pig]: { type: MobType.Pig, health: 10, speed: 1.5, attackDamage: 0, hostile: false, bodyColor: '#f0a0a0', headColor: '#f0b0b0', legColor: '#d08080', width: 0.7, height: 0.85, eyeH: 0.7, drops: [{ id: 200, min: 1, max: 3 }] },
  [MobType.Cow]: { type: MobType.Cow, health: 10, speed: 1.3, attackDamage: 0, hostile: false, bodyColor: '#6a4a3a', headColor: '#7a5a4a', legColor: '#5a3a2a', width: 0.8, height: 1.1, eyeH: 0.95, drops: [{ id: 202, min: 1, max: 3 }] },
  [MobType.Zombie]: { type: MobType.Zombie, health: 20, speed: 2.2, attackDamage: 3, hostile: true, bodyColor: '#4a7a4a', headColor: '#5a8a5a', legColor: '#3a6a3a', width: 0.6, height: 1.8, eyeH: 1.6, drops: [] },
  [MobType.Skeleton]: { type: MobType.Skeleton, health: 20, speed: 2.0, attackDamage: 2, hostile: true, bodyColor: '#c8c8c8', headColor: '#d8d8d8', legColor: '#a8a8a8', width: 0.6, height: 1.8, eyeH: 1.6, drops: [] },
  [MobType.Creeper]: { type: MobType.Creeper, health: 20, speed: 1.8, attackDamage: 8, hostile: true, bodyColor: '#5a8a4a', headColor: '#6a9a5a', legColor: '#4a7a3a', width: 0.6, height: 1.6, eyeH: 1.4, drops: [] },
}

interface Mob {
  type: MobType
  def: MobDef
  position: THREE.Vector3
  velocity: THREE.Vector3
  yaw: number
  health: number
  mesh: THREE.Group
  aiState: 'idle' | 'wander' | 'chase'
  aiTimer: number
  hurtTimer: number
  grounded: boolean
  dead: boolean
  deathTimer: number
  walkTime: number
  legL: THREE.Group
  legR: THREE.Group
}

export class MobSystem {
  readonly root = new THREE.Group()
  private readonly mobs: Mob[] = []
  private spawnTimer = 0
  private readonly maxMobs = 20

  constructor(scene: THREE.Scene) {
    this.root.name = 'mobs'
    scene.add(this.root)
  }

  update(dt: number, playerPos: THREE.Vector3, world: World, dayTime: number,
    hostileEnabled = true, passiveEnabled = true): { playerDamage: number; drops: { id: number; count: number; pos: THREE.Vector3 }[] } {
    let playerDamage = 0
    const drops: { id: number; count: number; pos: THREE.Vector3 }[] = []

    this.spawnTimer += dt
    if (this.spawnTimer >= 4 && this.mobs.length < this.maxMobs) {
      this.spawnTimer = 0
      this.trySpawn(playerPos, world, dayTime, hostileEnabled, passiveEnabled)
    }

    // Remove mobs of disabled types
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i]
      if (m.def.hostile && !hostileEnabled) { this.remove(i); continue }
      if (!m.def.hostile && !passiveEnabled) { this.remove(i); continue }
    }

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i]

      if (m.dead) {
        m.deathTimer -= dt
        m.mesh.rotation.z = Math.min(Math.PI / 2, m.mesh.rotation.z + dt * 3)
        m.mesh.position.y -= dt * 0.5
        if (m.deathTimer <= 0) {
          for (const d of m.def.drops) {
            const c = d.min + Math.floor(Math.random() * (d.max - d.min + 1))
            if (c > 0) drops.push({ id: d.id, count: c, pos: m.position.clone() })
          }
          this.remove(i)
        }
        continue
      }

      if (m.hurtTimer > 0) {
        m.hurtTimer -= dt
        m.mesh.visible = Math.floor(m.hurtTimer * 10) % 2 === 0
      } else {
        m.mesh.visible = true
      }

      m.aiTimer -= dt
      const dist = m.position.distanceTo(playerPos)

      if (m.def.hostile) {
        const isNight = Math.sin(dayTime * Math.PI * 2) < -0.1
        if (isNight && dist < 24) {
          m.aiState = 'chase'
        } else if (!isNight && m.aiState === 'chase') {
          m.aiState = 'wander'
          m.aiTimer = 2 + Math.random() * 3
        }

        if (m.aiState === 'chase' && dist < 1.8 && m.aiTimer <= 0) {
          playerDamage += m.def.attackDamage
          m.aiTimer = 1.0
        }
      }

      if (m.aiTimer <= 0 && m.aiState !== 'chase') {
        m.aiState = m.aiState === 'idle' ? 'wander' : 'idle'
        m.aiTimer = 2 + Math.random() * 4
        if (m.aiState === 'wander') m.yaw = Math.random() * Math.PI * 2
      }

      let mx = 0, mz = 0
      if (m.aiState === 'wander') {
        mx = Math.sin(m.yaw) * m.def.speed
        mz = Math.cos(m.yaw) * m.def.speed
      } else if (m.aiState === 'chase') {
        const dx = playerPos.x - m.position.x
        const dz = playerPos.z - m.position.z
        const d = Math.hypot(dx, dz)
        if (d > 0.5) {
          mx = (dx / d) * m.def.speed
          mz = (dz / d) * m.def.speed
          m.yaw = Math.atan2(dx, dz)
        }
      }

      m.velocity.x = mx
      m.velocity.z = mz
      m.velocity.y -= 28 * dt

      this.moveAxis(m, world, m.velocity.x * dt, 'x')
      this.moveAxis(m, world, m.velocity.z * dt, 'z')
      this.moveAxis(m, world, m.velocity.y * dt, 'y')

      m.mesh.position.copy(m.position)
      m.mesh.position.y -= m.def.eyeH
      m.mesh.rotation.y = m.yaw

      const hs = Math.hypot(m.velocity.x, m.velocity.z)
      if (hs > 0.1) {
        m.walkTime += dt * 8
        const sw = Math.sin(m.walkTime) * 0.5
        m.legL.rotation.x = sw
        m.legR.rotation.x = -sw
      } else {
        m.legL.rotation.x *= 0.9
        m.legR.rotation.x *= 0.9
      }

      if (dist > 64) this.remove(i)
    }

    return { playerDamage, drops }
  }

  hitMob(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, damage: number): boolean {
    let best: Mob | null = null
    let bestDist = maxDist

    for (const m of this.mobs) {
      if (m.dead) continue
      const to = m.position.clone().sub(origin)
      to.y -= m.def.height * 0.5 - m.def.eyeH
      const dot = to.dot(dir)
      if (dot < 0 || dot > bestDist) continue
      const perp = to.clone().sub(dir.clone().multiplyScalar(dot)).length()
      if (perp < m.def.width * 1.5) {
        best = m
        bestDist = dot
      }
    }

    if (best) {
      best.health -= damage
      best.hurtTimer = 0.5
      best.velocity.y = 4
      const kb = dir.clone().multiplyScalar(5)
      kb.y = 3
      best.velocity.add(kb)
      if (best.health <= 0) {
        best.dead = true
        best.deathTimer = 1.0
      }
      return true
    }
    return false
  }

  private trySpawn(pp: THREE.Vector3, world: World, dayTime: number, hostileOk: boolean, passiveOk: boolean): void {
    const isNight = Math.sin(dayTime * Math.PI * 2) < -0.1
    const angle = Math.random() * Math.PI * 2
    const dist = 16 + Math.random() * 24
    const x = pp.x + Math.cos(angle) * dist
    const z = pp.z + Math.sin(angle) * dist
    const gy = world.getTerrainHeight(Math.floor(x), Math.floor(z))
    if (gy <= 1) return

    let type: MobType
    if (isNight && Math.random() < 0.55 && hostileOk) {
      const h = [MobType.Zombie, MobType.Skeleton, MobType.Creeper]
      type = h[Math.floor(Math.random() * h.length)]
    } else if (passiveOk) {
      type = Math.random() < 0.5 ? MobType.Pig : MobType.Cow
    } else if (hostileOk && isNight) {
      const h = [MobType.Zombie, MobType.Skeleton, MobType.Creeper]
      type = h[Math.floor(Math.random() * h.length)]
    } else {
      return
    }

    const def = DEFS[type]
    this.spawn(type, new THREE.Vector3(x, gy + def.eyeH + 1, z))
  }

  private spawn(type: MobType, pos: THREE.Vector3): void {
    const def = DEFS[type]
    const mesh = this.buildMesh(def)
    mesh.position.copy(pos).setY(pos.y - def.eyeH)
    this.root.add(mesh)

    const legL = mesh.getObjectByName('leg-l') as THREE.Group
    const legR = mesh.getObjectByName('leg-r') as THREE.Group

    this.mobs.push({
      type, def, position: pos.clone(), velocity: new THREE.Vector3(),
      yaw: Math.random() * Math.PI * 2, health: def.health, mesh,
      aiState: 'idle', aiTimer: 2 + Math.random() * 3,
      hurtTimer: 0, grounded: false, dead: false, deathTimer: 0, walkTime: 0,
      legL, legR,
    })
  }

  private buildMesh(d: MobDef): THREE.Group {
    const g = new THREE.Group()
    const bm = new THREE.MeshLambertMaterial({ color: d.bodyColor })
    const hm = new THREE.MeshLambertMaterial({ color: d.headColor })
    const lm = new THREE.MeshLambertMaterial({ color: d.legColor })
    const em = new THREE.MeshLambertMaterial({ color: '#111' })

    if (!d.hostile) {
      // Quadruped
      const body = new THREE.Mesh(new THREE.BoxGeometry(d.width, d.height * 0.45, d.width * 1.2), bm)
      body.position.y = d.height * 0.45
      const head = new THREE.Mesh(new THREE.BoxGeometry(d.width * 0.55, d.height * 0.38, d.width * 0.45), hm)
      head.position.set(0, d.height * 0.58, d.width * 0.6)
      const le = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), em)
      le.position.set(-0.08, d.height * 0.62, d.width * 0.82)
      const re = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), em)
      re.position.set(0.08, d.height * 0.62, d.width * 0.82)
      g.add(body, head, le, re)

      const lw = d.width * 0.18, lh = d.height * 0.3
      const legL = new THREE.Group(); legL.name = 'leg-l'
      legL.position.set(-d.width * 0.28, d.height * 0.22, d.width * 0.35)
      legL.add(new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), lm).translateY(-lh / 2))
      const legR = new THREE.Group(); legR.name = 'leg-r'
      legR.position.set(d.width * 0.28, d.height * 0.22, d.width * 0.35)
      legR.add(new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), lm).translateY(-lh / 2))
      const bl = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), lm)
      bl.position.set(-d.width * 0.28, d.height * 0.22 - lh / 2, -d.width * 0.35)
      const br = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), lm)
      br.position.set(d.width * 0.28, d.height * 0.22 - lh / 2, -d.width * 0.35)
      g.add(legL, legR, bl, br)
    } else {
      // Humanoid
      const bh = d.height * 0.38
      const body = new THREE.Mesh(new THREE.BoxGeometry(d.width * 0.8, bh, d.width * 0.45), bm)
      body.position.y = d.height * 0.5
      const head = new THREE.Mesh(new THREE.BoxGeometry(d.width * 0.65, d.width * 0.65, d.width * 0.65), hm)
      head.position.y = d.height * 0.75
      const le = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), em)
      le.position.set(-0.09, d.height * 0.77, d.width * 0.33)
      const re = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), em)
      re.position.set(0.09, d.height * 0.77, d.width * 0.33)
      g.add(body, head, le, re)

      const aw = d.width * 0.18, ah = d.height * 0.32
      const al = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, aw), bm)
      al.position.set(-d.width * 0.55, d.height * 0.5, d.type === MobType.Zombie ? d.width * 0.3 : 0)
      al.rotation.x = d.type === MobType.Zombie ? -Math.PI / 3 : 0
      const ar = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, aw), bm)
      ar.position.set(d.width * 0.55, d.height * 0.5, d.type === MobType.Zombie ? d.width * 0.3 : 0)
      ar.rotation.x = d.type === MobType.Zombie ? -Math.PI / 3 : 0
      g.add(al, ar)

      const lw = d.width * 0.22, lh = d.height * 0.32
      const legL = new THREE.Group(); legL.name = 'leg-l'
      legL.position.set(-d.width * 0.2, d.height * 0.28, 0)
      legL.add(new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), lm).translateY(-lh / 2))
      const legR = new THREE.Group(); legR.name = 'leg-r'
      legR.position.set(d.width * 0.2, d.height * 0.28, 0)
      legR.add(new THREE.Mesh(new THREE.BoxGeometry(lw, lh, lw), lm).translateY(-lh / 2))
      g.add(legL, legR)
    }

    return g
  }

  private moveAxis(m: Mob, world: World, amt: number, axis: 'x' | 'y' | 'z'): void {
    if (amt === 0) return
    const p = m.position.clone()
    p[axis] += amt
    const hw = m.def.width * 0.5
    const minX = Math.floor(p.x - hw)
    const maxX = Math.floor(p.x + hw - 0.001)
    const minY = Math.floor(p.y - m.def.eyeH)
    const maxY = Math.floor(p.y - m.def.eyeH + m.def.height - 0.001)
    const minZ = Math.floor(p.z - hw)
    const maxZ = Math.floor(p.z + hw - 0.001)

    let hit = false
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (world.isSolidAt(x, y, z)) {
            hit = true
            if (axis === 'y' && amt < 0) p.y = y + 1 + m.def.eyeH
          }
        }
      }
    }

    if (!hit) {
      m.position[axis] = p[axis]
    } else if (axis === 'y') {
      if (amt < 0) { m.grounded = true; m.position.y = p.y }
      m.velocity.y = 0
    } else if (m.grounded) {
      // Step up
      const sp = m.position.clone()
      sp[axis] += amt; sp.y += 1.05
      const sy1 = Math.floor(sp.y - m.def.eyeH)
      const sy2 = Math.floor(sp.y - m.def.eyeH + m.def.height - 0.001)
      let ok = true
      for (let x = minX; x <= maxX && ok; x++)
        for (let y = sy1; y <= sy2 && ok; y++)
          for (let z = minZ; z <= maxZ && ok; z++)
            if (world.isSolidAt(x, y, z)) ok = false
      if (ok) { m.velocity.y = 7; m.grounded = false }
    }

    if (axis === 'y' && !hit) m.grounded = false
  }

  private remove(i: number): void {
    const m = this.mobs[i]
    this.root.remove(m.mesh)
    m.mesh.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.geometry.dispose()
        if (n.material instanceof THREE.Material) n.material.dispose()
      }
    })
    this.mobs.splice(i, 1)
  }

  dispose(): void {
    for (let i = this.mobs.length - 1; i >= 0; i--) this.remove(i)
    this.root.removeFromParent()
  }
}
