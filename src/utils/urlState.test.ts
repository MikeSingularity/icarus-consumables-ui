import { describe, it, expect } from 'vitest'
import {
  buildCanonicalSearchString,
  filterCanonicalParamsToRelevant,
  parseFarmingParamsFromUrl,
  validateFarmingParams,
  type CanonicalUrlParams,
  type ParsedFarmingParams,
} from './urlState'

const emptyParams: CanonicalUrlParams = {
  itemNames: [],
  slotCount: 3,
  recipeOverrides: {},
  genericSelections: {},
  derivedRecipeOverrides: {},
  servingsOverrides: {},
}

describe('buildCanonicalSearchString', () => {
  it('includes i and l with empty item list and default slot count', () => {
    const search = buildCanonicalSearchString(emptyParams, '')
    expect(search).toContain('i=')
    expect(search).toContain('l=3')
  })

  it('encodes item names in i param', () => {
    const search = buildCanonicalSearchString({ ...emptyParams, itemNames: ['bread', 'steak'] }, '')
    expect(search).toContain('i=bread,steak')
  })

  it('encodes slot count in l param', () => {
    const search = buildCanonicalSearchString({ ...emptyParams, slotCount: 5 }, '')
    expect(search).toContain('l=5')
  })

  it('encodes recipe overrides in r param', () => {
    const search = buildCanonicalSearchString(
      {
        ...emptyParams,
        recipeOverrides: { crispybacon: 'Crispy_Bacon_Butter' },
      },
      '',
    )
    expect(search).toContain('r=crispybacon:Crispy_Bacon_Butter')
  })

  it('encodes generic selections in g param', () => {
    const search = buildCanonicalSearchString(
      {
        ...emptyParams,
        genericSelections: { Sugar: 'honey' },
      },
      '',
    )
    expect(search).toContain('g=Sugar:honey')
  })

  it('encodes derived recipe overrides in d param', () => {
    const search = buildCanonicalSearchString(
      {
        ...emptyParams,
        derivedRecipeOverrides: { pastry: 'Pastry_Butter' },
      },
      '',
    )
    expect(search).toContain('d=pastry:Pastry_Butter')
  })

  it('encodes servings overrides in s param', () => {
    const search = buildCanonicalSearchString(
      {
        ...emptyParams,
        servingsOverrides: { somefood: 2.5 },
      },
      '',
    )
    expect(search).toContain('s=somefood:2.5')
  })

  it('omits r, g, d, s when empty', () => {
    const search = buildCanonicalSearchString(emptyParams, '')
    expect(search).not.toContain('r=')
    expect(search).not.toContain('g=')
    expect(search).not.toContain('d=')
    expect(search).not.toContain('s=')
  })

  it('preserves other query params from currentSearch', () => {
    const search = buildCanonicalSearchString(emptyParams, '?foo=bar&baz=qux')
    expect(search).toContain('foo=bar')
    expect(search).toContain('baz=qux')
  })
})

describe('filterCanonicalParamsToRelevant', () => {
  it('strips derived overrides for ingredients not in relevant set', () => {
    const params: CanonicalUrlParams = {
      ...emptyParams,
      itemNames: ['bread'],
      derivedRecipeOverrides: { pastry: 'Pastry_Butter', flour: 'Flour_Recipe' },
    }
    const relevant = {
      loadoutItemNames: new Set(['bread']),
      derivedIngredientNames: new Set(['pastry']),
      genericIds: new Set<string>(),
    }
    const filtered = filterCanonicalParamsToRelevant(params, relevant)
    expect(filtered.derivedRecipeOverrides).toEqual({ pastry: 'Pastry_Butter' })
  })

  it('strips recipe and servings overrides for items not in loadout', () => {
    const params: CanonicalUrlParams = {
      ...emptyParams,
      itemNames: ['bread'],
      recipeOverrides: { bread: 'R1', removed: 'R2' },
      servingsOverrides: { bread: 2, removed: 3 },
    }
    const relevant = {
      loadoutItemNames: new Set(['bread']),
      derivedIngredientNames: new Set<string>(),
      genericIds: new Set<string>(),
    }
    const filtered = filterCanonicalParamsToRelevant(params, relevant)
    expect(filtered.recipeOverrides).toEqual({ bread: 'R1' })
    expect(filtered.servingsOverrides).toEqual({ bread: 2 })
  })

  it('strips generic selections for generic IDs not in relevant set', () => {
    const params: CanonicalUrlParams = {
      ...emptyParams,
      genericSelections: { Any_Veg: 'carrot', Any_Fruit: 'apple' },
    }
    const relevant = {
      loadoutItemNames: new Set<string>(),
      derivedIngredientNames: new Set<string>(),
      genericIds: new Set(['Any_Veg']),
    }
    const filtered = filterCanonicalParamsToRelevant(params, relevant)
    expect(filtered.genericSelections).toEqual({ Any_Veg: 'carrot' })
  })
})

describe('parseFarmingParamsFromUrl', () => {
  it('returns empty records for empty search', () => {
    const parsed = parseFarmingParamsFromUrl('')
    expect(parsed.recipeOverrides).toEqual({})
    expect(parsed.genericSelections).toEqual({})
    expect(parsed.derivedRecipeOverrides).toEqual({})
    expect(parsed.servingsOverrides).toEqual({})
  })

  it('parses r param into recipeOverrides', () => {
    const parsed = parseFarmingParamsFromUrl('?r=item1:Recipe_A,item2:Recipe_B')
    expect(parsed.recipeOverrides).toEqual({ item1: 'Recipe_A', item2: 'Recipe_B' })
  })

  it('parses g param into genericSelections', () => {
    const parsed = parseFarmingParamsFromUrl('?g=Sugar:honey,Salt:sea_salt')
    expect(parsed.genericSelections).toEqual({ Sugar: 'honey', Salt: 'sea_salt' })
  })

  it('parses d param into derivedRecipeOverrides', () => {
    const parsed = parseFarmingParamsFromUrl('?d=pastry:Pastry_Butter')
    expect(parsed.derivedRecipeOverrides).toEqual({ pastry: 'Pastry_Butter' })
  })

  it('parses s param into servingsOverrides with numbers', () => {
    const parsed = parseFarmingParamsFromUrl('?s=food1:1.5,food2:2')
    expect(parsed.servingsOverrides).toEqual({ food1: 1.5, food2: 2 })
  })

  it('skips invalid s entries (non-positive or NaN)', () => {
    const parsed = parseFarmingParamsFromUrl('?s=good:2,bad:0,also:nan')
    expect(parsed.servingsOverrides).toEqual({ good: 2 })
  })

})

import type { Generic } from '@/types/consumables'

describe('validateFarmingParams', () => {
  const context = {
    recipeIds: new Set(['Recipe_A', 'Recipe_B']),
    genericIds: new Set(['Sugar', 'Salt']),
    genericIdToItems: {
      Sugar: { id: 'Sugar', display_name: 'Sugar', items: ['honey', 'sugarcane'] } as Generic,
      Salt: { id: 'Salt', display_name: 'Salt', items: ['sea_salt', 'rock_salt'] } as Generic,
    },
  }

  it('keeps recipe overrides whose recipeId exists', () => {
    const parsed: ParsedFarmingParams = {
      recipeOverrides: { item1: 'Recipe_A', item2: 'Unknown_Recipe' },
      genericSelections: {},
      derivedRecipeOverrides: {},
      servingsOverrides: {},
    }
    const out = validateFarmingParams(parsed, context)
    expect(out.recipeOverrides).toEqual({ item1: 'Recipe_A' })
  })

  it('keeps generic selections whose genericId and itemName are valid', () => {
    const parsed: ParsedFarmingParams = {
      recipeOverrides: {},
      genericSelections: {
        Sugar: 'honey',
        Salt: 'sea_salt',
        Unknown: 'x', // invalid generic id
      },
      derivedRecipeOverrides: {},
      servingsOverrides: {},
    }
    const out = validateFarmingParams(parsed, context)
    expect(out.genericSelections).toEqual({ Sugar: 'honey', Salt: 'sea_salt' })
  })

  it('drops generic selection when itemName is not in that generic list', () => {
    const parsed: ParsedFarmingParams = {
      recipeOverrides: {},
      genericSelections: { Sugar: 'invalid_item' },
      derivedRecipeOverrides: {},
      servingsOverrides: {},
    }
    const out = validateFarmingParams(parsed, context)
    expect(out.genericSelections).toEqual({})
  })

  it('keeps derived overrides whose recipeId exists', () => {
    const parsed: ParsedFarmingParams = {
      recipeOverrides: {},
      genericSelections: {},
      derivedRecipeOverrides: { pastry: 'Recipe_B', flour: 'Bad_Recipe' },
      servingsOverrides: {},
    }
    const out = validateFarmingParams(parsed, context)
    expect(out.derivedRecipeOverrides).toEqual({ pastry: 'Recipe_B' })
  })

  it('keeps positive servings overrides', () => {
    const parsed: ParsedFarmingParams = {
      recipeOverrides: {},
      genericSelections: {},
      derivedRecipeOverrides: {},
      servingsOverrides: { food1: 2.5, food2: 0.1 },
    }
    const out = validateFarmingParams(parsed, context)
    expect(out.servingsOverrides).toEqual({ food1: 2.5, food2: 0.1 })
  })
})
