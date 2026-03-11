# Data compatibility (minified JSON)

When the backend structure of `icarus_consumables.min.json` changes, this doc records what was checked and what the UI tolerates. Schema and types: `docs/minified_README.md`, `src/types/consumables.ts`.

## UI expectations (required)

The app requires these top-level keys and uses them as follows:

- **metadata** – Required. Used in `App.tsx` for version/patchnotes display. Must include at least: `parser_version`, `client_version`, `last_sync_date`, `generated_date`. Optional: `patchnotes_url`, `latest_week`.
- **items** – Array of items; each item must have `name`, `display_name`, `category`, `tier`, `base_stats`, `modifiers`, `modifier_stats`, `recipes`.
- **recipes** – Record of recipe ID to recipe. Each recipe: `id`, `inputs`, `outputs`, `benches`, `requirements`. Outputs must have `name`, `yields_count` (used by farming calc).
- **generics** – Array (may be empty).
- **modifiers** – Record of modifier ID to `{ id, display_name, lifetime, stats }`.
- **stats** – Record of stat key to `{ display_name, unit?, categories }`.
- **features** – Optional. If present and non-empty, used for DLC display names; otherwise derived from item `requirements.features`.
- **requirements** – Optional. Global registry mapping requirement IDs (talent, blueprint, workshop) to display names; used for talent filter labels and item/recipe requirement resolution.

## Tolerated extra fields

The UI ignores unknown top-level or nested fields. Backend can add:

- **metadata**: e.g. `server_build_guid`, `client_build_guid`, `server_version`, `version_title`.
- **Recipe outputs**: `yields_item` (string or null).
- **Recipe requirements**: `session` (any type).

## Last verified

- **2026-03-07**: Checked `public-dev/icarus_consumables.min.json`. Top-level keys: `features`, `generics`, `items`, `metadata`, `modifiers`, `recipes`, `stats`. All required fields present. Build and runtime OK. New optional fields documented in types and readme.
