# Clawlist Matrix Lab - Agent Negotiation Test Harness

**TypeScript-based test framework for autonomous AI agent marketplace negotiation.**

## Recent Updates (2026-02-08)

✅ **Phase 11-14 Complete:**
- 67 unit tests passing (price parsing, schema validation, statistics, logging)
- Statistical sweep analysis (mean/median/stddev, CSV export)
- Structured logging system (DEBUG/INFO/WARN/ERROR levels, JSON mode)
- Scenario schema validation
- Transcript viewer CLI (color-coded, filterable)
- Enhanced export CLI (filter by agent/date/format)
- Proactive DM monitoring for operator bot
- Decision consistency rules to prevent agent flip-flopping
- 5 diverse scenarios available

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start Matrix infrastructure (Synapse + Element)
make up

# Bootstrap users and market room
make bootstrap

# Run a test scenario
make scenario SCENARIO=switch_basic DURATION_SEC=120

# View results
cat runs/latest/out/summary.json
```

## Infrastructure

- **Synapse**: http://127.0.0.1:18008 (Matrix homeserver)
- **Element UI**: http://127.0.0.1:18080 (web client to watch live)

## Core Commands

### Setup
```bash
make build         # Compile TypeScript
make up            # Start Synapse + Element
make down          # Stop infrastructure
make bootstrap     # Create users + #market:localhost room
```

### Testing
```bash
make test          # Run unit tests (67 tests)
make validate      # Validate scenario schemas
make scenario SCENARIO=switch_basic DURATION_SEC=120
make sweep SCENARIO=switch_basic N=10
```

### Analysis & Debugging
```bash
make analyze DIR=runs/sweep_xxx       # Statistical analysis of sweep results
make transcript RUN_ID=latest FILTER=DEAL  # Pretty-print transcript (color-coded)
make export RUN_ID=latest FORMAT=csv  # Export to JSONL/JSON/CSV
make logs RUN_ID=xxx                  # Tail run logs
```

### Cleanup
```bash
make clean-runs KEEP=10    # Delete old runs, keep 10 most recent
make cleanup               # Stop stuck gateways (if needed)
```

## Test Modes

### 1. Scenario Testing (Automated)
Run predefined negotiation scenarios between two AI agents.

```bash
make scenario SCENARIO=switch_basic
```

**What happens:**
1. Spawns seller + buyer agents with constraints
2. Seller posts listing to #market:localhost
3. Buyer sees listing, initiates DM negotiation
4. Agents negotiate autonomously
5. After DURATION_SEC, stops and exports transcripts
6. Scores results (deal success, price violations, quality)

**Scenarios available:**
- `scenarios/switch_basic.json` - Nintendo Switch negotiation

### 2. Batch Testing (Sweeps)
Run multiple scenarios to measure success rate.

```bash
make sweep SCENARIO=switch_basic N=10
```

**Output:**
- Individual runs: `runs/<sweepId>_1/`, `runs/<sweepId>_2/`, etc.
- Aggregate stats: `runs/<sweepId>/aggregate.json`

### 3. Live Sandbox Mode
Persistent marketplace with multiple agent sellers/buyers.

```bash
make live-start POPULATE=8           # Start + populate market
make live-agents-start SELLERS=3 BUYERS=2  # Spawn behavioral agents
make live-status                     # Check health
make live-stop                       # Shutdown
```

**Not yet migrated to TypeScript** - uses bash scripts in `lab/live_*.sh`

### 4. Operator Bot (Telegram ↔ Matrix Bridge)
Run the operator bot to control a Matrix agent via Telegram.

```bash
./lab/operator_up.sh              # Start operator gateway
./lab/operator_matrix_setup.sh    # Configure Matrix user
./lab/operator_dm_monitor.sh --loop  # Proactive DM notifications
```

**Features:**
- Send Matrix messages via Telegram
- Receive Matrix DM notifications in Telegram
- Control agent behavior from mobile

**Proactive DM Monitoring:**
```bash
# One-time check
./lab/operator_dm_monitor.sh

# Continuous monitoring (60s interval)
./lab/operator_dm_monitor.sh --loop
```

When new Matrix DMs arrive, you'll get a Telegram notification:
```
📬 New Matrix DM from @switch_buyer:localhost:

Hey, still available? Would you take 120€?

(Check full DM in Matrix)
```

### 5. Human-Seeded Mode
You play the seller via Telegram, agent plays buyer.

```bash
make human-seller DURATION_SEC=300
```

**Not yet migrated to TypeScript** - uses `lab/run_human_seeded_seller.sh`

## Test Analysis Workflow

**For each test run:**

1. **Run test**: `make scenario SCENARIO=switch_basic`
2. **Review results**: `cat runs/latest/out/summary.json`
3. **Analyze behavior**: Copy `docs/TEST_TEMPLATE.md` → `runs/<runId>/ANALYSIS.md`
4. **Document findings**:
   - ✅ What agents did well
   - ❌ Problems & stuck points
   - 🔍 Behavioral patterns
   - 💡 Improvement recommendations
   - 🧪 Hypotheses for next tests
5. **Track issues**: Add bugs to ISSUES.md → tasks in PLAN.md
6. **Iterate**: Run next test based on insights

**See**: `docs/TEST_TEMPLATE.md` for full analysis structure

---

## Output Structure

Each test run produces artifacts in `runs/<runId>/out/`:

```
runs/<runId>/out/
├── meta.json           # Run metadata (dmRoomId, agent MXIDs)
├── market.jsonl        # Market room transcript
├── dm.jsonl            # DM room transcript
├── summary.json        # Scoring results
├── gateway_*.log       # Agent gateway logs
└── gateway_*.pid       # Process IDs
```

### Summary Fields
```json
{
  "runId": "test_183909",
  "result": "pass|fail|no_deal",
  "dealReached": true,
  "finalPrice": 135,
  "violations": [],
  "metrics": {
    "offerCount": 5,
    "tFirstDmSec": 7,
    "humanIntervention": false
  },
  "quality": {
    "condition": true,
    "accessories": true,
    "logistics": true
  }
}
```

## Architecture

### TypeScript Modules

```
src/
├── common.ts          # Utilities (ports, env, exec, retry)
├── matrix-api.ts      # Matrix client v3 (typed)
├── openclaw.ts        # OpenClaw CLI wrapper
├── gateway.ts         # Gateway lifecycle management
├── docker.ts          # Docker Compose orchestration
├── scenario.ts        # Scenario loading + mission generation
├── bootstrap.ts       # User/room bootstrap
├── dm-room.ts         # Per-run DM room creation
├── export.ts          # Transcript export (Matrix → JSONL)
├── score.ts           # Evaluation scoring
├── run-scenario.ts    # Main orchestrator (CLI)
└── sweep.ts           # Batch testing (CLI)
```

### CLI Entry Points

```
dist/
├── cli-up.js          # make up
├── cli-down.js        # make down
├── cli-bootstrap.js   # make bootstrap
├── run-scenario.js    # make scenario
└── sweep.js           # make sweep
```

## Development

### Building
```bash
npm run build          # Compile TS → JS
npm run watch          # Auto-recompile on changes
npm run clean          # Delete dist/
```

### Adding a Scenario

Create `scenarios/<name>.json`:
```json
{
  "name": "iphone_basic",
  "item": "iPhone 13",
  "marketRoomAlias": "#market:localhost",
  "seller": {
    "profile": "switch-seller",
    "anchorPrice": 400,
    "floorPrice": 350
  },
  "buyer": {
    "profile": "switch-buyer",
    "startOffer": 300,
    "ceilingPrice": 380
  },
  "durationSec": 120,
  "seed": {
    "bodyTemplate": "RUN_ID:{RUN_ID} SELLING: iPhone 13 — asking 400€. DM me."
  }
}
```

Then run:
```bash
make scenario SCENARIO=iphone_basic
```

## Troubleshooting

### Synapse won't start
```bash
# Check if config exists
ls -la synapse-data2/homeserver.yaml

# If missing, regenerate
docker-compose -f infra/docker-compose.yml run --rm synapse generate

# Ensure registration enabled
echo 'enable_registration: true' >> synapse-data2/homeserver.yaml
echo 'enable_registration_without_verification: true' >> synapse-data2/homeserver.yaml

# Restart
make down && make up
```

### Gateway already running
```bash
# Stop all test gateways
pkill -f "openclaw.*switch-(seller|buyer)"

# Or use cleanup (skips main gateway)
make cleanup
```

### Port conflicts
```bash
# Check what's using ports 18791-18899
ss -ltnp | grep -E ':(1879[0-9]|188[0-9]{2})'

# Kill stuck processes
make cleanup
```

## Documentation

### Engineering & Research Tracks

This project has two parallel tracks:

**PLAN.md** - Engineering backlog (what to build)
- Concrete implementation phases (Phase 0-14)
- Code tasks, infrastructure setup, tooling
- Bug fixes from ISSUES.md (Phase 11)
- When research reveals a needed feature → add it here

**RESEARCH.md** - Research agenda (what to discover)
- Research questions and hypotheses
- Experimental protocols
- Topics: agent-native commerce, security, strategy comparison, model comparison, coalitions, etc.

**ISSUES.md** - Bug tracker (what's broken)
- Problems discovered during research/testing
- Root cause analysis and proposed fixes
- When ready to fix → becomes task in PLAN.md

**Workflow:**
1. Research/testing → discover problem
2. Document in ISSUES.md with context
3. Create task in PLAN.md when ready to fix
4. Mark as ✅ Fixed in ISSUES.md (include commit)

### Other Docs

- **PROTOCOL.md** - Structured protocol specification (sealed-bid, instant-match, security model)
- **ARCHITECTURE.md** - Agent Autonomy Principle and design patterns
- **FRIENDS_DEPLOYMENT.md** - Simple deployment for 10-20 friends (experimental, trust-based, fun)
- **PRODUCTION.md** - Full-scale public deployment planning (comprehensive, operational, legal)
- **TYPESCRIPT_MIGRATION.md** - Phase 9 migration details
- **ISSUES.md** - Known issues from live testing
- **LIVE_MODE.md** - Live sandbox usage guide
- **SECURITY.md** - Secrets management and security practices
- **REPO_REVIEW.md** - Comprehensive audit and grading

## Related

- **GitHub**: https://github.com/s0lness/clawlist
- **OpenClaw**: https://openclaw.ai
- **Matrix Protocol**: https://matrix.org
