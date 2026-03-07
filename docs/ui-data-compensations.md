# UI Data Compensations

This document describes where the UI compensates for missing or malformed data in the consumables JSON (`icarus_consumables.min.json`). For each case we state what the compensation does, where it lives, what triggers it, and what the correct data-side fix is.

The application uses the top-level key `stats` (not `stat_metadata`) for stat metadata; each entry has `display_name` (and optionally `unit`, `categories`). Modifier effect keys and values live in `modifiers[*].stats`.

---

## 1. Malformed `stats` entry: `display_name` containing `%`

### What the UI does

`formatEffectKey` in `src/utils/formatters.ts` has two paths:

1. **Key present in `stats`** — returns `formatBuffLabel(meta.display_name)` (abbreviation applied; otherwise the label as-is). If `display_name` itself contains a trailing `%` (e.g. `HealthRegen%`), that is shown verbatim.
2. **Key absent from `stats`** — derives a label from the key: strip suffix `_[+%?]*`, strip `Base`/`Granted`, split CamelCase into words. That path is never used when the key exists, so malformed labels in the data are not auto-corrected.

In `ConsumableCard` and `LoadoutPanel`, effect keys **absent** from `stats` are rendered in `text-yellow-600` as a QA signal. Keys that are present but have a malformed `display_name` do **not** get this highlight, because they are technically in `stats`.

### Known affected keys (examples)

| Stat key (example) | Current `display_name` (malformed) | Expected |
| --- | --- | --- |
| `BaseHealthRegen_+%` (or as in data) | `HealthRegen%` | `Health Regen` |
| `BaseStaminaRegen_+%` | `StaminaRegen%` | `Stamina Regen` |

The `%` belongs on the **value** (handled by `formatEffectValue`), not in the stat label.

### Data fix

For every `stats` entry whose `display_name` ends with `%`, remove the `%` and format as readable text (e.g. CamelCase to words). Ensure all modifier effect keys used in `modifiers[*].stats` have a corresponding `stats` entry with a clean `display_name`.

---

## 2. Fallback label when key is absent from `stats`

### What the UI does

When a modifier effect key has **no** entry in `stats`, `formatEffectKey` derives a label:

1. Strip suffix `_[+%?]*` from the key.
2. Strip leading `Base` or `Granted`.
3. Split CamelCase into space-separated words.

Example: unknown key `BaseMovementSpeed_+%` renders as “Movement Speed”. The derived label is shown in `text-yellow-600` on the card and in the loadout panel as a QA signal that the key is not in `stats`.

### Data fix

Every key that appears in `modifiers[*].stats` should have an entry in the top-level `stats` object with a human-readable `display_name` and at least one `categories` entry. Adding the key to `stats` removes the yellow highlight automatically.

---

## 3. Missing or empty top-level `features` dictionary

### What the UI does

`App.tsx` builds the DLC/feature display-name map for `FilterBar` and the feature modal. It prefers the top-level `features` object from the JSON:

```typescript
const featureNames: Record<string, string> =
  data.features != null && Object.keys(data.features).length > 0
    ? data.features
    : Object.fromEntries(
        [...new Set(items.flatMap((item) => item.required_features ?? []))].map((f) => [f, f]),
      )
```

If `data.features` is null or empty, it falls back to the set of feature IDs from `item.required_features` across all items and uses the raw ID as the display name (e.g. `"Styx"` instead of `"Styx Expansion"`). The DLC filter still works, but users see internal IDs.

### Data fix

Ensure the top-level `features` object is always present and populated: every feature ID that appears on any item should be mapped to its public display name. Example:

| ID | Display name |
| --- | --- |
| `Styx` | `Styx Expansion` |
| `Homestead` | `Homestead` |

New DLCs should be added to `features` when their items are added to the data.

---

## Reference

- Stat metadata types: `src/types/consumables.ts` — `StatMetadataEntry` with `display_name`, `unit`, `categories`.
- Formatting: `src/utils/formatters.ts` — `formatEffectKey`, `formatEffectValue`, `formatBuffLabel`.
- Data schema: `docs/minified_item_readme.md`.
