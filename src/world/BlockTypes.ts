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
}

type FaceColorMap = Partial<Record<BlockFaceName, string>>

export interface BlockDefinition {
  id: BlockId
  label: string
  solid: boolean
  transparent: boolean
  baseColor: string
  faceColors?: FaceColorMap
}

export const BLOCK_DEFINITIONS: Record<BlockId, BlockDefinition> = {
  [BlockId.Air]: {
    id: BlockId.Air,
    label: 'Air',
    solid: false,
    transparent: true,
    baseColor: '#000000',
  },
  [BlockId.Grass]: {
    id: BlockId.Grass,
    label: 'Grass',
    solid: true,
    transparent: false,
    baseColor: '#6aa84f',
    faceColors: {
      py: '#81c35d',
      ny: '#6d4c31',
      px: '#71ae52',
      nx: '#71ae52',
      pz: '#71ae52',
      nz: '#71ae52',
    },
  },
  [BlockId.Dirt]: {
    id: BlockId.Dirt,
    label: 'Dirt',
    solid: true,
    transparent: false,
    baseColor: '#7a5230',
  },
  [BlockId.Stone]: {
    id: BlockId.Stone,
    label: 'Stone',
    solid: true,
    transparent: false,
    baseColor: '#8a939b',
  },
  [BlockId.Wood]: {
    id: BlockId.Wood,
    label: 'Wood',
    solid: true,
    transparent: false,
    baseColor: '#9a6a3a',
    faceColors: {
      py: '#c39257',
      ny: '#c39257',
      px: '#956639',
      nx: '#956639',
      pz: '#956639',
      nz: '#956639',
    },
  },
  [BlockId.Glass]: {
    id: BlockId.Glass,
    label: 'Glass',
    solid: true,
    transparent: true,
    baseColor: '#a9eaff',
  },
  [BlockId.Sand]: {
    id: BlockId.Sand,
    label: 'Sand',
    solid: true,
    transparent: false,
    baseColor: '#e8d5a3',
    faceColors: {
      py: '#f0deb0',
      ny: '#d4c08a',
      px: '#e2cf9a',
      nx: '#e2cf9a',
      pz: '#e2cf9a',
      nz: '#e2cf9a',
    },
  },
  [BlockId.Leaf]: {
    id: BlockId.Leaf,
    label: 'Leaf',
    solid: true,
    transparent: false,
    baseColor: '#3e8a2e',
    faceColors: {
      py: '#4ca83a',
      ny: '#2d6e20',
      px: '#3a8028',
      nx: '#3a8028',
      pz: '#3a8028',
      nz: '#3a8028',
    },
  },
  [BlockId.Brick]: {
    id: BlockId.Brick,
    label: 'Brick',
    solid: true,
    transparent: false,
    baseColor: '#8b4533',
    faceColors: {
      py: '#9b5543',
      ny: '#6b3523',
      px: '#834030',
      nx: '#834030',
      pz: '#834030',
      nz: '#834030',
    },
  },
  [BlockId.Snow]: {
    id: BlockId.Snow,
    label: 'Snow',
    solid: true,
    transparent: false,
    baseColor: '#e8eef5',
    faceColors: {
      py: '#f0f5fa',
      ny: '#c8d0da',
      px: '#dce4ec',
      nx: '#dce4ec',
      pz: '#dce4ec',
      nz: '#dce4ec',
    },
  },
}

export const HOTBAR_BLOCKS = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Wood,
  BlockId.Glass,
  BlockId.Sand,
  BlockId.Leaf,
  BlockId.Brick,
  BlockId.Snow,
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

export function getFaceColor(block: BlockId, face: BlockFaceName): THREE.Color {
  const definition = getBlockDefinition(block)
  const color = new THREE.Color(definition.faceColors?.[face] ?? definition.baseColor)
  return color.multiplyScalar(FACE_SHADE[face])
}
