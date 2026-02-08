.PHONY: build test validate check up down bootstrap scenario sweep cleanup logs clean-runs live-start live-stop live-status live-populate live-agents live-agents-start live-agents-stop live-agents-status

# Build & Test
build:
	npm run build

test:
	npm test

validate:
	npm run validate

check:
	@./scripts/validate-installation.sh

validate-system:
	@./scripts/run-validation-suite.sh

# Docker/Infrastructure
up: build
	node dist/cli-up.js

down:
	node dist/cli-down.js

bootstrap: build
	node dist/cli-bootstrap.js

cleanup:
	@echo "[cleanup] TypeScript migration: cleanup handled by gateway.ts"
	@# Old bash cleanup is no longer needed

# Scenario testing
SCENARIO ?= switch_basic
RUN_ID ?= $(shell date +%Y%m%d_%H%M%S)
DURATION_SEC ?= 120
N ?= 10

scenario: build
	DURATION_SEC=$(DURATION_SEC) RUN_ID=$(RUN_ID) node dist/run-scenario.js $(SCENARIO)

sweep: build
	node dist/sweep.js $(SCENARIO) $(N)

# Analyze sweep results
analyze:
	@if [ -z "$(DIR)" ]; then echo "Usage: make analyze DIR=runs/sweep_xxx"; exit 1; fi
	node dist/cli-analyze-sweep.js $(DIR) --csv

# Performance metrics
performance:
	@if [ -z "$(DIR)" ]; then echo "Usage: make performance DIR=runs/sweep_xxx"; exit 1; fi
	node dist/cli-performance.js $(DIR)

# Security audit summary
audit:
	@if [ -z "$(RUN_ID)" ]; then \
		echo "Usage: make audit RUN_ID=<runId>"; \
		echo "Example: make audit RUN_ID=latest"; \
	else \
		node dist/cli-audit-summary.js runs/$(RUN_ID); \
	fi

# Utility targets
RUN_ID ?=
FILTER ?=
logs:
	@if [ -z "$(RUN_ID)" ]; then \
		echo "Usage: make logs RUN_ID=<runId>"; \
		ls -t runs/*/out/*.log 2>/dev/null | head -5; \
	else \
		tail -f runs/$(RUN_ID)/out/*.log 2>/dev/null || echo "No logs found for $(RUN_ID)"; \
	fi

transcript:
	@if [ -z "$(RUN_ID)" ]; then \
		echo "Usage: make transcript RUN_ID=<runId> [FILTER=keyword]"; \
		echo "Examples:"; \
		echo "  make transcript RUN_ID=latest"; \
		echo "  make transcript RUN_ID=test_123 FILTER=DEAL"; \
	else \
		node dist/cli-view-transcript.js runs/$(RUN_ID)/out/dm.jsonl $(if $(FILTER),--filter=$(FILTER),); \
	fi

AGENT ?=
FROM ?=
TO ?=
FORMAT ?= jsonl
OUT ?=
export:
	@if [ -z "$(RUN_ID)" ]; then \
		echo "Usage: make export RUN_ID=<runId> [options]"; \
		echo "Options:"; \
		echo "  AGENT=@buyer:localhost    Filter by agent"; \
		echo "  FROM=2026-02-07           Start date"; \
		echo "  TO=2026-02-08             End date"; \
		echo "  FORMAT=jsonl|json|csv     Output format"; \
		echo "  OUT=file.csv              Output file"; \
	else \
		node dist/cli-export.js --dir=runs/$(RUN_ID) \
			$(if $(AGENT),--agent=$(AGENT),) \
			$(if $(FROM),--from=$(FROM),) \
			$(if $(TO),--to=$(TO),) \
			--format=$(FORMAT) \
			$(if $(OUT),--out=$(OUT),); \
	fi

KEEP ?= 10
clean-runs:
	@echo "Keeping $(KEEP) most recent runs, deleting the rest..."
	@ls -t runs/ | tail -n +$$(($(KEEP)+1)) | xargs -I {} rm -rf runs/{} 2>/dev/null || true
	@echo "Done. Runs remaining:"
	@ls -t runs/ | wc -l

# Live sandbox mode (kept bash for now - will migrate later)
POPULATE ?= 0
SELLERS ?= 3
BUYERS ?= 2

live-start:
	POPULATE=$(POPULATE) ./lab/live_start.sh

live-stop:
	./lab/live_stop.sh

live-status:
	./lab/live_status.sh

live-populate:
	./lab/populate_market.sh $(N)

# Live agents with behaviors
live-agents:
	./lab/live_agents.sh status

live-agents-start:
	./lab/live_agents.sh start $(SELLERS) $(BUYERS)

live-agents-stop:
	./lab/live_agents.sh stop

live-agents-status:
	./lab/live_agents.sh status

# Legacy human-seller mode (kept bash for now)
human-seller:
	RUN_ID=$(RUN_ID) DURATION_SEC=$(DURATION_SEC) ./lab/run_human_seeded_seller.sh
