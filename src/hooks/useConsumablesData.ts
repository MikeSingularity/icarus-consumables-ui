import { useState, useEffect } from 'react';
import { DATA_URL } from '@/constants/api';
import type {
  ConsumablesData,
  Item,
  ItemCategory,
  Generic,
  Requirements,
} from '@/types/consumables';

/**
 * Module-level cache. Populated on first successful fetch and reused for
 * the lifetime of the browser session without re-fetching.
 */
let cachedData: ConsumablesData | null = null;

/**
 * Derives ItemCategory from the tags array.
 * This restores compatibility with the existing UI logic while using the new tag-based format.
 */
function processItem(item: Item): Item {
  const tags = item.tags ?? [];
  const categoryTag = tags.find((t) => t.startsWith('IC.Category.'));
  const category = categoryTag ? (categoryTag.split('.').pop() as ItemCategory) : undefined;

  const requirements: Partial<Requirements> = { ...item.requirements };
  const features: string[] = [...(requirements.features ?? [])];

  tags.forEach((tag) => {
    if (tag.startsWith('IC.Required.FeatureLevel.')) {
      const feature = tag.split('.').pop();
      if (feature && !features.includes(feature)) features.push(feature);
    } else if (tag.startsWith('IC.Required.Workshop.')) {
      requirements.workshop = tag.split('.').pop();
    } else if (tag.startsWith('IC.Required.Talent.')) {
      requirements.talent = tag.split('.').pop();
    } else if (tag.startsWith('IC.Required.Blueprint.')) {
      requirements.blueprint = tag.split('.').pop();
    }
  });

  if (features.length > 0) requirements.features = features;

  return {
    ...item,
    tags,
    category,
    requirements: Object.keys(requirements).length > 0 ? requirements : undefined,
    modifiers: item.modifiers ?? {},
    recipes: item.recipes ?? [],
    base_stats: item.base_stats ?? {},
    modifier_stats: item.modifier_stats ?? {},
  };
}

/**
 * Fetches and caches the consumables dataset from DATA_URL.
 * Performs structural transformations to ensure compatibility with the updated types.
 */
export function useConsumablesData(): {
  data: ConsumablesData | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<ConsumablesData | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(cachedData === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedData !== null) return;

    let cancelled = false;

    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;

        // Transformation for items
        const items: Record<string, Item> = {};
        for (const [id, item] of Object.entries(json.items as Record<string, Item>)) {
          items[id] = processItem(item);
        }

        // Transformation for generics
        const generics: Record<string, Generic> = {};
        for (const [id, itemIds] of Object.entries(json.generics as Record<string, string[]>)) {
          generics[id] = {
            id,
            display_name: id.replace(/_/g, ' '),
            items: itemIds,
          };
        }

        const processedData: ConsumablesData = {
          ...json,
          items,
          generics,
        };

        cachedData = processedData;
        setData(processedData);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load consumables data';
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
