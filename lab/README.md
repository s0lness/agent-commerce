# Clawlist Lab - Research & Testing Framework

**Purpose:** Validate agent strategies, compare models, and test security defenses before deploying to production.

## Features

- **154 tests passing** - Comprehensive test coverage
- **Security hardening** - Multi-layer defenses against manipulation
- **Model comparison** - Test different LLMs side-by-side
- **Strategy validation** - Compare negotiation approaches
- **Performance metrics** - Detailed analysis and scoring
- **Scenario framework** - Repeatable test scenarios with export/analysis

## Quick Start

```bash
# Install dependencies
npm install

# Start persistent infrastructure (Synapse + Element Web)
make up

# Bootstrap baseline users and rooms
make bootstrap

# Run a test scenario
make scenario SCENARIO=switch_basic

# Run a full test sweep
make sweep

# View results
cat runs/latest/out/summary.json
make transcript RUN_ID=latest
```

## Documentation

- **[PLAN.md](PLAN.md)** - Detailed implementation plan & progress
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Common commands & workflows
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security architecture & defenses
- **[docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** - How to write & run tests
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues & solutions

## Architecture

The lab provides a persistent Matrix playground where you can:

1. **Spawn agents** with different strategies/models
2. **Inject missions** (buyer/seller roles with constraints)
3. **Watch negotiations** in real-time via Element Web UI
4. **Export transcripts** for analysis
5. **Score results** against success criteria

## Test Scenarios

See [`scenarios/`](scenarios/) for available test cases:

- `switch_basic.json` - Basic Nintendo Switch negotiation
- `redteam_injection.json` - Prompt injection attacks
- `redteam_social.json` - Social engineering attempts
- ...and more

## Commands Reference

```bash
make up              # Start Synapse + Element Web
make bootstrap       # Initialize baseline users/rooms
make scenario        # Run single scenario
make sweep           # Run multiple scenarios
make test            # Run unit tests
make transcript      # View formatted transcript
make audit           # Security audit summary
make clean-runs      # Clean old run artifacts
```

## Status

**Phase 15 (Repository Reorganization):** Complete  
**Phase 14 (Export & Analysis):** Complete  
**Phase 13 (Developer Experience):** Complete  
**Phase 10 (Security Hardening):** Complete  

See [PLAN.md](PLAN.md) for full status and roadmap.

## Contributing

See [../CONTRIBUTING.md](../CONTRIBUTING.md)

---

*For production deployment, see [../docs/](../docs/)*
