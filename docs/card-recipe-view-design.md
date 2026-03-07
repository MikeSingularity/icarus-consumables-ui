# Card Modifier vs Recipe View and Alternate Recipe Selection

This document describes the design and implementation of the card view toggle (Modifiers vs Recipe), alternate recipe selection for loadout and derived ingredients, and URL encoding of recipe-related state. **Phases 1, 2, and 3 are implemented.** Implementation lives in `ConsumableCard`, `FilterBar`, `FarmingPanel`, `useFarmingState`, and `src/utils/urlState.ts`.

---

## 1. Goals

- Let users toggle between **modifier view** on cards (buffs, base stats, tier) and **recipe view** (ingredients, bench, alternate recipe and generic choices).
- Support selecting **alternate recipes** for loadout items and **derived ingredients** (e.g. sugar from honey vs sugarcane; pastry from one of several recipes).

---

## 2. Implemented Behaviour

- **ConsumableCard:** Shows tier, base stats, modifier buffs (name, lifetime, effect stats from `modifier.stats`), and crafting bench. When card view mode is **Recipe**, shows one level of recipe inputs, bench, and—when the item is in the loadout—recipe dropdown (if multiple recipes) and generic dropdowns (if any).
- **FarmingPanel:** For loadout items: servings/hr (or override when no timed modifier), Recipe dropdown when the item has multiple recipes, generic selectors, and derived-recipe dropdowns per ingredient with multiple recipes.
- **Farming calc:** `getEffectiveRecipeId` uses `recipeOverrides[item.name]` for loadout items; `walkIngredients` uses `genericSelections[genericId]` for generic inputs and `derivedRecipeOverrides[ingredientName]` for sub-recipes when set; otherwise first recipe.

Data can represent alternate sources as **generics** (`is_generic` + generics map) or as **multiple recipes** with the same output (Option B: distinct recipe IDs). The UI supports both via `genericSelections` and `derivedRecipeOverrides` (and `recipeOverrides` for the loadout item itself).

---

## 3. Data Model (Relevant Parts)

- **Item:** `recipes: string[]`. Multiple IDs = multiple benches/recipes.
- **Recipe:** `inputs: RecipeInput[]` with `name`, `count`, `display_name`, `is_generic`. Same-output variants use separate recipe IDs (Option B).
- **Generic:** `id`, `items: string[]`. UI state: `genericSelections[genericId] = itemName`.
- **recipeOverrides:** `Record<itemName, recipeId>` for loadout items.
- **derivedRecipeOverrides:** `Record<ingredientName, recipeId>` for ingredients with multiple recipes; applied when walking the tree.
- **genericSelections:** `Record<genericId, itemName>`; global for all recipes using that generic.

Per-parent overrides (“use recipe B for flour only when used in chocolate cake”) are out of scope; keying is by ingredient name only.

---

## 4. Design Decisions (Implemented)

### 4.1 Toggle Placement

**Chosen: Global toggle (Option B).** A single “Modifiers | Recipe” control in the FilterBar switches all cards. Keeps one source of truth and consistent layout.

### 4.2 Recipe View on Card

- **Primary recipe:** `recipeOverrides[item.name] ?? item.recipes[0]` (and parent recipe for pieces).
- **Content:** Bench in footer; inputs with `display_name` and count (e.g. “Flour x3”, “Sugar x2”).
- **Generics:** Show current source (e.g. “Sugar (Honey)”). When item is in loadout, show dropdown and call `onSetGeneric`; otherwise text only.
- **Multiple recipes:** When in loadout and item has multiple recipes, show Recipe dropdown using `formatRecipeLabel`; same `recipeOverrides` and `onSetRecipe` as FarmingPanel.
- **Scope:** One level of inputs only; full tree and plot/stockpile numbers remain in the Farming Calculator.

### 4.3 Derived Recipe Overrides

- **Keying:** `derivedRecipeOverrides` keyed by ingredient name only.
- **Farming calc:** In `walkIngredients`, use `derivedRecipeOverrides[ingredientName]` when set; else `recipes[0]`. One dropdown per ingredient with multiple recipes (e.g. “Pastry” → Pastry vs Pastry Butter), labeled via `formatRecipeLabel`, persisted with `setDerivedRecipeOverride(ingredientName, recipeId)`.

---

## 5. URL Representation (Transport)

Canonical URL is built from application state in `src/utils/urlState.ts`. Query parameters:

| Param | Meaning | Format | Example |
| --- | --- | --- | --- |
| `i` | Loadout item names | Comma-separated | `i=crispybacon,chocolatecakepiece` |
| `l` | Loadout slot count (1–5) | Integer | `l=4` |
| `r` | Loadout recipe overrides | `itemName:recipeId` per entry, comma-separated | `r=crispybacon:Crispy_Bacon_Butter` |
| `g` | Generic selections | `genericId:itemName` per entry, comma-separated | `g=Sugar:honey` |
| `d` | Derived recipe overrides | `ingredientName:recipeId` per entry, comma-separated | `d=pastry:Pastry_Butter` |
| `s` | Servings overrides | `itemName:number` per entry, comma-separated | `s=somefood:2.5` |

- **Delimiters:** Comma between entries; colon between key and value. If names ever contain colons, switch to another separator (e.g. `~`) and document.
- **Encoding:** URL API decodes percent-encoded values. Other query params are preserved when updating these.
- **Restore:** On load, parse into state; drop entries whose keys/values are not in the current dataset so stale URLs do not break the app.
- **Write:** On any change to items, slots, recipe overrides, generic selections, derived overrides, or servings; use `history.replaceState` so each change does not create a new history entry.

---

## 6. Implementation Reference

| Area | Location |
| --- | --- |
| Card view mode state | `App.tsx`: `cardViewMode`, `setCardViewMode` |
| Toggle UI | `FilterBar`: `cardViewMode`, `onCardViewModeChange` |
| Recipe view on card | `ConsumableCard`: `viewMode === 'recipe'`, recipe/generic props |
| Farming state and setters | `useFarmingState`: `recipeOverrides`, `genericSelections`, `derivedRecipeOverrides`, setters |
| Canonical URL build/parse | `src/utils/urlState.ts`: `buildCanonicalSearchString`, `parseFarmingParamsFromSearch`, `filterCanonicalParamsToRelevant` |
| Recipe label formatting | `src/utils/formatters.ts`: `formatRecipeLabel` |

---

## 7. Summary

- **Toggle:** Global “Modifiers” vs “Recipe” in FilterBar; all cards switch together.
- **Recipe labels:** Recipe dropdowns use recipe `display_name` or humanized recipe id via `formatRecipeLabel`, not bench name only.
- **Recipe view on card:** One level of inputs; recipe and generic dropdowns when item is in loadout.
- **Derived overrides:** Keyed by ingredient name; one FarmingPanel dropdown per ingredient with multiple recipes; used in `walkIngredients`.
- **URL:** Full loadout and recipe state encoded in `i`, `l`, `r`, `g`, `d`, `s`; read on load (with validation), written on change via replaceState.
