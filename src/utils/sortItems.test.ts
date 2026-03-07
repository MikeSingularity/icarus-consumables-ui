import { describe, it, expect } from 'vitest'
import { sortItems, buildSortOptions } from './sortItems'
import type { Item, StatMetadataEntry } from '@/types/consumables'

const statMetadata: Record<string, StatMetadataEntry> = {
  'BaseMaximumHealth_+': { display_name: 'Max Health', categories: ['Health'] },
  'BaseMaximumStamina_+': { display_name: 'Max Stamina', categories: ['Stamina'] },
  'BaseFoodRecovery_+': { display_name: 'Food when Consumed', categories: ['Consumption'] },
  'BaseWaterRecovery_+': { display_name: 'Water when Consumed', categories: ['Consumption'] },
}

const makeItem = (
  name: string,
  tier: number,
  baseStats: Record<string, number>,
  mods: string[],
  modifierStats: Record<string, number> = {},
): Item => ({
  name,
  display_name: name,
  category: 'Food',
  tier: { total: tier, anchor: 'Character' },
  base_stats: baseStats,
  modifiers: mods,
  modifier_stats: modifierStats,
  recipes: [],
})

const itemA = makeItem('itemA', 3, { 'BaseFoodRecovery_+': 150 }, ['HealthBuff'], { Health: 95 })
const itemB = makeItem('itemB', 1, { 'BaseFoodRecovery_+': 50 }, ['StaminaBuff'], { Stamina: 60 })
const itemC = makeItem('itemC', 2, { 'BaseFoodRecovery_+': 100, 'BaseWaterRecovery_+': 30 }, ['NoBuff'], { Experience: 30 })
const itemD = makeItem('itemD', 4, {}, [])

describe('sortItems', () => {
  const items = [itemA, itemB, itemC, itemD]

  it('sorts by tier descending with key "tier"', () => {
    const sorted = sortItems(items, 'tier')
    expect(sorted.map((i) => i.name)).toEqual(['itemD', 'itemA', 'itemC', 'itemB'])
  })

  it('sorts by name ascending with key "name"', () => {
    const sorted = sortItems(items, 'name')
    expect(sorted.map((i) => i.name)).toEqual(['itemA', 'itemB', 'itemC', 'itemD'])
  })

  it('sorts by name with secondary sort by tier when display_name is equal', () => {
    const sameName1 = makeItem('z', 2, {}, [])
    const sameName2 = makeItem('z', 4, {}, [])
    sameName1.display_name = 'Same'
    sameName2.display_name = 'Same'
    const sorted = sortItems([sameName1, sameName2], 'name')
    expect(sorted[0].tier.total).toBe(4)
    expect(sorted[1].tier.total).toBe(2)
  })

  it('sorts by base stat descending with "base:<key>", items without stat go last', () => {
    const sorted = sortItems(items, 'base:BaseFoodRecovery_+')
    expect(sorted[0].name).toBe('itemA') // 150
    expect(sorted[1].name).toBe('itemC') // 100
    expect(sorted[2].name).toBe('itemB') // 50
    expect(sorted[3].name).toBe('itemD') // undefined → -1
  })

  it('secondary sort by tier when base stats are equal', () => {
    const eq1 = makeItem('eq1', 3, { 'BaseFoodRecovery_+': 100 }, [])
    const eq2 = makeItem('eq2', 1, { 'BaseFoodRecovery_+': 100 }, [])
    const sorted = sortItems([eq2, eq1], 'base:BaseFoodRecovery_+')
    expect(sorted[0].name).toBe('eq1') // higher tier wins
  })

  it('sorts by modifier_stats score descending with "modcat:<category>"', () => {
    const sorted = sortItems(items, 'modcat:Health')
    expect(sorted[0].name).toBe('itemA') // Health: 95
    // remaining order by tier descending (itemD=4, itemC=2, itemB=1)
    const rest = sorted.slice(1).map((i) => i.name)
    expect(rest).toEqual(['itemD', 'itemC', 'itemB'])
  })

  it('returns a new array without mutating input', () => {
    const original = [itemB, itemA]
    const sorted = sortItems(original, 'tier')
    expect(original[0].name).toBe('itemB')
    expect(sorted[0].name).toBe('itemA')
  })
})

describe('buildSortOptions', () => {
  it('always includes Tier then Name options first', () => {
    const opts = buildSortOptions([itemA], statMetadata)
    expect(opts[0]).toEqual({ key: 'tier', label: 'Tier' })
    expect(opts[1]).toEqual({ key: 'name', label: 'Name' })
  })

  it('includes base stat options with display_name labels for stats present in items', () => {
    const opts = buildSortOptions([itemA, itemC], statMetadata)
    const keys = opts.map((o) => o.key)
    expect(keys).toContain('base:BaseFoodRecovery_+')
    expect(keys).toContain('base:BaseWaterRecovery_+')
    expect(keys).not.toContain('base:BaseOxygenRecovery_+')
    const foodOpt = opts.find((o) => o.key === 'base:BaseFoodRecovery_+')
    expect(foodOpt?.label).toBe('Food')
  })

  it('includes modifier category options when items have non-zero modifier_stats', () => {
    const opts = buildSortOptions([itemA, itemB], statMetadata)
    const keys = opts.map((o) => o.key)
    expect(keys).toContain('modcat:Health')
    expect(keys).toContain('modcat:Stamina')
  })

  it('omits modifier category when no items have that modifier_stats key', () => {
    const opts = buildSortOptions([itemC], statMetadata)
    const keys = opts.map((o) => o.key)
    expect(keys).not.toContain('modcat:Health')
    expect(keys).not.toContain('modcat:Stamina')
  })
})
