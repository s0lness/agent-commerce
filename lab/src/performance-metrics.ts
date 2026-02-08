/**
 * Performance metrics analysis for agent behavior validation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

export interface PerformanceMetrics {
  responseTime: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    fastest: number;
    slowest: number;
  };
  successRate: {
    total: number;
    successful: number;
    rate: number;
  };
  negotiationEfficiency: {
    avgRounds: number;
    avgPriceDiscount: number;
  };
}

export interface RunSummary {
  dealReached: boolean;
  finalPrice: number | null;
  metrics: {
    tFirstDmSec: number | null;
    offerCount: number;
  };
  violations: string[];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export async function analyzePerformance(runDirs: string[]): Promise<PerformanceMetrics> {
  const responseTimes: number[] = [];
  const discounts: number[] = [];
  const offerCounts: number[] = [];
  let successCount = 0;

  for (const dir of runDirs) {
    try {
      const summaryPath = join(dir, 'out', 'summary.json');
      const content = await readFile(summaryPath, 'utf-8');
      const summary: RunSummary = JSON.parse(content);

      // Response time
      if (summary.metrics?.tFirstDmSec && summary.metrics.tFirstDmSec > 0) {
        responseTimes.push(summary.metrics.tFirstDmSec);
      }

      // Success tracking
      if (summary.dealReached) {
        successCount++;
        
        // Offer count
        if (summary.metrics?.offerCount) {
          offerCounts.push(summary.metrics.offerCount);
        }

        // Price discount (if we had anchor price, we could calculate this)
        // For now, just track final prices
        if (summary.finalPrice) {
          // Placeholder - would need scenario context to calculate discount
        }
      }
    } catch {
      continue;
    }
  }

  const totalRuns = runDirs.length;

  return {
    responseTime: {
      mean: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      median: percentile(responseTimes, 50),
      p95: percentile(responseTimes, 95),
      p99: percentile(responseTimes, 99),
      fastest: Math.min(...responseTimes) || 0,
      slowest: Math.max(...responseTimes) || 0,
    },
    successRate: {
      total: totalRuns,
      successful: successCount,
      rate: totalRuns > 0 ? successCount / totalRuns : 0,
    },
    negotiationEfficiency: {
      avgRounds: offerCounts.reduce((a, b) => a + b, 0) / offerCounts.length || 0,
      avgPriceDiscount: 0, // Would need scenario context
    },
  };
}

export function formatPerformanceReport(metrics: PerformanceMetrics): string {
  let report = '# Performance Metrics\n\n';

  report += '## Response Time (seconds)\n';
  report += `- Mean: ${metrics.responseTime.mean.toFixed(2)}s\n`;
  report += `- Median: ${metrics.responseTime.median.toFixed(2)}s\n`;
  report += `- 95th percentile: ${metrics.responseTime.p95.toFixed(2)}s\n`;
  report += `- 99th percentile: ${metrics.responseTime.p99.toFixed(2)}s\n`;
  report += `- Fastest: ${metrics.responseTime.fastest.toFixed(2)}s\n`;
  report += `- Slowest: ${metrics.responseTime.slowest.toFixed(2)}s\n`;
  report += '\n';

  report += '## Success Rate\n';
  report += `- Total runs: ${metrics.successRate.total}\n`;
  report += `- Successful: ${metrics.successRate.successful}\n`;
  report += `- Rate: ${(metrics.successRate.rate * 100).toFixed(1)}%\n`;
  report += '\n';

  report += '## Negotiation Efficiency\n';
  report += `- Avg rounds: ${metrics.negotiationEfficiency.avgRounds.toFixed(1)}\n`;
  report += '\n';

  // Assessment
  report += '## Assessment\n';
  
  if (metrics.responseTime.mean < 10) {
    report += '- ✅ Excellent response time (< 10s average)\n';
  } else if (metrics.responseTime.mean < 30) {
    report += '- ⚠️  Acceptable response time (< 30s average)\n';
  } else {
    report += '- ❌ Slow response time (> 30s average)\n';
  }

  if (metrics.successRate.rate >= 0.7) {
    report += '- ✅ High success rate (>= 70%)\n';
  } else if (metrics.successRate.rate >= 0.5) {
    report += '- ⚠️  Moderate success rate (>= 50%)\n';
  } else {
    report += '- ❌ Low success rate (< 50%)\n';
  }

  return report;
}
