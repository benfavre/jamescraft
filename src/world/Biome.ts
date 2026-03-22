import { BlockId } from './BlockTypes'

export const enum BiomeType {
  Plains = 0,
  Forest = 1,
  Desert = 2,
  Tundra = 3,
  Mountains = 4,
  Swamp = 5,
  Taiga = 6,
  BirchForest = 7,
}

export interface BiomeDefinition {
  type: BiomeType
  name: string
  surfaceBlock: BlockId
  subSurfaceBlock: BlockId
  underwaterSurface: BlockId
  treeDensity: number
  treeType: 'oak' | 'birch' | 'spruce' | 'none'
  baseHeight: number
  heightScale: number
}

const BIOMES: Record<BiomeType, BiomeDefinition> = {
  [BiomeType.Plains]: {
    type: BiomeType.Plains, name: 'Plains',
    surfaceBlock: BlockId.Grass, subSurfaceBlock: BlockId.Dirt, underwaterSurface: BlockId.Sand,
    treeDensity: 0.02, treeType: 'oak', baseHeight: 26, heightScale: 0.45,
  },
  [BiomeType.Forest]: {
    type: BiomeType.Forest, name: 'Forest',
    surfaceBlock: BlockId.Grass, subSurfaceBlock: BlockId.Dirt, underwaterSurface: BlockId.Dirt,
    treeDensity: 0.14, treeType: 'oak', baseHeight: 27, heightScale: 0.55,
  },
  [BiomeType.Desert]: {
    type: BiomeType.Desert, name: 'Desert',
    surfaceBlock: BlockId.Sand, subSurfaceBlock: BlockId.Sandstone, underwaterSurface: BlockId.Sand,
    treeDensity: 0, treeType: 'none', baseHeight: 25, heightScale: 0.2,
  },
  [BiomeType.Tundra]: {
    type: BiomeType.Tundra, name: 'Tundra',
    surfaceBlock: BlockId.SnowGrass, subSurfaceBlock: BlockId.Dirt, underwaterSurface: BlockId.Gravel,
    treeDensity: 0.01, treeType: 'spruce', baseHeight: 25, heightScale: 0.4,
  },
  [BiomeType.Mountains]: {
    type: BiomeType.Mountains, name: 'Mountains',
    surfaceBlock: BlockId.Stone, subSurfaceBlock: BlockId.Stone, underwaterSurface: BlockId.Gravel,
    treeDensity: 0.02, treeType: 'spruce', baseHeight: 32, heightScale: 1.6,
  },
  [BiomeType.Swamp]: {
    type: BiomeType.Swamp, name: 'Swamp',
    surfaceBlock: BlockId.Grass, subSurfaceBlock: BlockId.Dirt, underwaterSurface: BlockId.Clay,
    treeDensity: 0.07, treeType: 'oak', baseHeight: 20, heightScale: 0.15,
  },
  [BiomeType.Taiga]: {
    type: BiomeType.Taiga, name: 'Taiga',
    surfaceBlock: BlockId.SnowGrass, subSurfaceBlock: BlockId.Dirt, underwaterSurface: BlockId.Gravel,
    treeDensity: 0.11, treeType: 'spruce', baseHeight: 27, heightScale: 0.6,
  },
  [BiomeType.BirchForest]: {
    type: BiomeType.BirchForest, name: 'Birch Forest',
    surfaceBlock: BlockId.Grass, subSurfaceBlock: BlockId.Dirt, underwaterSurface: BlockId.Sand,
    treeDensity: 0.12, treeType: 'birch', baseHeight: 26, heightScale: 0.5,
  },
}

export function getBiomeDefinition(type: BiomeType): BiomeDefinition {
  return BIOMES[type]
}

export function selectBiome(temperature: number, humidity: number, mountainousness: number): BiomeType {
  if (mountainousness > 0.62) return BiomeType.Mountains
  const t = (temperature + 1) * 0.5
  const h = (humidity + 1) * 0.5
  if (t < 0.28) return h > 0.5 ? BiomeType.Taiga : BiomeType.Tundra
  if (t > 0.68) return h < 0.35 ? BiomeType.Desert : BiomeType.Plains
  if (h > 0.62) return BiomeType.Swamp
  if (h > 0.48) return t > 0.45 ? BiomeType.Forest : BiomeType.BirchForest
  return BiomeType.Plains
}
