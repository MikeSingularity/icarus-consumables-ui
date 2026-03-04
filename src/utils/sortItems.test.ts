import { describe, it, expect } from 'vitest'
import { sortItems, itemHasModifierCategory, buildSortOptions } from './sortItems'
import type { Item, Modifier, StatMetadataEntry } from '@/types/consumables'

const statMetadata: Record<string, StatMetadataEntry> = {
  BaseMaximumHealth: { label: 'Max Health', categories: ['Health', 'Combat'] },
  BaseMaximumStamina: { label: 'Max Stamina', categories: ['Stamina'] },
}

const modifiers: Record<string, Modifier> = {
  HealthBuff: {
    id: 'HealthBuff',
    display_name: 'Health Buff',
    lifetime: 900,
    effects: { BaseMaximumHealth: 75 },
  },
  StaminaBuff: {
    id: 'StaminaBuff',
    display_name: 'Stamina Buff',
    lifetime: 600,
    effects: { BaseMaximumStamina: 100 },
  },
  NoBuff: {
    id: 'NoBuff',
    display_name: 'No Stat Buff',
    lifetime: 300,
    effects: { BaseExperience: 0.05 },
  },
}

const makeItem = (
  name: string,
  tier: number,
  baseStats: Record<string, number>,
  mods: string[],
): Item => ({
  name,
  display_name: name,
  category: 'Food',
  tier: { total: tier, anchor: 'Character' },
  base_stats: baseStats,
  modifiers: mods,
  recipes: [],
})

const itemA = makeItem('itemA', 3, { Food: 150 }, ['HealthBuff'])
const itemB = makeItem('itemB', 1, { Food: 50 }, ['StaminaBuff'])
const itemC = makeItem('itemC', 2, { Food: 100, Water: 30 }, ['NoBuff'])
const itemD = makeItem('itemD', 4, {}, [])

describe('itemHasModifierCategory', () => {
  it('returns true when modifier effect is in category', () => {
    expect(itemHasModifierCategory(itemA, 'Health', modifiers, statMetadata)).toBe(true)
    expect(itemHasModifierCategory(itemB, 'Stamina', modifiers, statMetadata)).toBe(true)
  })

  it('returns false when no modifier effect matches category', () => {
    expect(itemHasModifierCategory(itemA, 'Stamina', modifiers, statMetadata)).toBe(false)
    expect(itemHasModifierCategory(itemC, 'Health', modifiers, statMetadata)).toBe(false)
  })

  it('returns false for items with no modifiers', () => {
    expect(itemHasModifierCategory(itemD, 'Health', modifiers, statMetadata)).toBe(false)
  })
})

describe('sortItems', () => {
  const items = [itemA, itemB, itemC, itemD]

  it('sorts by tier descending with key "tier"', () => {
    const sorted = sortItems(items, 'tier', modifiers, statMetadata)
    expect(sorted.map((i) => i.name)).toEqual(['itemD', 'itemA', 'itemC', 'itemB'])
  })

  it('sorts by base stat descending with "base:<key>", items without stat go last', () => {
    const sorted = sortItems(items, 'base:Food', modifiers, statMetadata)
    expect(sorted[0].name).toBe('itemA') // Food: 150
    expect(sorted[1].name).toBe('itemC') // Food: 100
    expect(sorted[2].name).toBe('itemB') // Food: 50
    expect(sorted[3].name).toBe('itemD') // Food: undefined → -1
  })

  it('secondary sort by tier when base stats are equal', () => {
    const eq1 = makeItem('eq1', 3, { Food: 100 }, [])
    const eq2 = makeItem('eq2', 1, { Food: 100 }, [])
    const sorted = sortItems([eq2, eq1], 'base:Food', modifiers, statMetadata)
    expect(sorted[0].name).toBe('eq1') // higher tier wins
  })

  it('binary groups by modifier category with "modcat:<cat>"', () => {
    const sorted = sortItems(items, 'modcat:Health', modifiers, statMetadata)
    expect(sorted[0].name).toBe('itemA') // has Health buff
    // remaining order determined by tier descending
    const rest = sorted.slice(1).map((i) => i.name)
    expect(rest).toContain('itemD') // tier 4
    expect(rest.indexOf('itemD')).toBeLessThan(rest.indexOf('itemC'))
    expect(rest.indexOf('itemC')).toBeLessThan(rest.indexOf('itemB'))
  })

  it('returns a new array without mutating input', () => {
    const original = [itemB, itemA]
    const sorted = sortItems(original, 'tier', modifiers, statMetadata)
    expect(original[0].name).toBe('itemB')
    expect(sorted[0].name).toBe('itemA')
  })
})

describe('buildSortOptions', () => {
  it('always includes Tier option first', () => {
    const opts = buildSortOptions([itemA], modifiers, statMetadata)
    expect(opts[0]).toEqual({ key: 'tier', label: 'Tier' })
  })

  it('includes base stat options for stats present in items', () => {
    const opts = buildSortOptions([itemA, itemC], modifiers, statMetadata)
    const keys = opts.map((o) => o.key)
    expect(keys).toContain('base:Food')
    expect(keys).toContain('base:Water')
    expect(keys).not.toContain('base:Oxygen')
  })

  it('includes modifier category options when items have matching effects', () => {
    const opts = buildSortOptions([itemA, itemB], modifiers, statMetadata)
    const keys = opts.map((o) => o.key)
    expect(keys).toContain('modcat:Health')
    expect(keys).toContain('modcat:Stamina')
  })

  it('omits modifier category when no items have matching effects', () => {
    const opts = buildSortOptions([itemC], modifiers, statMetadata)
    const keys = opts.map((o) => o.key)
    expect(keys).not.toContain('modcat:Health')
    expect(keys).not.toContain('modcat:Stamina')
  })
})
