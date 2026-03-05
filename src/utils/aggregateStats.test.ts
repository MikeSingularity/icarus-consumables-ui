import { describe, it, expect } from 'vitest'
import { aggregateBaseStats, aggregateModifierEffects, collectModifiers } from './aggregateStats'
import type { Item, Modifier } from '@/types/consumables'

const makeItem = (
  name: string,
  baseStats: Record<string, number>,
  mods: string[],
): Item => ({
  name,
  display_name: name,
  category: 'Food',
  tier: { total: 1, anchor: 'Character' },
  base_stats: baseStats,
  modifiers: mods,
  modifier_stats: {},
  recipes: [],
})

const modifiers: Record<string, Modifier> = {
  ModA: {
    id: 'ModA',
    display_name: 'Mod A',
    lifetime: 600,
    stats: { 'BaseMaximumHealth_+': 75 },
  },
  ModB: {
    id: 'ModB',
    display_name: 'Mod B',
    lifetime: 300,
    stats: { 'BaseMaximumHealth_+': 25, 'BaseMaximumStamina_+': 50 },
  },
}

const itemA = makeItem('a', { 'BaseFoodRecovery_+': 100, 'BaseWaterRecovery_+': 20 }, ['ModA'])
const itemB = makeItem('b', { 'BaseFoodRecovery_+': 50, 'BaseHealthRecovery_+': 10 }, ['ModB'])
const itemC = makeItem('c', { 'BaseFoodRecovery_+': 25 }, [])

describe('aggregateBaseStats', () => {
  it('sums overlapping stat keys across items', () => {
    expect(aggregateBaseStats([itemA, itemB])).toEqual({
      'BaseFoodRecovery_+': 150,
      'BaseWaterRecovery_+': 20,
      'BaseHealthRecovery_+': 10,
    })
  })

  it('returns empty object for no items', () => {
    expect(aggregateBaseStats([])).toEqual({})
  })

  it('includes all keys present in any item', () => {
    const result = aggregateBaseStats([itemA, itemC])
    expect(result['BaseFoodRecovery_+']).toBe(125)
    expect(result['BaseWaterRecovery_+']).toBe(20)
    expect('BaseHealthRecovery_+' in result).toBe(false)
  })
})

describe('aggregateModifierEffects', () => {
  it('sums effects across unique modifiers', () => {
    const result = aggregateModifierEffects([itemA, itemB], modifiers)
    expect(result['BaseMaximumHealth_+']).toBe(100) // 75 + 25
    expect(result['BaseMaximumStamina_+']).toBe(50)
  })

  it('counts each modifier at most once even if shared across items', () => {
    const itemD = makeItem('d', {}, ['ModA'])
    const result = aggregateModifierEffects([itemA, itemD], modifiers)
    expect(result['BaseMaximumHealth_+']).toBe(75) // not 150
  })

  it('returns empty object for items with no modifiers', () => {
    expect(aggregateModifierEffects([itemC], modifiers)).toEqual({})
  })

  it('ignores modifier IDs not found in the modifiers dict', () => {
    const itemMissing = makeItem('x', {}, ['NonExistentMod'])
    expect(aggregateModifierEffects([itemMissing], modifiers)).toEqual({})
  })
})

describe('collectModifiers', () => {
  it('returns unique modifier objects in encounter order', () => {
    const result = collectModifiers([itemA, itemB], modifiers)
    expect(result.map((m) => m.id)).toEqual(['ModA', 'ModB'])
  })

  it('deduplicates shared modifier IDs across items', () => {
    const itemD = makeItem('d', {}, ['ModA'])
    const result = collectModifiers([itemA, itemD], modifiers)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ModA')
  })

  it('returns empty array for items with no modifiers', () => {
    expect(collectModifiers([itemC], modifiers)).toEqual([])
  })
})
