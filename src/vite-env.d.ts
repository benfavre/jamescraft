interface VoxelDebugApi {
  getState: () => {
    ready: boolean
    locked: boolean
    touchMode: boolean
    cameraMode: 'first-person' | 'third-person'
    selectedSlot: number
    selectedBlock: string
    loadedChunks: number
    player: { x: number; y: number; z: number }
    target: { block: number[]; adjacent: number[]; distance: number } | null
    playground: {
      starsCollected: number
      starsTotal: number
      padsUsed: number
      ringCleared: boolean
      bridgePlaced: number
      bridgeNeeded: number
      crateSmashed: boolean
      goalReached: boolean
    }
  }
  peekBlock: (x: number, y: number, z: number) => number
}

interface Window {
  __VOXEL_DEBUG__?: VoxelDebugApi
}
