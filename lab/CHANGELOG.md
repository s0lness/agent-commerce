# Changelog

## 2026-02-08 - Major Security & Testing Update

### Added

**Phase 10: Security Hardening**
- Constraint enforcement system (`src/constraints.ts`)
  - Hard budget/floor validation
  - Cannot be overridden by prompt injection
  - 23 unit tests
- Prompt injection detection and sanitization
  - Detects `[SYSTEM]`, `[INSTRUCTION]`, `[OVERRIDE]` markers
  - Social engineering keyword detection
  - Message sanitization
- Audit logging system (`src/audit-log.ts`)
  - Tracks all agent decisions with reasoning
  - Logs constraint violations
  - Flags injection attempts
  - 7 unit tests
- Security integration tests (`src/integration-security.test.ts`)
  - End-to-end injection resistance
  - Multi-layer defense validation
  - 8 tests
- Red team scenarios
  - `redteam_injection.json` - Prompt injection test
  - `redteam_social.json` - Social engineering test
- Security documentation
  - `docs/SECURITY.md` - Complete security guide (6.2KB)
  - `SECURITY_SUMMARY.md` - Feature overview
  - Threat model and best practices
- Security tooling
  - `cli-audit-summary.ts` - Audit log analyzer
  - `make audit RUN_ID=xxx` command

**Phase 12: Testing Improvements**
- Statistical sweep analysis (`src/sweep-stats.ts`)
  - Mean/median/stddev calculations
  - CSV export
  - 4 unit tests
- Structured logging system (`src/logger.ts`)
  - DEBUG/INFO/WARN/ERROR levels
  - JSON output mode
  - 5 unit tests
- Scenario schema validation (`src/scenario-schema.ts`)
  - JSON schema validation
  - 9 unit tests
- Testing guide (`TESTING_GUIDE.md`)

**Phase 13: Developer Experience**
- Makefile improvements
  - `make test`, `make validate`, `make analyze`
  - `make logs`, `make transcript`, `make export`
  - `make audit`, `make clean-runs`
- runs/latest symlink auto-updates
- Element Web configured in docker-compose
- Installation validation script (`scripts/validate-installation.sh`)
  - `make check` command

**Phase 14: Export & Analysis**
- Transcript viewer (`cli-view-transcript.ts`)
  - Color-coded by sender
  - Keyword filtering
- Enhanced export CLI (`cli-export.ts`)
  - Filter by agent, date, listing
  - Multiple formats (JSONL/JSON/CSV)
- Performance metrics (`src/performance-metrics.ts`)
  - Response time analysis (mean, median, p95, p99)
  - Success rate calculation
  - Validation suite script

**Documentation**
- TESTING_GUIDE.md - Comprehensive testing procedures
- QUICK_REFERENCE.md - Common commands
- STATUS.md - Project status
- WORK_SESSION_SUMMARY.md - Session summary
- DOCUMENTATION_INDEX.md - Doc navigation
- VALIDATION_CHECKLIST.md - System verification
- METRICS_GUIDE.md - Performance metrics

### Changed
- Updated README.md with new features
- Updated PLAN.md - Marked Phases 10-14 complete
- Hardened agent missions with constraint warnings

### Fixed
- Scoring attribution bug (commit bbbed06)
- Timing calculation bug (commit bbbed06)
- Buyer flip-flopping (commit b8c6235)
- Audit log test isolation (commit 2dbbece)
- Internal message leakage verified as not an issue

### Metrics
- Tests: 67 → 154 (+87 tests)
- Test files: 2 → 9
- Scenarios: 5 → 7 (+2 red team)
- Documentation files: 15 → 25+
- Commits: 54 (this session)
- Lines of code: +12,000+

## 2026-02-07 - TypeScript Migration

### Changed
- Migrated bash scripts to TypeScript
- Unified build system with `npm run build`
- Improved type safety across codebase

### Added
- Type definitions for Matrix API
- Structured scenario configuration
- Export and scoring modules

## 2026-02-06 - Initial Framework

### Added
- Basic scenario testing framework
- Matrix homeserver integration (Synapse)
- Element Web UI
- Seller and buyer agent spawning
- DM room creation and transcript export
- Basic scoring system

---

For detailed changes, see git log or WORK_SESSION_SUMMARY.md
