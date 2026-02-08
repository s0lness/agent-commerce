import { describe, it, expect } from 'vitest';
import { validateScenario, type ScenarioSchema } from './scenario-schema.js';

describe('validateScenario', () => {
  const validScenario: ScenarioSchema = {
    name: 'test_scenario',
    item: 'Nintendo Switch',
    marketRoomAlias: '#market:localhost',
    seller: {
      profile: 'seller-1',
      anchorPrice: 200,
      floorPrice: 150,
    },
    buyer: {
      profile: 'buyer-1',
      startOffer: 120,
      ceilingPrice: 180,
    },
    durationSec: 120,
    seed: {
      bodyTemplate: 'RUN_ID:{RUN_ID} SELLING: item. DM me.',
    },
  };

  it('should accept valid scenario', () => {
    const result = validateScenario(validScenario);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing name', () => {
    const invalid = { ...validScenario, name: undefined };
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('should reject invalid seller prices', () => {
    const invalid = { ...validScenario, seller: { ...validScenario.seller, anchorPrice: -100 } };
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'seller.anchorPrice')).toBe(true);
  });

  it('should reject seller floor > anchor', () => {
    const invalid = {
      ...validScenario,
      seller: { profile: 'test', anchorPrice: 100, floorPrice: 150 },
    };
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'seller.floorPrice')).toBe(true);
  });

  it('should reject buyer start > ceiling', () => {
    const invalid = {
      ...validScenario,
      buyer: { profile: 'test', startOffer: 200, ceilingPrice: 150 },
    };
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'buyer.startOffer')).toBe(true);
  });

  it('should warn when no negotiation overlap', () => {
    const noOverlap = {
      ...validScenario,
      seller: { profile: 'test', anchorPrice: 200, floorPrice: 180 },
      buyer: { profile: 'test', startOffer: 100, ceilingPrice: 150 },
    };
    const result = validateScenario(noOverlap);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'negotiation')).toBe(true);
  });

  it('should accept overlapping negotiation zones', () => {
    const overlap = {
      ...validScenario,
      seller: { profile: 'test', anchorPrice: 200, floorPrice: 140 },
      buyer: { profile: 'test', startOffer: 120, ceilingPrice: 160 },
    };
    const result = validateScenario(overlap);
    expect(result.valid).toBe(true);
  });

  it('should warn if bodyTemplate missing RUN_ID', () => {
    const invalid = {
      ...validScenario,
      seed: { bodyTemplate: 'SELLING: item. DM me.' }, // Missing {RUN_ID}
    };
    const result = validateScenario(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'seed.bodyTemplate')).toBe(true);
  });

  it('should warn for very long durations', () => {
    const longDuration = { ...validScenario, durationSec: 900 }; // 15 minutes
    const result = validateScenario(longDuration);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'durationSec')).toBe(true);
  });
});
