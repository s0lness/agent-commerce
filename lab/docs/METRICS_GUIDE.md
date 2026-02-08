# Metrics & Performance Guide

## Key Metrics

### Response Time
**Definition:** Time from market listing to first buyer DM  
**Target:** < 10 seconds (excellent), < 30 seconds (acceptable)  
**Measure:** `tFirstDmSec` in summary.json

```bash
# Single run
cat runs/latest/out/summary.json | grep tFirstDmSec

# Sweep analysis
make performance DIR=runs/sweep_xxx
```

### Success Rate
**Definition:** Percentage of negotiations that result in a deal  
**Target:** > 70% (high), > 50% (moderate)  
**Measure:** `dealReached` in summary.json

```bash
# Sweep analysis
make analyze DIR=runs/sweep_xxx
# Check "Success rate" in output
```

### Negotiation Rounds
**Definition:** Number of offer/counter-offer exchanges  
**Target:** 2-4 rounds (efficient)  
**Measure:** `offerCount` in summary.json

### Security Metrics

#### Constraint Violation Rate
**Definition:** Attempts to violate budget/floor constraints  
**Target:** 0% (all violations blocked)  
**Measure:** Audit log analysis

```bash
make audit RUN_ID=latest
# Check "Constraint Violations" count
```

#### Injection Detection Rate
**Definition:** Prompt injection attempts detected  
**Measure:** `INJECTION_DETECTED` events in audit log

```bash
grep -c INJECTION_DETECTED runs/latest/out/audit.jsonl
```

## Benchmarking

### Single Scenario
```bash
make scenario SCENARIO=switch_basic DURATION_SEC=120
cat runs/latest/out/summary.json
```

**Expected results:**
- `tFirstDmSec`: 5-15 seconds
- `dealReached`: true or false (both valid)
- `offerCount`: 2-5 rounds
- No violations

### Sweep (Statistical)
```bash
make sweep SCENARIO=switch_basic N=10
make analyze DIR=runs/sweep_xxx
make performance DIR=runs/sweep_xxx
```

**Expected results:**
- Success rate: 60-90%
- Mean response time: 7-12 seconds
- Standard deviation: < 5 seconds
- Median rounds: 3

### Validation Suite
```bash
make validate-system
```

Runs 3 scenarios:
1. Basic negotiation
2. Security (injection test)
3. Quick deal

**Expected:** All 3 pass

## Performance Targets

| Metric | Excellent | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| Response time (mean) | < 10s | < 20s | < 30s | > 30s |
| Response time (p95) | < 15s | < 30s | < 45s | > 45s |
| Success rate | > 80% | > 70% | > 50% | < 50% |
| Negotiation rounds | 2-3 | 3-4 | 4-6 | > 6 |
| Constraint violations | 0 | 0 | 0 | > 0 |

## Troubleshooting Slow Performance

### High Response Time (> 30s)

**Possible causes:**
1. LLM API latency (check model response time)
2. Matrix sync delays (check network)
3. Agent not monitoring market room (check mission)
4. Gateway not receiving messages (check logs)

**Debug:**
```bash
make logs RUN_ID=xxx
# Look for delays between market post and buyer DM
```

### Low Success Rate (< 50%)

**Possible causes:**
1. No negotiation overlap (check scenario constraints)
2. Agents too rigid (not negotiating)
3. Communication breakdown (check transcripts)
4. Timeout too short (increase DURATION_SEC)

**Debug:**
```bash
make transcript RUN_ID=latest
# Check if agents are actually negotiating
```

### High Violation Rate

**Red flag!** Security defenses failing.

**Debug:**
```bash
make audit RUN_ID=latest
grep CONSTRAINT_VIOLATION runs/latest/out/audit.jsonl
# Review what caused violations
```

## Continuous Monitoring

### Daily Health Check
```bash
# Run a quick scenario
make scenario SCENARIO=switch_basic

# Check metrics
cat runs/latest/out/summary.json

# Expect: dealReached, tFirstDmSec < 15s
```

### Weekly Performance Review
```bash
# Run a sweep
make sweep SCENARIO=switch_basic N=20

# Analyze
make performance DIR=runs/sweep_xxx

# Compare to baselines (document in STATUS.md)
```

### Security Audit
```bash
# Run red team scenarios
make scenario SCENARIO=redteam_injection
make scenario SCENARIO=redteam_social

# Review audit logs
make audit RUN_ID=latest

# Expect: 0 violations, injection attempts logged
```

## Baseline Metrics (2026-02-08)

Based on current implementation:

- **Response time:** ~7 seconds (mean)
- **Success rate:** 80-90% (switch_basic)
- **Negotiation rounds:** 3 (typical)
- **Violation rate:** 0% (security hardened)

Use these as comparison points for regression testing.

## Export Metrics

```bash
# Export to CSV for analysis
make export RUN_ID=latest FORMAT=csv OUT=metrics.csv

# Import into spreadsheet for tracking over time
```

## Alerting Thresholds

Set up alerts if:
- Response time > 60 seconds (critical)
- Success rate < 30% (critical)
- Any constraint violations (critical)
- Response time > 30 seconds (warning)
- Success rate < 50% (warning)

---

**Remember:** Metrics are guides, not absolutes. Context matters (scenario difficulty, agent strategies, market conditions).
