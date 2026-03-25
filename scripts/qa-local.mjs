import { chromium } from 'playwright'

const targetUrl = process.env.TARGET_URL ?? 'http://127.0.0.1:5173'
const screenshotPath = process.env.SCREENSHOT_PATH ?? 'docs/local-playwright-check.png'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page = await context.newPage()

try {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__VOXEL_DEBUG__?.getState().loadedChunks > 0)
  await page.mouse.click(800, 450)
  await page.waitForFunction(() => window.__VOXEL_DEBUG__?.getState().locked === true)
  await page.waitForFunction(() => window.__VOXEL_DEBUG__?.getState().cameraMode === 'third-person')
  await page.keyboard.press('KeyV')
  await page.waitForFunction(() => window.__VOXEL_DEBUG__?.getState().cameraMode === 'first-person')
  await page.keyboard.press('KeyV')
  await page.waitForFunction(() => window.__VOXEL_DEBUG__?.getState().cameraMode === 'third-person')

  const beforeMove = await readDebugState(page)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(900)
  await page.keyboard.up('KeyW')
  const afterMove = await readDebugState(page)

  if (Math.abs(afterMove.player.z - beforeMove.player.z) < 0.4 && Math.abs(afterMove.player.x - beforeMove.player.x) < 0.4) {
    throw new Error('Movement check failed')
  }

  if ((afterMove.playground?.starsCollected ?? 0) < 1) {
    throw new Error('Star trail check failed')
  }

  const beforeJumpY = afterMove.player.y
  await page.keyboard.press('Space')
  await page.waitForTimeout(500)
  const peakState = await readDebugState(page)

  if (peakState.player.y <= beforeJumpY + 0.2) {
    throw new Error('Jump check failed')
  }

  await page.waitForTimeout(900)
  await page.mouse.move(800, 640)
  await page.waitForTimeout(200)
  const targetState = await readDebugState(page)

  if (!targetState.target) {
    throw new Error('No DDA target under crosshair')
  }

  const [targetX, targetY, targetZ] = targetState.target.block

  await triggerCanvasMouse(page, 0, 'down')
  await page.waitForFunction(
    ([x, y, z]) => window.__VOXEL_DEBUG__?.peekBlock(x, y, z) === 0,
    [targetX, targetY, targetZ],
  )
  await triggerCanvasMouse(page, 0, 'up')

  const placeState = await readDebugState(page)

  if (!placeState.target) {
    throw new Error('No placement target after break')
  }

  const placeTarget = placeState.target.adjacent

  await page.keyboard.press('Digit7')
  await triggerCanvasMouse(page, 2, 'down')
  await triggerCanvasMouse(page, 2, 'up')
  await page.waitForFunction(
    ([x, y, z]) => window.__VOXEL_DEBUG__?.peekBlock(x, y, z) === 5,
    placeTarget,
  )

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(JSON.stringify({ ok: true, screenshotPath }))
} finally {
  await browser.close()
}

async function readDebugState(page) {
  const state = await page.evaluate(() => window.__VOXEL_DEBUG__?.getState() ?? null)

  if (!state) {
    throw new Error('Debug API unavailable')
  }

  return state
}

async function triggerCanvasMouse(page, button, phase) {
  await page.evaluate(
    ({ currentButton, currentPhase }) => {
      const canvas = document.querySelector('.game-canvas')

      if (!(canvas instanceof HTMLElement)) {
        throw new Error('Missing .game-canvas')
      }

      const rect = canvas.getBoundingClientRect()
      const clientX = rect.left + rect.width / 2
      const clientY = rect.top + rect.height / 2

      canvas.dispatchEvent(
        new MouseEvent(`mouse${currentPhase}`, {
          button: currentButton,
          bubbles: true,
          clientX,
          clientY,
        }),
      )
    },
    { currentButton: button, currentPhase: phase },
  )
}
