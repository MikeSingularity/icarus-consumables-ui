# Icarus Consumables UI

A web app for browsing Icarus consumables (food and drink), building loadouts, and calculating farming and stockpile needs. Data is loaded at runtime from a JSON source; the URL encodes your loadout and recipe choices so you can share or open the same setup on another device.

**Live app:** [https://icarus-consumables-ui.pages.dev/](https://icarus-consumables-ui.pages.dev/)

---

## Features

- **Browse and filter** — Grid of consumable cards with tier, base stats, and modifier buffs. Filter by tier, sort by stat category or base stats, and toggle Talents and DLC. Switch card view between “Modifiers” and “Recipe” (ingredients and bench).
- **Loadout builder** — Select up to five items; modifier conflicts are blocked. Aggregated base stats and buff effects appear in the sidebar.
- **Farming calculator** — For your loadout, see crop plots and stockpile requirements per hour. Choose recipes, generic ingredients (e.g. sugar from honey vs sugarcane), and derived recipes. Servings per hour configurable for items without a timed buff.
- **Share** — The URL updates with loadout and recipe state. Use “QR code” in the header to show a scannable link for the current setup or just copy-and-paste the current displayed URL.

---

## Tech stack

- React 19, TypeScript, Vite 7
- Tailwind CSS (dark theme)
- pnpm, ESLint, Prettier, Vitest

---

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). For production build and lint:

```bash
pnpm run build    # output in dist/
scripts/lint.sh   # eslint then build
pnpm test         # Vitest
```

Data is fetched at runtime. In development you can point `VITE_DATA_URL` to a local file (see `src/constants/api.ts` and `scripts/fetch-data.sh`).

---

## Data

The app loads consumables data from a single JSON endpoint. You can use the same data for other tools or integrations:

**Data URL:** [https://mikesingularity.github.io/icarus-consumables-data/icarus_consumables.min.json](https://mikesingularity.github.io/icarus-consumables-data/icarus_consumables.min.json)

Schema and field descriptions are in [docs/minified_item_readme.md](docs/minified_item_readme.md).

---

## Documentation

- [Implementation plan and phases](docs/plan.md)
- [UX design and principles](docs/ux-design.md)
- [Card recipe view and URL state](docs/card-recipe-view-design.md)
- [UI data compensations](docs/ui-data-compensations.md)
- [Data schema (minified JSON)](docs/minified_item_readme.md)

---

## Bug reports and contributing

Open an issue or pull request at [GitHub](https://github.com/MikeSingularity/icarus-consumables-ui).
