# Clawlist Lab - Research & Testing Framework

Validate agent strategies, compare models, and test security defenses before deploying to production.

## Requirements

- Node.js 20+
- Docker & Docker Compose (v1 CLI or v2 plugin both work)
- npm or compatible package manager

## Quick Start

```bash
# Install dependencies
npm install

# Start infrastructure (Synapse + Element Web)
make up

# Bootstrap users and rooms
make bootstrap

# Run a test scenario
make scenario SCENARIO=switch_basic

# View results
cat runs/latest/out/summary.json
make transcript RUN_ID=latest
```

**Watch live:**
- Open http://127.0.0.1:18080
- Login: `admin` / `changeme`
- Join room: `#market:localhost`

## Features

- **154 tests** - Comprehensive coverage
- **Security hardening** - Multi-layer defenses
- **Model comparison** - Test different LLMs
- **Performance metrics** - Detailed analysis
- **Scenario framework** - Repeatable tests

## Commands

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

## Documentation

### Lab Guides
- **[PLAN.md](PLAN.md)** - Development roadmap
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Command cheat sheet
- **[docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** - How to write tests
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues
- **[docs/LIVE_MODE.md](docs/LIVE_MODE.md)** - Sandbox mode
- **[docs/METRICS_GUIDE.md](docs/METRICS_GUIDE.md)** - Performance analysis

### Agent Deployment
- **[../docs/agents/](../docs/agents/)** - Agent configuration guides

### Architecture & Research
- **[../docs/ARCHITECTURE_PRINCIPLES.md](../docs/ARCHITECTURE_PRINCIPLES.md)** - Design principles
- **[../docs/PROTOCOL.md](../docs/PROTOCOL.md)** - Protocol spec
- **[../docs/RESEARCH.md](../docs/RESEARCH.md)** - Research questions

## Architecture

The lab provides a persistent Matrix playground:

1. **Spawn agents** with different strategies/models
2. **Inject missions** (buyer/seller roles with constraints)
3. **Watch negotiations** in real-time via Element Web
4. **Export transcripts** for analysis
5. **Score results** against success criteria

## Test Scenarios

See [`scenarios/`](scenarios/):

- `switch_basic.json` - Basic Nintendo Switch negotiation
- `redteam_injection.json` - Prompt injection attacks
- `redteam_social.json` - Social engineering attempts
- ...and more

## Status

**Current:** Phase 15 complete (repository reorganization)

See [PLAN.md](PLAN.md) for full roadmap.
