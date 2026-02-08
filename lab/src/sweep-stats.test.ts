import { describe, it, expect } from 'vitest';
import { analyzeSweep, formatStats, exportCSV, type SweepStats } from './sweep-stats.js';

describe('sweep-stats', () => {
  const mockStats: SweepStats = {
    totalRuns: 10,
    successful: 8,
    failed: 1,
    noDeal: 1,
    successRate: 0.8,
    
    prices: {
      mean: 145.5,
      median: 150,
      stdDev: 10.2,
      min: 130,
      max: 160,
      values: [130, 135, 140, 145, 150, 150, 155, 160],
    },
    
    responseTime: {
      mean: 7.5,
      median: 7.0,
      stdDev: 2.1,
      min: 5.2,
      max: 12.3,
      values: [5.2, 6.1, 7.0, 7.3, 7.8, 8.2, 9.1, 12.3],
    },
    
    offers: {
      mean: 3.2,
      median: 3,
      values: [2, 3, 3, 3, 4, 4],
    },
    
    violations: {
      'SELLER_BELOW_FLOOR:120': 2,
      'BUYER_ABOVE_CEILING:180': 1,
    },
  };

  describe('formatStats', () => {
    it('should format stats as markdown', () => {
      const output = formatStats(mockStats);
      expect(output).toContain('# Sweep Statistics');
      expect(output).toContain('Total runs: 10');
      expect(output).toContain('Successful: 8 (80.0%)');
      expect(output).toContain('Mean: 145.50');
      expect(output).toContain('SELLER_BELOW_FLOOR:120: 2');
    });

    it('should handle empty stats gracefully', () => {
      const emptyStats: SweepStats = {
        totalRuns: 0,
        successful: 0,
        failed: 0,
        noDeal: 0,
        successRate: 0,
        prices: { mean: null, median: null, stdDev: null, min: null, max: null, values: [] },
        responseTime: { mean: null, median: null, stdDev: null, min: null, max: null, values: [] },
        offers: { mean: null, median: null, values: [] },
        violations: {},
      };
      
      const output = formatStats(emptyStats);
      expect(output).toContain('Total runs: 0');
      expect(output).not.toContain('Mean:');
    });
  });

  describe('exportCSV', () => {
    it('should export data as CSV', () => {
      const csv = exportCSV(mockStats);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('run_index,final_price,response_time_sec,offer_count');
      expect(lines[1]).toBe('1,130,5.2,2');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should handle missing values', () => {
      const sparseStats: SweepStats = {
        ...mockStats,
        prices: { ...mockStats.prices, values: [150] },
        responseTime: { ...mockStats.responseTime, values: [7.5, 8.2] },
        offers: { ...mockStats.offers, values: [] },
      };
      
      const csv = exportCSV(sparseStats);
      const lines = csv.split('\n');
      
      expect(lines[1]).toBe('1,150,7.5,');
      expect(lines[2]).toBe('2,,8.2,');
    });
  });
});
