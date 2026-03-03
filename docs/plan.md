# Icarus Consumables UI - Implementation Plan

## Decisions & Constraints

| Concern | Decision |
| :--- | :--- |
| Hosting | Cloudflare Pages, auto-generated `*.pages.dev` URL |
| Framework | React + TypeScript + Vite |
| Package manager | pnpm |
| Data source | Runtime fetch from GitHub Pages (see `docs/json_url.txt`) |
| Initial scope | `category === "Food"` only |
| Theme | Dark mode first |

---

## Step 1: Cloudflare Pages Setup

1. Create a free account at `cloudflare.com`.
2. From the dashboard, navigate to **Workers & Pages** → **Pages** tab → **Create**.
3. Choose **Connect to Git** → **GitHub** → authorize OAuth (grant access to `icarus-consumables-ui` at minimum).
4. Select the `icarus-consumables-ui` repository.
5. Configure build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Under **Environment variables**, add: `NODE_VERSION` = `20`
7. Click **Save and Deploy**. The first deploy will fail (empty repo) — this is expected. The connection is established.
8. Note the auto-generated `*.pages.dev` URL.

---

## Step 2: Hello World

1. Scaffold the project in the repo root:
   ```
   pnpm create vite@latest . -- --template react-ts
   pnpm install
   ```
2. Verify it builds locally: `pnpm build`
3. Add `public/_headers` with security headers (CSP, X-Frame-Options, Referrer-Policy). Cloudflare Pages reads this file at deploy time.
4. Commit and push to `main`. Cloudflare Pages auto-deploys on push.
5. Confirm the `*.pages.dev` URL shows the Vite starter.
6. Add a JS/TS standards section to `.ai-rules.md` (ESLint + Prettier config, component naming, import order).

---

## Step 3: Project Foundation

### Tooling
- Install and configure ESLint and Prettier.
- Install Tailwind CSS with the `class` dark mode strategy (dark mode on by default via a class on `<html>`).
- Install Vitest for unit tests (bundled with Vite, no extra config needed).

### Data Layer

**Fetch:** At app startup, fetch the JSON from the GitHub Pages URL. Cache the result in module scope for the session lifetime. Handle loading and error states explicitly.

**Category filter:** The fetch hook accepts a `categories` filter parameter. For Phases 1 and 2, pass `["Food"]`. Expanding to other categories later is a single-argument change.

**TypeScript interfaces** (`src/types/consumables.ts`):

```typescript
export interface ConsumablesData {
  metadata: Metadata;
  items: Item[];
  recipes: Record<string, Recipe>;
  generics: Generic[];
  modifiers: Record<string, Modifier>;
  stat_metadata: Record<string, StatMetadataEntry>;
}

export interface Metadata {
  game_version: string;
  build_guid: string;
  parser_version: string;
  parse_date: string;
  generated_date: string;
}

export interface Item {
  name: string;
  display_name: string;
  category: "Food" | "Drink" | "Animal Food" | "Medicine" | "Workshop";
  base_stats: Record<string, number>;
  tier: { total: number; anchor: string };
  modifiers: string[];
  recipes: string[];
  traits?: {
    is_harvested?: boolean;
    is_orbital?: boolean;
    is_decay_product?: boolean;
    is_override?: boolean;
  };
  source_item?: string;
  talent_requirement?: string;
  growth_data?: { growth_time: number; harvest_min: number; harvest_max: number };
}

export interface Recipe {
  id: string;
  inputs: RecipeInput[];
  alternate_inputs?: RecipeInput[];
  outputs: RecipeOutput[];
  benches: string[];
  requirements: { talent?: string; character?: number; session?: string };
}

export interface RecipeInput {
  name: string;
  count: number;
  display_name: string;
  is_generic: boolean;
}

export interface RecipeOutput {
  name: string;
  yields_count: number;
  display_name: string;
  yields_item?: string;
  yields_min?: number;
  yields_max?: number;
}

export interface Generic {
  id: string;
  items: string[];
}

export interface Modifier {
  id: string;
  display_name: string;
  lifetime: number;                // seconds; 0 = instant or permanent
  effects: Record<string, number>; // e.g., {"BaseMaximumHealth": 75, "BaseHealthRegen%": 0.2}
}

export interface StatMetadataEntry {
  label: string;
  categories: string[];
}
```

**Unit tests:** Write Vitest tests for all data-transform utilities (sorting, filtering, stat aggregation, modifier conflict detection) using static fixture data — do not call the live URL in tests.

---

## Phase 1: Food Browser

### Data Handling
- Filter out `category !== "Food"` at the data layer.
- Show `is_decay_product` items normally — no badge. They appear in the list like any other item; players can observe they have no recipe.
- For items with `source_item` set (pieces, e.g., cake slices): show the **piece** in the grid. The piece is what gets consumed and what players select.

### Item Card
Each card displays:
- `display_name`
- Tier indicator (`tier.total`)
- **Instant effects** from `base_stats` (e.g., Food: 50, Water: 20)
- **Timed buffs** resolved from `modifiers` → global modifiers dict:
  - `display_name` of the modifier
  - `lifetime` formatted as duration (e.g., "2 min"); if `lifetime === 0`, show "Instant" or "Permanent"
  - `effects` formatted per stat using `stat_metadata.label`, with percentage values (keys ending in `%`) formatted as `+20%` and absolute values as `+75`
- Crafting bench (`tier.anchor`) shown subtly

### Filter Bar
- Text search on `display_name`
- Tier slider: 0–4, filters `tier.total <= selectedTier`
- Talent filter: derive all unique `talent_requirement` values from items. Default: all talents assumed (no filtering). When a player deselects a talent, items requiring that talent become **dimmed with reduced opacity** — not hidden. No unique talent badges on cards.
- Talent state persisted in `localStorage`.

### Grid
- Responsive: 1 col (mobile) → 2 col (tablet) → 3–4 col (desktop)
- Sortable by any stat from `base_stats` or by `tier.total`; clicking a stat header sorts descending, items with no value for that stat sort to the bottom
- Default sort: `tier.total` descending

---

## Phase 2: Loadout Builder

### Loadout Configuration (persisted in `localStorage`)
- **Slot count**: 1–5, default 3. Player-selectable via a control in the UI.
- **Tier filter**: 0–4 (shared with Phase 1 filter bar).
- **Talent filter**: shared with Phase 1 filter bar.

### Item Selection Rules
- Player clicks an item card to add it to the loadout.
- **Hard block:** If a candidate item shares any modifier ID with an already-selected item, the selection is rejected and a clear inline message explains the conflict (e.g., "Conflicts with [Item Name] — same buff active").
- Selection is rejected when slots are full.
- Selected items are visually highlighted in the grid; deselect by clicking again or via the loadout panel.

### Loadout Panel
Displays:
- Selected items side by side (up to 5 columns).
- **Aggregated base_stats**: sum across all selected items per stat key, displayed using `stat_metadata.label`.
- **Aggregated modifier effects**: sum `effects` values per stat key across all unique modifiers from all selected items. Percentage and absolute values formatted consistently. `lifetime` shown per modifier (not summed).
- Modifier conflict warnings if shown (should not be reachable via hard block, but defensive).

### Stateful URL
- Encode the current loadout as `?items=name1,name2,name3` in the URL.
- Restore loadout from URL on page load (validate each name against the dataset; ignore unknown names).
- Loadout slot count, tier, and talent settings are persisted in `localStorage`, not the URL (URL is for sharing the item selection only).

---

## Phase 3: Farming Calculator (Food Only)

Scope stays at `category === "Food"`. No new categories added.

### Consumption Rate Derivation

Each loadout item has at most one modifier. Consumption rate is derived directly from it:

- **Items per hour** = `3600 / modifier.lifetime` where the item has a modifier and `lifetime > 0`.
- Items with no modifier, or whose modifier has `lifetime === 0` (instant/permanent): expose a **player-configurable servings/hour** input (default: 1).

### Ingredient Resolution

For each selected loadout item:
1. Look up its `recipes` array (IDs); if multiple, **default to the recipe whose `benches[0]` has the lowest tier** (benches are sorted lowest-to-highest per the data spec). Expose a per-item recipe selector in the UI for overrides.
2. Scale ingredient quantities by the item's derived items/hour rate.
3. Walk the recipe `inputs`. For `is_generic: true` inputs, resolve valid items via the `generics` lookup and let the player select which specific ingredient they want to use.
4. Recurse into sub-ingredients where applicable (e.g., a recipe requires a processed ingredient that itself has a recipe with crop inputs).

### Classifying Leaf Ingredients

At the end of resolution, all leaf-level ingredients fall into one of two buckets:

- **Farmable crops**: have `growth_data` → calculate plot counts.
- **Non-farmable ingredients**: no `growth_data` (meat, fish, foraged items, etc.) → show units needed per hour as a stockpile list.

### Farming Calculator Output

**Crop Plot List** — for each farmable crop:
- Required units/hour = `items_per_hour × ingredient_count / recipe_output_count` (summed across all loadout items that share this crop)
- Units per plot per hour = `((harvest_min + harvest_max) / 2) / (growth_time / 3600)`
- **Plots needed** = `ceil(required_units_per_hour / units_per_plot_per_hour)`
- Display: crop name, plots needed, growth time, harvest yield range.

**Stockpile List** — for each non-farmable ingredient:
- Units/hour = `items_per_hour × ingredient_count / recipe_output_count` (summed across loadout items)
- Display: ingredient name, units needed per hour.

### Source Item Display in Recipes
For items with `source_item` set (pieces): the recipe panel shows "Crafted as [Parent display_name]" and resolves the **parent item's** recipes for the ingredient list.

---

## Phase 4: Expanded Categories + PWA

### Scope Expansion
- Add `"Drink"` as an optional toggle in the category filter (off by default, player enables it).
- Add `"Animal Food"` as an optional toggle (off by default). Animal Food shares crop ingredients with player food, so enabling it merges seamlessly into the existing farming calculator output.
- Both additions require no new data-layer logic — the farming calculator already handles them generically.

### Visual Separation of Categories
When Drink or Animal Food items are visible alongside Food items, they must be clearly distinguished. Two mechanisms combined:
- **Category badge**: each card carries a colour-coded category pill (Food / Drink / Animal Food) using a distinct accent colour per category.
- **Grid grouping**: the grid renders each active category as a named section with a header row (e.g., "Food", "Drinks", "Animal Food") rather than interleaving all cards in a single flat list.

This means the grid switches from a flat sorted list to a grouped layout when more than one category is active. Within each group, existing sort and filter behaviour applies.

### PWA & Mobile Handoff
- Add `public/manifest.json` for PWA installability.
- Add service worker via `vite-plugin-pwa` for offline support.
- Add QR code generation (`qrcode.react`) for the current stateful URL — lets players scan from their phone to get the farming checklist on mobile.
- Mobile viewport: collapses to a summary card + farming checklist only (hide the full grid on small screens when a loadout is active).

---

## Coding Standards (JS/TS Addendum to `.ai-rules.md`)

To be added to `.ai-rules.md` during Step 2:
- Formatter: Prettier, 2-space indent, single quotes, trailing commas.
- Linter: ESLint with `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `@typescript-eslint`.
- Component files: PascalCase (`ConsumableCard.tsx`). Hooks: camelCase prefixed with `use` (`useConsumables.ts`). Types: in `src/types/`.
- No default exports except for page-level route components.
- Absolute imports from `src/` via Vite alias (`@/`).
- All data-transform logic isolated in pure functions under `src/utils/` with corresponding Vitest tests.
