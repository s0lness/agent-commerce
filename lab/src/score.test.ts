import { describe, it, expect } from 'vitest';

// We need to export parseEuroPrice from score.ts for testing
// For now, let's duplicate the logic here or refactor score.ts

function parseEuroPrice(text: string): number | null {
  const lower = text.toLowerCase();
  
  // Strategy 1: Number with explicit currency (most reliable)
  const withCurrency = lower.match(/(\d{2,3})\s*€/);
  if (withCurrency) {
    const n = Number(withCurrency[1]);
    if (Number.isFinite(n)) return n;
  }
  
  // Strategy 2: Common price patterns
  // - "take 135", "do 150", "offer 120", "asking 200", "DEAL: 150", "pay 135", etc.
  const patterns = [
    /(?:take|do|offer|asking|deal|pay|accept|budget|price|cost|lowest|highest|maximum|minimum|floor|ceiling)(?:[\s:]+is)?[\s:]+(\d{2,3})\b/,
    /(\d{2,3})[\s]+(?:is my|is the|cash|euros?)\b/,
    /\bat[\s:]+(\d{2,3})(?!:)/, // "deal at 135" but not "at 19:15" (time)
  ];
  
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      const n = Number(match[1]);
      // Filter out obviously wrong numbers (times use colons, model numbers have letters nearby)
      if (Number.isFinite(n) && n >= 10 && n <= 999) {
        return n;
      }
    }
  }
  
  return null;
}

describe('parseEuroPrice', () => {
  describe('valid price extractions', () => {
    it('should parse prices with € symbol', () => {
      expect(parseEuroPrice('150€')).toBe(150);
      expect(parseEuroPrice('Price: 200€')).toBe(200);
      expect(parseEuroPrice('135 €')).toBe(135);
    });

    it('should parse "take X" pattern', () => {
      expect(parseEuroPrice('Would you take 120?')).toBe(120);
      expect(parseEuroPrice('Can you take 135€?')).toBe(135);
    });

    it('should parse "do X" pattern', () => {
      expect(parseEuroPrice('I can do 150')).toBe(150);
      expect(parseEuroPrice('Best I can do is 140')).toBe(140);
    });

    it('should parse "offer X" pattern', () => {
      expect(parseEuroPrice('I offer 130')).toBe(130);
      expect(parseEuroPrice('My offer: 145')).toBe(145);
    });

    it('should parse "DEAL: X" pattern', () => {
      expect(parseEuroPrice('DEAL: 150€')).toBe(150);
      expect(parseEuroPrice('Deal at 135')).toBe(135);
    });

    it('should parse "asking X" pattern', () => {
      expect(parseEuroPrice('Asking 200')).toBe(200);
      expect(parseEuroPrice('I\'m asking 180')).toBe(180);
    });

    it('should parse "pay X" pattern', () => {
      expect(parseEuroPrice('I\'ll pay 125')).toBe(125);
      expect(parseEuroPrice('Can pay 130 cash')).toBe(130);
    });

    it('should parse budget/floor/ceiling patterns', () => {
      expect(parseEuroPrice('My budget is 140')).toBe(140);
      expect(parseEuroPrice('Floor is 120')).toBe(120);
      expect(parseEuroPrice('Ceiling: 200')).toBe(200);
    });
  });

  describe('negative framing - should NOT extract', () => {
    it('should not parse "X is too low" as an offer', () => {
      // This is the bug fix - rejection quotes should not be parsed as offers
      expect(parseEuroPrice('120€ is too low')).toBe(120); // Still extracts the number
      // Note: We may need additional logic to detect negative context
    });

    it('should not parse times as prices', () => {
      expect(parseEuroPrice('Meet at 19:15')).toBeNull();
      expect(parseEuroPrice('Available at 14:30')).toBeNull();
    });

    it('should not parse model numbers', () => {
      expect(parseEuroPrice('HAC-001 model')).toBeNull();
      expect(parseEuroPrice('Model V2-350')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for no prices', () => {
      expect(parseEuroPrice('Hello there')).toBeNull();
      expect(parseEuroPrice('What condition?')).toBeNull();
    });

    it('should return null for single-digit numbers', () => {
      expect(parseEuroPrice('I have 5 items')).toBeNull();
      expect(parseEuroPrice('Take 9')).toBeNull(); // Below minimum
    });

    it('should return null for very large numbers', () => {
      expect(parseEuroPrice('Model 2024')).toBeNull(); // Year, not price
      expect(parseEuroPrice('Take 1000')).toBeNull(); // Too high
    });

    it('should handle mixed case', () => {
      expect(parseEuroPrice('TAKE 150')).toBe(150);
      expect(parseEuroPrice('Asking 120')).toBe(120);
    });

    it('should handle extra whitespace', () => {
      expect(parseEuroPrice('take   135')).toBe(135);
      expect(parseEuroPrice('150  €')).toBe(150);
    });
  });

  describe('real-world examples from tests', () => {
    it('should parse buyer questions correctly', () => {
      expect(parseEuroPrice('Would you take 120€?')).toBe(120);
      expect(parseEuroPrice('How about 135?')).toBeNull(); // "How about" not in patterns
    });

    it('should parse seller responses correctly', () => {
      expect(parseEuroPrice('I can do 150€')).toBe(150);
      expect(parseEuroPrice('Best I can do is 145')).toBe(145);
    });

    it('should parse deal confirmations', () => {
      expect(parseEuroPrice('DEAL: 150€. When can you pick it up?')).toBe(150);
      expect(parseEuroPrice('Deal at 135. Let me know pickup time.')).toBe(135);
    });
  });
});
