import { describe, it, expect } from 'vitest'
import {
  formatLifetime,
  formatBuffLabel,
  formatEffectKey,
  formatEffectValue,
  formatTalentLabel,
} from './formatters'
import type { StatMetadataEntry } from '@/types/consumables'

const statMetadata: Record<string, StatMetadataEntry> = {
  'BaseMaximumHealth_+': { display_name: 'Max Health', categories: ['Health'] },
  'BaseMaximumStamina_+': { display_name: 'Max Stamina', categories: ['Stamina'] },
  'BaseFoodStomachSlots_+': { display_name: 'Consumes Space in Stomach', categories: ['Consumption'] },
}

describe('formatBuffLabel', () => {
  it('returns abbreviated label when mapping exists', () => {
    expect(formatBuffLabel('Chance to find additional Stone while Mining')).toBe(
      "Add'l Stone while Mining",
    )
    expect(formatBuffLabel('Experience Gained for Tamed Creatures')).toBe('Exp. Gain for Tames')
    expect(formatBuffLabel('Chance to Return Melee Physical Damage to Attacker')).toBe(
      'Reflect Melee Damage',
    )
    expect(formatBuffLabel('Melee Physical Damage Returned')).toBe('Melee Damage Returned')
  })

  it('returns original label when no mapping exists', () => {
    expect(formatBuffLabel('Max Health')).toBe('Max Health')
    expect(formatBuffLabel('Food Effects Duration')).toBe('Food Effects Duration')
  })
})

describe('formatLifetime', () => {
  it('returns "Instant" for 0 seconds', () => {
    expect(formatLifetime(0)).toBe('Instant')
  })

  it('formats sub-minute durations with seconds', () => {
    expect(formatLifetime(45)).toBe('45s')
  })

  it('formats exact minutes without seconds', () => {
    expect(formatLifetime(300)).toBe('5 min')
    expect(formatLifetime(900)).toBe('15 min')
    expect(formatLifetime(1800)).toBe('30 min')
  })

  it('formats minutes with leftover seconds', () => {
    expect(formatLifetime(90)).toBe('1 min 30s')
    expect(formatLifetime(125)).toBe('2 min 5s')
  })
})

describe('formatEffectKey', () => {
  it('uses stats display_name when available', () => {
    expect(formatEffectKey('BaseMaximumHealth_+', statMetadata)).toBe('Max Health')
    expect(formatEffectKey('BaseMaximumStamina_+', statMetadata)).toBe('Max Stamina')
  })

  it('derives label from CamelCase key when not in stats', () => {
    expect(formatEffectKey('BaseHealthRegen_+%', statMetadata)).toBe('Health Regen')
    expect(formatEffectKey('BaseStaminaRegen_+%', statMetadata)).toBe('Stamina Regen')
    expect(formatEffectKey('BaseExperience_+%', statMetadata)).toBe('Experience')
  })

  it('strips Granted prefix when deriving', () => {
    expect(formatEffectKey('GrantedAuraTamingSpeed_?', statMetadata)).toBe('Aura Taming Speed')
  })

  it('abbreviates long stat display_name via formatBuffLabel', () => {
    const longStatMeta: Record<string, StatMetadataEntry> = {
      'SomeStat_+': {
        display_name: 'Experience Gained for Tamed Creatures',
        categories: ['Taming'],
      },
    }
    expect(formatEffectKey('SomeStat_+', longStatMeta)).toBe('Exp. Gain for Tames')
  })
})

describe('formatEffectValue', () => {
  it('formats percent keys as percentage strings', () => {
    expect(formatEffectValue('BaseHealthRegen_+%', 20)).toBe('+20%')
    expect(formatEffectValue('BaseExperience_+%', 5)).toBe('+5%')
    expect(formatEffectValue('BaseStaminaRegen_+%', 100)).toBe('+100%')
  })

  it('formats absolute keys as plain integers', () => {
    expect(formatEffectValue('BaseMaximumHealth_+', 75)).toBe('+75')
    expect(formatEffectValue('BaseFoodStomachSlots_+', 1)).toBe('+1')
  })

  it('prepends minus for negative values', () => {
    expect(formatEffectValue('BaseMaximumHealth_+', -50)).toBe('-50')
    expect(formatEffectValue('BaseHealthRegen_+%', -10)).toBe('-10%')
  })
})

describe('formatTalentLabel', () => {
  it('replaces underscores with spaces', () => {
    expect(formatTalentLabel('Glass_Jar_Jam')).toBe('Glass Jar Jam')
    expect(formatTalentLabel('Workshop_Food')).toBe('Workshop Food')
  })

  it('handles keys with no underscores', () => {
    expect(formatTalentLabel('Cooking')).toBe('Cooking')
  })
})
