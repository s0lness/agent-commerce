# Repository Reorganization Plan

## Current Issues
1. `clawlist-matrix-run/` name is ambiguous
2. No clear separation between "production server code" and "research lab"
3. Duplicate files (PLAN.md, SECURITY.md, docs/) between parent and subdirectory
4. No navigation guide for newcomers

## Proposed Structure

```
clawlist/
├── README.md                          # Main entry - vision + navigation
├── LICENSE                            # MIT (from lab/)
│
├── lab/                               # Rename from clawlist-matrix-run/
│   ├── README.md                      # "Research & Testing Framework"
│   ├── src/                           # Test framework code (154 tests)
│   ├── scenarios/                     # Test scenarios
│   ├── docs/                          # Lab-specific docs
│   ├── scripts/                       # Validation/test scripts
│   ├── package.json                   # Lab dependencies
│   └── (all current matrix-run files)
│
├── server/                            # Rename from src/ (or production/)
│   ├── README.md                      # Production server code
│   ├── src/                           # Move current src/ here
│   ├── tools/                         # Move current tools/ here
│   ├── config/                        # Move current config/ here
│   ├── tests/                         # Move current tests/ here
│   ├── package.json                   # Server dependencies
│   └── tsconfig.json
│
├── docs/                              # Global documentation
│   ├── README.md                      # Documentation index
│   ├── VISION.md                      # Agent commerce future (from README)
│   ├── RESEARCH.md                    # Research questions (consolidate)
│   ├── DEPLOYMENT.md                  # How friends deploy/join
│   ├── ARCHITECTURE.md                # Overall system design
│   └── (move relevant docs from lab/docs/)
│
├── .github/
│   └── workflows/                     # CI (from lab/)
│
└── Root files:
    ├── .gitignore                     # Consolidated
    ├── CONTRIBUTING.md                # From lab/
    └── CHANGELOG.md                   # Consolidated history
```

## Consolidation Rules

### Duplicate Documentation
- **PLAN.md (parent)** → Delete, point to lab/PLAN.md
- **SECURITY.md** → Keep lab version (comprehensive), link from root
- **docs/** → Merge parent docs/ into global docs/, link lab-specific to lab/docs/

### Code Organization
- **Root src/, tools/, tests/** → Move to `server/`
- **Root package.json** → Becomes server/package.json
- **Root config/** → Move to server/config/

### Documentation Moves
From lab/ to global docs/:
- VISION.md (extract from README)
- DEPLOYMENT.md (rename FRIENDS_DEPLOYMENT.md)
- High-level RESEARCH.md

Keep in lab/docs/:
- TESTING_GUIDE.md
- TROUBLESHOOTING.md
- METRICS_GUIDE.md
- QUICK_REFERENCE.md
- Technical implementation docs

## New READMEs

### Root README.md
```markdown
# Clawlist - Agent-to-Agent Commerce

Vision: Personal agents will transform commerce. This project explores 
how agents negotiate deals, discover protocols, and enable new forms of trade.

## What's Here

- **lab/** - Research & testing framework (154 tests, security hardening)
- **server/** - Production server code (Matrix-based commerce platform)
- **docs/** - Vision, deployment guides, research questions

## Quick Start

**For researchers/testers:**
→ See [lab/README.md](lab/README.md)

**To deploy a server for friends:**
→ See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

**To understand the vision:**
→ See [docs/VISION.md](docs/VISION.md)
```

### lab/README.md
```markdown
# Clawlist Lab - Research & Testing Framework

Purpose: Validate agent strategies, compare models, test security defenses
before deploying to production.

- 154 tests passing
- Security hardening (multi-layer defenses)
- Model comparison tools
- Strategy validation
- Performance metrics

Quick start: See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
```

### server/README.md
```markdown
# Clawlist Server

Production server code for running a Matrix-based commerce platform
where agents can join, negotiate, and trade.

**Note:** This is experimental. For production deployment, see
[../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

Quick start: `npm install && npm run start:agent`
```

### docs/README.md
```markdown
# Documentation Index

- [VISION.md](VISION.md) - Why agent commerce matters
- [DEPLOYMENT.md](DEPLOYMENT.md) - How to host for friends
- [RESEARCH.md](RESEARCH.md) - Open questions to explore
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design

For lab/testing docs, see [../lab/docs/](../lab/docs/)
```

## Migration Steps

1. **Rename clawlist-matrix-run → lab**
   ```bash
   git mv clawlist-matrix-run lab
   ```

2. **Create server/ directory**
   ```bash
   mkdir server
   git mv src server/src
   git mv tools server/tools
   git mv tests server/tests
   git mv config server/config
   git mv dist server/dist
   git mv dist-tools server/dist-tools
   git mv dist-tests server/dist-tests
   git mv package.json server/
   git mv tsconfig.json server/
   git mv tsconfig.tools.json server/
   git mv tsconfig.tests.json server/
   ```

3. **Reorganize docs**
   - Keep docs/ at root for global documentation
   - Move lab-specific docs stay in lab/docs/
   - Create docs/README.md navigation

4. **Update all internal references**
   - Update import paths in server/
   - Update script paths in package.json files
   - Update documentation links

5. **Create new READMEs**
   - Root README with navigation
   - lab/README pointing to quick start
   - server/README explaining purpose
   - docs/README as index

6. **Clean up duplicates**
   - Remove root PLAN.md (point to lab/PLAN.md)
   - Consolidate .gitignore
   - Move LICENSE from lab/ to root

7. **Update workflows**
   - Move .github/ from lab/ to root
   - Update paths in CI config

## Result

Clear, navigable structure where:
- New visitors immediately understand what's what
- Researchers go straight to lab/
- Friends wanting to join see docs/DEPLOYMENT.md
- Production server code is clearly separate
- No ambiguous naming or duplicates
