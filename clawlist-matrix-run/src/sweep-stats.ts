/**
 * Statistical analysis for sweep results
 * Computes aggregate metrics across multiple test runs
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export interface RunSummary {
  runId: string;
  result: 'pass' | 'fail' | 'no_deal';
  dealReached: boolean;
  finalPrice: number | null;
  tFirstDmSec: number | null;
  offerCount: number;
  violations: string[];
}

export interface SweepStats {
  totalRuns: number;
  successful: number;
  failed: number;
  noDeal: number;
  successRate: number;
  
  prices: {
    mean: number | null;
    median: number | null;
    stdDev: number | null;
    min: number | null;
    max: number | null;
    values: number[];
  };
  
  responseTime: {
    mean: number | null;
    median: number | null;
    stdDev: number | null;
    min: number | null;
    max: number | null;
    values: number[];
  };
  
  offers: {
    mean: number | null;
    median: number | null;
    values: number[];
  };
  
  violations: {
    [key: string]: number;
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values);
  if (avg === null) return null;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export async function analyzeSweep(sweepDir: string): Promise<SweepStats> {
  const entries = await readdir(sweepDir, { withFileTypes: true });
  const runDirs = entries.filter(e => e.isDirectory() && e.name.match(/^.+_\d+$/));
  
  const summaries: RunSummary[] = [];
  
  for (const dir of runDirs) {
    const summaryPath = join(sweepDir, dir.name, 'out', 'summary.json');
    try {
      const content = await readFile(summaryPath, 'utf-8');
      const data = JSON.parse(content);
      summaries.push({
        runId: data.runId || dir.name,
        result: data.result,
        dealReached: data.dealReached,
        finalPrice: data.finalPrice,
        tFirstDmSec: data.metrics?.tFirstDmSec,
        offerCount: data.metrics?.offerCount || 0,
        violations: data.violations || [],
      });
    } catch (err) {
      // Skip runs without summary.json
      continue;
    }
  }
  
  const successful = summaries.filter(s => s.result === 'pass');
  const failed = summaries.filter(s => s.result === 'fail');
  const noDeal = summaries.filter(s => s.result === 'no_deal');
  
  const prices = successful.map(s => s.finalPrice).filter((p): p is number => p !== null);
  const times = summaries.map(s => s.tFirstDmSec).filter((t): t is number => t !== null && t > 0);
  const offers = summaries.map(s => s.offerCount).filter(o => o > 0);
  
  const violationCounts: { [key: string]: number } = {};
  for (const summary of summaries) {
    for (const v of summary.violations) {
      violationCounts[v] = (violationCounts[v] || 0) + 1;
    }
  }
  
  return {
    totalRuns: summaries.length,
    successful: successful.length,
    failed: failed.length,
    noDeal: noDeal.length,
    successRate: summaries.length > 0 ? successful.length / summaries.length : 0,
    
    prices: {
      mean: mean(prices),
      median: median(prices),
      stdDev: stdDev(prices),
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null,
      values: prices,
    },
    
    responseTime: {
      mean: mean(times),
      median: median(times),
      stdDev: stdDev(times),
      min: times.length > 0 ? Math.min(...times) : null,
      max: times.length > 0 ? Math.max(...times) : null,
      values: times,
    },
    
    offers: {
      mean: mean(offers),
      median: median(offers),
      values: offers,
    },
    
    violations: violationCounts,
  };
}

export function formatStats(stats: SweepStats): string {
  let output = '# Sweep Statistics\n\n';
  
  output += `## Overview\n`;
  output += `- Total runs: ${stats.totalRuns}\n`;
  output += `- Successful: ${stats.successful} (${(stats.successRate * 100).toFixed(1)}%)\n`;
  output += `- Failed: ${stats.failed}\n`;
  output += `- No deal: ${stats.noDeal}\n\n`;
  
  if (stats.prices.mean !== null) {
    output += `## Final Prices (€)\n`;
    output += `- Mean: ${stats.prices.mean.toFixed(2)}\n`;
    output += `- Median: ${stats.prices.median?.toFixed(2) || 'N/A'}\n`;
    output += `- Std Dev: ${stats.prices.stdDev?.toFixed(2) || 'N/A'}\n`;
    output += `- Range: ${stats.prices.min} - ${stats.prices.max}\n\n`;
  }
  
  if (stats.responseTime.mean !== null) {
    output += `## Response Time (seconds)\n`;
    output += `- Mean: ${stats.responseTime.mean.toFixed(2)}\n`;
    output += `- Median: ${stats.responseTime.median?.toFixed(2) || 'N/A'}\n`;
    output += `- Std Dev: ${stats.responseTime.stdDev?.toFixed(2) || 'N/A'}\n`;
    output += `- Range: ${stats.responseTime.min?.toFixed(2)} - ${stats.responseTime.max?.toFixed(2)}\n\n`;
  }
  
  if (stats.offers.mean !== null) {
    output += `## Offer Count\n`;
    output += `- Mean: ${stats.offers.mean.toFixed(2)}\n`;
    output += `- Median: ${stats.offers.median?.toFixed(2) || 'N/A'}\n\n`;
  }
  
  if (Object.keys(stats.violations).length > 0) {
    output += `## Violations\n`;
    for (const [violation, count] of Object.entries(stats.violations).sort((a, b) => b[1] - a[1])) {
      output += `- ${violation}: ${count}\n`;
    }
    output += '\n';
  }
  
  return output;
}

export function exportCSV(stats: SweepStats): string {
  const headers = ['run_index', 'final_price', 'response_time_sec', 'offer_count'];
  const rows: string[] = [headers.join(',')];
  
  const maxLen = Math.max(
    stats.prices.values.length,
    stats.responseTime.values.length,
    stats.offers.values.length
  );
  
  for (let i = 0; i < maxLen; i++) {
    const row = [
      i + 1,
      stats.prices.values[i] ?? '',
      stats.responseTime.values[i] ?? '',
      stats.offers.values[i] ?? '',
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}
