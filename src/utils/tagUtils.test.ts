import { describe, it, expect } from 'vitest';
import { isLeafNode, isRawMaterial, Tags } from './tagUtils';
import type { Item } from '@/types/consumables';

const mockItem = (tags: string[]): Item => ({
  id: 'test_item',
  display_name: 'Test Item',
  tier: '1',
  tags,
  base_stats: {},
  modifiers: {},
  modifier_stats: {},
  recipes: [],
});

describe('tagUtils', () => {
  it('should have the correct tag values', () => {
    expect(Tags.Raw).toBe('IC.Material.Raw');
    expect(Tags.Ingot).toBe('IC.Material.Ingot');
    expect(Tags.Container).toBe('IC.Marker.Container');
  });

  it('should identify leaf nodes correctly', () => {
    const rawItem = mockItem(['IC.Material.Raw']);
    const ingotItem = mockItem(['IC.Material.Ingot']);
    const containerItem = mockItem(['IC.Marker.Container']);
    const normalItem = mockItem(['Some.Other.Tag']);

    expect(isLeafNode(rawItem)).toBe(true);
    expect(isLeafNode(ingotItem)).toBe(true);
    expect(isLeafNode(containerItem)).toBe(true);
    expect(isLeafNode(normalItem)).toBe(false);
  });

  it('should identify raw materials correctly', () => {
    const rawItem = mockItem(['IC.Material.Raw']);
    const normalItem = mockItem(['Some.Other.Tag']);

    expect(isRawMaterial(rawItem)).toBe(true);
    expect(isRawMaterial(normalItem)).toBe(false);
  });
});
