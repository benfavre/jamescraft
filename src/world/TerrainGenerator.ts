import { CHUNK_HEIGHT } from '../constants'
import { BlockId } from './BlockTypes'
import { SimplexNoise } from './SimplexNoise'

export interface TreePlacement {
  x: number
  z: number
  height: number
  trunkHeight: number
  canopyRadius: number
}

export class TerrainGenerator {
  private readonly broadNoise: SimplexNoise
  private readonly detailNoise: SimplexNoise
  private readonly ridgeNoise: SimplexNoise
  private readonly treeNoise: SimplexNoise

  constructor(seed: number) {
    this.broadNoise = new SimplexNoise(seed)
    this.detailNoise = new SimplexNoise(seed * 13 + 17)
    this.ridgeNoise = new SimplexNoise(seed * 31 + 7)
    this.treeNoise = new SimplexNoise(seed * 47 + 23)
  }

  getTerrainHeight(x: number, z: number): number {
    const broad = this.broadNoise.noise2D(x * 0.018, z * 0.018) * 11
    const detail = this.detailNoise.noise2D(x * 0.055, z * 0.055) * 4.25
    const ridge = 1 - Math.abs(this.ridgeNoise.noise2D(x * 0.032, z * 0.032))
    const plateau = ridge * ridge * 5
    const height = 22 + broad + detail + plateau

    return Math.max(6, Math.min(CHUNK_HEIGHT - 8, Math.round(height)))
  }

  getBlockAt(x: number, y: number, z: number): BlockId {
    const height = this.getTerrainHeight(x, z)

    if (y > height) {
      return BlockId.Air
    }

    if (y === height) {
      return BlockId.Grass
    }

    if (y >= height - 3) {
      return BlockId.Dirt
    }

    const cavity = this.detailNoise.noise2D((x + 200) * 0.08, (z - 140) * 0.08)

    if (cavity > 0.82 && y < height - 8) {
      return BlockId.Air
    }

    return BlockId.Stone
  }

  shouldPlaceTree(x: number, z: number): boolean {
    const value = this.treeNoise.noise2D(x * 0.8, z * 0.8)
    return value > 0.72
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
        if (terrainHeight < 10 || terrainHeight > CHUNK_HEIGHT - 16) continue

        const hashVal = Math.abs(this.treeNoise.noise2D(worldX * 1.7, worldZ * 1.7))
        const trunkHeight = 4 + Math.floor(hashVal * 3)
        const canopyRadius = 2

        trees.push({
          x: worldX,
          z: worldZ,
          height: terrainHeight,
          trunkHeight,
          canopyRadius,
        })
      }
    }

    return trees
  }
}
