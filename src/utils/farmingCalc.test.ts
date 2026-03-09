import { describe, it, expect } from 'vitest'
import {
  buildGenericsMap,
  buildItemsMap,
  needsServingsOverride,
  getItemsPerHour,
  getRecipeYieldCount,
  getEffectiveRecipeId,
  getAvailableRecipeIds,
  getDurationMultiplier,
  computeFarmingResult,
} from './farmingCalc'
import type { Item, Recipe, Modifier, Generic, StatMetadataEntry } from '@/types/consumables'
import type { FarmingParams } from './farmingCalc'

// ---- Fixtures ----

const makeItem = (
  name: string,
  modifiers: string[] = [],
  recipes: string[] = [],
  growthData?: { growth_time: number; harvest_min: number; harvest_max: number },
  sourceItem?: string,
): Item => ({
  name,
  display_name: name.replace(/_/g, ' '),
  category: 'Food',
  tier: { total: 1, anchor: 'Character' },
  base_stats: {},
  modifiers,
  modifier_stats: {},
  recipes,
  ...(growthData !== undefined && { growth_data: growthData }),
  ...(sourceItem !== undefined && { source_item: sourceItem }),
})

const makeModifier = (id: string, lifetime: number): Modifier => ({
  id,
  display_name: id,
  lifetime,
  stats: {},
})

const makeRecipe = (
  id: string,
  inputs: Array<{ name: string; count: number; is_generic?: boolean }>,
  outputName: string,
  yieldsCount = 1,
): Recipe => ({
  id,
  inputs: inputs.map((i) => ({
    name: i.name,
    count: i.count,
    display_name: i.name.replace(/_/g, ' '),
    is_generic: i.is_generic ?? false,
  })),
  outputs: [{ name: outputName, yields_count: yieldsCount, display_name: outputName }],
  benches: ['Crafting_Bench'],
  requirements: {},
})

// Wheat grows in 1 hour, yields 5 units per harvest
const wheat = makeItem('Wheat', [], [], { growth_time: 3600, harvest_min: 4, harvest_max: 6 })
// Flour: crafted from 2 Wheat, yields 1 Flour
const flour = makeItem('Flour', [], ['recipe_flour'])
const recipeFlour = makeRecipe('recipe_flour', [{ name: 'Wheat', count: 2 }], 'Flour')
// Bread: crafted from 3 Flour, yields 1 Bread; has a 30-min timed modifier
const breadMod = makeModifier('bread_mod', 1800)
const bread = makeItem('Bread', ['bread_mod'], ['recipe_bread'])
const recipeBread = makeRecipe('recipe_bread', [{ name: 'Flour', count: 3 }], 'Bread')
// Meat: no growth_data (stockpile ingredient)
const rawMeat = makeItem('Raw_Meat')
// Stew: crafted from 2 Raw_Meat; instant modifier (lifetime=0)
const stewMod = makeModifier('stew_mod', 0)
const stew = makeItem('Stew', ['stew_mod'], ['recipe_stew'])
const recipeStew = makeRecipe('recipe_stew', [{ name: 'Raw_Meat', count: 2 }], 'Stew')

const allItems = [wheat, flour, bread, rawMeat, stew]
const allModifiers = { bread_mod: breadMod, stew_mod: stewMod }
const allRecipes = {
  recipe_flour: recipeFlour,
  recipe_bread: recipeBread,
  recipe_stew: recipeStew,
}

const defaultParams = (
  loadoutItems: Item[],
  overrides: Partial<Pick<FarmingParams, 'servingsOverrides' | 'recipeOverrides' | 'genericSelections'>> = {},
): FarmingParams => ({
  loadoutItems,
  itemsMap: buildItemsMap(allItems),
  recipes: allRecipes,
  modifiers: allModifiers,
  genericsMap: {},
  servingsOverrides: overrides.servingsOverrides ?? {},
  recipeOverrides: overrides.recipeOverrides ?? {},
  genericSelections: overrides.genericSelections ?? {},
})

// ---- Tests ----

describe('buildGenericsMap', () => {
  it('converts generics array to id-keyed dict', () => {
    const generics: Generic[] = [
      { id: 'Any_Vegetable', display_name: 'Vegetable', items: ['Potato', 'Carrot'] },
      { id: 'Any_Meat', display_name: 'Meat', items: ['Raw_Meat', 'Fish'] },
    ]
    const map = buildGenericsMap(generics)
    expect(map['Any_Vegetable']).toEqual(generics[0])
    expect(map['Any_Meat']).toEqual(generics[1])
  })
})

describe('buildItemsMap', () => {
  it('creates name-keyed item lookup', () => {
    const map = buildItemsMap([wheat, bread])
    expect(map['Wheat']).toBe(wheat)
    expect(map['Bread']).toBe(bread)
    expect(map['Flour']).toBeUndefined()
  })
})

describe('needsServingsOverride', () => {
  it('returns false for items with a timed modifier', () => {
    expect(needsServingsOverride(bread, allModifiers)).toBe(false)
  })

  it('returns true for items with instant modifier (lifetime=0)', () => {
    expect(needsServingsOverride(stew, allModifiers)).toBe(true)
  })

  it('returns true for items with no modifier', () => {
    expect(needsServingsOverride(wheat, allModifiers)).toBe(true)
  })
})

describe('getItemsPerHour', () => {
  it('calculates rate from timed modifier: 3600 / lifetime', () => {
    // bread_mod.lifetime = 1800 → 2 items/hr
    expect(getItemsPerHour(bread, allModifiers, {})).toBeCloseTo(2)
  })

  it('uses servingsOverrides for instant modifier items', () => {
    expect(getItemsPerHour(stew, allModifiers, { Stew: 3 })).toBe(3)
  })

  it('defaults to 1 for instant modifier items with no override', () => {
    expect(getItemsPerHour(stew, allModifiers, {})).toBe(1)
  })

  it('defaults to 1 for items with no modifier', () => {
    expect(getItemsPerHour(wheat, allModifiers, {})).toBe(1)
  })

  it('respects custom servings for items with no modifier', () => {
    expect(getItemsPerHour(wheat, allModifiers, { Wheat: 4 })).toBe(4)
  })

  it('applies duration multiplier to timed modifier: fewer items/hr when duration extended', () => {
    // bread: 3600/1800 = 2 items/hr base; with 1.2x duration → 3600/(1800*1.2) ≈ 1.667
    expect(getItemsPerHour(bread, allModifiers, {}, 1.2)).toBeCloseTo(1.666666, 4)
  })
})

describe('getDurationMultiplier', () => {
  const durationStatKey = 'BaseFoodEffectsDuration_+%'
  const statMetadata: Record<string, StatMetadataEntry> = {
    [durationStatKey]: {
      display_name: 'Food Effects Duration',
      unit: '%',
      categories: ['Consumption'],
    },
  }

  it('returns 1 when loadout has no Food Effects Duration bonus', () => {
    expect(getDurationMultiplier([bread], allModifiers, statMetadata)).toBe(1)
  })

  it('returns 1 + bonus/100 when a loadout item grants Food Effects Duration', () => {
    const durationMod = makeModifier('duration_buff', 600)
    durationMod.stats[durationStatKey] = 20
    const mods = { ...allModifiers, duration_buff: durationMod }
    const itemWithDuration = makeItem('duration_food', ['duration_buff'], [])
    expect(getDurationMultiplier([itemWithDuration], mods, statMetadata)).toBe(1.2)
  })

  it('sums duration bonus per loadout item so 3 foods each +10% = 30% = 1.3x', () => {
    const durationStatKey = 'BaseFoodEffectsDuration_+%'
    const statMetadata: Record<string, StatMetadataEntry> = {
      [durationStatKey]: {
        display_name: 'Food Effects Duration',
        unit: '%',
        categories: ['Consumption'],
      },
    }
    const mod1 = makeModifier('d1', 600)
    mod1.stats[durationStatKey] = 10
    const mod2 = makeModifier('d2', 600)
    mod2.stats[durationStatKey] = 10
    const mod3 = makeModifier('d3', 600)
    mod3.stats[durationStatKey] = 10
    const mods = { ...allModifiers, d1: mod1, d2: mod2, d3: mod3 }
    const loadout = [
      makeItem('food1', ['d1'], []),
      makeItem('food2', ['d2'], []),
      makeItem('food3', ['d3'], []),
    ]
    expect(getDurationMultiplier(loadout, mods, statMetadata)).toBe(1.3)
  })

  it('sums duration even when multiple foods share the same modifier (each food contributes)', () => {
    const durationStatKey = 'BaseFoodEffectsDuration_+%'
    const statMetadata: Record<string, StatMetadataEntry> = {
      [durationStatKey]: {
        display_name: 'Food Effects Duration',
        unit: '%',
        categories: ['Consumption'],
      },
    }
    const sharedMod = makeModifier('shared_duration', 600)
    sharedMod.stats[durationStatKey] = 10
    const mods = { ...allModifiers, shared_duration: sharedMod }
    const loadout = [
      makeItem('food1', ['shared_duration'], []),
      makeItem('food2', ['shared_duration'], []),
      makeItem('food3', ['shared_duration'], []),
    ]
    expect(getDurationMultiplier(loadout, mods, statMetadata)).toBe(1.3)
  })
})

describe('getRecipeYieldCount', () => {
  it('returns yields_count for direct output match', () => {
    const recipe = makeRecipe('r', [], 'Bread', 2)
    expect(getRecipeYieldCount('Bread', recipe)).toBe(2)
  })

  it('returns 1 when no matching output', () => {
    expect(getRecipeYieldCount('Unknown', recipeBread)).toBe(1)
  })

  it('returns yields_count for multiple outputs, matching by name', () => {
    const multiRecipe: Recipe = {
      id: 'r_multi',
      inputs: [],
      outputs: [
        { name: 'By_Product', yields_count: 1, display_name: 'By Product' },
        { name: 'Cake_Slice', yields_count: 4, display_name: 'Slices' },
      ],
      benches: ['Bench'],
      requirements: {},
    }
    expect(getRecipeYieldCount('Cake_Slice', multiRecipe)).toBe(4)
    expect(getRecipeYieldCount('By_Product', multiRecipe)).toBe(1)
  })
})

describe('getEffectiveRecipeId', () => {
  it('returns item first recipe by default', () => {
    const map = buildItemsMap(allItems)
    expect(getEffectiveRecipeId(bread, map, {})).toBe('recipe_bread')
  })

  it('respects recipeOverrides', () => {
    const map = buildItemsMap(allItems)
    expect(getEffectiveRecipeId(bread, map, { Bread: 'recipe_bread_v2' })).toBe('recipe_bread_v2')
  })

  it('returns undefined for items with no recipe', () => {
    const map = buildItemsMap(allItems)
    expect(getEffectiveRecipeId(wheat, map, {})).toBeUndefined()
  })

  it('uses piece own recipe when piece has recipes (real-world pattern)', () => {
    // Real-world: piece carries the recipe; parent may not exist in items
    const piece = makeItem('Cake_Piece', ['bread_mod'], ['recipe_chocolate_cake'], undefined, 'Whole_Cake')
    const map = buildItemsMap([...allItems, piece]) // parent not in map
    expect(getEffectiveRecipeId(piece, map, {})).toBe('recipe_chocolate_cake')
  })

  it('falls back to parent recipe when piece has no recipes of its own', () => {
    const parent = makeItem('Whole_Cake', [], ['recipe_whole_cake'])
    const piece = makeItem('Cake_Slice', [], [], undefined, 'Whole_Cake')
    const map = buildItemsMap([parent, piece])
    expect(getEffectiveRecipeId(piece, map, {})).toBe('recipe_whole_cake')
  })
})

describe('getAvailableRecipeIds', () => {
  it('returns item recipes', () => {
    const map = buildItemsMap(allItems)
    expect(getAvailableRecipeIds(bread, map)).toEqual(['recipe_bread'])
  })

  it('returns piece own recipes when present', () => {
    const piece = makeItem('Cake_Piece', [], ['recipe_cake_1', 'recipe_cake_2'], undefined, 'Whole_Cake')
    const map = buildItemsMap([...allItems, piece])
    expect(getAvailableRecipeIds(piece, map)).toEqual(['recipe_cake_1', 'recipe_cake_2'])
  })

  it('falls back to parent recipes when piece has no recipes', () => {
    const parent = makeItem('Whole_Cake', [], ['recipe_cake_1', 'recipe_cake_2'])
    const piece = makeItem('Cake_Slice', [], [], undefined, 'Whole_Cake')
    const map = buildItemsMap([parent, piece])
    expect(getAvailableRecipeIds(piece, map)).toEqual(['recipe_cake_1', 'recipe_cake_2'])
  })
})

describe('computeFarmingResult', () => {
  it('resolves leaf farmable ingredient into crop plot entry', () => {
    // Bread (2/hr) → Flour (recipe: 2 Wheat → 1 Flour) → Wheat (farmable)
    // Bread: 3600/1800 = 2 items/hr
    // Flour needed: 3 Flour/bread × 2 bread/hr = 6 Flour/hr
    // Wheat needed: 6 Flour/hr × (2 Wheat / 1 Flour) = 12 Wheat/hr (from Flour recipe)
    // Wheat: growth_time=3600, avg_harvest=(4+6)/2=5
    // units_per_plot_per_hour = 5 / (3600/3600) = 5
    // plots = ceil(12 / 5) = 3
    const result = computeFarmingResult(defaultParams([bread]))
    expect(result.cropPlots).toHaveLength(1)
    expect(result.cropPlots[0].name).toBe('Wheat')
    expect(result.cropPlots[0].unitsPerHour).toBeCloseTo(12)
    expect(result.cropPlots[0].plotsNeeded).toBe(3)
    expect(result.stockpile).toHaveLength(0)
  })

  it('resolves non-farmable ingredient into stockpile entry', () => {
    // Stew with no override → 1 stew/hr → 2 Raw_Meat/hr
    const result = computeFarmingResult(defaultParams([stew]))
    expect(result.stockpile).toHaveLength(1)
    expect(result.stockpile[0].name).toBe('Raw_Meat')
    expect(result.stockpile[0].unitsPerHour).toBeCloseTo(2)
    expect(result.cropPlots).toHaveLength(0)
  })

  it('uses servings override for instant modifier', () => {
    // Stew with override 3/hr → 6 Raw_Meat/hr
    const result = computeFarmingResult(defaultParams([stew], { servingsOverrides: { Stew: 3 } }))
    expect(result.stockpile[0].unitsPerHour).toBeCloseTo(6)
  })

  it('sums ingredients across multiple loadout items sharing the same leaf', () => {
    // Both bread and stew have Raw_Meat... actually only stew has Raw_Meat.
    // Let's use two stew instances... but we can't select the same item twice.
    // Instead use two different items that both need Wheat.
    const flatWheat = makeItem('Flat_Bread', ['bread_mod'], ['recipe_flat_bread'])
    const recipeFlatBread = makeRecipe('recipe_flat_bread', [{ name: 'Flour', count: 2 }], 'Flat_Bread')
    const extendedItems = [...allItems, flatWheat]
    const extendedRecipes = { ...allRecipes, recipe_flat_bread: recipeFlatBread }
    const params: FarmingParams = {
      loadoutItems: [bread, flatWheat],
      itemsMap: buildItemsMap(extendedItems),
      recipes: extendedRecipes,
      modifiers: allModifiers,
      genericsMap: {},
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: {},
    }
    const result = computeFarmingResult(params)
    expect(result.cropPlots).toHaveLength(1)
    expect(result.cropPlots[0].name).toBe('Wheat')
    // Bread: 2/hr × 3 Flour × 2 Wheat = 12 Wheat/hr
    // FlatBread: 2/hr × 2 Flour × 2 Wheat = 8 Wheat/hr
    // Total: 20 Wheat/hr
    expect(result.cropPlots[0].unitsPerHour).toBeCloseTo(20)
  })

  it('skips loadout items with no recipe', () => {
    const result = computeFarmingResult(defaultParams([wheat]))
    expect(result.cropPlots).toHaveLength(0)
    expect(result.stockpile).toHaveLength(0)
  })

  it('resolves generic ingredient to first option by default', () => {
    const carrot = makeItem('Carrot', [], [], { growth_time: 1800, harvest_min: 3, harvest_max: 5 })
    const genericRecipe = makeRecipe(
      'recipe_generic',
      [{ name: 'Any_Vegetable', count: 2, is_generic: true }],
      'Generic_Food',
    )
    const genericFood = makeItem('Generic_Food', ['bread_mod'], ['recipe_generic'])
    const params: FarmingParams = {
      loadoutItems: [genericFood],
      itemsMap: buildItemsMap([...allItems, carrot, genericFood]),
      recipes: { ...allRecipes, recipe_generic: genericRecipe },
      modifiers: allModifiers,
      genericsMap: {
        Any_Vegetable: { id: 'Any_Vegetable', display_name: 'Veggie', items: ['Carrot', 'Wheat'] },
      },
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: {},
    }
    const result = computeFarmingResult(params)
    // Default selection: Carrot (first in list)
    expect(result.cropPlots).toHaveLength(1)
    expect(result.cropPlots[0].name).toBe('Carrot')
    expect(result.genericChoices).toHaveLength(1)
    expect(result.genericChoices[0].genericId).toBe('Any_Vegetable')
    expect(result.genericChoices[0].options).toEqual(['Carrot', 'Wheat'])
  })

  it('respects genericSelections override', () => {
    const carrot = makeItem('Carrot', [], [], { growth_time: 1800, harvest_min: 3, harvest_max: 5 })
    const genericRecipe = makeRecipe(
      'recipe_generic',
      [{ name: 'Any_Vegetable', count: 2, is_generic: true }],
      'Generic_Food',
    )
    const genericFood = makeItem('Generic_Food', ['bread_mod'], ['recipe_generic'])
    const params: FarmingParams = {
      loadoutItems: [genericFood],
      itemsMap: buildItemsMap([...allItems, carrot, genericFood]),
      recipes: { ...allRecipes, recipe_generic: genericRecipe },
      modifiers: allModifiers,
      genericsMap: {
        Any_Vegetable: { id: 'Any_Vegetable', display_name: 'Veggie', items: ['Carrot', 'Wheat'] },
      },
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: { Any_Vegetable: 'Wheat' },
    }
    const result = computeFarmingResult(params)
    expect(result.cropPlots).toHaveLength(1)
    expect(result.cropPlots[0].name).toBe('Wheat')
  })

  it('stops recursion for generic items marked as is_leaf', () => {
    // Steamed Fish pattern: Any_Raw_Fish is a leaf generic.
    // Even if its resolved items have recipes (like butchering), it should stop at the generic's display name.
    const fishRecipe = makeRecipe(
      'recipe_fish',
      [{ name: 'Any_Raw_Fish', count: 1, is_generic: true }],
      'Steamed_Fish',
    )
    const steamedFish = makeItem('Steamed_Fish', ['bread_mod'], ['recipe_fish'])
    
    // fish01 exists and has a recipe, but is_leaf should prevent recursing into it
    const fish01 = makeItem('fish01', [], ['recipe_butcher'])
    const recipeButcher = makeRecipe('recipe_butcher', [{ name: 'carcass', count: 1 }], 'fish01')

    const params: FarmingParams = {
      loadoutItems: [steamedFish],
      itemsMap: buildItemsMap([steamedFish, fish01]),
      recipes: { recipe_fish: fishRecipe, recipe_butcher: recipeButcher },
      modifiers: allModifiers,
      genericsMap: {
        Any_Raw_Fish: { 
          id: 'Any_Raw_Fish', 
          display_name: 'Raw Fish', 
          items: ['fish01'], 
          is_leaf: true 
        },
      },
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: {},
    }

    const result = computeFarmingResult(params)
    
    // Should NOT have crop plots from sub-ingredients
    expect(result.cropPlots).toHaveLength(0)
    // Should have "Any_Raw_Fish" in stockpile with display_name "Raw Fish"
    expect(result.stockpile).toHaveLength(1)
    expect(result.stockpile[0].name).toBe('Any_Raw_Fish')
    expect(result.stockpile[0].display_name).toBe('Raw Fish')
    // 2/hr (bread_mod) * 1 count = 2 units/hr
    expect(result.stockpile[0].unitsPerHour).toBeCloseTo(2)
  })

  it('handles source_item pieces with fallback to parent recipe (piece has no own recipe)', () => {
    // parent exists in itemsMap, piece has no recipes → uses parent recipe
    const parent = makeItem('Whole_Cake', [], ['recipe_whole_cake'])
    const slice = makeItem('Cake_Slice', ['bread_mod'], [], undefined, 'Whole_Cake')
    const recipeWholeCake: Recipe = {
      id: 'recipe_whole_cake',
      inputs: [{ name: 'Flour', count: 3, display_name: 'Flour', is_generic: false }],
      outputs: [{ name: 'Cake_Slice', yields_count: 4, display_name: 'Slices' }],
      benches: ['Bench'],
      requirements: {},
    }
    const params: FarmingParams = {
      loadoutItems: [slice],
      itemsMap: buildItemsMap([...allItems, parent, slice]),
      recipes: { ...allRecipes, recipe_whole_cake: recipeWholeCake },
      modifiers: allModifiers,
      genericsMap: {},
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: {},
    }
    const result = computeFarmingResult(params)
    // slice: 2/hr; yields 4 per craft → 0.5 crafts/hr
    // Flour needed: 0.5 × 3 = 1.5 Flour/hr
    // Wheat needed: 1.5 × 2 = 3 Wheat/hr
    expect(result.cropPlots).toHaveLength(1)
    expect(result.cropPlots[0].name).toBe('Wheat')
    expect(result.cropPlots[0].unitsPerHour).toBeCloseTo(3)
  })

  it('handles source_item pieces with own recipe (real-world chocolate cake pattern)', () => {
    // Real pattern: chocolatecakepiece has recipe 'Chocolate_Cake' whose output
    // directly names the piece — recipe_produces carries the logical parent name
    const piece = makeItem('chocolatecakepiece', ['bread_mod'], ['recipe_chocolate_cake'], undefined, 'chocolatecake')
    const recipeChocolateCake: Recipe = {
      id: 'recipe_chocolate_cake',
      inputs: [{ name: 'Flour', count: 3, display_name: 'Flour', is_generic: false }],
      outputs: [
        {
          name: 'chocolatecakepiece',
          yields_count: 8,
          display_name: 'Chocolate Cake Piece',
          recipe_produces: { name: 'chocolatecake', yields_count: 1 },
        },
      ],
      benches: ['Electric Stove'],
      requirements: {},
    }
    const params: FarmingParams = {
      loadoutItems: [piece],
      itemsMap: buildItemsMap([...allItems, piece]), // parent 'chocolatecake' NOT in map
      recipes: { ...allRecipes, recipe_chocolate_cake: recipeChocolateCake },
      modifiers: allModifiers,
      genericsMap: {},
      servingsOverrides: {},
      recipeOverrides: {},
      genericSelections: {},
    }
    const result = computeFarmingResult(params)
    // piece: 2/hr; recipe outputs 8 per craft → 0.25 crafts/hr
    // Flour needed: 0.25 × 3 = 0.75 Flour/hr
    // Wheat needed: 0.75 × 2 = 1.5 Wheat/hr
    expect(result.cropPlots).toHaveLength(1)
    expect(result.cropPlots[0].name).toBe('Wheat')
    expect(result.cropPlots[0].unitsPerHour).toBeCloseTo(1.5)
  })
})
