# UX Design — Icarus Consumables UI

This document captures UX principles, viewport strategy, and design decisions for the Icarus Consumables application.

---

## 1. Purpose and Context

The application helps players choose consumables (food and drink) and plan farming and stockpile needs in Icarus. Primary use cases:

- **Second monitor / side screen:** Browse items and build a loadout while playing; reference without leaving the game.
- **Planning:** Compare base stats and buffs, resolve modifier conflicts, and see required crops and non-farmable ingredients.
- **Sharing:** Stateful URLs allow sharing a loadout and recipe choices; future mobile handoff (e.g. QR) is planned for a summary view.

---

## 2. Architecture Choice

A **client-side SPA hosted on a CDN** was chosen to support:

- Automated data updates (data fetched at runtime from a single JSON source).
- Complex relational data (items, modifiers, recipes, generics, growth data) without a custom backend.
- Stateful URLs for sharing and future mobile handoff.
- Zero ongoing server cost (static hosting).

---

## 3. Visual and Layout Principles

### 3.1 Dark Mode First

- The game is visually intense; a dark UI reduces glare on a second screen and keeps focus on the game.
- Tailwind dark theme is applied by default (e.g. class on `html`). No light-mode toggle in current scope.

### 3.2 High Contrast and Scannability

- Text and borders use sufficient contrast against the dark background.
- Cards and panels use consistent spacing and typography so users can scan tiers, stats, and buff names quickly.
- Data grids and cards are preferred over long lists; sort and filter allow quick narrowing.

### 3.3 Responsive Layout

- **Desktop:** Main content (filter + card grid) and sidebar (loadout + farming calculator) side by side.
- **Narrow viewports:** Stack vertically; sidebar below main content. Sticky header and filter bar keep controls accessible.
- **Future mobile:** Phase 4 will collapse to a summary card and farming checklist when a loadout is active and viewport is small.

---

## 4. Key Flows

### 4.1 Browse and Filter

- Filter bar above the grid: tier slider, sort (tier, category, base stats), talents filter, DLC/feature filter.
- Filters persist in localStorage so returning users keep their preferences.
- Empty state: clear message when no items match (e.g. “No items match your filters”).

### 4.2 Loadout Building

- Click a card to add to loadout; click again or use panel control to remove.
- Modifier conflict: selection is blocked with an explicit message (e.g. “Conflicts with [Item] — same buff active”).
- Slot limit (1–5) is configurable and enforced.
- Loadout panel shows aggregated base stats and modifier effects; conflict state is visible if ever shown.

### 4.3 Farming Calculator

- Automatically derives consumption from modifier lifetime or allows manual servings/hour for items without a timed modifier.
- Recipe, generic, and derived-recipe choices are available in the sidebar; card recipe view can show the same choices when the item is in the loadout.
- Output is split into crop plots (with plot counts and growth info) and stockpile (units per hour). One level of recipe on the card; full tree and numbers in the calculator.

### 4.4 Sharing and Persistence

- Full loadout and recipe-related state are encoded in the URL (items, slots, recipe overrides, generic selections, derived overrides, servings).
- Restore from URL on load; invalid or stale keys are dropped so old links do not break the app.
- `history.replaceState` is used so every toggle does not create a new history entry.

---

## 5. Accessibility and Error Handling

- **Loading:** Dedicated loading state (e.g. spinner) while data is fetched.
- **Errors:** If fetch fails or data is missing, an error message is shown; no silent failure.
- **Validation:** URL and persisted state are validated against the current dataset; unknown items or recipe IDs are ignored and not applied.
- **Labels and structure:** Interactive controls and sections are structured so the UI is navigable and understandable (future work: formal a11y audit and ARIA where needed).

---

## 6. Future UX (Phase 4)

- **Categories:** Drink and Animal Food as optional filters; category badges and grouped grid for multi-category view.
- **PWA:** Installable app and optional offline support.
- **Mobile handoff:** QR code for the current URL; mobile view shows only summary card and farming checklist to support on-the-go reference.

---

## 7. References

- Implementation details: `docs/plan.md`, `docs/card-recipe-view-design.md`.
- Data compensations and edge cases: `docs/ui-data-compensations.md`.
- Data schema: `docs/minified_item_readme.md`.
