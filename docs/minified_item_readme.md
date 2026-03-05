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
- `stats`: Mappings for internal stat codes to readable names and categories.

## 2. Metadata (`metadata`)

Version and build information for the specific data set.

| Field | Type | Description |
| :--- | :--- | :--- |
| `parser_version` | string | Internal version of the Icarus Consumables Parser. |
| `game_version` | string | Factual game version (from `version.json`). |
| `build_guid` | string | Steam Dedicated Server build GUID. |
| `parse_date` | string | Date the data was parsed (YYYY-MM-DD). |
| `generated_date` | string | Date the minified file was finalized. |

## 3. Items (`items`)

An array of consumable items.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Internal ID (normalized). |
| `display_name` | string | Localized human-readable name. |
| `category` | string | Practical classification (Food, Drink, Workshop). |
| `tier` | object | `{ "total": 2.3, "anchor": "Crafting_Bench" }`. |
| `base_stats` | object | Direct permanent stats e.g. `{ "Food": 50 }`. |
| `modifiers` | array | List of modifier IDs attached to this item. |
| `modifier_stats`| object | Accumulated score by category (e.g. `{"Health": 120}`) for sorting. |
| `recipes` | array | List of recipe IDs that produce this item. |
| `source_item` | string | (Optional) The raw item/carcass this is derived from. |
| `talent_requirement`| string | (Optional) Talent ID required to unlock. |
| `required_features` | array | (Optional) Feature IDs required for this item. |
| `traits` | object | (Optional) Booleans like `is_harvested`, `is_override`. |
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

#### Output Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Internal ID of the produced item. |
| `display_name` | string | Localized name. |
| `yields_count` | number | Average quantity produced. |
| `yields_min` | number | (Optional) Minimum quantity. |
| `yields_max` | number | (Optional) Maximum quantity. |

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
| `stats` | object | Stat changes (raw ID -> value). |

## 6. Stats (`stats`)

| Field | Type | Description |
| :--- | :--- | :--- |
| `display_name` | string | Readable label (units stripped). |
| `unit` | string | (Optional) Explicit unit (%, kg, s). |
| `categories` | array | Functional categories. |

## 7. Features (`features`)

A dictionary mapping internal feature IDs to their public-facing display names.

| Key (ID) | Value (Display Name) |
| :--- | :--- |
| `Styx` | `Styx Expansion` |
| `Homestead` | `Homestead` |

**Note on Remapping**: Some technical feature levels (like `Galileo` or `Laika`) are remapped to `Core` if they are now part of the base game. These will not appear as tags in the output.
