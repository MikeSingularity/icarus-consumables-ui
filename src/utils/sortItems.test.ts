import { describe, it, expect } from 'vitest';
import { sortItems, buildSortOptions } from './sortItems';
import type { Item, StatMetadataEntry } from '@/types/consumables';

const statMetadata: Record<string, StatMetadataEntry> = {
  'BaseMaximumHealth_+': { display_name: 'Max Health', category: 'Health' },
  'BaseMaximumStamina_+': { display_name: 'Max Stamina', category: 'Stamina' },
  'BaseFoodRecovery_+': { display_name: 'Food when Consumed', category: 'Consumption' },
  'BaseWaterRecovery_+': { display_name: 'Water when Consumed', category: 'Consumption' },
};

const makeItem = (
  id: string,
  tier: string,
  baseStats: Record<string, number>,
  mods: string[],
  modifierStats: Record<string, number> = {}
): Item => ({
  id,
  display_name: id,
  category: 'Food',
  tier,
  base_stats: baseStats,
  modifiers: Object.fromEntries(mods.map((m) => [m, 600])),
  modifier_stats: modifierStats,
  recipes: [],
  tags: [],
});

const itemA = makeItem('itemA', '3', { 'BaseFoodRecovery_+': 150 }, ['HealthBuff'], { health: 95 });
const itemB = makeItem('itemB', '1', { 'BaseFoodRecovery_+': 50 }, ['StaminaBuff'], {
  stamina: 60,
});
const itemC = makeItem(
  'itemC',
  '2',
  { 'BaseFoodRecovery_+': 100, 'BaseWaterRecovery_+': 30 },
  ['NoBuff'],
  { experience: 30 }
);
const itemD = makeItem('itemD', '4', {}, []);

const testStatCats: Record<string, string> = {
  health: 'Health',
  stamina: 'Stamina',
  experience: 'Experience',
};

describe('sortItems', () => {
  const items = [itemA, itemB, itemC, itemD];

  it('sorts by tier descending with key "tier"', () => {
    const sorted = sortItems(items, 'tier');
    expect(sorted.map((i) => i.id)).toEqual(['itemD', 'itemA', 'itemC', 'itemB']);
  });

  it('sorts by name ascending with key "name"', () => {
    const sorted = sortItems(items, 'name');
    expect(sorted.map((i) => i.id)).toEqual(['itemA', 'itemB', 'itemC', 'itemD']);
  });

  it('sorts by name with secondary sort by tier when display_name is equal', () => {
    const sameName1 = makeItem('z1', '2', {}, []);
    const sameName2 = makeItem('z2', '4', {}, []);
    sameName1.display_name = 'Same';
    sameName2.display_name = 'Same';
    const sorted = sortItems([sameName1, sameName2], 'name');
    expect(sorted[0].tier).toBe('4');
    expect(sorted[1].tier).toBe('2');
  });

  it('sorts by base stat descending with "base:<key>", items without stat go last', () => {
    const sorted = sortItems(items, 'base:BaseFoodRecovery_+');
    expect(sorted[0].id).toBe('itemA'); // 150
    expect(sorted[1].id).toBe('itemC'); // 100
    expect(sorted[2].id).toBe('itemB'); // 50
    expect(sorted[3].id).toBe('itemD'); // undefined → -1
  });

  it('secondary sort by tier when base stats are equal', () => {
    const eq1 = makeItem('eq1', '3', { 'BaseFoodRecovery_+': 100 }, []);
    const eq2 = makeItem('eq2', '1', { 'BaseFoodRecovery_+': 100 }, []);
    const sorted = sortItems([eq2, eq1], 'base:BaseFoodRecovery_+');
    expect(sorted[0].id).toBe('eq1'); // higher tier wins
  });

  it('sorts by modifier_stats score descending with "modcat:<category>"', () => {
    const sorted = sortItems(items, 'modcat:health');
    expect(sorted[0].id).toBe('itemA'); // health: 95
    // remaining order by tier descending (itemD=4, itemC=2, itemB=1)
    const rest = sorted.slice(1).map((i) => i.id);
    expect(rest).toEqual(['itemD', 'itemC', 'itemB']);
  });

  it('returns a new array without mutating input', () => {
    const original = [itemB, itemA];
    const sorted = sortItems(original, 'tier');
    expect(original[0].id).toBe('itemB');
    expect(sorted[0].id).toBe('itemA');
  });
});

describe('buildSortOptions', () => {
  it('always includes Tier then Name options first', () => {
    const opts = buildSortOptions([itemA], statMetadata, testStatCats);
    expect(opts[0]).toEqual({ key: 'tier', label: 'Tier' });
    expect(opts[1]).toEqual({ key: 'name', label: 'Name' });
  });

  it('includes base stat options with display_name labels for stats present in items', () => {
    const opts = buildSortOptions([itemA, itemC], statMetadata, testStatCats);
    const keys = opts.map((o) => o.key);
    expect(keys).toContain('base:BaseFoodRecovery_+');
    expect(keys).toContain('base:BaseWaterRecovery_+');
    expect(keys).not.toContain('base:BaseOxygenRecovery_+');
    const foodOpt = opts.find((o) => o.key === 'base:BaseFoodRecovery_+');
    expect(foodOpt?.label).toBe('Food');
  });

  it('includes modifier category options when items have non-zero modifier_stats', () => {
    const opts = buildSortOptions([itemA, itemB], statMetadata, testStatCats);
    const keys = opts.map((o) => o.key);
    expect(keys).toContain('modcat:health');
    expect(keys).toContain('modcat:stamina');
    const healthOpt = opts.find((o) => o.key === 'modcat:health');
    expect(healthOpt?.label).toBe('Health Buffs');
  });

  it('omits modifier category when no items have that modifier_stats key', () => {
    const opts = buildSortOptions([itemC], statMetadata, testStatCats);
    const keys = opts.map((o) => o.key);
    expect(keys).not.toContain('modcat:health');
    expect(keys).not.toContain('modcat:stamina');
  });
});
