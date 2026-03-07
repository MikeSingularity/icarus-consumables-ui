# Card Modifier vs Recipe View and Alternate Recipe Selection

## Goal

- Let users toggle between the current **modifier view** on cards (buffs, base stats, tier) and a **recipe view** (ingredients, bench, alternate recipe/source choices).
- Support selecting **alternate recipes** for loadout items and, where it matters, for **derived ingredients** (e.g. chocolate cake piece: get sugar from honey instead of sugarcane).

## Current Behaviour

- **ConsumableCard**: Shows tier, base stats, modifier buffs (name, lifetime, effect stats), and crafting bench. No recipe or ingredients.
- **FarmingPanel** (sidebar): For loadout items with modifiers it shows:
  - Servings/hr when the item has no timed modifier.
  - **Recipe** dropdown when the item has multiple recipes (different benches).
  - **Generic ingredient selectors** (e.g. "Sugar" → Honey vs Sugarcane) collected from the full farming tree; these are global (one choice per generic tag).
- **Farming calc**: `getEffectiveRecipeId` uses `recipeOverrides[item.name]` for loadout items; `walkIngredients` uses `genericSelections[genericId]` for generic inputs and always uses `recipes[0]` for sub-recipes of derived ingredients (no override for non-loadout items).

Choice of source for ingredients like sugar (honey vs sugarcane) may be represented in the data as a **generic** (`is_generic` input + generics map), or as **multiple recipes** with the same output (Option B: unique recipe IDs, e.g. Flour from Wheat vs Flour from Corn). The UI supports both via genericSelections and derived/recipe overrides.

## Data Model (Relevant Parts)

- **Item**: `recipes: string[]` (recipe IDs that produce this item). Multiple IDs = multiple benches/recipes.
- **Recipe**: `inputs: RecipeInput[]`. Each input has `name`, `count`, `display_name`, `is_generic`. Same-output variants use separate recipe IDs (Option B), not alternate_inputs.
- **Generic**: `id` (e.g. tag name), `items: string[]` (e.g. honey, sugarcane). Picker is `genericSelections[genericId] = itemName`.
- **recipeOverrides**: `Record<itemName, recipeId>` — only used for **loadout** items today.
- **genericSelections**: `Record<genericId, itemName>` — global; used for every recipe that references that generic.

There is no current support for "use recipe B for ingredient X when X is used in recipe Y"; sub-recipes always use the first recipe. So "alternate recipes" in this design means:
1. **Loadout item**: which recipe (bench) to use — already supported via Recipe dropdown.
2. **Generic slot** (e.g. sugar): which source item (honey vs sugarcane) — already supported via generic selectors; we want it visible in a recipe view.
3. **Derived non-generic ingredients**: if we ever need "use recipe B for flour when used in chocolate cake", that would require extending `recipeOverrides` to key by something like `"chocolatecakepiece|flour"` or a nested structure; out of scope for the initial design unless we find a concrete need.

## Design Options

### 1. Where to put the toggle

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Per-card** | Each card has a small "Modifiers / Recipe" toggle. | Per-item choice; recipe view only where needed. | More UI on every card; state (which cards show recipe) can get noisy. |
| **B. Global** | Single toggle in FilterBar or above the grid: "Card view: Modifiers \| Recipe". | One place; consistent view. | All cards switch at once; recipe view on many cards may be busy. |
| **C. Contextual** | Cards show modifier view by default; when an item is **in the loadout**, show a way to open "recipe view" (e.g. expand on the card or in the sidebar). | Focus on loadout items; keeps grid simple. | Recipe view not visible for non-selected items without extra click. |

**Recommendation:** Start with **B (global toggle)** for simplicity and consistency. If we later want "recipe only for loadout items", we can refine to "when Recipe view is on, only loadout cards show recipe; others show a placeholder or still modifiers."

### 2. What the recipe view shows on a card

- **Primary recipe**: Use same logic as farming calc — for the card’s item, effective recipe = `recipeOverrides[item.name] ?? item.recipes[0]` (and fallback to parent’s recipe for pieces).
- **Content**:
  - Bench name (already in footer).
  - List of **inputs**: `display_name` and count (e.g. "Flour x3", "Sugar x2").
  - For **generic** inputs: show the **current** source, e.g. "Sugar (Honey)" or "Sugar (Sugarcane)", and optionally a small dropdown to change it (same as FarmingPanel). If we don’t put the dropdown on the card, at least show the current choice and a short note: "Change in Farming Calculator below."
- **Multiple recipes**: If `getAvailableRecipeIds(item).length > 1`, show which recipe is selected (e.g. bench name) and a **dropdown to switch** (same as FarmingPanel). For cards not in the loadout, we can either hide the dropdown and show the default recipe, or show the dropdown and persist via the same `recipeOverrides` so the choice applies when they add the item.

**Scope of recipe view:** Show **one level** of inputs only (no recursive tree on the card). The full tree and plot/stockpile numbers stay in the Farming Calculator.

### 3. Alternate recipes and generics

- **Loadout item recipe**: Already in FarmingPanel; duplicate the same **Recipe** dropdown in the card’s recipe view when the item is in the loadout (or when global recipe view is on and the item has multiple recipes). Use the same `recipeOverrides` and `onSetRecipe`.
- **Generic (e.g. sugar → honey vs sugarcane)**:
  - **Option 3a**: Keep generic selectors only in FarmingPanel; in recipe view on the card just show the **resolved** ingredient, e.g. "Sugar (Honey)" with text like "Change in Farming Calculator."
  - **Option 3b**: In recipe view, for each generic input, show a small dropdown on the card (same options as FarmingPanel). Call `onSetGeneric(genericId, itemName)`. So the card becomes a second place to change the same global `genericSelections`.

**Recommendation:** **Option 3b** for loadout items in recipe view: show a dropdown per generic so users can choose "sugar from honey" directly on the chocolate cake (piece) card. For cards not in the loadout, show the current generic choice as text only (no dropdown), since changing it here would affect all loadout items that use that generic.

### 4. Derived recipes (sub-recipes) — primary focus

**This is the main use case:** choosing which recipe (or source) to use for **derived** ingredients — e.g. for chocolate cake piece, get sugar from honey instead of sugarcane (generic selection), or when an ingredient has multiple recipes, choose which one to use in that context.

Today:
- **Generics** (recipe inputs with `is_generic: true` and a tag in the generics map) are supported via `genericSelections` and are surfaced in FarmingPanel and in card recipe view.
- **Sub-recipes** use `derivedRecipeOverrides` when the ingredient has multiple recipes; otherwise the first recipe. The game data uses **Option B**: multiple recipes with the same output but unique names (e.g. Flour from Wheat, Flour from Corn, Flour from Potato as separate recipe IDs). Choosing which recipe to use is done via recipe overrides (loadout item) or derived recipe overrides (ingredient).

To support derived recipe choice:
- **Keying:** `derivedRecipeOverrides: Record<string, string>` keyed by **ingredient name only** (e.g. `pastry`). One dropdown per ingredient; the choice applies to all loadout items that use that ingredient. Leaves room for per-parent overrides later if needed.
- **Farming calc:** In `walkIngredients`, when resolving the sub-recipe for an ingredient, look up `derivedRecipeOverrides[ingredientName]` and use that recipe ID if set; otherwise `recipes[0]`. Collect one `DerivedRecipeChoice` per ingredient that has multiple recipes (dedupe by ingredientName).
- **UI:** In FarmingPanel, one dropdown per ingredient with multiple recipes (e.g. "Pastry" with options Pastry vs Pastry Butter). Persist via `setDerivedRecipeOverride(ingredientName, recipeId)`. Use `formatRecipeLabel` for option labels.

**Recommendation:** Implemented as Phase 2. Single selector per modifiable recipe keeps the UI compact and leaves room for subrecipes later.

## Implementation Outline

**Phase 1 — Recipe dropdown label and card recipe view**
1. **Recipe dropdown:** Use recipe display name (or humanized recipe id) for the Recipe selector in FarmingPanel and anywhere else we list recipe options, not the bench. (Done: `formatRecipeLabel` in formatters; FarmingPanel uses it.)
2. **State:** Add a global view mode: `'modifiers' | 'recipe'`. Store in React state (e.g. in App or a small context). Optional: persist in `localStorage` or URL.
3. **ConsumableCard:** Accept `viewMode` and, when `viewMode === 'recipe'`, show one level of recipe inputs; for generics show current choice + dropdown when in loadout; for multiple recipes show Recipe dropdown using `formatRecipeLabel`.
4. **FilterBar:** Add toggle "Modifiers" | "Recipe". Pass `recipeOverrides`, `genericSelections`, setters, `genericsMap`, `selectedNames` into the grid/cards for recipe view.

**Phase 2 — Derived recipe overrides (primary focus)** (Done)
5. **State:** `derivedRecipeOverrides: Record<string, string>` keyed by **ingredient name only**. `setDerivedRecipeOverride(ingredientName, recipeId)`.
6. **Farming calc:** `FarmingParams.derivedRecipeOverrides`. In `walkIngredients`, when choosing a sub-recipe for an ingredient, use `derivedRecipeOverrides[ingredientName]` if set; otherwise `recipes[0]`. Collect one `DerivedRecipeChoice` per ingredient that has multiple recipes (dedupe by ingredientName).
7. **UI:** In FarmingPanel, one dropdown per ingredient with multiple recipes (e.g. "Pastry" → Pastry vs Pastry Butter). Options labeled via `formatRecipeLabel`. Wire to `setDerivedRecipeOverride(ingredientName, recipeId)`.
8. **Generic vs derived:** `genericSelections` = choice per generic tag (when data uses `is_generic`). Derived overrides = one recipe choice per ingredient with multiple recipes (Option B: same output, different recipe IDs).

**Phase 3 — URL / location bar (transport)**
9. **Encode all recipe-related state in the URL** so that sharing or bookmarking preserves loadout and every recipe choice. Coordinate with existing `?items=...` (useLoadoutState) so one canonical search string is built and replaced.
10. **URL param scheme** (see below): add `r`, `g`, `d` (and optionally `s` for servings). Read on load; write on change (replaceState). When restoring, validate keys/values against current data (e.g. recipe ids exist, item names exist) and drop invalid entries so a stale URL still loads without breaking.
11. **Single source of truth:** Either useLoadoutState builds the full search string (including farming params) and writeItemsToUrl becomes a more general "write state to URL" that includes items + farming, or farming state hook reads/writes its own params and both hooks cooperate to preserve each other's params when updating (current buildSearchString already preserves other params when updating items). Prefer one place that builds the full query string from loadout + farming state so the order of params is stable and there's no race.

## URL representation (location bar / transport)

To preserve the full configuration when sharing or bookmarking a URL, encode loadout and all recipe-related state in the query string. Existing behaviour: `?i=name1,name2&l=4` (items comma-separated, l = slot count 1–5). Extend with the following.

### Query parameters

| Param | Meaning | Format | Example |
|-------|---------|--------|---------|
| `i` | Loadout item names | Comma-separated, no encoding | `i=crispybacon,chocolatecakepiece` |
| `l` | Loadout slot count (1–5) | Integer | `l=4` |
| `r` | Loadout recipe overrides | `itemName:recipeId` per entry, comma-separated | `r=crispybacon:Crispy_Bacon_Butter` |
| `g` | Generic selections | `genericId:itemName` per entry, comma-separated | `g=Sugar:honey` |
| `d` | Derived recipe overrides | Key is ingredient name, value is recipeId; comma between entries | `d=pastry:Pastry_Butter` |
| `s` | Servings overrides (optional) | `itemName:number` per entry, comma-separated | `s=somefood:2.5` |

- **Delimiter within a param:** Comma (`,`) separates entries. Colon (`:`) separates key from value in each entry. Game data item names and recipe ids are assumed to use only letters, digits, and underscores; if colons appear in names, choose a different in-entry separator (e.g. `~`) and document it.
- **Encoding:** When reading, the URL API (e.g. `URLSearchParams`) automatically decodes percent-encoded characters. Preserve other existing query params when updating any of these so that e.g. future filter state in the URL is not dropped.
- **Restore and validate:** On load, parse `r`, `g`, `d`, `s` into state. Ignore or strip entries whose keys/values are not present in the current dataset (e.g. invalid recipe id, removed item) so that an old or edited URL does not break the app; optional: normalise to lowercase if the data layer uses lowercase names.

### Implementation notes

- **Who writes the URL:** Prefer a single helper that builds the full search string from loadout + farming state (items, slots, recipeOverrides, genericSelections, derivedRecipeOverrides, servingsOverrides), and call it from both loadout and farming state updates so the URL always reflects the combined state. Alternatively, have each hook update only its own params while preserving others (current `buildSearchString` pattern in useLoadoutState).
- **Canonical URL from state:** The shareable URL should be derivable from application state in one place, not by reading the address bar. That way both `history.replaceState` and future on-demand features (e.g. generating a QR code for the current loadout and recipe choices) can use the same canonical URL built from current state.
- **When to write:** On any change to items, slots, recipe overrides, generic selections, derived recipe overrides (and optionally servings). Use `history.replaceState` to avoid adding history entries on every toggle.
- **When to read:** Once on initial load (e.g. in useFarmingState init or a dedicated effect when data is ready). Merge URL-derived values into initial state; do not overwrite URL with defaults if the URL already contains params (so reload and share preserve state).

## Summary

- **Toggle:** Global "Modifiers" vs "Recipe" view for all cards.
- **Recipe labels:** Use recipe display name (or humanized recipe id) for recipe dropdowns, not bench.
- **Recipe view on card:** One level of inputs; generics and loadout-item recipe dropdowns when in loadout.
- **Derived recipe overrides (primary):** Key by ingredient name only; one dropdown per ingredient in FarmingPanel; choice applies to all loadout items that use that ingredient. Persist in farming state; use in `walkIngredients`.
- **URL transport:** Encode `items`, `r` (loadout recipe overrides), `g` (generic selections), `d` (derived recipe overrides), and optionally `s` (servings) in the query string so that sharing or bookmarking the URL preserves the full loadout and all recipe choices; read and validate on load, write on change.
