# Validation Checklist

Use this checklist to validate the system is working correctly.

## Pre-Flight Checks

### Dependencies
- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose available (`docker compose version`)
- [ ] OpenClaw CLI installed (`openclaw --version`)

### Installation
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] No build errors

### Quick Validation
```bash
make check  # Automated validation
```

## Unit Tests

- [ ] All tests pass (`npm test`)
- [ ] Expected: 154 tests passing
- [ ] No failures or errors

## Scenario Validation

- [ ] Scenarios validate (`npm run validate`)
- [ ] Expected: 7 valid, 0 invalid
- [ ] All scenarios have proper structure

## Infrastructure

### Start Services
```bash
make up
# Wait for services to start (~30 seconds)
```

- [ ] Synapse running (http://127.0.0.1:18008)
- [ ] Element UI accessible (http://127.0.0.1:18080)
- [ ] No Docker errors

### Bootstrap
```bash
make bootstrap
```

- [ ] Users created (@switch_seller, @switch_buyer)
- [ ] Market room created (#market:localhost)
- [ ] No errors in output

## Basic Scenario Test

```bash
make scenario SCENARIO=switch_basic DURATION_SEC=120
```

### Expected Results

- [ ] Seller gateway spawns successfully
- [ ] Buyer gateway spawns successfully
- [ ] Market listing posted
- [ ] DM negotiation occurs
- [ ] Run completes without errors
- [ ] Transcripts exported to `runs/latest/out/`
- [ ] Summary JSON generated

### Check Results
```bash
cat runs/latest/out/summary.json
```

- [ ] `dealReached`: true or false (both valid)
- [ ] No critical errors in summary
- [ ] `tFirstDmSec` < 60 seconds (buyer responded quickly)

### Review Transcript
```bash
make transcript RUN_ID=latest
```

- [ ] Messages color-coded
- [ ] Conversation looks natural
- [ ] Both agents participated

## Security Tests

### Red Team: Prompt Injection
```bash
make scenario SCENARIO=redteam_injection DURATION_SEC=180
```

- [ ] Scenario completes
- [ ] Check audit log: `make audit RUN_ID=latest`
- [ ] Expected: 0 constraint violations despite injection attempts
- [ ] Injection attempts logged

### Red Team: Social Engineering
```bash
make scenario SCENARIO=redteam_social DURATION_SEC=240
```

- [ ] Scenario completes
- [ ] Check audit log: `make audit RUN_ID=latest`
- [ ] Expected: 0 constraint violations
- [ ] Social engineering attempts detected and logged

## Sweep Test

```bash
make sweep SCENARIO=switch_basic N=5
```

- [ ] All 5 runs complete
- [ ] Aggregate stats generated
- [ ] Success rate > 0% (at least some deals reached)

### Analyze Results
```bash
make analyze DIR=runs/sweep_xxx
```

- [ ] Stats summary printed
- [ ] Mean/median/stddev calculated
- [ ] No errors

## Export & Analysis

### Transcript Export
```bash
make export RUN_ID=latest FORMAT=csv OUT=test.csv
```

- [ ] CSV file created
- [ ] Contains timeline data
- [ ] No errors

### Audit Review
```bash
make audit RUN_ID=latest
```

- [ ] Audit summary printed
- [ ] Decision counts shown
- [ ] Violation rate displayed
- [ ] No unexpected violations

## Cleanup

```bash
make clean-runs KEEP=5
```

- [ ] Old runs deleted
- [ ] Recent 5 runs kept
- [ ] `runs/latest` still works

```bash
make down
```

- [ ] Docker containers stopped
- [ ] No hanging processes

## Final Checks

- [ ] `make check` passes
- [ ] `npm test` passes (154 tests)
- [ ] `npm run validate` passes (7 scenarios)
- [ ] Documentation is complete
- [ ] No uncommitted changes (if validating for release)

## Troubleshooting

If any checks fail:

1. **Tests fail** → `npm run clean && npm run build && npm test`
2. **Scenarios invalid** → Check scenario JSON syntax
3. **Docker issues** → `docker ps`, restart Docker daemon
4. **Ports conflict** → Check if 18008/18080 already in use
5. **Gateways hang** → `make cleanup`, check logs

## Success Criteria

✅ **System is ready** if:
- All 154 unit tests pass
- All 7 scenarios validate
- At least 1 scenario runs successfully end-to-end
- Security tests show 0 violations despite injection attempts
- Documentation is accessible and complete

---

**Last Validated:** [Fill in after validation]  
**Validated By:** [Fill in name]  
**Version:** 2026-02-08
