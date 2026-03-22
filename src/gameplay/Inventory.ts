import { BlockId, getBlockDefinition } from '../world/BlockTypes'

export const enum ItemType {
  Block = 0,
  Tool = 1,
  Food = 2,
}

export const enum ToolTier { Wood = 0, Stone = 1, Iron = 2, Diamond = 3 }
export const enum ToolKind { Pickaxe = 0, Axe = 1, Shovel = 2, Sword = 3 }

export interface ItemStack {
  id: number
  type: ItemType
  count: number
  durability?: number
  maxDurability?: number
  toolTier?: ToolTier
  toolKind?: ToolKind
}

export const ITEM_STICK = 100
export const ITEM_WOODEN_PICKAXE = 101
export const ITEM_STONE_PICKAXE = 102
export const ITEM_IRON_PICKAXE = 103
export const ITEM_DIAMOND_PICKAXE = 104
export const ITEM_WOODEN_AXE = 105
export const ITEM_STONE_AXE = 106
export const ITEM_IRON_AXE = 107
export const ITEM_DIAMOND_AXE = 108
export const ITEM_WOODEN_SHOVEL = 109
export const ITEM_STONE_SHOVEL = 110
export const ITEM_IRON_SHOVEL = 111
export const ITEM_DIAMOND_SHOVEL = 112
export const ITEM_WOODEN_SWORD = 113
export const ITEM_STONE_SWORD = 114
export const ITEM_IRON_SWORD = 115
export const ITEM_DIAMOND_SWORD = 116
export const ITEM_RAW_PORK = 200
export const ITEM_COOKED_PORK = 201
export const ITEM_RAW_BEEF = 202
export const ITEM_COOKED_BEEF = 203

export const FOOD_VALUES: Record<number, number> = {
  [ITEM_RAW_PORK]: 3, [ITEM_COOKED_PORK]: 8,
  [ITEM_RAW_BEEF]: 3, [ITEM_COOKED_BEEF]: 8,
}

export const ITEM_LABELS: Record<number, string> = {
  [ITEM_STICK]: 'Stick',
  [ITEM_WOODEN_PICKAXE]: 'Wood Pick', [ITEM_STONE_PICKAXE]: 'Stone Pick',
  [ITEM_IRON_PICKAXE]: 'Iron Pick', [ITEM_DIAMOND_PICKAXE]: 'Diamond Pick',
  [ITEM_WOODEN_AXE]: 'Wood Axe', [ITEM_STONE_AXE]: 'Stone Axe',
  [ITEM_IRON_AXE]: 'Iron Axe', [ITEM_DIAMOND_AXE]: 'Diamond Axe',
  [ITEM_WOODEN_SHOVEL]: 'Wood Shovel', [ITEM_STONE_SHOVEL]: 'Stone Shovel',
  [ITEM_IRON_SHOVEL]: 'Iron Shovel', [ITEM_DIAMOND_SHOVEL]: 'Diamond Shovel',
  [ITEM_WOODEN_SWORD]: 'Wood Sword', [ITEM_STONE_SWORD]: 'Stone Sword',
  [ITEM_IRON_SWORD]: 'Iron Sword', [ITEM_DIAMOND_SWORD]: 'Diamond Sword',
  [ITEM_RAW_PORK]: 'Raw Pork', [ITEM_COOKED_PORK]: 'Cooked Pork',
  [ITEM_RAW_BEEF]: 'Raw Beef', [ITEM_COOKED_BEEF]: 'Cooked Beef',
}

export const ITEM_COLORS: Record<number, string> = {
  [ITEM_STICK]: '#9a6a3a',
  [ITEM_WOODEN_PICKAXE]: '#9a6a3a', [ITEM_STONE_PICKAXE]: '#8a939b',
  [ITEM_IRON_PICKAXE]: '#d4d4d4', [ITEM_DIAMOND_PICKAXE]: '#4eeae2',
  [ITEM_WOODEN_AXE]: '#9a6a3a', [ITEM_STONE_AXE]: '#8a939b',
  [ITEM_IRON_AXE]: '#d4d4d4', [ITEM_DIAMOND_AXE]: '#4eeae2',
  [ITEM_WOODEN_SHOVEL]: '#9a6a3a', [ITEM_STONE_SHOVEL]: '#8a939b',
  [ITEM_IRON_SHOVEL]: '#d4d4d4', [ITEM_DIAMOND_SHOVEL]: '#4eeae2',
  [ITEM_WOODEN_SWORD]: '#9a6a3a', [ITEM_STONE_SWORD]: '#8a939b',
  [ITEM_IRON_SWORD]: '#d4d4d4', [ITEM_DIAMOND_SWORD]: '#4eeae2',
  [ITEM_RAW_PORK]: '#e8a0a0', [ITEM_COOKED_PORK]: '#a05030',
  [ITEM_RAW_BEEF]: '#c06060', [ITEM_COOKED_BEEF]: '#804020',
}

export const TOOL_SPEED: Record<ToolTier, number> = {
  [ToolTier.Wood]: 2, [ToolTier.Stone]: 4, [ToolTier.Iron]: 6, [ToolTier.Diamond]: 8,
}

interface CraftingRecipe {
  w: number; h: number; pattern: number[]
  result: { id: number; type: ItemType; count: number; toolTier?: ToolTier; toolKind?: ToolKind; dur?: number }
}

const P = BlockId.Planks as number
const ST = ITEM_STICK
const C = BlockId.Cobblestone as number

export const RECIPES: CraftingRecipe[] = [
  { w: 1, h: 1, pattern: [BlockId.Wood], result: { id: P, type: ItemType.Block, count: 4 } },
  { w: 1, h: 1, pattern: [BlockId.BirchLog], result: { id: P, type: ItemType.Block, count: 4 } },
  { w: 1, h: 1, pattern: [BlockId.SpruceLog], result: { id: P, type: ItemType.Block, count: 4 } },
  { w: 1, h: 2, pattern: [P, P], result: { id: ST, type: ItemType.Tool, count: 4 } },
  { w: 2, h: 2, pattern: [P, P, P, P], result: { id: BlockId.CraftingTable, type: ItemType.Block, count: 1 } },
  { w: 3, h: 3, pattern: [C, C, C, C, 0, C, C, C, C], result: { id: BlockId.Furnace, type: ItemType.Block, count: 1 } },
  // Wooden tools
  { w: 3, h: 3, pattern: [P, P, P, 0, ST, 0, 0, ST, 0], result: { id: ITEM_WOODEN_PICKAXE, type: ItemType.Tool, count: 1, toolTier: ToolTier.Wood, toolKind: ToolKind.Pickaxe, dur: 60 } },
  { w: 2, h: 3, pattern: [P, P, P, ST, 0, ST], result: { id: ITEM_WOODEN_AXE, type: ItemType.Tool, count: 1, toolTier: ToolTier.Wood, toolKind: ToolKind.Axe, dur: 60 } },
  { w: 1, h: 3, pattern: [P, ST, ST], result: { id: ITEM_WOODEN_SHOVEL, type: ItemType.Tool, count: 1, toolTier: ToolTier.Wood, toolKind: ToolKind.Shovel, dur: 60 } },
  { w: 1, h: 3, pattern: [P, P, ST], result: { id: ITEM_WOODEN_SWORD, type: ItemType.Tool, count: 1, toolTier: ToolTier.Wood, toolKind: ToolKind.Sword, dur: 60 } },
  // Stone tools
  { w: 3, h: 3, pattern: [C, C, C, 0, ST, 0, 0, ST, 0], result: { id: ITEM_STONE_PICKAXE, type: ItemType.Tool, count: 1, toolTier: ToolTier.Stone, toolKind: ToolKind.Pickaxe, dur: 132 } },
  { w: 2, h: 3, pattern: [C, C, C, ST, 0, ST], result: { id: ITEM_STONE_AXE, type: ItemType.Tool, count: 1, toolTier: ToolTier.Stone, toolKind: ToolKind.Axe, dur: 132 } },
  { w: 1, h: 3, pattern: [C, ST, ST], result: { id: ITEM_STONE_SHOVEL, type: ItemType.Tool, count: 1, toolTier: ToolTier.Stone, toolKind: ToolKind.Shovel, dur: 132 } },
  { w: 1, h: 3, pattern: [C, C, ST], result: { id: ITEM_STONE_SWORD, type: ItemType.Tool, count: 1, toolTier: ToolTier.Stone, toolKind: ToolKind.Sword, dur: 132 } },
]

export class Inventory {
  readonly slots: (ItemStack | null)[] = new Array(36).fill(null)

  getHotbarSlot(i: number): ItemStack | null { return this.slots[i] ?? null }

  addItem(id: number, type: ItemType, count: number, extra?: Partial<ItemStack>): number {
    let rem = count
    if (type !== ItemType.Tool) {
      for (let i = 0; i < 36 && rem > 0; i++) {
        const s = this.slots[i]
        if (s && s.id === id && s.type === type && s.count < 64) {
          const add = Math.min(rem, 64 - s.count)
          s.count += add; rem -= add
        }
      }
    }
    for (let i = 0; i < 36 && rem > 0; i++) {
      if (!this.slots[i]) {
        const add = type === ItemType.Tool ? 1 : Math.min(rem, 64)
        this.slots[i] = { id, type, count: add, ...extra }
        rem -= add
      }
    }
    return count - rem
  }

  removeFromSlot(slot: number, count: number): boolean {
    const s = this.slots[slot]
    if (!s) return false
    if (s.count <= count) this.slots[slot] = null
    else s.count -= count
    return true
  }

  damageTool(slot: number): boolean {
    const s = this.slots[slot]
    if (!s || s.type !== ItemType.Tool || !s.durability) return false
    s.durability--
    if (s.durability <= 0) { this.slots[slot] = null; return true }
    return false
  }

  swapSlots(a: number, b: number): void {
    const tmp = this.slots[a]
    this.slots[a] = this.slots[b]
    this.slots[b] = tmp
  }
}

export function tryCraft(grid: (ItemStack | null)[], gw: number, gh: number): CraftingRecipe | null {
  let x0 = gw, x1 = -1, y0 = gh, y1 = -1
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (grid[y * gw + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  }
  if (x1 < 0) return null
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const compact: number[] = []
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) compact.push(grid[y * gw + x]?.id ?? 0)
  for (const r of RECIPES) {
    if (r.w !== w || r.h !== h) continue
    if (compact.every((v, i) => v === r.pattern[i])) return r
  }
  return null
}

export function getItemLabel(id: number): string {
  if (ITEM_LABELS[id]) return ITEM_LABELS[id]
  try { return getBlockDefinition(id as BlockId).label } catch { return `Item ${id}` }
}

export function getItemColor(id: number): string {
  if (ITEM_COLORS[id]) return ITEM_COLORS[id]
  try { return getBlockDefinition(id as BlockId).baseColor } catch { return '#888' }
}
