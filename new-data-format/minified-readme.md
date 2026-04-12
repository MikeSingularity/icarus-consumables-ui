# Icarus Calculator Data Format Guide

This document describes the structure and fields of the `output/data_calculator.json` file. This guide is intended for **external engineers** building UX applications (e.g., crafting calculators, inventory trackers, or stat analyzers) who do not have direct access to the Icarus Calculator source code.

---

## 1. File Overview

The JSON object is a monolithic data set containing the following top-level keys:

| Key               | Description                                                                 |
| :---------------- | :-------------------------------------------------------------------------- |
| `metadata`        | Build and version information (Reserved for future use).                    |
| `features`        | Mapping of feature IDs (DLCs/Updates) to human-readable names.              |
| `generics`        | Tag-based input groups (e.g., `any_vegetable`) mapped to valid item IDs.    |
| `items`           | The master registry of items, indexed by their unique internal ID.          |
| `modifiers`       | Detailed effects for buffs/debuffs (e.g., food effects).                    |
| `recipes`         | Crafting logic indexed by recipe ID, defining inputs, outputs, and benches. |
| `stat_categories` | Display labels for internal stat classification.                            |
| `stats`           | Metadata for individual game statistics (names, units, categories).         |

---

## 2. Item Registry (`items`)

The `items` object is the core of the data set. Each item is indexed by its **lowercase internal ID**.

### 2.1 Item Object Fields

| Field            | Type   | Description                                                                              |
| :--------------- | :----- | :--------------------------------------------------------------------------------------- |
| `id`             | string | Normalized unique identifier (redundant with the key).                                   |
| `display_name`   | string | Localized human-readable name.                                                           |
| `tier`           | string | Technology level (e.g., `"1.0"`, `"3.1"`).                                               |
| `tags`           | array  | **CRITICAL**: Classification tags. See [Tag Classification](#3-tag-classification-tags). |
| `recipes`        | array  | List of recipe IDs that produce this item.                                               |
| `decay_data`     | object | `{ "decay_time": 300, "spoil_time": 60, "spoils_to": "id" }`.                            |
| `base_stats`     | object | Direct permanent effects (e.g., `{ "BaseFoodRecovery_+": 20 }`).                         |
| `growth_data`    | object | Farming info: `{ "growth_time": 2400, "harvest_min": 6, "harvest_max": 9 }`.             |
| `modifiers`      | object | **Map** of Modifier ID -> Duration (seconds). E.g., `{ "agave_syrup": 1800 }`.           |
| `modifier_stats` | object | Cached sorting scores for the attached modifiers (e.g., `{ "health": 30 }`).             |

> [!TIP]
> Use `IC.Category.*` tags to quickly filter the primary item type (e.g., `IC.Category.Resources`).

### 2.2 Item Structure Example (`agave`)

Here is a full example of an item entry with all advanced data populated:

```json
"agave": {
    "id": "agave",
    "display_name": "Agave",
    "tier": "0",
    "tags": [
        "IC.Category.Resources",
        "IC.Material.Raw",
        "Item.Plant.Herb",
        "Traits.Meshable"
    ],
    "recipes": ["agave"],
    "base_stats": {
        "BaseFoodRecovery_+": 20
    },
    "decay_data": {
        "decay_time": 300,
        "spoil_time": 800,
        "spoils_to": "spoiled_plants"
    },
    "growth_data": {
        "growth_time": 2400,
        "harvest_min": 6,
        "harvest_max": 9
    },
    "modifiers": {
        "agave_syrup": 1800
    },
    "modifier_stats": {
        "consumption": 21,
        "health": 30
    }
}
```

---

## 3. Tag Classification (`tags`)

Tags are the primary system for filtering and categorizing items. They follow a hierarchical structure (e.g., `Parent.Child.SubChild`).

### 3.1 Implementation Expectation

The raw JSON contains only the leaf tags explicitly assigned to an item. **Developers are responsible for implementing the hierarchical matching logic.**

- **Hierarchy**: A query for a parent tag (e.g., `Item.Plant`) **must** also match all children (e.g., `Item.Plant.Fruit`).
- **Case Sensitivity**: Tags in Icarus are consistently interpreted in a **case-insensitive** manner. It is highly recommended that client-side engines normalize all tags to lowercase before comparison.

For a detailed matching specification, see Section 2 of the [Tag System Technical Reference](tags-reference.md).

### 3.2 Key IC Categories

The Icarus Calculator generates several **`IC.*`** tags to simplify common UI tasks:

| Tag                     | Purpose                                             |
| :---------------------- | :-------------------------------------------------- |
| `IC.Category.Food`      | Nutritional items with stats/modifiers.             |
| `IC.Category.Resources` | Basic raw materials (Ore, Wood, Stone).             |
| `IC.Category.Drink`     | Items that restore hydration.                       |
| `IC.Marker.Container`   | Items that can hold other resources (Oxygen/Fluid). |
| `IC.Required.*`         | DLC or Workshop currency requirements.              |

> [!NOTE]
> For a full list of categories, query operators (`ANY`, `ALL`, `NONE`), and technical logic (Fish/Fluid handling), see the [Tag System Technical Reference](tags-reference.md).

---

## 4. Crafting Recipes (`recipes`)

Recipes are indexed by their internal ID and bridge items with the benches that craft them.

| Field          | Type   | Description                                                                                                                |
| :------------- | :----- | :------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string | Internal recipe identifier.                                                                                                |
| `display_name` | string | Human-readable name (Stripped of 'Recipe\_' prefixes).                                                                     |
| `benches`      | array  | List of benches where this can be crafted. Entries match `items[id]` and are **sorted by tier order** (lowest to highest). |
| `inputs`       | array  | A list of **`Product`** objects required to craft the recipe.                                                              |
| `outputs`      | array  | A list of **`Product`** objects produced by the recipe.                                                                    |

### 4.1 The `Product` Object

Most item transactions (inputs, outputs, intermediate production) use the `Product` schema:

| `id` | string | The internal ID of the item or **tag** (for generic inputs). |
| `count` | number | The quantity required or produced. |
| `recipe_produces` | object | **(Optional)** A nested `Product` object. This represents an **intermediate conduit or placeholder** (e.g., a whole cake or an egg) that yields the final interactive output (pieces or a baby dragon). |

### 4.2 Recipe Structure Example (Simple: `dried_white_meat`)

A recipe might require a specific bench and use raw materials categorized by tags.

```json
"dried_white_meat": {
    "id": "dried_white_meat",
    "display_name": "Dried White Meat",
    "benches": [
        "drying_rack",
        "smoker_t3"
    ],
    "inputs": [
        {
            "id": "white_meat",
            "count": 1
        }
    ],
    "outputs": [
        {
            "id": "white_meat_dried",
            "count": 1
        }
    ]
}
```

### 4.3 Recipe Structure Example (Composite: `chocolate_cake`)

Some recipes yield outputs that logically originate from an **intermediate conduit item** (e.g., a whole cake that exists only to be sliced). This is handled via the `recipe_produces` metadata.

> [!IMPORTANT]
> A conduit item like `chocolate_cake` may have no direct game purpose other than to yield its subdivided pieces.

```json
"chocolate_cake": {
    "id": "chocolate_cake",
    "display_name": "Chocolate Cake",
    "benches": ["electric_stove"],
    "inputs": [
        { "id": "flour", "count": 20 },
        { "id": "sugar", "count": 10 }
    ],
    "outputs": [
        {
            "id": "chocolate_cake_piece",
            "count": 8,
            "recipe_produces": {
                "id": "chocolate_cake",
                "count": 1
            }
        }
    ]
}
```

---

## 5. Buffs & Modifiers (`modifiers`)

Used primarily for food effects.

| Field          | Type   | Description                                                          |
| :------------- | :----- | :------------------------------------------------------------------- |
| `id`           | string | Unique modifier identifier.                                          |
| `display_name` | string | Localized name of the buff.                                          |
| `stats`        | object | Stat adjustments (e.g., `"BaseMaximumHealth_+": 50`).                |
| `affectors`    | object | Modifiers to the modifier itself (e.g. `effectiveness`, `lifetime`). |

---

## 6. Statistics Matrix (`stats` & `stat_categories`)

To display stat gains clearly, cross-reference the keys in an item or modifier's `stats` block with the global `stats` registry.

### 6.1 Stats Metadata Fields

| Field                | Type   | Description                                                                       |
| :------------------- | :----- | :-------------------------------------------------------------------------------- |
| `display_name`       | string | The clean label (e.g., "Maximum Health").                                         |
| `unit`               | string | The unit suffix (e.g., "+", "%", "m").                                            |
| `categories`         | array  | Indices for `stat_categories` (e.g., "Survival").                                 |
| `display_operations` | array  | **CRITICAL**: Math required before display (e.g., division by 100 for distances). |

### 6.2 Stats Example (`trailbeaconmaxplacementdistance_+`)

Some stats require math before being shown in a UI (e.g., converting game units to meters).

```json
"trailbeaconmaxplacementdistance_+": {
    "display_name": "Max Trail Beacon Placement Distance",
    "unit": "m",
    "category": "deployable",
    "display_operations": [
        {
            "operation": "division",
            "value": 100
        }
    ]
}
```

---

## 7. UX Implementation Tips

1.  **Format Your Stats**: Before displaying a stat value, check for `display_operations`. If a stat has a `division` operation of `100`, a raw value of `5000` should be displayed as `50`.
2.  **Bench Item Mapping**: Every entry in a recipe's `benches` array corresponds to a top-level key in the `items` object. Access `items[bench_id]` to retrieve the display name and tech tier of the station.
3.  **Tier-Based Selection**: Benches are pre-sorted by tier. Use the first element of the `benches` array to find the "earliest" possible crafting station for a recipe.
4.  **Tag-Based Filtering**: Always check for `IC.` tags first for high-level UI tabs.
5.  **Generic Substitutions**: When a recipe input doesn't match an item ID, check the `generics` map. For example, if a recipe requires `any_vegetable`, the `generics` map defines which item IDs fulfill this requirement.
6.  **Recursive Calculation**: Use the `recipes` array in an item to build a dependency tree. Be aware of the `max_depth` (20) recommended for traversal engines to prevent circular loops.
