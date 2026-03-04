# Icarus Consumables Minified Data

This document describes the structure and fields of the combined, minified JSON output (`icarus_consumables.min.json`).

## 1. File Overview

The JSON object contains:
- `metadata`: Runtime and version information.
- `items`: The master list of consumable items.
- `recipes`: Crafting recipes indexed by the internal recipe ID.
- `generics`: Mappings for tag-based recipe inputs (e.g., `Any_Vegetable`) to valid items.
- `features`: Mapping of feature IDs (DLCs/Updates) to their display names.
- `modifiers`: Detailed effects for food/drink buffs.
- `stat_metadata`: Mappings for internal stat codes to readable names and categories.

## 2. Items (`items`)

An array of consumable items.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Internal ID (normalized). |
| `display_name` | string | Localized human-readable name. |
| `category` | string | Practical classification (Food, Drink, Workshop). |
| `tier` | object | `{ "total": 2.3, "anchor": "Crafting_Bench" }`. |
| `base_stats` | object | Direct permanent stats e.g. `{ "Food": 50 }`. |
| `modifiers` | array | List of modifier IDs attached to this item. |
| `recipes` | array | List of recipe IDs that produce this item. |
| `required_features` | array | (Optional) Feature IDs required for this item (inherited). |
| `traits` | object | (Optional) Booleans like `is_harvested`, `is_decay_product`. |
| `growth_data` | object | (Optional) Farming info if applicable. |

## 3. Recipes (`recipes`)

A dictionary of recipes indexed by ID.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | The internal ID of the recipe. |
| `inputs` | array | Required materials (see [Input Fields](#input-fields)). |
| `alternate_inputs` | array | (Optional) Alternative material sets. |
| `outputs` | array | Items produced (see [Output Fields](#output-fields)). |
| `benches` | array | Localized bench names, sorted by tier. |
| `requirements` | object | Logic for unlocking (see [Requirement Fields](#requirement-fields)). |

#### Input Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | ID or Tag. |
| `count` | integer | Quantity required. |
| `display_name` | string | Localized name. |
| `is_generic` | boolean | `true` if tag-based. |

#### Requirement Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `talent` | string | The internal Talent ID required to craft. |
| `character` | integer | (Optional) Minimum character level. |
| `required_features` | array | (Optional) Feature IDs required for this recipe. |

### 4. Generic Ingredient Groups (`generics`)

Maps tags to valid items.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | The tag (e.g., `Any_Vegetable`). |
| `items` | array | List of valid item IDs. |

## 5. Modifiers (`modifiers`)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Internal ID. |
| `display_name` | string | Name of the buff. |
| `lifetime` | integer | Duration in seconds. |
| `effects` | object | Stat changes. |

## 6. Stat Metadata (`stat_metadata`)

| Field | Type | Description |
| :--- | :--- | :--- |
| `label` | string | Readable label. |
| `categories` | array | Functional categories. |

## 7. Features (`features`)

A dictionary mapping internal feature IDs to their public-facing display names.

| Key (ID) | Value (Display Name) |
| :--- | :--- |
| `Styx` | `Styx Expansion` |
| `Homestead` | `Homestead` |

**Note on Remapping**: Some technical feature levels (like `Galileo` or `Laika`) are remapped to `Core` if they are now part of the base game. These will not appear as tags in the output.
