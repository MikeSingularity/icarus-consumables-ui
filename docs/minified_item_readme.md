# Icarus Consumables - Minified Data Format

This document describes the structure of `icarus_consumables.min.json`, a consolidated and optimized dataset containing all food, drink, and medicine information from Icarus.

## File Overview

The minified file is a single JSON object containing:

- `metadata`: Runtime and version information.
- `items`: The master list of consumable items.
- `recipes`: Crafting recipes indexed by the internal recipe ID.
- `generics`: Mappings for tag-based recipe inputs (e.g., `Any_Vegetable`) to valid items.
- `modifiers`: Detailed effects for food/drink buffs.
- `stat_metadata`: Mappings for internal stat codes to readable names and categories.

## 1. Metadata

Provides context for the generation run.

| Field | Description |
| :--- | :--- |
| `game_version` | The internal version of Icarus used. |
| `build_guid` | The Steam Build ID of the processed game data. |
| `parser_version` | The version of the extraction tool used. |
| `parse_date` | Date of extraction from game data in `YYYY-MM-DD`. |
| `generated_date` | Date the minified file was compiled in `YYYY-MM-DD`. |

## 2. Items (`items`)

An array of objects representing items. All `description` and `source_ids` fields are removed from items for size efficiency (buff descriptions are also removed from `modifiers`).

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Normalized internal ID (lowercase, alphanumeric). |
| `display_name` | string | Localized name in English. |
| `category` | string | `Food`, `Drink`, `Animal Food`, `Medicine`, or `Workshop`. |
| `base_stats` | object | Core stats like `{"Food": 50}`. Note: Buff stats are in `modifiers`. |
| `tier` | object | Contains `total` (numeric tier) and `anchor` (base bench requirement). The higher the tier, the more advanced the player needs to be to craft the item. |
| `modifiers` | array | List of modifier IDs applied on consumption. |
| `recipes` | array | List of recipe IDs that produce this item. |
| `traits` | object | (Optional) Boolean flags. Only present if at least one is `true`. |
| `source_item` | string | (Optional) Parent item ID for pieces (e.g., cake slices). |
| `talent_requirement`| string | (Optional) Specific talent ID required to unlock the item. |
| `growth_data` | object | (Optional) Farming info: `growth_time`, `harvest_min`, `harvest_max`. |

### Traits Breakdown
Common boolean flags found in the `traits` object:
- `is_harvested`: Item is obtained via nature/harvesting.
- `is_orbital`: Item is a Workshop/Orbital purchase.
- `is_decay_product`: Item is a byproduct of spoilage (e.g., Spoiled Meat).
- `is_override`: Item data was modified or added by manual overrides.
- **Note**: A property is only included if its value is `true`. If all are `false`, the `traits` object is omitted.

## 3. Recipes (`recipes`)

A dictionary of recipe objects indexed by recipe ID.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | The internal ID of the recipe. |
| `inputs` | array | Required materials (see [Input Fields](#input-fields)). |
| `alternate_inputs` | array | (Optional) Alternative material sets (same schema as inputs). |
| `outputs` | array | Items produced (see [Output Fields](#output-fields)). |
| `benches` | array | Localized bench names, sorted by tier (lowest to highest). |
| `requirements` | object | Logic for unlocking (see [Requirement Fields](#requirement-fields)). |

#### Input Fields
Used in `inputs` and `alternate_inputs`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Normalized internal ID or Tag (e.g., `Any_Vegetable`). |
| `count` | integer | The quantity of the item required. |
| `display_name` | string | Localized name or human-readable tag. |
| `is_generic` | boolean | `true` if this is a tag-based input (matches any item in a group). |

#### Output Fields
Used in the `outputs` array.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Normalized internal ID. |
| `yields_count` | number | The quantity produced, scaled by the item's yield multiplier. |
| `display_name` | string | Localized name. |
| `yields_item` | string | (Optional) Specific item ID this yields (e.g., Piece -> Base). |
| `yields_min` | number | (Optional) Minimum quantity for varying resource yields. |
| `yields_max` | number | (Optional) Maximum quantity for varying resource yields. |

#### Requirement Fields
Used in the `requirements` object.

| Field | Type | Description |
| :--- | :--- | :--- |
| `talent` | string | Internal Talent ID required to unlock this recipe (or `None`). |
| `character` | integer | Minimum character level required for the recipe. |
| `session` | string | Special mission or session requirement if applicable. |

### 4. Generic Ingredient Groups (`generics`)

An array of objects mapping generic recipe tags to their valid specific items. This allows the UI to resolve what satisfies a "generic" slot in a recipe.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | The internal generic tag (e.g., `Any_Vegetable`). |
| `items` | array | List of internal item names that satisfy this tag. |

## 5. Modifiers (`modifiers`)

Detailed effects for buffs granted by items.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | The internal modifier ID. |
| `display_name` | string | Localized name of the buff. |
| `lifetime` | integer | Duration in seconds (0 for permanent/instant). |
| `effects` | object | Stat modifiers: `{"BaseMaximumHealth": 75, "BaseHealthRegen%": 0.2}`. |

## 5. Stat Metadata (`stat_metadata`)

Maps technical stat keys to readable labels and functional categories.

| Field | Type | Description |
| :--- | :--- | :--- |
| `label` | string | User-friendly title for the stat. |
| `categories` | array | One or more categories (e.g., `["Health", "Combat"]`). |

---

### Tips for Consumption
- Match `items.modifiers` entries against keys in the global `modifiers` object.
- Match `items.recipes` entries against keys in the global `recipes` object.
- Use `stat_metadata` to transform keys like `BaseMaximumStamina` into "Max Stamina" for UI display.