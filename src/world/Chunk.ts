import { CHUNK_HEIGHT, CHUNK_SIZE } from '../constants'
import { BlockId } from './BlockTypes'
import { TerrainGenerator } from './TerrainGenerator'

export class Chunk {
  readonly chunkX: number
  readonly chunkZ: number
  readonly blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT)

  constructor(chunkX: number, chunkZ: number) {
    this.chunkX = chunkX
    this.chunkZ = chunkZ
  }

  generate(generator: TerrainGenerator): void {
    for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
        const worldX = this.chunkX * CHUNK_SIZE + localX
        const worldZ = this.chunkZ * CHUNK_SIZE + localZ

        for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
          this.set(localX, y, localZ, generator.getBlockAt(worldX, y, worldZ))
        }
      }
    }

    const trees = generator.getTreesInChunk(this.chunkX, this.chunkZ, CHUNK_SIZE)
    for (const tree of trees) {
      const localX = tree.x - this.chunkX * CHUNK_SIZE
      const localZ = tree.z - this.chunkZ * CHUNK_SIZE

      const logBlock = tree.treeType === 'birch' ? BlockId.BirchLog : tree.treeType === 'spruce' ? BlockId.SpruceLog : BlockId.Wood
      const leafBlock = tree.treeType === 'birch' ? BlockId.BirchLeaf : tree.treeType === 'spruce' ? BlockId.SpruceLeaf : BlockId.Leaf

      for (let ty = 1; ty <= tree.trunkHeight; ty += 1) {
        const y = tree.height + ty
        if (y >= CHUNK_HEIGHT) break
        this.set(localX, y, localZ, logBlock)
      }

      if (tree.treeType === 'spruce') {
        // Spruce: conical canopy
        const tipY = tree.height + tree.trunkHeight + 1
        for (let cy = tree.height + 2; cy <= tipY; cy += 1) {
          if (cy >= CHUNK_HEIGHT) break
          const layerFromTop = tipY - cy
          const r = Math.min(tree.canopyRadius, Math.floor(layerFromTop * 0.7) + 1)
          for (let dx = -r; dx <= r; dx += 1) {
            for (let dz = -r; dz <= r; dz += 1) {
              if (dx === 0 && dz === 0) continue
              const lx = localX + dx
              const lz = localZ + dz
              if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue
              if (Math.abs(dx) === r && Math.abs(dz) === r) continue
              if (this.get(lx, cy, lz) === BlockId.Air) {
                this.set(lx, cy, lz, leafBlock)
              }
            }
          }
        }
        // Top leaf
        if (tipY < CHUNK_HEIGHT) {
          this.set(localX, tipY, localZ, leafBlock)
        }
      } else {
        // Oak/Birch: boxy canopy
        const canopyBase = tree.height + tree.trunkHeight - 1
        const canopyTop = tree.height + tree.trunkHeight + 2
        const r = tree.canopyRadius

        for (let cy = canopyBase; cy <= canopyTop; cy += 1) {
          if (cy >= CHUNK_HEIGHT) break
          const layerR = cy === canopyTop ? r - 1 : r
          for (let dx = -layerR; dx <= layerR; dx += 1) {
            for (let dz = -layerR; dz <= layerR; dz += 1) {
              if (dx === 0 && dz === 0 && cy < canopyTop) continue
              const lx = localX + dx
              const lz = localZ + dz
              if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue
              if (Math.abs(dx) === layerR && Math.abs(dz) === layerR) continue
              if (this.get(lx, cy, lz) === BlockId.Air) {
                this.set(lx, cy, lz, leafBlock)
              }
            }
          }
        }
      }
    }
  }

  get(localX: number, y: number, localZ: number): BlockId {
    return this.blocks[getIndex(localX, y, localZ)] as BlockId
  }

  set(localX: number, y: number, localZ: number, block: BlockId): void {
    this.blocks[getIndex(localX, y, localZ)] = block
  }
}

function getIndex(localX: number, y: number, localZ: number): number {
  return localX + CHUNK_SIZE * (localZ + CHUNK_SIZE * y)
}
