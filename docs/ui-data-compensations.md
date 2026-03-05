# UI Data Compensations

This document describes the three places where the UI actively compensates for
missing or malformed data in `icarus_consumables.min.json`. Each section states
what the compensation does, where it lives in the code, what triggers it, and
what the correct data-side fix looks like.

---

## 1. Malformed `stat_metadata` labels containing `%`

### What the UI does

`formatEffectKey` in `src/utils/formatters.ts` has two paths:

1. **Key found in `stat_metadata`** — returns `meta.label` as-is.
2. **Key absent from `stat_metadata`** — strips the trailing `%` from the key
   name, strips the `Base` or `Granted` prefix, then splits CamelCase into
   words (e.g. `BaseHealthRegen%` → `Health Regen`).

Currently, some keys **are** present in `stat_metadata` but have labels that
themselves contain a trailing `%` (e.g. the label for `BaseHealthRegen%` is
`HealthRegen%`). Because the key is found, the UI takes path 1 and returns the
malformed label verbatim. The CamelCase cleanup in path 2 never runs.

As a QA signal, `ConsumableCard.tsx` renders any stat key that is **absent**
from `stat_metadata` in `text-yellow-600`. Keys with malformed labels do
**not** trigger this highlight because they are technically present.

### Known affected keys

| Stat key | Current label | Expected label |
| :--- | :--- | :--- |
| `BaseHealthRegen%` | `HealthRegen%` | `Health Regen` |
| `BaseStaminaRegen%` | `StaminaRegen%` | `Stamina Regen` |
| `BaseSharedExperience%` (unconfirmed key name) | `SharedExperience%` | `Shared Experience` |

### Data fix

For every `stat_metadata` entry whose `label` value ends with `%`, remove the
`%` and insert spaces between CamelCase words so the label reads as natural
English. The `%` belongs on the formatted **value** (handled by
`formatEffectValue`), not the label.

---

## 2. Fallback label derivation for keys absent from `stat_metadata`

### What the UI does

When a modifier effect key has **no entry at all** in `stat_metadata`,
`formatEffectKey` derives a display label automatically:

1. Strip trailing `%` if present.
2. Strip leading `Base` or `Granted` prefix.
3. Split remaining CamelCase string into space-separated words.

Example: an unknown key `BaseMovementSpeed%` would render as `Movement Speed`.

The derived label is shown in `text-yellow-600` on the card as a visual
indicator that the key is unrecognised. This makes it easy to spot any key
the data parser forgot to include.

### Data fix

Every modifier effect key that appears in `modifiers[*].effects` should have a
corresponding entry in `stat_metadata` with a human-readable `label` and at
least one `categories` entry. When a new modifier is added to the game, its
stat keys must be added to `stat_metadata` at the same time.

Once a key is added to `stat_metadata`, its yellow highlight disappears
automatically — this is the intended verification signal.

---

## 3. Missing top-level `features` dictionary

### What the UI does

`App.tsx` builds the DLC feature display-name map used by `FilterBar` and
`FeatureModal`. It prefers the top-level `features` dict from the JSON:

```typescript
const featureNames: Record<string, string> =
  data.features != null && Object.keys(data.features).length > 0
    ? data.features
    : Object.fromEntries(
        [...new Set(items.flatMap((item) => item.required_features ?? []))].map((f) => [f, f]),
      )
```

If `data.features` is null or empty, it falls back to collecting all unique
feature ID strings from `item.required_features` across all items and using
the raw ID as the display name (e.g. `"Styx"` instead of `"Styx Expansion"`).

The DLC filter still functions correctly in this fallback state, but users see
internal IDs rather than friendly names.

### Data fix

Ensure the top-level `features` object is always present and populated in the
output JSON, mapping every feature ID that appears on any item to its
public-facing display name. The current expected mapping is:

| ID | Display name |
| :--- | :--- |
| `Styx` | `Styx Expansion` |
| `Homestead` | `Homestead` |

Any new DLC added to the game must be added here at the same time its items
are included in the data.
