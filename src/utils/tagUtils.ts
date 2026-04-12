import type { Item } from '@/types/consumables';

/**
 * Key tag markers used for behavioral logic in the application.
 */
export const Tags = {
  /** Items tagged as Raw are now leaf nodes (harvested items like meat/berries). */
  Raw: 'IC.Material.Raw',
  /** Items tagged as Ingot are also leaf nodes. */
  Ingot: 'IC.Material.Ingot',
  /** Items tagged as Container are reusable (bottles, jars) and should be treated as leaf nodes. */
  Container: 'IC.Marker.Container',
} as const;

/**
 * Returns true if the item should be treated as a leaf node in recipe/farming logic.
 * These are items that are either harvested from the world or are reusable containers.
 */
export function isLeafNode(item: Item): boolean {
  return (
    item.tags.includes(Tags.Raw) ||
    item.tags.includes(Tags.Ingot) ||
    item.tags.includes(Tags.Container)
  );
}

/**
 * Returns true if the item is specifically a reusable container (e.g. Glass Jar).
 */
export function isContainer(item: Item): boolean {
  return item.tags.includes(Tags.Container);
}

/**
 * Returns true if the item is specifically a raw material (harvested).
 */
export function isRawMaterial(item: Item): boolean {
  return item.tags.includes(Tags.Raw);
}
