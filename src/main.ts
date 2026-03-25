import './style.css'
import { VoxelSandboxGame } from './VoxelSandboxGame'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app mount node')
}

const game = new VoxelSandboxGame(app)

window.__VOXEL_DEBUG__ = {
  getState: () => game.getDebugState(),
  peekBlock: (x: number, y: number, z: number) => game.peekBlock(x, y, z),
}

window.addEventListener('beforeunload', () => {
  delete window.__VOXEL_DEBUG__
  game.dispose()
})
