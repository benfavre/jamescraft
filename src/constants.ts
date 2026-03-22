export const CHUNK_SIZE = 16
export const CHUNK_HEIGHT = 128
export const WORLD_SEED = 1337
export const RENDER_RADIUS = 5
export const MAX_INTERACTION_DISTANCE = 8
export const SEA_LEVEL = 20

export const PLAYER_HEIGHT = 1.8
export const PLAYER_EYE_HEIGHT = 1.62
export const PLAYER_HALF_WIDTH = 0.3
export const PLAYER_SPEED = 5.6
export const PLAYER_SNEAK_SPEED = 2.45
export const PLAYER_SWIM_SPEED = 3.2
export const PLAYER_JUMP_SPEED = 9.5
export const PLAYER_GRAVITY = 28
export const PLAYER_WATER_GRAVITY = 4
export const PLAYER_AIR_CONTROL = 0.3
export const PLAYER_GROUND_ACCELERATION = 18

export const BLOCK_FACE_NAMES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const
export type BlockFaceName = (typeof BLOCK_FACE_NAMES)[number]
