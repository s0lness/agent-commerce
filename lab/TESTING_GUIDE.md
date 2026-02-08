# Testing Guide

## Quick Start

```bash
# 1. Build
npm run build

# 2. Start infrastructure
make up
make bootstrap

# 3. Run a basic scenario
make scenario SCENARIO=switch_basic

# 4. Check results
cat runs/latest/out/summary.json
```

## Test Suites

### Unit Tests (105 tests)

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:ui            # Interactive UI
```

**Coverage:**
- Price parsing: 19 tests
- Schema validation: 9 tests
- Statistics: 4 tests
- Structured logging: 5 tests
- Constraints: 23 tests
- Audit logging: 7 tests
- Security integration: 8 tests
- Sweep stats: 4 tests

### Scenario Validation

```bash
npm run validate           # Validate all scenario configs
```

Checks:
- Required fields present
- Price ranges valid
- Negotiation overlap exists
- Template includes RUN_ID

### Integration Tests (Scenarios)

#### Basic Scenarios

```bash
# Simple negotiation
make scenario SCENARIO=switch_basic DURATION_SEC=120

# Aggressive lowball
make scenario SCENARIO=switch_aggressive DURATION_SEC=180

# Patient flexible
make scenario SCENARIO=switch_patient DURATION_SEC=240

# Different items
make scenario SCENARIO=macbook_basic DURATION_SEC=180
make scenario SCENARIO=iphone_quick_deal DURATION_SEC=90
```

#### Security Tests (Red Team)

```bash
# Test prompt injection defenses
make scenario SCENARIO=redteam_injection DURATION_SEC=180

# Test social engineering defenses
make scenario SCENARIO=redteam_social DURATION_SEC=240

# Review security audit
make audit RUN_ID=latest
```

**Expected Results:**
- Zero budget/floor violations
- All injection attempts logged
- Constraints enforced despite manipulation

### Batch Testing (Sweeps)

```bash
# Run 10 iterations
make sweep SCENARIO=switch_basic N=10

# Analyze results
make analyze DIR=runs/sweep_xxx

# Check success rate
cat runs/sweep_xxx/sweep-stats.md
```

**Target Metrics:**
- Success rate: >80%
- Mean response time: <10 seconds
- Price within negotiation zone

## Analysis & Debugging

### View Transcripts

```bash
# Pretty-print DM transcript
make transcript RUN_ID=latest

# Filter for specific keywords
make transcript RUN_ID=latest FILTER=DEAL

# Export to CSV
make export RUN_ID=latest FORMAT=csv OUT=transcript.csv
```

### Security Audit

```bash
# Generate audit summary
make audit RUN_ID=latest

# Check for violations
grep CONSTRAINT_VIOLATION runs/latest/out/audit.jsonl

# Check for injection attempts
grep INJECTION_DETECTED runs/latest/out/audit.jsonl
```

### Logs

```bash
# Tail gateway logs
make logs RUN_ID=latest

# View specific agent logs
tail -f runs/latest/out/gateway_buyer*.log
```

## Validation Checklist

Before committing changes:

- [ ] `npm test` passes (105 tests)
- [ ] `npm run validate` passes (all scenarios)
- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] Run at least one scenario successfully
- [ ] Check audit log has no violations

## Continuous Integration

If setting up CI:

```yaml
# .github/workflows/test.yml
- run: npm install
- run: npm run build
- run: npm test
- run: npm run validate
```

**Note:** Full scenario tests require Matrix infrastructure (Docker), so CI would only run unit tests unless you set up a test instance.

## Performance Benchmarks

### Target Metrics

| Metric | Target | Command |
|--------|--------|---------|
| Unit tests | <5s | `npm test` |
| Build | <10s | `npm run build` |
| Scenario (120s) | <140s total | `make scenario SCENARIO=switch_basic` |
| Sweep (N=10) | <25min | `make sweep N=10` |

### Bottlenecks

- **Agent response time:** Depends on LLM API latency
- **Matrix sync:** Network-bound
- **Export/score:** I/O-bound (reading JSONLs)

## Troubleshooting

### Tests failing

```bash
# Check for port conflicts
ss -ltn | grep 18008

# Rebuild
npm run clean
npm run build
npm test
```

### Scenario hangs

```bash
# Check gateway logs
make logs RUN_ID=xxx

# Check if gateways are running
ps aux | grep openclaw

# Clean up stuck processes
make cleanup
```

### No deal reached

Check transcript for issues:
```bash
make transcript RUN_ID=latest
cat runs/latest/out/summary.json
```

Common causes:
- Buyer/seller constraints have no overlap
- Agent not receiving messages
- Response timeout

## Best Practices

1. **Always validate scenarios** before running sweeps
2. **Check audit logs** after security tests
3. **Use runs/latest** for quick access to recent results
4. **Clean old runs** periodically: `make clean-runs KEEP=10`
5. **Review transcripts** when debugging unexpected outcomes

## Advanced Testing

### Custom Scenarios

1. Create `scenarios/custom.json`
2. Validate: `npm run validate`
3. Run: `make scenario SCENARIO=custom`

### Multi-Agent Tests

Not yet implemented. Future: multiple buyers competing, multiple sellers, etc.

### Stress Testing

```bash
# Run many scenarios in parallel (be careful with rate limits)
for i in {1..5}; do
  make scenario SCENARIO=switch_basic &
done
wait
```

---

**Remember:** Red team scenarios are critical for security validation. Run them regularly!
