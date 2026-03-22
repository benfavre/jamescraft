import { CHUNK_HEIGHT, SEA_LEVEL } from '../constants'
import { BlockId } from './BlockTypes'
import { type BiomeDefinition, type BiomeType, getBiomeDefinition, selectBiome } from './Biome'
import { SimplexNoise } from './SimplexNoise'

export interface TreePlacement {
  x: number
  z: number
  height: number
  trunkHeight: number
  canopyRadius: number
  treeType: 'oak' | 'birch' | 'spruce'
}

export class TerrainGenerator {
  private readonly broadNoise: SimplexNoise
  private readonly detailNoise: SimplexNoise
  private readonly ridgeNoise: SimplexNoise
  private readonly treeNoise: SimplexNoise
  private readonly temperatureNoise: SimplexNoise
  private readonly humidityNoise: SimplexNoise
  private readonly mountainNoise: SimplexNoise
  private readonly caveNoise1: SimplexNoise
  private readonly caveNoise2: SimplexNoise
  private readonly oreNoise: SimplexNoise

  constructor(seed: number) {
    this.broadNoise = new SimplexNoise(seed)
    this.detailNoise = new SimplexNoise(seed * 13 + 17)
    this.ridgeNoise = new SimplexNoise(seed * 31 + 7)
    this.treeNoise = new SimplexNoise(seed * 47 + 23)
    this.temperatureNoise = new SimplexNoise(seed * 59 + 41)
    this.humidityNoise = new SimplexNoise(seed * 73 + 53)
    this.mountainNoise = new SimplexNoise(seed * 89 + 67)
    this.caveNoise1 = new SimplexNoise(seed * 97 + 79)
    this.caveNoise2 = new SimplexNoise(seed * 107 + 83)
    this.oreNoise = new SimplexNoise(seed * 113 + 97)
  }

  getBiomeAt(x: number, z: number): BiomeType {
    const temp = this.temperatureNoise.noise2D(x * 0.003, z * 0.003)
    const humid = this.humidityNoise.noise2D(x * 0.003, z * 0.003)
    const mount = this.mountainNoise.noise2D(x * 0.005, z * 0.005)
    return selectBiome(temp, humid, mount)
  }

  getBiomeDefinitionAt(x: number, z: number): BiomeDefinition {
    return getBiomeDefinition(this.getBiomeAt(x, z))
  }

  getTerrainHeight(x: number, z: number): number {
    const biome = this.getBiomeDefinitionAt(x, z)
    const broad = this.broadNoise.noise2D(x * 0.018, z * 0.018) * 11
    const detail = this.detailNoise.noise2D(x * 0.055, z * 0.055) * 4.25
    const ridge = 1 - Math.abs(this.ridgeNoise.noise2D(x * 0.032, z * 0.032))
    const plateau = ridge * ridge * 5
    const raw = broad + detail + plateau
    const height = biome.baseHeight + raw * biome.heightScale
    return Math.max(1, Math.min(CHUNK_HEIGHT - 20, Math.round(height)))
  }

  getBlockAt(x: number, y: number, z: number): BlockId {
    if (y === 0) return BlockId.Bedrock

    const height = this.getTerrainHeight(x, z)
    const biome = this.getBiomeDefinitionAt(x, z)

    if (y > height) {
      return y <= SEA_LEVEL ? BlockId.Water : BlockId.Air
    }

    // Cave carving
    if (y > 1 && y < height - 1 && this.isCave(x, y, z)) {
      return y <= SEA_LEVEL ? BlockId.Water : BlockId.Air
    }

    // Surface
    if (y === height) {
      if (height <= SEA_LEVEL) return biome.underwaterSurface
      return biome.surfaceBlock
    }

    // Sub-surface (3 layers)
    if (y >= height - 3) {
      return biome.subSurfaceBlock
    }

    // Ore generation
    const ore = this.getOreAt(x, y, z)
    if (ore !== BlockId.Air) return ore

    return BlockId.Stone
  }

  private isCave(x: number, y: number, z: number): boolean {
    // Spaghetti caves using intersecting noise planes
    const n1 = this.caveNoise1.noise3D(x * 0.04, y * 0.06, z * 0.04)
    const n2 = this.caveNoise2.noise3D(x * 0.04, y * 0.06, z * 0.04)
    if (Math.abs(n1) < 0.07 && Math.abs(n2) < 0.07) return true

    // Cheese caves - larger open areas underground
    if (y < 40) {
      const cheese = this.caveNoise1.noise3D(x * 0.02, y * 0.03, z * 0.02)
      if (cheese > 0.55) return true
    }

    return false
  }

  private getOreAt(x: number, y: number, z: number): BlockId {
    // Coal: common, y < 80
    if (y < 80) {
      const v = this.oreNoise.noise3D(x * 0.12, y * 0.12, z * 0.12)
      if (v > 0.72) return BlockId.CoalOre
    }
    // Iron: moderate, y < 54
    if (y < 54) {
      const v = this.oreNoise.noise3D(x * 0.14 + 100, y * 0.14, z * 0.14 + 100)
      if (v > 0.78) return BlockId.IronOre
    }
    // Gold: rare, y < 32
    if (y < 32) {
      const v = this.oreNoise.noise3D(x * 0.15 + 200, y * 0.15, z * 0.15 + 200)
      if (v > 0.85) return BlockId.GoldOre
    }
    // Diamond: very rare, y < 16
    if (y < 16) {
      const v = this.oreNoise.noise3D(x * 0.16 + 300, y * 0.16, z * 0.16 + 300)
      if (v > 0.88) return BlockId.DiamondOre
    }
    // Lava pools deep underground
    if (y <= 5 && y > 1) {
      const v = this.caveNoise1.noise3D(x * 0.03, y * 0.1, z * 0.03)
      if (v > 0.6 && this.isCave(x, y, z)) return BlockId.Lava
    }
    return BlockId.Air
  }

  shouldPlaceTree(x: number, z: number): boolean {
    const biome = this.getBiomeDefinitionAt(x, z)
    if (biome.treeDensity <= 0) return false
    const value = this.treeNoise.noise2D(x * 0.8, z * 0.8)
    return value > (1 - biome.treeDensity * 6)
  }

  getTreesInChunk(chunkX: number, chunkZ: number, chunkSize: number): TreePlacement[] {
    const trees: TreePlacement[] = []
    const startX = chunkX * chunkSize
    const startZ = chunkZ * chunkSize

    for (let lz = 1; lz < chunkSize - 1; lz += 1) {
      for (let lx = 1; lx < chunkSize - 1; lx += 1) {
        const worldX = startX + lx
        const worldZ = startZ + lz
        if (!this.shouldPlaceTree(worldX, worldZ)) continue

        const terrainHeight = this.getTerrainHeight(worldX, worldZ)
        if (terrainHeight <= SEA_LEVEL || terrainHeight > CHUNK_HEIGHT - 16) continue

        const biome = this.getBiomeDefinitionAt(worldX, worldZ)
        if (biome.treeType === 'none') continue

        const hashVal = Math.abs(this.treeNoise.noise2D(worldX * 1.7, worldZ * 1.7))
        const trunkHeight = biome.treeType === 'spruce' ? 5 + Math.floor(hashVal * 4) : 4 + Math.floor(hashVal * 3)
        const canopyRadius = biome.treeType === 'spruce' ? 1 + Math.floor(hashVal * 2) : 2

        trees.push({
          x: worldX,
          z: worldZ,
          height: terrainHeight,
          trunkHeight,
          canopyRadius,
          treeType: biome.treeType,
        })
      }
    }

    return trees
  }
}
