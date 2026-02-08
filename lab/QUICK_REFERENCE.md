# Quick Reference

## Common Commands

```bash
# Build & Test
npm run build
npm test

# Infrastructure
make up           # Start Synapse + Element
make bootstrap    # Create users + rooms
make down         # Stop infrastructure

# Run Tests
make scenario SCENARIO=switch_basic
make sweep SCENARIO=switch_basic N=10
make audit RUN_ID=latest

# Analysis
make transcript RUN_ID=latest FILTER=DEAL
make export RUN_ID=latest FORMAT=csv
make analyze DIR=runs/sweep_xxx

# Cleanup
make clean-runs KEEP=10
```

## File Locations

- **Scenarios:** `scenarios/*.json`
- **Run outputs:** `runs/<runId>/out/`
- **Transcripts:** `runs/<runId>/out/{dm,market}.jsonl`
- **Summaries:** `runs/<runId>/out/summary.json`
- **Audit logs:** `runs/<runId>/out/audit.jsonl`
- **Latest run:** `runs/latest/`

## Test Coverage

- **Total:** 105 tests
- **Price parsing:** 19 tests
- **Schema validation:** 9 tests
- **Statistics:** 4 tests
- **Logging:** 5 tests
- **Constraints:** 23 tests
- **Audit:** 7 tests
- **Security integration:** 8 tests

## Scenarios Available

1. `switch_basic` - Basic Nintendo Switch negotiation
2. `switch_aggressive` - Firm seller, aggressive lowball buyer
3. `switch_patient` - Flexible seller, patient buyer
4. `macbook_basic` - MacBook Air M1 negotiation
5. `iphone_quick_deal` - Quick iPhone sale
6. `redteam_injection` - Prompt injection security test
7. `redteam_social` - Social engineering security test

## Security Checklist

- [ ] Constraints defined in scenario
- [ ] Hard budget/floor enforced
- [ ] Audit logging enabled
- [ ] Red team tested
- [ ] Audit log reviewed
- [ ] Zero violations confirmed

## Debugging

```bash
# Check logs
make logs RUN_ID=xxx

# View transcript
make transcript RUN_ID=latest

# Check for violations
grep VIOLATION runs/latest/out/audit.jsonl

# Security review
make audit RUN_ID=latest
```

## Documentation

- **README.md** - Overview & setup
- **PLAN.md** - Engineering roadmap
- **RESEARCH.md** - Research agenda
- **docs/SECURITY.md** - Security guide
- **SECURITY_SUMMARY.md** - Security features
- **PRODUCTION.md** - Deployment blueprint

## Links

- **Element UI:** http://127.0.0.1:18080
- **Synapse:** http://127.0.0.1:18008
- **Docs:** See `docs/` directory

---

**Status:** 105 tests passing, 7 scenarios, Phases 10-14 operational
