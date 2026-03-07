/**
 * Canonical URL state builder and parser for loadout + farming params.
 * Single source of truth for the shareable query string (replaceState and future QR).
 */

/** Params required to build the full search string. */
export interface CanonicalUrlParams {
  itemNames: string[]
  slotCount: number
  recipeOverrides: Record<string, string>
  genericSelections: Record<string, string>
  derivedRecipeOverrides: Record<string, string>
  servingsOverrides: Record<string, number>
}

/**
 * Sets of keys that are still relevant for the current loadout.
 * Used to strip stale r/g/d/s overrides from the URL when the loadout or recipe tree changes.
 */
export interface RelevantUrlContext {
  loadoutItemNames: Set<string>
  derivedIngredientNames: Set<string>
  genericIds: Set<string>
}

/** Parsed farming params from URL (unvalidated). */
export interface ParsedFarmingParams {
  recipeOverrides: Record<string, string>
  genericSelections: Record<string, string>
  derivedRecipeOverrides: Record<string, string>
  servingsOverrides: Record<string, number>
}

const URL_PARAM_ITEMS = 'i'
const URL_PARAM_SLOTS = 'l'
const URL_PARAM_RECIPE_OVERRIDES = 'r'
const URL_PARAM_GENERIC_SELECTIONS = 'g'
const URL_PARAM_DERIVED_OVERRIDES = 'd'
const URL_PARAM_SERVINGS = 's'

const FARMING_PARAM_KEYS = [
  URL_PARAM_RECIPE_OVERRIDES,
  URL_PARAM_GENERIC_SELECTIONS,
  URL_PARAM_DERIVED_OVERRIDES,
  URL_PARAM_SERVINGS,
]

/**
 * Parses a single key:value param (e.g. r=item1:recipe1,item2:recipe2).
 * Entries are comma-separated; key and value within each entry separated by colon.
 */
function parseKeyValueParam(value: string | null): Record<string, string> {
  if (value === null || value === '') return {}
  const entries = value.split(',').filter(Boolean)
  const result: Record<string, string> = {}
  for (const entry of entries) {
    const colonIndex = entry.indexOf(':')
    if (colonIndex === -1) continue
    const k = entry.slice(0, colonIndex).trim()
    const v = entry.slice(colonIndex + 1).trim()
    if (k && v) result[k] = v
  }
  return result
}

/**
 * Parses servings param (itemName:number) into Record<string, number>.
 * Invalid numbers are skipped.
 */
function parseServingsParam(value: string | null): Record<string, number> {
  if (value === null || value === '') return {}
  const entries = value.split(',').filter(Boolean)
  const result: Record<string, number> = {}
  for (const entry of entries) {
    const colonIndex = entry.indexOf(':')
    if (colonIndex === -1) continue
    const k = entry.slice(0, colonIndex).trim()
    const v = parseFloat(entry.slice(colonIndex + 1).trim())
    if (k && !Number.isNaN(v) && v > 0) result[k] = v
  }
  return result
}

/**
 * Filters canonical URL params so only overrides for currently relevant keys are kept.
 * Removes r/g/d/s entries for loadout items or ingredients no longer in the current recipe tree.
 *
 * @param params - Full params (e.g. from app state).
 * @param relevant - Keys that are still relevant for the current loadout and farming result.
 */
export function filterCanonicalParamsToRelevant(
  params: CanonicalUrlParams,
  relevant: RelevantUrlContext,
): CanonicalUrlParams {
  const recipeOverrides: Record<string, string> = {}
  for (const [name, recipeId] of Object.entries(params.recipeOverrides)) {
    if (relevant.loadoutItemNames.has(name)) recipeOverrides[name] = recipeId
  }
  const genericSelections: Record<string, string> = {}
  for (const [id, itemName] of Object.entries(params.genericSelections)) {
    if (relevant.genericIds.has(id)) genericSelections[id] = itemName
  }
  const derivedRecipeOverrides: Record<string, string> = {}
  for (const [ingredientName, recipeId] of Object.entries(params.derivedRecipeOverrides)) {
    if (relevant.derivedIngredientNames.has(ingredientName)) derivedRecipeOverrides[ingredientName] = recipeId
  }
  const servingsOverrides: Record<string, number> = {}
  for (const [name, value] of Object.entries(params.servingsOverrides)) {
    if (relevant.loadoutItemNames.has(name)) servingsOverrides[name] = value
  }
  return {
    ...params,
    recipeOverrides,
    genericSelections,
    derivedRecipeOverrides,
    servingsOverrides,
  }
}

/**
 * Builds the canonical search string from full loadout + farming state.
 * Preserves any other query params. Use for replaceState and QR.
 *
 * @param params - Loadout and farming state to encode.
 * @param currentSearch - Optional search string to preserve other params from; defaults to window.location.search.
 */
export function buildCanonicalSearchString(
  params: CanonicalUrlParams,
  currentSearch: string = typeof window !== 'undefined' ? window.location.search : '',
): string {
  const current = new URLSearchParams(currentSearch)

  // Remove our params so we can re-add them in canonical order; keep others.
  current.delete(URL_PARAM_ITEMS)
  current.delete(URL_PARAM_SLOTS)
  for (const key of FARMING_PARAM_KEYS) {
    current.delete(key)
  }

  const pairs: string[] = []
  current.forEach((value, key) => {
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  })

  pairs.push(`${URL_PARAM_ITEMS}=${params.itemNames.join(',')}`)
  pairs.push(`${URL_PARAM_SLOTS}=${params.slotCount}`)

  const rEntries = Object.entries(params.recipeOverrides)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  if (rEntries) pairs.push(`${URL_PARAM_RECIPE_OVERRIDES}=${rEntries}`)

  const gEntries = Object.entries(params.genericSelections)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  if (gEntries) pairs.push(`${URL_PARAM_GENERIC_SELECTIONS}=${gEntries}`)

  const dEntries = Object.entries(params.derivedRecipeOverrides)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  if (dEntries) pairs.push(`${URL_PARAM_DERIVED_OVERRIDES}=${dEntries}`)

  const sEntries = Object.entries(params.servingsOverrides)
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  if (sEntries) pairs.push(`${URL_PARAM_SERVINGS}=${sEntries}`)

  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}

/**
 * Parses farming-related params (r, g, d, s) from the current or given search string.
 * Returns raw key/value records; validation should be done when merging into state.
 */
export function parseFarmingParamsFromUrl(
  search: string = window.location.search,
): ParsedFarmingParams {
  const params = new URLSearchParams(search)
  return {
    recipeOverrides: parseKeyValueParam(params.get(URL_PARAM_RECIPE_OVERRIDES)),
    genericSelections: parseKeyValueParam(params.get(URL_PARAM_GENERIC_SELECTIONS)),
    derivedRecipeOverrides: parseKeyValueParam(params.get(URL_PARAM_DERIVED_OVERRIDES)),
    servingsOverrides: parseServingsParam(params.get(URL_PARAM_SERVINGS)),
  }
}

/** Context used to validate parsed URL farming params against current data. */
export interface FarmingValidationContext {
  recipeIds: Set<string>
  genericIds: Set<string>
  /** genericId -> list of valid item names for that generic. */
  genericIdToItems: Record<string, string[]>
}

/**
 * Validates and filters parsed farming params so only valid entries are applied.
 * Drops entries whose keys/values are not present in the dataset.
 */
export function validateFarmingParams(
  parsed: ParsedFarmingParams,
  context: FarmingValidationContext,
): ParsedFarmingParams {
  const recipeOverrides: Record<string, string> = {}
  for (const [itemName, recipeId] of Object.entries(parsed.recipeOverrides)) {
    if (context.recipeIds.has(recipeId)) recipeOverrides[itemName] = recipeId
  }

  const genericSelections: Record<string, string> = {}
  for (const [genericId, itemName] of Object.entries(parsed.genericSelections)) {
    if (!context.genericIds.has(genericId)) continue
    const validItems = context.genericIdToItems[genericId]
    if (validItems?.includes(itemName)) genericSelections[genericId] = itemName
  }

  const derivedRecipeOverrides: Record<string, string> = {}
  for (const [ingredientName, recipeId] of Object.entries(parsed.derivedRecipeOverrides)) {
    if (context.recipeIds.has(recipeId)) derivedRecipeOverrides[ingredientName] = recipeId
  }

  const servingsOverrides: Record<string, number> = {}
  for (const [itemName, value] of Object.entries(parsed.servingsOverrides)) {
    if (typeof value === 'number' && value > 0) servingsOverrides[itemName] = value
  }

  return {
    recipeOverrides,
    genericSelections,
    derivedRecipeOverrides,
    servingsOverrides,
  }
}
