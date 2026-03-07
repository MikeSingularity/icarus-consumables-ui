# Icarus Consumables UI — Implementation Plan

This document defines hosting, stack, phased feature set, and implementation status. For the JSON schema and field semantics, see `docs/minified_item_readme.md`. For TypeScript types, see `src/types/consumables.ts` and `src/types/ui.ts`.

---

## 1. Decisions and Constraints

| Concern | Decision |
| --- | --- |
| Hosting | Cloudflare Pages; auto-generated `*.pages.dev` URL |
| Framework | React 19 + TypeScript + Vite 7 |
| Package manager | pnpm |
| Data source | Runtime fetch; URL from `VITE_DATA_URL` or fallback (see `docs/json_url.txt`) |
| Initial scope | Consumable items with modifiers (filter excludes inedible); Food-focused UX |
| Theme | Dark mode first |

---

## 2. Cloudflare Pages Setup

1. Create an account at cloudflare.com and open **Workers & Pages** → **Pages** → **Create**.
2. Choose **Connect to Git** → GitHub → authorize and select the `icarus-consumables-ui` repository.
3. Configure build:
   - Framework preset: **Vite**
   - Build command: `pnpm run build`
   - Build output directory: `dist`
4. Add environment variable: `NODE_VERSION` = `20`.
5. Save and deploy. The first deploy may fail until the repo has a valid build; the Git connection is established.
6. Note the generated `*.pages.dev` URL.

---

## 3. Project Foundation

### 3.1 Tooling

- **Lint:** ESLint (eslint.config.js); run via `pnpm lint`.
- **Format:** Prettier (.prettierrc); run via `pnpm exec prettier --write .`.
- **Tests:** Vitest; run via `pnpm test`.
- **Build:** `pnpm run build` (TypeScript then Vite). Lint script: `scripts/lint.sh` runs `pnpm lint` then `pnpm build`.

### 3.2 Data Layer

- **Data URL:** `src/constants/api.ts` exports `DATA_URL` from `import.meta.env.VITE_DATA_URL` with a documented fallback. No hardcoded data URLs elsewhere.
- **Local development:** `.env.development` can set `VITE_DATA_URL` to a local path (e.g. `/icarus_consumables.min.json` served from `public-dev/`). Use `scripts/fetch-data.sh` to refresh the local file. Production uses the fallback when the env var is unset.
- **Fetch:** At startup the app fetches JSON from `DATA_URL`, caches it in memory for the session, and handles loading and error states explicitly.
- **Filtering:** The data hook filters items (e.g. inedible excluded); the UI focuses on consumables with modifiers.

### 3.3 Conventions (see also .cursorrules)

- Component files: PascalCase. Hooks: camelCase with `use` prefix. Types in `src/types/`.
- Data-transform logic: pure functions in `src/utils/` with Vitest tests.
- Absolute imports via `@/` (alias to `src/`). No default exports except page-level route components.

---

## 4. Phase Summary and Status

| Phase | Scope | Status |
| --- | --- | --- |
| **1** | Food browser: card grid, filter bar (tier, sort, talents, DLC), item cards (tier, base stats, modifiers, bench) | Done |
| **2** | Loadout builder: slot count, selection with modifier conflict blocking, loadout panel, aggregated stats, stateful URL (`?i=...&l=...`) | Done |
| **3** | Farming calculator: servings/hr from modifier lifetime or override, ingredient resolution, recipe/generic/derived overrides, crop plots and stockpile lists, URL params `r`, `g`, `d`, `s` | Done |
| **3b** | Card recipe view: global Modifiers/Recipe toggle, recipe view on cards (one level), recipe and generic dropdowns when in loadout; derived recipe overrides in sidebar | Done |
| **4** | Expanded categories (Drink, Animal Food), PWA, QR code for URL, mobile summary view | Not implemented |

---

## 5. Phase 1: Food Browser (Done)

- **Data:** Filter to consumable items (e.g. inedible excluded); optional category filter at data layer.
- **Cards:** Display name, tier, base stats, modifier buffs (name, lifetime, effect stats), crafting bench. Badges: orbital (satellite icon), DLC (feature). Pieces (e.g. cake slices) shown as the piece; `source_item` used where needed for recipe resolution.
- **Filter bar:** Tier slider (0–4), sort dropdown (tier, category-based, base stat keys), Talents modal, DLC/Features modal. Selections persisted in localStorage.
- **Grid:** Responsive columns; loading, error, and empty states.

---

## 6. Phase 2: Loadout Builder (Done)

- **Loadout:** Slot count 1–5 (localStorage); click to add/remove. Hard block on modifier conflict; slot full blocks further add.
- **Loadout panel:** Selected items, aggregated base stats and modifier effects, conflict messaging.
- **URL:** Loadout encoded as `?i=name1,name2&l=slotCount`; restore on load with validation.

---

## 7. Phase 3: Farming Calculator (Done)

- **Consumption:** Items per hour = `3600 / modifier.lifetime` when lifetime &gt; 0; otherwise configurable servings/hour per item.
- **Recipe resolution:** Default recipe (e.g. lowest-tier bench); per-item recipe override, generic selections, derived recipe overrides. Recursive walk of ingredients; leaf nodes classified as farmable (growth_data) or stockpile.
- **Output:** Crop plot list (required units/hr, yield, plots needed); stockpile list (units/hr).
- **Pieces:** Recipe panel shows “Crafted as [Parent]” and uses parent recipe for ingredients.
- **URL:** Params `r`, `g`, `d`, `s` for recipe overrides, generic selections, derived overrides, servings overrides. Single canonical search string; read on load, write on change (replaceState). See `docs/card-recipe-view-design.md` and `src/utils/urlState.ts`.

---

## 8. Phase 4: Future Work (Not Implemented)

- **Categories:** Optional Drink and Animal Food toggles; category badges and grouped grid.
- **PWA:** manifest.json, service worker (e.g. vite-plugin-pwa), offline support.
- **Mobile handoff:** QR code for current URL; mobile viewport shows summary and farming checklist only.

---

## 9. Security and Headers

- `public/_headers` can define security headers (CSP, X-Frame-Options, Referrer-Policy) for Cloudflare Pages.
