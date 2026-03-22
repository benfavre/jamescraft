import * as THREE from 'three'
import Stats from 'stats.js'
import { MAX_INTERACTION_DISTANCE, PLAYER_EYE_HEIGHT, PLAYER_HALF_WIDTH, PLAYER_HEIGHT } from './constants'
import { GameAudio } from './gameplay/GameAudio'
import { FeedbackEffects } from './gameplay/FeedbackEffects'
import { Playground, type PlaygroundEvent } from './gameplay/Playground'
import { SurvivalSystem } from './gameplay/Survival'
import { Inventory, ItemType, getItemLabel, getItemColor, type ToolKind } from './gameplay/Inventory'
import { MobSystem } from './gameplay/MobSystem'
import { InputController } from './player/InputController'
import { Player } from './player/Player'
import { HOTBAR_BLOCKS, getBlockDefinition, BlockId } from './world/BlockTypes'
import { traceVoxelRay, type VoxelHit } from './world/DDA'
import { World } from './world/World'
import { SkyRenderer } from './world/SkyRenderer'

interface GameSettings {
  hostileMobs: boolean
  passiveMobs: boolean
  dayNightCycle: boolean
  survival: boolean
  sound: boolean
  renderDistance: number
  fov: number
  showFps: boolean
}

const SETTINGS_KEY = 'jamescraft-settings'
const DEFAULT_SETTINGS: GameSettings = {
  hostileMobs: true,
  passiveMobs: true,
  dayNightCycle: true,
  survival: true,
  sound: true,
  renderDistance: 5,
  fov: 75,
  showFps: false,
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(s: GameSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch {}
}

export class VoxelSandboxGame {
  private static readonly BEST_RUN_STORAGE_KEY = 'voxel-sandbox-best-run-seconds'
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  private readonly stats = new Stats()
  private readonly world: World
  private readonly player: Player
  private readonly playground: Playground
  private readonly input: InputController
  private readonly highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03, 1.03, 1.03)),
    new THREE.LineBasicMaterial({ color: '#ffd166' }),
  )
  private readonly ghostBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.98, 0.98),
    new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.35, depthWrite: false }),
  )
  private readonly skyColor = new THREE.Color('#8ecdf9')
  private readonly ambientLight = new THREE.AmbientLight('#d8f0ff', 0.65)
  private readonly sunLight = new THREE.DirectionalLight('#fff5de', 1.35)
  private dayNightTime = 0.25

  // New systems
  private readonly survival = new SurvivalSystem()
  private readonly inventory = new Inventory()
  private readonly mobs: MobSystem
  private readonly sky: SkyRenderer
  private readonly audio = new GameAudio()
  private readonly effects: FeedbackEffects

  // HUD elements
  private readonly startCard = document.createElement('div')
  private readonly debugOverlay = document.createElement('div')
  private readonly hotbar = document.createElement('div')
  private readonly mobileBlockToggle = document.createElement('button')
  private readonly hotbarButtons: HTMLButtonElement[] = []
  private readonly celebrationToast = document.createElement('div')
  private readonly boostOverlay = document.createElement('div')
  private readonly pauseMenu = document.createElement('div')
  private readonly settingsPanel = document.createElement('div')
  private debugVisible = false
  private hudVisible = true
  private pauseMenuOpen = false
  private settingsOpen = false
  private gameStarted = false
  private readonly settings: GameSettings

  // Survival HUD
  private readonly healthBar = document.createElement('div')
  private readonly hungerBar = document.createElement('div')
  private readonly deathScreen = document.createElement('div')
  private readonly inventoryPanel = document.createElement('div')

  // Playground (kept for backwards compat)
  private readonly completedMissions = new Set<string>()

  // State
  private currentTarget: VoxelHit | null = null
  private selectedSlot = 0
  private disposed = false
  private lastFrameTime = performance.now()
  private mobileIntroDismissed = false
  private mobileHotbarExpanded = false
  private celebrationTimer = 0
  private boostOverlayTimer = 0
  private runSeconds = 0
  private courseFinished = false
  private inventoryOpen = false
  private breakProgress = 0
  private breakingBlock: THREE.Vector3 | null = null
  private hurtFlashTimer = 0
  private stepTimer = 0
  private wasPaused = false
  private readonly frozenCameraQuat = new THREE.Quaternion()
  private readonly frozenCameraPos = new THREE.Vector3()

  constructor(private readonly mountNode: HTMLElement) {
    this.settings = loadSettings()
    this.mountNode.innerHTML = ''
    this.mountNode.className = 'game-shell'

    this.camera.fov = this.settings.fov
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.domElement.className = 'game-canvas'
    this.mountNode.append(this.renderer.domElement)

    this.scene.background = this.skyColor
    this.scene.fog = new THREE.Fog(this.skyColor, 60, 200)

    this.setupLights()

    this.world = new World(this.scene)
    this.player = new Player(this.camera, this.renderer.domElement, this.world.getSpawnPoint())
    this.world.primeAround(this.player.position)
    this.playground = new Playground(this.scene, this.world, this.player.position)
    this.effects = new FeedbackEffects(this.scene)
    this.mobs = new MobSystem(this.scene)
    this.sky = new SkyRenderer()
    this.scene.add(this.sky.root)
    this.scene.add(this.player.avatar.root)

    this.survival.state.lastGroundedY = this.player.position.y

    this.input = new InputController(() => {
      if (this.pauseMenuOpen || this.settingsOpen || this.inventoryOpen) return
      if (!this.survival.state.alive && this.settings.survival) return
      this.player.controls.lock()
    })
    this.mountNode.classList.toggle('touch-mode', this.input.isTouchMode())
    this.readBestRunSeconds()

    this.highlight.visible = false
    this.scene.add(this.highlight)
    this.ghostBlock.visible = false
    this.ghostBlock.renderOrder = 2
    this.scene.add(this.ghostBlock)

    this.player.controls.addEventListener('lock', this.syncLockState)
    this.player.controls.addEventListener('unlock', this.syncLockState)
    this.syncLockState()

    this.stats.showPanel(0)
    this.stats.dom.className = 'stats-panel'
    this.stats.dom.style.display = this.settings.showFps ? 'block' : 'none'
    this.mountNode.append(this.stats.dom)

    this.mountNode.append(this.createHud())
    this.updateSelectedSlot(0)

    window.addEventListener('resize', this.handleResize)
    this.renderer.setAnimationLoop(this.animate)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    window.removeEventListener('resize', this.handleResize)
    this.renderer.setAnimationLoop(null)
    this.input.dispose()
    this.player.controls.removeEventListener('lock', this.syncLockState)
    this.player.controls.removeEventListener('unlock', this.syncLockState)
    this.highlight.geometry.dispose()
    ;(this.highlight.material as THREE.Material).dispose()
    this.ghostBlock.geometry.dispose()
    ;(this.ghostBlock.material as THREE.Material).dispose()
    this.audio.dispose()
    this.effects.dispose()
    this.player.avatar.dispose()
    this.playground.dispose()
    this.mobs.dispose()
    this.sky.dispose()
    this.world.dispose()
    this.renderer.dispose()
  }

  /** True when any menu/overlay is open and gameplay should freeze. */
  private isGamePaused(): boolean {
    return !this.gameStarted
      || this.pauseMenuOpen || this.settingsOpen || this.inventoryOpen
      || (!this.survival.state.alive && this.settings.survival)
  }

  /**
   * Final authority on pointer lock and camera state. Runs RIGHT BEFORE
   * render so nothing can modify the camera after this call.
   * - Forces pointer unlock whenever any menu is open
   * - Forces camera freeze (overwrites any PointerLockControls changes)
   * - Toggles cursor CSS
   */
  private enforceMenuState(): void {
    const menuOpen = this.pauseMenuOpen || this.settingsOpen || this.inventoryOpen
      || (!this.survival.state.alive && this.settings.survival)
      || !this.gameStarted

    // Force pointer unlock — if pointer is locked while a menu is open,
    // the user can't see or use their cursor.
    if (menuOpen && document.pointerLockElement) {
      document.exitPointerLock()
    }

    // Force camera freeze — PointerLockControls has its own mousemove
    // listener that modifies camera.quaternion directly. We overwrite
    // it here so the rendered frame always shows the frozen view.
    if (menuOpen) {
      this.camera.quaternion.copy(this.frozenCameraQuat)
      this.camera.position.copy(this.frozenCameraPos)
    }

    this.mountNode.classList.toggle('menu-open', menuOpen)
  }

  private readonly animate = (): void => {
    const now = performance.now()
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05)
    this.lastFrameTime = now

    this.stats.begin()

    // ── Menu input (always processed) ──
    if (this.input.consumeHudToggle()) {
      this.hudVisible = !this.hudVisible
      this.mountNode.classList.toggle('hud-hidden', !this.hudVisible)
    }
    if (this.input.consumeInventoryToggle()) this.toggleInventory()
    if (this.input.consumeDebugToggle()) {
      this.debugVisible = !this.debugVisible
      this.debugOverlay.classList.toggle('visible', this.debugVisible)
    }
    if (this.input.consumePauseToggle()) {
      if (this.settingsOpen) {
        this.closeSettings()
      } else if (this.inventoryOpen) {
        this.toggleInventory()
      } else if (this.pauseMenuOpen) {
        this.resumeGame()
      } else if (this.gameStarted && this.survival.state.alive) {
        this.pauseMenuOpen = true
        this.pauseMenu.classList.add('visible')
        this.frozenCameraQuat.copy(this.camera.quaternion)
        this.frozenCameraPos.copy(this.camera.position)
        if (document.pointerLockElement) document.exitPointerLock()
      }
    }
    if (this.input.consumeEscape()) {
      if (this.settingsOpen) {
        this.closeSettings()
      } else if (this.inventoryOpen) {
        this.toggleInventory()
      } else if (this.pauseMenuOpen) {
        this.resumeGame()
      }
    }

    // ── Pause state ──
    const paused = this.isGamePaused()

    // Snapshot camera on pause entry
    if (paused && !this.wasPaused) {
      this.frozenCameraQuat.copy(this.camera.quaternion)
      this.frozenCameraPos.copy(this.camera.position)
    }
    this.wasPaused = paused

    if (!paused) {
      // ── Gameplay updates (only when active) ──
      this.world.update(this.player.position)
      this.player.update(dt, this.input, this.world)

      const slotSelection = this.input.consumeSlotSelection()
      if (slotSelection !== null) this.updateSelectedSlot(slotSelection)
      if (this.input.consumeCameraToggle()) this.player.toggleCameraMode()

      this.handlePlaygroundEvents(this.playground.update(dt, this.player, now / 1000))
      this.trackTimers(dt)
      if (this.settings.dayNightCycle) this.updateDayNightCycle(dt)
      this.sky.update(this.player.position, this.dayNightTime)

      // Mobs
      if (this.settings.hostileMobs || this.settings.passiveMobs) {
        const mobResult = this.mobs.update(dt, this.player.position, this.world, this.dayNightTime,
          this.settings.hostileMobs, this.settings.passiveMobs)
        if (mobResult.playerDamage > 0 && this.survival.state.alive && this.settings.survival) {
          const died = this.survival.takeDamage(mobResult.playerDamage)
          this.playSound('hurt')
          this.hurtFlashTimer = 0.3
          if (died) this.handleDeath()
        }
        for (const drop of mobResult.drops) {
          this.inventory.addItem(drop.id, ItemType.Food, drop.count)
        }
      }

      // Survival
      if (this.settings.survival && this.survival.state.alive) {
        const sv = this.survival.update(dt, this.player.position.y, this.player.isGrounded, this.player.inWater)
        if (sv.damaged) {
          this.playSound('hurt')
          this.hurtFlashTimer = 0.3
        }
        if (sv.died) this.handleDeath()
      }

      // Footstep sounds
      if (this.player.isGrounded && Math.hypot(this.player.velocity.x, this.player.velocity.z) > 1) {
        this.stepTimer += dt
        if (this.stepTimer > 0.4) { this.stepTimer = 0; this.playSound('step') }
      } else {
        this.stepTimer = 0.3
      }

      this.updateTarget()
      this.updateGhostBlock()
      this.applyBlockEditing(dt)
      this.effects.update(dt)
    } else {
      // Discard all gameplay inputs while paused
      this.input.consumeSlotSelection()
      this.input.consumeCameraToggle()
      this.input.consumePrimaryAction()
      this.input.consumeSecondaryAction()
    }

    this.updateHud()
    this.input.endFrame()
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt

    // ── FINAL AUTHORITY: enforce correct state right before render ──
    this.enforceMenuState()

    this.renderer.render(this.scene, this.camera)
    this.stats.end()
  }

  private setupLights(): void {
    this.sunLight.position.set(48, 72, 24)
    this.scene.add(this.ambientLight, this.sunLight)
  }

  private createHud(): HTMLElement {
    const hud = document.createElement('div')
    hud.className = 'hud'
    const touchMode = this.input.isTouchMode()

    // ── Start Screen ──
    this.startCard.className = 'start-card'
    const startTitle = document.createElement('h1')
    startTitle.className = 'start-title'
    startTitle.textContent = 'JamesCraft'
    const startSub = document.createElement('p')
    startSub.className = 'start-subtitle'
    startSub.textContent = 'A survival voxel sandbox with biomes, ores, mobs, crafting & day/night cycle.'
    const startBtn = document.createElement('button')
    startBtn.type = 'button'
    startBtn.className = 'start-button'
    startBtn.textContent = touchMode ? 'PLAY' : 'SINGLEPLAYER'
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.audio.unlock()
      if (touchMode) { this.dismissMobileIntro(); return }
      this.player.controls.lock()
    })

    const startControls = document.createElement('ul')
    startControls.className = 'start-controls'
    if (!touchMode) {
      startControls.innerHTML = `
        <li><strong>WASD</strong> Move &nbsp; <strong>Space</strong> Jump &nbsp; <strong>Shift</strong> Sneak</li>
        <li><strong>Hold LMB</strong> Break block &nbsp; <strong>RMB</strong> Place block</li>
        <li><strong>1-9</strong> Hotbar &nbsp; <strong>E</strong> Inventory &nbsp; <strong>V</strong> Camera &nbsp; <strong>F3</strong> Debug</li>
        <li><strong>Tip:</strong> Punch trees to get wood, then craft tools!</li>
      `
    }

    const startVer = document.createElement('span')
    startVer.className = 'start-version'
    startVer.textContent = 'JamesCraft v0.2.0'

    const settingsBtn = document.createElement('button')
    settingsBtn.type = 'button'
    settingsBtn.className = 'start-button start-button-secondary'
    settingsBtn.textContent = 'SETTINGS'
    settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openSettings() })

    this.startCard.append(startTitle, startSub, startBtn, settingsBtn, startControls, startVer)

    if (!touchMode) {
      this.startCard.addEventListener('click', () => {
        if (this.player.isLocked || this.settingsOpen || this.pauseMenuOpen) return
        this.audio.unlock()
        this.player.controls.lock()
      })
    }

    // ── Debug Overlay (F3) ──
    this.debugOverlay.className = 'debug-overlay'
    this.debugOverlay.id = 'debug-overlay'

    // ── Hotbar (Minecraft-style) ──
    this.hotbar.className = 'hotbar'
    HOTBAR_BLOCKS.forEach((block, index) => {
      const def = getBlockDefinition(block)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'hslot'
      const swatch = document.createElement('div')
      swatch.className = 'hslot-swatch'
      swatch.style.background = def.baseColor
      const key = document.createElement('span')
      key.className = 'hslot-key'
      key.textContent = String(index + 1)
      const name = document.createElement('span')
      name.className = 'hslot-name'
      name.textContent = def.label
      btn.append(swatch, key, name)
      btn.addEventListener('click', () => {
        this.updateSelectedSlot(index)
        if (this.input.isTouchMode()) this.setMobileHotbarExpanded(false)
      })
      this.hotbarButtons.push(btn)
      this.hotbar.append(btn)
    })

    // ── Crosshair ──
    const crosshair = document.createElement('div')
    crosshair.className = 'crosshair'
    crosshair.innerHTML = '<span></span><span></span>'

    // ── Survival HUD (hearts + hunger) ──
    this.healthBar.className = 'health-bar'
    this.hungerBar.className = 'hunger-bar'
    const survivalHud = document.createElement('div')
    survivalHud.className = 'survival-hud'
    survivalHud.id = 'survival-hud'
    survivalHud.append(this.healthBar, this.hungerBar)

    // ── Death Screen ──
    this.deathScreen.className = 'death-screen'
    const deathTitle = document.createElement('h1')
    deathTitle.textContent = 'You Died!'
    const deathSub = document.createElement('p')
    deathSub.className = 'death-sub'
    deathSub.innerHTML = 'Score: <strong id="death-score">0</strong>'
    const respawnBtn = document.createElement('button')
    respawnBtn.type = 'button'
    respawnBtn.className = 'start-button'
    respawnBtn.textContent = 'RESPAWN'
    respawnBtn.addEventListener('click', () => this.handleRespawn())
    const titleBtn = document.createElement('button')
    titleBtn.type = 'button'
    titleBtn.className = 'start-button'
    titleBtn.textContent = 'TITLE SCREEN'
    titleBtn.style.opacity = '0.6'
    titleBtn.addEventListener('click', () => window.location.reload())
    this.deathScreen.append(deathTitle, deathSub, respawnBtn, titleBtn)

    // ── Inventory Panel ──
    this.inventoryPanel.className = 'inventory-panel'

    // ── Pause Menu ──
    this.pauseMenu.className = 'pause-menu'
    this.pauseMenu.innerHTML = '<h2>Game Paused</h2>'
    const resumeBtn = document.createElement('button')
    resumeBtn.type = 'button'
    resumeBtn.className = 'start-button'
    resumeBtn.textContent = 'RESUME'
    resumeBtn.addEventListener('click', () => this.resumeGame())
    const pauseSettingsBtn = document.createElement('button')
    pauseSettingsBtn.type = 'button'
    pauseSettingsBtn.className = 'start-button start-button-secondary'
    pauseSettingsBtn.textContent = 'SETTINGS'
    pauseSettingsBtn.addEventListener('click', () => this.openSettings())
    const pauseTitleBtn = document.createElement('button')
    pauseTitleBtn.type = 'button'
    pauseTitleBtn.className = 'start-button start-button-secondary'
    pauseTitleBtn.textContent = 'TITLE SCREEN'
    pauseTitleBtn.addEventListener('click', () => window.location.reload())
    this.pauseMenu.append(resumeBtn, pauseSettingsBtn, pauseTitleBtn)

    // ── Settings Panel ──
    this.settingsPanel.className = 'settings-panel'

    // ── Toasts & Overlays ──
    this.celebrationToast.className = 'celebration-toast'
    this.celebrationToast.setAttribute('aria-live', 'polite')
    this.boostOverlay.className = 'boost-overlay'
    this.boostOverlay.innerHTML = Array.from({ length: 10 }, () => '<span></span>').join('')

    const breakBar = document.createElement('div')
    breakBar.className = 'break-bar'
    breakBar.id = 'break-bar'
    const hurtOverlay = document.createElement('div')
    hurtOverlay.className = 'hurt-overlay'
    hurtOverlay.id = 'hurt-overlay'

    hud.append(
      this.startCard, this.debugOverlay, survivalHud,
      this.celebrationToast, this.boostOverlay,
      this.hotbar, crosshair,
      this.deathScreen, this.inventoryPanel,
      this.pauseMenu, this.settingsPanel,
      breakBar, hurtOverlay,
    )

    if (touchMode) hud.append(this.createMobileControls())
    return hud
  }

  private updateTarget(): void {
    this.currentTarget = traceVoxelRay(
      this.player.getInteractionOrigin(),
      this.player.getLookDirection(),
      MAX_INTERACTION_DISTANCE,
      (x, y, z) => this.world.getBlock(x, y, z),
    )
    if (!this.currentTarget) { this.highlight.visible = false; return }
    this.highlight.visible = true
    this.highlight.position.set(
      this.currentTarget.block.x + 0.5,
      this.currentTarget.block.y + 0.5,
      this.currentTarget.block.z + 0.5,
    )
  }

  private updateGhostBlock(): void {
    if (!this.currentTarget || !this.input.isInteractionEnabled(this.player.isLocked)) {
      this.ghostBlock.visible = false; return
    }
    const pp = this.currentTarget.adjacent
    if (!this.world.isWithinBuildHeight(pp.y)) { this.ghostBlock.visible = false; return }
    const blockDef = getBlockDefinition(HOTBAR_BLOCKS[this.selectedSlot])
    const mat = this.ghostBlock.material as THREE.MeshLambertMaterial
    mat.color.set(blockDef.baseColor)
    this.ghostBlock.visible = true
    this.ghostBlock.position.set(pp.x + 0.5, pp.y + 0.5, pp.z + 0.5)
  }

  private updateDayNightCycle(dt: number): void {
    this.dayNightTime = (this.dayNightTime + dt * 0.008) % 1
    const sunAngle = this.dayNightTime * Math.PI * 2
    const sunHeight = Math.sin(sunAngle)
    const sunHoriz = Math.cos(sunAngle)
    this.sunLight.position.set(sunHoriz * 48, Math.max(sunHeight * 72, 2), 24)
    const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.15) / 0.65))
    const nightSky = new THREE.Color('#0a1628')
    const daySky = new THREE.Color('#8ecdf9')
    const sunsetSky = new THREE.Color('#ff9966')
    const sunsetFactor = Math.max(0, 1 - Math.abs(sunHeight) * 4) * (sunHeight >= -0.1 ? 1 : 0)
    const sky = daySky.clone().lerp(nightSky, 1 - dayFactor).lerp(sunsetSky, sunsetFactor * 0.4)
    this.skyColor.copy(sky)
    this.scene.background = this.skyColor
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(this.skyColor)
    this.ambientLight.intensity = 0.15 + dayFactor * 0.5
    this.sunLight.intensity = 0.2 + dayFactor * 1.15
    const sunColor = new THREE.Color('#fff5de').lerp(new THREE.Color('#ff8844'), sunsetFactor * 0.6)
    this.sunLight.color.copy(sunColor)
  }

  private applyBlockEditing(dt: number): void {
    if (!this.input.isInteractionEnabled(this.player.isLocked) || !this.currentTarget || !this.survival.state.alive) {
      this.input.consumePrimaryAction()
      this.input.consumeSecondaryAction()
      this.breakProgress = 0
      return
    }

    // Block breaking with progress
    if (this.input.isPrimaryHeld()) {
      const bx = this.currentTarget.block.x
      const by = this.currentTarget.block.y
      const bz = this.currentTarget.block.z

      // Reset progress if target changed
      if (!this.breakingBlock || this.breakingBlock.x !== bx || this.breakingBlock.y !== by || this.breakingBlock.z !== bz) {
        this.breakProgress = 0
        this.breakingBlock = new THREE.Vector3(bx, by, bz)
      }

      const blockId = this.world.getBlock(bx, by, bz)
      const blockDef = getBlockDefinition(blockId)

      if (blockDef.hardness < Infinity) {
        // Calculate tool speed
        let toolSpeed = 1
        const hotbarItem = this.inventory.getHotbarSlot(this.selectedSlot)
        if (hotbarItem?.type === ItemType.Tool && hotbarItem.toolKind !== undefined) {
          const toolMatch = this.toolMatchesBlock(hotbarItem.toolKind, blockDef.preferredTool)
          if (toolMatch) {
            const tierSpeed = [2, 4, 6, 8]
            toolSpeed = tierSpeed[hotbarItem.toolTier ?? 0]
          }
        }

        const breakTime = Math.max(0.05, blockDef.hardness / toolSpeed)
        this.breakProgress += dt / breakTime

        if (this.breakProgress >= 1) {
          this.world.setBlock(bx, by, bz, BlockId.Air)
          this.playSound('break')

          // Drop as item (stone drops cobblestone)
          let dropId = blockId as number
          if (blockId === BlockId.Stone) dropId = BlockId.Cobblestone
          this.inventory.addItem(dropId, ItemType.Block, 1)

          // Damage tool
          if (hotbarItem?.type === ItemType.Tool) {
            const broke = this.inventory.damageTool(this.selectedSlot)
            if (broke) this.showCelebration('Tool broke!')
          }

          this.effects.spawnBurst({
            count: 10,
            origin: new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5),
            colors: [blockDef.baseColor, '#ffffff', '#888888'],
            speed: [1.8, 3.5], spread: 0.5, lifetime: [0.3, 0.55], scale: [0.06, 0.12], gravity: 8,
          })

          this.breakProgress = 0
          this.breakingBlock = null

          // Try to hit mob behind block
          this.mobs.hitMob(this.player.getInteractionOrigin(), this.player.getLookDirection(), MAX_INTERACTION_DISTANCE, 1)
        }
      }
    } else {
      this.breakProgress = 0
      this.breakingBlock = null

      // Single-click mob attack
      if (this.input.consumePrimaryAction()) {
        let dmg = 1
        const item = this.inventory.getHotbarSlot(this.selectedSlot)
        if (item?.type === ItemType.Tool && item.toolKind === 3) { // Sword
          dmg = [4, 5, 6, 7][item.toolTier ?? 0]
        }
        if (this.mobs.hitMob(this.player.getInteractionOrigin(), this.player.getLookDirection(), MAX_INTERACTION_DISTANCE, dmg)) {
          this.playSound('mobHit')
          if (item?.type === ItemType.Tool) this.inventory.damageTool(this.selectedSlot)
        }
      }
    }

    if (this.input.consumeSecondaryAction()) {
      const pp = this.currentTarget.adjacent
      if (!this.world.isWithinBuildHeight(pp.y)) return

      const nextBlock = HOTBAR_BLOCKS[this.selectedSlot]
      if (this.world.getBlock(pp.x, pp.y, pp.z) !== BlockId.Air) return
      if (this.blockWouldOverlapPlayer(pp)) return

      this.world.setBlock(pp.x, pp.y, pp.z, nextBlock)
      this.playSound('place')
      this.effects.spawnBurst({
        count: 8,
        origin: new THREE.Vector3(pp.x + 0.5, pp.y + 0.5, pp.z + 0.5),
        colors: ['#fff4cb', '#8fe9ff', '#9df0b8'],
        speed: [1.4, 3], spread: 0.35, lifetime: [0.28, 0.5], scale: [0.05, 0.1], gravity: 6,
      })
    }
  }

  private toolMatchesBlock(toolKind: ToolKind, preferred: string): boolean {
    const map: Record<number, string> = { 0: 'pickaxe', 1: 'axe', 2: 'shovel', 3: 'sword' }
    return map[toolKind] === preferred
  }

  private updateHud(): void {
    // Debug overlay (F3)
    if (this.debugVisible) {
      const pos = this.player.position
      const biome = this.world.generator.getBiomeDefinitionAt(Math.floor(pos.x), Math.floor(pos.z))
      this.debugOverlay.innerHTML = `
        <span class="debug-item">JamesCraft v0.2.0</span>
        <span class="debug-item">${this.player.currentCameraMode === 'third-person' ? '3rd Person' : '1st Person'} | Chunks: ${this.world.getLoadedChunkCount()}</span>
        <span class="debug-item">XYZ: ${pos.x.toFixed(1)} / ${pos.y.toFixed(1)} / ${pos.z.toFixed(1)}</span>
        <span class="debug-item">Biome: ${biome.name}</span>
        <span class="debug-item">${this.currentTarget ? `Looking at: ${this.currentTarget.block.x}, ${this.currentTarget.block.y}, ${this.currentTarget.block.z}` : ''}</span>
        <span class="debug-item">Health: ${this.survival.state.health}/${this.survival.state.maxHealth} | Hunger: ${this.survival.state.hunger}/${this.survival.state.maxHunger}</span>
      `
    }

    // Survival HUD
    this.updateSurvivalHud()
    this.updateCelebrationToast()
    this.boostOverlay.classList.toggle('active', this.boostOverlayTimer > 0)
    this.boostOverlay.style.setProperty('--boost-strength', this.boostOverlayTimer.toFixed(2))

    // Break progress bar
    const breakBar = document.getElementById('break-bar')
    if (breakBar) {
      breakBar.style.width = `${Math.min(1, this.breakProgress) * 100}%`
      breakBar.classList.toggle('active', this.breakProgress > 0)
    }

    // Hurt overlay
    const hurtOverlay = document.getElementById('hurt-overlay')
    if (hurtOverlay) {
      hurtOverlay.classList.toggle('active', this.hurtFlashTimer > 0)
    }

    // Death screen
    this.deathScreen.classList.toggle('visible', !this.survival.state.alive && this.settings.survival)

    // Low health shake / hide survival HUD
    const survHud = document.getElementById('survival-hud')
    if (survHud) {
      survHud.classList.toggle('low-health', this.survival.state.health <= 4 && this.survival.state.alive && this.settings.survival)
      survHud.style.display = this.settings.survival ? '' : 'none'
    }

    // Hotbar
    this.hotbarButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === this.selectedSlot)
    })
  }

  private updateSurvivalHud(): void {
    const s = this.survival.state

    // Hearts
    let hearts = ''
    for (let i = 0; i < 10; i++) {
      const hp = i * 2
      if (s.health > hp + 1) hearts += '<span class="heart full"></span>'
      else if (s.health > hp) hearts += '<span class="heart half"></span>'
      else hearts += '<span class="heart empty"></span>'
    }
    this.healthBar.innerHTML = hearts

    // Hunger
    let hunger = ''
    for (let i = 0; i < 10; i++) {
      const hp = i * 2
      if (s.hunger > hp + 1) hunger += '<span class="drumstick full"></span>'
      else if (s.hunger > hp) hunger += '<span class="drumstick half"></span>'
      else hunger += '<span class="drumstick empty"></span>'
    }
    this.hungerBar.innerHTML = hunger
  }

  private updateSelectedSlot(index: number): void {
    this.selectedSlot = index
    this.hotbarButtons.forEach((btn, i) => btn.classList.toggle('active', i === index))
    this.refreshMobileBlockToggle()
    this.breakProgress = 0
  }

  private readonly syncLockState = (): void => {
    if (this.input.isTouchMode()) {
      this.startCard.classList.toggle('hidden', this.mobileIntroDismissed)
      return
    }

    const locked = this.player.isLocked

    if (locked) {
      // Safety: if player is dead, don't allow pointer lock
      if (!this.survival.state.alive && this.settings.survival) {
        this.player.controls.unlock()
        return
      }
      // Pointer just locked — hide all menus, game is active
      this.gameStarted = true
      this.startCard.classList.add('hidden')
      this.pauseMenu.classList.remove('visible')
      this.pauseMenuOpen = false
      this.settingsPanel.classList.remove('visible')
      this.settingsOpen = false
      this.inventoryPanel.classList.remove('visible')
      this.inventoryOpen = false
      return
    }

    // Pointer just unlocked
    if (!this.gameStarted) {
      // Haven't entered the game yet — show start card
      this.startCard.classList.remove('hidden')
      return
    }

    // Game was running, pointer released (Escape or focus loss)
    // Snapshot camera immediately so enforceMenuState() can freeze it
    this.frozenCameraQuat.copy(this.camera.quaternion)
    this.frozenCameraPos.copy(this.camera.position)

    // Show pause menu unless settings, inventory, or death screen is open
    if (!this.settingsOpen && !this.inventoryOpen && this.survival.state.alive) {
      this.startCard.classList.add('hidden')
      this.pauseMenuOpen = true
      this.pauseMenu.classList.add('visible')
      // The keydown for Escape fires BEFORE the unlock event, so a queued
      // escape would immediately close the pause menu we just opened. Eat it.
      this.input.consumeEscape()
    }
  }

  private readonly handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private trackTimers(dt: number): void {
    if (this.celebrationTimer > 0) this.celebrationTimer = Math.max(0, this.celebrationTimer - dt)
    if (this.boostOverlayTimer > 0) this.boostOverlayTimer = Math.max(0, this.boostOverlayTimer - dt)
    if (!this.courseFinished && this.isRunActive()) this.runSeconds += dt
  }

  private handlePlaygroundEvents(events: PlaygroundEvent[]): void {
    for (const event of events) {
      if (event.type === 'star-collected') {
        this.playSound('star')
        this.effects.spawnBurst({
          count: 12, origin: this.player.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
          colors: ['#ffe56f', '#fff7c2', '#ffd166'], speed: [2.4, 4.8], spread: 0.65, lifetime: [0.45, 0.8], scale: [0.08, 0.14], gravity: 6,
        })
        this.completedMissions.add('star')
        this.showCelebration(`Stars ${event.collected}/${event.total}`)
      }
      if (event.type === 'pad-used') {
        this.playSound('boost')
        this.boostOverlayTimer = Math.max(this.boostOverlayTimer, 0.65)
        this.completedMissions.add('pad')
      }
      if (event.type === 'ring-cleared') {
        this.playSound('ring')
        this.completedMissions.add('ring')
        this.showCelebration('Ring cleared!')
      }
      if (event.type === 'crate-smashed') { this.playSound('smash'); this.completedMissions.add('crate') }
      if (event.type === 'bridge-complete') { this.playSound('bridge'); this.completedMissions.add('bridge') }
      if (event.type === 'goal-reached') {
        this.completedMissions.add('goal')
        this.courseFinished = true
        this.playSound('victory')
        this.showCelebration('Course complete!')
      }
    }
  }

  private showCelebration(message: string): void {
    this.celebrationToast.textContent = message
    this.celebrationToast.classList.add('visible')
    this.celebrationTimer = 2.4
  }

  private updateCelebrationToast(): void {
    this.celebrationToast.classList.toggle('visible', this.celebrationTimer > 0)
  }

  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen
    this.inventoryPanel.classList.toggle('visible', this.inventoryOpen)
    if (this.inventoryOpen) {
      this.renderInventory()
      this.frozenCameraQuat.copy(this.camera.quaternion)
      this.frozenCameraPos.copy(this.camera.position)
      // Force pointer free — enforceMenuState() also does this but we
      // want immediate effect so the cursor is visible right away
      if (document.pointerLockElement) document.exitPointerLock()
    } else {
      // Closing inventory — resume gameplay
      if (!this.input.isTouchMode() && this.gameStarted) {
        this.player.controls.lock()
      }
    }
  }

  private renderInventory(): void {
    const renderSlot = (i: number, isHotbar: boolean): string => {
      const item = this.inventory.slots[i]
      const cls = isHotbar ? 'inv-slot hotbar-slot' : 'inv-slot'
      if (item) {
        const color = getItemColor(item.id)
        const label = getItemLabel(item.id)
        const durBar = item.durability !== undefined && item.maxDurability
          ? `<div class="dur-bar" style="width:${(item.durability / item.maxDurability * 100)}%"></div>` : ''
        return `<div class="${cls}" data-slot="${i}" style="--item-color:${color}" title="${label}${item.count > 1 ? ' x' + item.count : ''}">
          <div class="inv-slot-swatch" style="background:${color}"></div>
          <span class="inv-count">${item.count > 1 ? item.count : ''}</span>
          <span class="inv-label">${label}</span>${durBar}</div>`
      }
      return `<div class="${cls}" data-slot="${i}"></div>`
    }

    let html = '<div class="inv-header"><h2>Inventory</h2><button class="inv-close" type="button">&times;</button></div>'
    html += '<div class="inv-body">'

    // Crafting
    html += '<div class="craft-section"><p class="inv-section-label">Crafting</p>'
    html += '<div class="craft-area"><div class="craft-grid">'
    for (let i = 0; i < 4; i++) html += '<div class="craft-slot" data-craft="' + i + '"></div>'
    html += '</div><div class="craft-arrow">&rarr;</div><div class="craft-output"></div></div></div>'

    // Main inventory
    html += '<p class="inv-section-label">Inventory</p><div class="inv-grid">'
    for (let i = 9; i < 36; i++) html += renderSlot(i, false)
    html += '</div>'

    // Hotbar
    html += '<p class="inv-section-label">Hotbar</p><div class="inv-grid">'
    for (let i = 0; i < 9; i++) html += renderSlot(i, true)
    html += '</div>'

    html += '<p class="inv-hint">Click items to move between hotbar and inventory. Press E or &times; to close.</p>'
    html += '</div>'
    this.inventoryPanel.innerHTML = html

    // Close button
    this.inventoryPanel.querySelector('.inv-close')?.addEventListener('click', () => this.toggleInventory())

    // Click handlers
    this.inventoryPanel.querySelectorAll('.inv-slot').forEach(el => {
      el.addEventListener('click', () => {
        const slot = Number((el as HTMLElement).dataset.slot)
        if (slot >= 9 && this.inventory.slots[slot]) {
          for (let h = 0; h < 9; h++) {
            if (!this.inventory.slots[h]) { this.inventory.swapSlots(slot, h); this.renderInventory(); return }
          }
        } else if (slot < 9 && this.inventory.slots[slot]) {
          for (let m = 9; m < 36; m++) {
            if (!this.inventory.slots[m]) { this.inventory.swapSlots(slot, m); this.renderInventory(); return }
          }
        }
      })
    })
  }

  private handleDeath(): void {
    this.playSound('die')
    this.hurtFlashTimer = 1.0
    this.frozenCameraQuat.copy(this.camera.quaternion)
    this.frozenCameraPos.copy(this.camera.position)
    const scoreEl = this.deathScreen.querySelector('#death-score')
    if (scoreEl) scoreEl.textContent = Math.floor(this.runSeconds).toString()
    // Force unlock so user can click Respawn — enforceMenuState() will
    // also do this, but we do it here for immediate effect
    if (document.pointerLockElement) document.exitPointerLock()
  }

  private handleRespawn(): void {
    this.survival.respawn()
    const spawn = this.world.getSpawnPoint()
    this.player.teleportTo(spawn)
    this.survival.state.lastGroundedY = spawn.y
    // Clear ALL menu/overlay state
    this.deathScreen.classList.remove('visible')
    this.pauseMenu.classList.remove('visible')
    this.pauseMenuOpen = false
    this.settingsPanel.classList.remove('visible')
    this.settingsOpen = false
    this.inventoryPanel.classList.remove('visible')
    this.inventoryOpen = false
    this.startCard.classList.add('hidden')
    this.hurtFlashTimer = 0
    this.breakProgress = 0
    this.breakingBlock = null
    if (!this.input.isTouchMode()) this.player.controls.lock()
  }

  private createMobileControls(): HTMLElement {
    const mc = document.createElement('div')
    mc.className = 'mobile-controls'

    const lookZone = document.createElement('div')
    lookZone.id = 'look-zone'
    lookZone.className = 'look-zone'
    lookZone.innerHTML = '<span>LOOK</span>'

    const joystick = document.createElement('div')
    joystick.id = 'move-joystick'
    joystick.className = 'joystick'
    joystick.innerHTML = '<div class="joystick-ring"></div><div class="joystick-thumb"></div>'
    const thumb = joystick.querySelector<HTMLDivElement>('.joystick-thumb')!

    const actions = document.createElement('div')
    actions.className = 'mobile-actions'
    actions.innerHTML = `
      <button id="action-break" class="action-btn action-break" type="button">BREAK</button>
      <button id="action-place" class="action-btn action-place" type="button">PLACE</button>
      <button id="action-jump" class="action-btn action-jump" type="button">JUMP</button>
      <button id="action-sneak" class="action-btn action-sneak" type="button">SNEAK</button>
      <button id="action-camera" class="action-btn action-camera" type="button">CAM</button>
    `

    this.mobileBlockToggle.type = 'button'
    this.mobileBlockToggle.id = 'mobile-block-toggle'
    this.mobileBlockToggle.className = 'mobile-block-toggle'
    this.mobileBlockToggle.addEventListener('click', () => this.setMobileHotbarExpanded(!this.mobileHotbarExpanded))
    this.refreshMobileBlockToggle()

    this.bindJoystick(joystick, thumb)
    this.bindLookZone(lookZone)
    this.bindTouchActions(actions)

    mc.append(lookZone, joystick, this.mobileBlockToggle, actions)
    return mc
  }

  private setMobileHotbarExpanded(expanded: boolean): void {
    this.mobileHotbarExpanded = expanded
    this.hotbar.classList.toggle('expanded', expanded)
    this.refreshMobileBlockToggle()
  }

  private refreshMobileBlockToggle(): void {
    if (!this.input.isTouchMode()) return
    const selected = getBlockDefinition(HOTBAR_BLOCKS[this.selectedSlot]).label
    this.mobileBlockToggle.textContent = this.mobileHotbarExpanded ? 'HIDE BLOCKS' : `BLOCKS: ${selected}`
    this.mobileBlockToggle.classList.toggle('active', this.mobileHotbarExpanded)
  }

  private bindJoystick(joystick: HTMLDivElement, thumb: HTMLDivElement): void {
    let pid: number | null = null
    const reset = () => { this.input.setTouchMoveAxes(0, 0); thumb.style.transform = 'translate(-50%, -50%)'; joystick.classList.remove('active') }
    const update = (cx: number, cy: number) => {
      const r = joystick.getBoundingClientRect()
      const rad = r.width * 0.33, cxr = r.left + r.width / 2, cyr = r.top + r.height / 2
      const dx = cx - cxr, dy = cy - cyr, d = Math.hypot(dx, dy), s = d > rad ? rad / d : 1
      const x = dx * s, y = dy * s
      thumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
      this.input.setTouchMoveAxes(x / rad, -y / rad)
    }
    joystick.addEventListener('pointerdown', (e) => { this.dismissMobileIntro(); pid = e.pointerId; joystick.classList.add('active'); try { joystick.setPointerCapture(e.pointerId) } catch {} update(e.clientX, e.clientY) })
    joystick.addEventListener('pointermove', (e) => { if (pid === e.pointerId) update(e.clientX, e.clientY) })
    const release = (e: PointerEvent) => { if (pid === e.pointerId) { try { joystick.releasePointerCapture(e.pointerId) } catch {} pid = null; reset() } }
    joystick.addEventListener('pointerup', release)
    joystick.addEventListener('pointercancel', release)
    joystick.addEventListener('lostpointercapture', () => { pid = null; reset() })
  }

  private bindLookZone(lookZone: HTMLDivElement): void {
    let pid: number | null = null, lx = 0, ly = 0
    lookZone.addEventListener('pointerdown', (e) => { this.dismissMobileIntro(); pid = e.pointerId; lx = e.clientX; ly = e.clientY; lookZone.classList.add('active'); try { lookZone.setPointerCapture(e.pointerId) } catch {} })
    lookZone.addEventListener('pointermove', (e) => { if (pid === e.pointerId) { this.input.queueTouchLook(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY } })
    const release = (e: PointerEvent) => { if (pid === e.pointerId) { try { lookZone.releasePointerCapture(e.pointerId) } catch {} pid = null; lookZone.classList.remove('active') } }
    lookZone.addEventListener('pointerup', release)
    lookZone.addEventListener('pointercancel', release)
    lookZone.addEventListener('lostpointercapture', () => { pid = null; lookZone.classList.remove('active') })
  }

  private bindTouchActions(actions: HTMLDivElement): void {
    const breakBtn = actions.querySelector<HTMLButtonElement>('#action-break')!
    const placeBtn = actions.querySelector<HTMLButtonElement>('#action-place')!
    const jumpBtn = actions.querySelector<HTMLButtonElement>('#action-jump')!
    const sneakBtn = actions.querySelector<HTMLButtonElement>('#action-sneak')!
    const camBtn = actions.querySelector<HTMLButtonElement>('#action-camera')!
    const tap = (b: HTMLButtonElement, h: () => void) => { b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.dismissMobileIntro(); h() }) }
    tap(breakBtn, () => this.input.queueTouchPrimaryAction())
    tap(placeBtn, () => this.input.queueTouchSecondaryAction())
    tap(jumpBtn, () => this.input.queueTouchJump())
    tap(camBtn, () => this.input.queueTouchCameraToggle())

    let spid: number | null = null
    sneakBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.dismissMobileIntro(); spid = e.pointerId; sneakBtn.classList.add('active'); this.input.setTouchSneaking(true); try { sneakBtn.setPointerCapture(e.pointerId) } catch {} })
    const relSneak = (e: PointerEvent) => { if (spid === e.pointerId) { spid = null; sneakBtn.classList.remove('active'); this.input.setTouchSneaking(false); try { sneakBtn.releasePointerCapture(e.pointerId) } catch {} } }
    sneakBtn.addEventListener('pointerup', relSneak)
    sneakBtn.addEventListener('pointercancel', relSneak)
    sneakBtn.addEventListener('lostpointercapture', () => { spid = null; sneakBtn.classList.remove('active'); this.input.setTouchSneaking(false) })
  }

  private dismissMobileIntro(): void {
    if (!this.input.isTouchMode() || this.mobileIntroDismissed) return
    this.audio.unlock()
    this.mobileIntroDismissed = true
    this.syncLockState()
  }

  private isRunActive(): boolean {
    return this.input.isTouchMode() ? this.mobileIntroDismissed : this.player.isLocked
  }

  private readBestRunSeconds(): number {
    try { const v = window.localStorage.getItem(VoxelSandboxGame.BEST_RUN_STORAGE_KEY); return v ? Number(v) || Infinity : Infinity } catch { return Infinity }
  }

  private playSound(cue: Parameters<GameAudio['play']>[0]): void {
    if (this.settings.sound) this.audio.play(cue)
  }

  private resumeGame(): void {
    this.pauseMenuOpen = false
    this.pauseMenu.classList.remove('visible')
    if (!this.input.isTouchMode()) this.player.controls.lock()
  }

  private openSettings(): void {
    this.settingsOpen = true
    this.pauseMenu.classList.remove('visible')
    this.pauseMenuOpen = false
    this.startCard.classList.add('hidden')
    this.settingsPanel.classList.add('visible')
    this.frozenCameraQuat.copy(this.camera.quaternion)
    this.frozenCameraPos.copy(this.camera.position)
    if (document.pointerLockElement) document.exitPointerLock()
    this.renderSettings()
  }

  private closeSettings(): void {
    this.settingsOpen = false
    this.settingsPanel.classList.remove('visible')

    if (!this.gameStarted) {
      // Came from start screen — show it again
      this.startCard.classList.remove('hidden')
    } else if (!this.player.isLocked && !this.input.isTouchMode()) {
      // Came from pause menu — show it again
      this.pauseMenuOpen = true
      this.pauseMenu.classList.add('visible')
    }
  }

  private renderSettings(): void {
    const s = this.settings
    const toggle = (label: string, key: keyof GameSettings, desc: string) => {
      const checked = s[key] ? 'checked' : ''
      return `<label class="setting-row">
        <div class="setting-info"><span class="setting-label">${label}</span><span class="setting-desc">${desc}</span></div>
        <input type="checkbox" class="setting-toggle" data-key="${key}" ${checked}>
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>`
    }
    const slider = (label: string, key: keyof GameSettings, min: number, max: number, step: number, unit: string, desc: string) => {
      return `<label class="setting-row">
        <div class="setting-info"><span class="setting-label">${label}</span><span class="setting-desc">${desc}</span></div>
        <div class="setting-slider-wrap">
          <input type="range" class="setting-slider" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${s[key]}">
          <span class="setting-value">${s[key]}${unit}</span>
        </div>
      </label>`
    }

    this.settingsPanel.innerHTML = `
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="inv-close settings-back" type="button">&times;</button>
      </div>
      <div class="settings-body">
        <p class="settings-section">Gameplay</p>
        ${toggle('Survival Mode', 'survival', 'Health, hunger, and fall damage')}
        ${toggle('Hostile Mobs', 'hostileMobs', 'Zombies, skeletons, creepers at night')}
        ${toggle('Passive Mobs', 'passiveMobs', 'Pigs and cows roaming the world')}
        ${toggle('Day/Night Cycle', 'dayNightCycle', 'Turn off to keep it always daytime')}
        <p class="settings-section">Audio & Display</p>
        ${toggle('Sound Effects', 'sound', 'All game sounds')}
        ${toggle('Show FPS', 'showFps', 'FPS counter in top-right corner')}
        ${slider('Field of View', 'fov', 50, 110, 5, '', 'Camera FOV in degrees')}
        ${slider('Render Distance', 'renderDistance', 3, 8, 1, ' chunks', 'Higher = see further, lower = better FPS')}
      </div>
    `

    // Close button
    this.settingsPanel.querySelector('.settings-back')?.addEventListener('click', () => this.closeSettings())

    // Toggle handlers
    this.settingsPanel.querySelectorAll<HTMLInputElement>('.setting-toggle').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.key as keyof GameSettings
        ;(this.settings as unknown as Record<string, boolean | number>)[key] = input.checked
        this.applySettings()
      })
    })

    // Slider handlers
    this.settingsPanel.querySelectorAll<HTMLInputElement>('.setting-slider').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.key as keyof GameSettings
        ;(this.settings as unknown as Record<string, boolean | number>)[key] = Number(input.value)
        const valSpan = input.parentElement?.querySelector('.setting-value')
        if (valSpan) valSpan.textContent = input.value + (key === 'renderDistance' ? ' chunks' : '')
        this.applySettings()
      })
    })
  }

  private applySettings(): void {
    saveSettings(this.settings)

    // FOV
    this.camera.fov = this.settings.fov
    this.camera.updateProjectionMatrix()

    // FPS counter
    this.stats.dom.style.display = this.settings.showFps ? 'block' : 'none'

    // Day/night: if disabled, force to midday
    if (!this.settings.dayNightCycle) {
      this.dayNightTime = 0.25
      this.updateDayNightCycle(0)
    }

    // Survival: if disabled, keep health full
    if (!this.settings.survival) {
      this.survival.state.health = this.survival.state.maxHealth
      this.survival.state.hunger = this.survival.state.maxHunger
      this.survival.state.alive = true
    }
  }

  private blockWouldOverlapPlayer(bp: THREE.Vector3): boolean {
    const px = this.player.position.x, py = this.player.position.y, pz = this.player.position.z
    return (
      px - PLAYER_HALF_WIDTH < bp.x + 1 && px + PLAYER_HALF_WIDTH > bp.x &&
      py - PLAYER_EYE_HEIGHT < bp.y + 1 && py - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT > bp.y &&
      pz - PLAYER_HALF_WIDTH < bp.z + 1 && pz + PLAYER_HALF_WIDTH > bp.z
    )
  }
}
