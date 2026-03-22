import * as THREE from 'three'
import type { BlockFaceName } from '../constants'

export const enum BlockId {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Wood = 4,
  Glass = 5,
  Sand = 6,
  Leaf = 7,
  Brick = 8,
  Snow = 9,
  Water = 10,
  Lava = 11,
  Cobblestone = 12,
  Planks = 13,
  Bedrock = 14,
  Gravel = 15,
  CoalOre = 16,
  IronOre = 17,
  GoldOre = 18,
  DiamondOre = 19,
  Obsidian = 20,
  Clay = 21,
  Sandstone = 22,
  SnowGrass = 23,
  Ice = 24,
  CraftingTable = 25,
  Furnace = 26,
  IronBlock = 27,
  GoldBlock = 28,
  DiamondBlock = 29,
  BirchLog = 30,
  BirchLeaf = 31,
  SpruceLog = 32,
  SpruceLeaf = 33,
  Pumpkin = 34,
  Melon = 35,
}

type FaceColorMap = Partial<Record<BlockFaceName, string>>

export type ToolType = 'hand' | 'pickaxe' | 'axe' | 'shovel' | 'sword'

export interface BlockDefinition {
  id: BlockId
  label: string
  solid: boolean
  transparent: boolean
  liquid: boolean
  baseColor: string
  faceColors?: FaceColorMap
  hardness: number
  preferredTool: ToolType
}

export const BLOCK_DEFINITIONS: Record<BlockId, BlockDefinition> = {
  [BlockId.Air]: { id: BlockId.Air, label: 'Air', solid: false, transparent: true, liquid: false, baseColor: '#000000', hardness: 0, preferredTool: 'hand' },
  [BlockId.Grass]: {
    id: BlockId.Grass, label: 'Grass', solid: true, transparent: false, liquid: false, baseColor: '#6aa84f', hardness: 0.6, preferredTool: 'shovel',
    faceColors: { py: '#81c35d', ny: '#6d4c31', px: '#71ae52', nx: '#71ae52', pz: '#71ae52', nz: '#71ae52' },
  },
  [BlockId.Dirt]: { id: BlockId.Dirt, label: 'Dirt', solid: true, transparent: false, liquid: false, baseColor: '#7a5230', hardness: 0.5, preferredTool: 'shovel' },
  [BlockId.Stone]: { id: BlockId.Stone, label: 'Stone', solid: true, transparent: false, liquid: false, baseColor: '#8a939b', hardness: 1.5, preferredTool: 'pickaxe' },
  [BlockId.Wood]: {
    id: BlockId.Wood, label: 'Oak Log', solid: true, transparent: false, liquid: false, baseColor: '#9a6a3a', hardness: 2, preferredTool: 'axe',
    faceColors: { py: '#c39257', ny: '#c39257', px: '#956639', nx: '#956639', pz: '#956639', nz: '#956639' },
  },
  [BlockId.Glass]: { id: BlockId.Glass, label: 'Glass', solid: true, transparent: true, liquid: false, baseColor: '#a9eaff', hardness: 0.3, preferredTool: 'hand' },
  [BlockId.Sand]: {
    id: BlockId.Sand, label: 'Sand', solid: true, transparent: false, liquid: false, baseColor: '#e8d5a3', hardness: 0.5, preferredTool: 'shovel',
    faceColors: { py: '#f0deb0', ny: '#d4c08a', px: '#e2cf9a', nx: '#e2cf9a', pz: '#e2cf9a', nz: '#e2cf9a' },
  },
  [BlockId.Leaf]: {
    id: BlockId.Leaf, label: 'Oak Leaves', solid: true, transparent: false, liquid: false, baseColor: '#3e8a2e', hardness: 0.2, preferredTool: 'hand',
    faceColors: { py: '#4ca83a', ny: '#2d6e20', px: '#3a8028', nx: '#3a8028', pz: '#3a8028', nz: '#3a8028' },
  },
  [BlockId.Brick]: {
    id: BlockId.Brick, label: 'Brick', solid: true, transparent: false, liquid: false, baseColor: '#8b4533', hardness: 2, preferredTool: 'pickaxe',
    faceColors: { py: '#9b5543', ny: '#6b3523', px: '#834030', nx: '#834030', pz: '#834030', nz: '#834030' },
  },
  [BlockId.Snow]: {
    id: BlockId.Snow, label: 'Snow', solid: true, transparent: false, liquid: false, baseColor: '#e8eef5', hardness: 0.2, preferredTool: 'shovel',
    faceColors: { py: '#f0f5fa', ny: '#c8d0da', px: '#dce4ec', nx: '#dce4ec', pz: '#dce4ec', nz: '#dce4ec' },
  },
  [BlockId.Water]: {
    id: BlockId.Water, label: 'Water', solid: false, transparent: true, liquid: true, baseColor: '#2858a8', hardness: Infinity, preferredTool: 'hand',
    faceColors: { py: '#3068b8', ny: '#1848a0', px: '#2858a8', nx: '#2858a8', pz: '#2858a8', nz: '#2858a8' },
  },
  [BlockId.Lava]: {
    id: BlockId.Lava, label: 'Lava', solid: false, transparent: true, liquid: true, baseColor: '#cf4a1a', hardness: Infinity, preferredTool: 'hand',
    faceColors: { py: '#e06020', ny: '#b03810', px: '#cf4a1a', nx: '#cf4a1a', pz: '#cf4a1a', nz: '#cf4a1a' },
  },
  [BlockId.Cobblestone]: {
    id: BlockId.Cobblestone, label: 'Cobblestone', solid: true, transparent: false, liquid: false, baseColor: '#7a7a7a', hardness: 2, preferredTool: 'pickaxe',
    faceColors: { py: '#8a8a8a', ny: '#5a5a5a', px: '#727272', nx: '#6e6e6e', pz: '#747474', nz: '#707070' },
  },
  [BlockId.Planks]: {
    id: BlockId.Planks, label: 'Oak Planks', solid: true, transparent: false, liquid: false, baseColor: '#b28d56', hardness: 2, preferredTool: 'axe',
    faceColors: { py: '#c4a06a', ny: '#9a7a48', px: '#b08850', nx: '#b08850', pz: '#b08850', nz: '#b08850' },
  },
  [BlockId.Bedrock]: { id: BlockId.Bedrock, label: 'Bedrock', solid: true, transparent: false, liquid: false, baseColor: '#3a3a3a', hardness: Infinity, preferredTool: 'hand' },
  [BlockId.Gravel]: {
    id: BlockId.Gravel, label: 'Gravel', solid: true, transparent: false, liquid: false, baseColor: '#7a736a', hardness: 0.6, preferredTool: 'shovel',
    faceColors: { py: '#8a837a', ny: '#5a5350', px: '#706860', nx: '#706860', pz: '#706860', nz: '#706860' },
  },
  [BlockId.CoalOre]: {
    id: BlockId.CoalOre, label: 'Coal Ore', solid: true, transparent: false, liquid: false, baseColor: '#585858', hardness: 3, preferredTool: 'pickaxe',
    faceColors: { py: '#6a6a6a', ny: '#404040', px: '#505050', nx: '#505050', pz: '#505050', nz: '#505050' },
  },
  [BlockId.IronOre]: {
    id: BlockId.IronOre, label: 'Iron Ore', solid: true, transparent: false, liquid: false, baseColor: '#8a7a68', hardness: 3, preferredTool: 'pickaxe',
    faceColors: { py: '#948a78', ny: '#6a6050', px: '#857a70', nx: '#857a70', pz: '#857a70', nz: '#857a70' },
  },
  [BlockId.GoldOre]: {
    id: BlockId.GoldOre, label: 'Gold Ore', solid: true, transparent: false, liquid: false, baseColor: '#90884a', hardness: 3, preferredTool: 'pickaxe',
    faceColors: { py: '#a09858', ny: '#706838', px: '#888048', nx: '#888048', pz: '#888048', nz: '#888048' },
  },
  [BlockId.DiamondOre]: {
    id: BlockId.DiamondOre, label: 'Diamond Ore', solid: true, transparent: false, liquid: false, baseColor: '#5a8a90', hardness: 3, preferredTool: 'pickaxe',
    faceColors: { py: '#68989e', ny: '#4a7a80', px: '#588888', nx: '#588888', pz: '#588888', nz: '#588888' },
  },
  [BlockId.Obsidian]: { id: BlockId.Obsidian, label: 'Obsidian', solid: true, transparent: false, liquid: false, baseColor: '#1a0a2a', hardness: 50, preferredTool: 'pickaxe' },
  [BlockId.Clay]: {
    id: BlockId.Clay, label: 'Clay', solid: true, transparent: false, liquid: false, baseColor: '#9090a0', hardness: 0.6, preferredTool: 'shovel',
    faceColors: { py: '#9898a8', ny: '#7878a0', px: '#8888a0', nx: '#8888a0', pz: '#8888a0', nz: '#8888a0' },
  },
  [BlockId.Sandstone]: {
    id: BlockId.Sandstone, label: 'Sandstone', solid: true, transparent: false, liquid: false, baseColor: '#d4c48a', hardness: 0.8, preferredTool: 'pickaxe',
    faceColors: { py: '#e0d098', ny: '#c0b478', px: '#d0c085', nx: '#d0c085', pz: '#d0c085', nz: '#d0c085' },
  },
  [BlockId.SnowGrass]: {
    id: BlockId.SnowGrass, label: 'Snowy Grass', solid: true, transparent: false, liquid: false, baseColor: '#c0d0c0', hardness: 0.6, preferredTool: 'shovel',
    faceColors: { py: '#f0f5f0', ny: '#6d4c31', px: '#b0c0b0', nx: '#b0c0b0', pz: '#b0c0b0', nz: '#b0c0b0' },
  },
  [BlockId.Ice]: { id: BlockId.Ice, label: 'Ice', solid: true, transparent: true, liquid: false, baseColor: '#9cd0e0', hardness: 0.5, preferredTool: 'pickaxe' },
  [BlockId.CraftingTable]: {
    id: BlockId.CraftingTable, label: 'Crafting Table', solid: true, transparent: false, liquid: false, baseColor: '#8a6a3a', hardness: 2.5, preferredTool: 'axe',
    faceColors: { py: '#a09060', ny: '#7a5a30', px: '#8a6838', nx: '#8a6838', pz: '#8a6838', nz: '#8a6838' },
  },
  [BlockId.Furnace]: {
    id: BlockId.Furnace, label: 'Furnace', solid: true, transparent: false, liquid: false, baseColor: '#6a6a6a', hardness: 3.5, preferredTool: 'pickaxe',
    faceColors: { py: '#7a7a7a', ny: '#5a5a5a', px: '#656565', nx: '#656565', pz: '#4a4a4a', nz: '#656565' },
  },
  [BlockId.IronBlock]: { id: BlockId.IronBlock, label: 'Iron Block', solid: true, transparent: false, liquid: false, baseColor: '#d4d4d4', hardness: 5, preferredTool: 'pickaxe' },
  [BlockId.GoldBlock]: { id: BlockId.GoldBlock, label: 'Gold Block', solid: true, transparent: false, liquid: false, baseColor: '#e8c840', hardness: 3, preferredTool: 'pickaxe' },
  [BlockId.DiamondBlock]: { id: BlockId.DiamondBlock, label: 'Diamond Block', solid: true, transparent: false, liquid: false, baseColor: '#4eeae2', hardness: 5, preferredTool: 'pickaxe' },
  [BlockId.BirchLog]: {
    id: BlockId.BirchLog, label: 'Birch Log', solid: true, transparent: false, liquid: false, baseColor: '#d4ccb4', hardness: 2, preferredTool: 'axe',
    faceColors: { py: '#c4bc9a', ny: '#c4bc9a', px: '#d0c8b0', nx: '#d0c8b0', pz: '#d0c8b0', nz: '#d0c8b0' },
  },
  [BlockId.BirchLeaf]: {
    id: BlockId.BirchLeaf, label: 'Birch Leaves', solid: true, transparent: false, liquid: false, baseColor: '#6aaa5a', hardness: 0.2, preferredTool: 'hand',
    faceColors: { py: '#78b868', ny: '#50903a', px: '#62a050', nx: '#62a050', pz: '#62a050', nz: '#62a050' },
  },
  [BlockId.SpruceLog]: {
    id: BlockId.SpruceLog, label: 'Spruce Log', solid: true, transparent: false, liquid: false, baseColor: '#40301a', hardness: 2, preferredTool: 'axe',
    faceColors: { py: '#5a4a30', ny: '#5a4a30', px: '#3a2810', nx: '#3a2810', pz: '#3a2810', nz: '#3a2810' },
  },
  [BlockId.SpruceLeaf]: {
    id: BlockId.SpruceLeaf, label: 'Spruce Leaves', solid: true, transparent: false, liquid: false, baseColor: '#2a5a2a', hardness: 0.2, preferredTool: 'hand',
    faceColors: { py: '#306830', ny: '#1a4a1a', px: '#255525', nx: '#255525', pz: '#255525', nz: '#255525' },
  },
  [BlockId.Pumpkin]: {
    id: BlockId.Pumpkin, label: 'Pumpkin', solid: true, transparent: false, liquid: false, baseColor: '#d0841a', hardness: 1, preferredTool: 'axe',
    faceColors: { py: '#c07818', ny: '#a06010', px: '#c87a16', nx: '#c87a16', pz: '#c87a16', nz: '#c87a16' },
  },
  [BlockId.Melon]: {
    id: BlockId.Melon, label: 'Melon', solid: true, transparent: false, liquid: false, baseColor: '#5a9030', hardness: 1, preferredTool: 'axe',
    faceColors: { py: '#80b060', ny: '#3a7018', px: '#4a7828', nx: '#4a7828', pz: '#4a7828', nz: '#4a7828' },
  },
}

export const HOTBAR_BLOCKS = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Cobblestone,
  BlockId.Planks,
  BlockId.Wood,
  BlockId.Glass,
  BlockId.Sand,
  BlockId.Brick,
] as const

const FACE_SHADE: Record<BlockFaceName, number> = {
  px: 0.9,
  nx: 0.82,
  py: 1,
  ny: 0.58,
  pz: 0.86,
  nz: 0.76,
}

export function getBlockDefinition(block: BlockId): BlockDefinition {
  return BLOCK_DEFINITIONS[block]
}

export function isSolidBlock(block: BlockId): boolean {
  return getBlockDefinition(block).solid
}

export function isLiquidBlock(block: BlockId): boolean {
  return getBlockDefinition(block).liquid
}

export function isTargetableBlock(block: BlockId): boolean {
  if (block === BlockId.Air) return false
  return !getBlockDefinition(block).liquid
}

export function getFaceColor(block: BlockId, face: BlockFaceName): THREE.Color {
  const definition = getBlockDefinition(block)
  const color = new THREE.Color(definition.faceColors?.[face] ?? definition.baseColor)
  return color.multiplyScalar(FACE_SHADE[face])
}
