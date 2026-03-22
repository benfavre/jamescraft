export interface SurvivalState {
  health: number
  maxHealth: number
  hunger: number
  maxHunger: number
  alive: boolean
  fallDistance: number
  lastGroundedY: number
  hungerTimer: number
  regenTimer: number
}

export class SurvivalSystem {
  state: SurvivalState

  constructor() {
    this.state = this.createFreshState()
  }

  private createFreshState(): SurvivalState {
    return {
      health: 20,
      maxHealth: 20,
      hunger: 20,
      maxHunger: 20,
      alive: true,
      fallDistance: 0,
      lastGroundedY: 0,
      hungerTimer: 0,
      regenTimer: 0,
    }
  }

  respawn(): void {
    Object.assign(this.state, this.createFreshState())
  }

  update(deltaSeconds: number, playerY: number, isGrounded: boolean, isInWater: boolean): { damaged: boolean; died: boolean; damageAmount: number } {
    if (!this.state.alive) return { damaged: false, died: false, damageAmount: 0 }

    let damaged = false
    let damageAmount = 0

    // Fall damage
    if (!isGrounded && !isInWater) {
      if (playerY < this.state.lastGroundedY) {
        this.state.fallDistance = this.state.lastGroundedY - playerY
      }
    } else {
      if (this.state.fallDistance > 3 && !isInWater) {
        const fallDmg = Math.floor(this.state.fallDistance - 3)
        if (fallDmg > 0) {
          this.state.health = Math.max(0, this.state.health - fallDmg)
          damaged = true
          damageAmount = fallDmg
        }
      }
      this.state.fallDistance = 0
      this.state.lastGroundedY = playerY
    }

    // Hunger drain
    this.state.hungerTimer += deltaSeconds
    if (this.state.hungerTimer >= 4) {
      this.state.hungerTimer -= 4
      if (this.state.hunger > 0) {
        this.state.hunger = Math.max(0, this.state.hunger - 1)
      }
    }

    // Health regen when hunger >= 18
    if (this.state.hunger >= 18 && this.state.health < this.state.maxHealth) {
      this.state.regenTimer += deltaSeconds
      if (this.state.regenTimer >= 2) {
        this.state.regenTimer -= 2
        this.state.health = Math.min(this.state.maxHealth, this.state.health + 1)
      }
    } else {
      this.state.regenTimer = 0
    }

    // Starvation damage
    if (this.state.hunger === 0) {
      this.state.hungerTimer += deltaSeconds * 0.5
      if (this.state.hungerTimer >= 6) {
        this.state.hungerTimer -= 6
        this.state.health = Math.max(1, this.state.health - 1)
        damaged = true
        damageAmount = 1
      }
    }

    const died = this.state.health <= 0 && this.state.alive
    if (died) {
      this.state.alive = false
    }

    return { damaged, died, damageAmount }
  }

  takeDamage(amount: number): boolean {
    if (!this.state.alive || amount <= 0) return false
    this.state.health = Math.max(0, this.state.health - amount)
    if (this.state.health <= 0) {
      this.state.alive = false
      return true
    }
    return false
  }

  eat(hungerValue: number): void {
    this.state.hunger = Math.min(this.state.maxHunger, this.state.hunger + hungerValue)
  }
}
