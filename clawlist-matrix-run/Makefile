.PHONY: build test validate up down bootstrap scenario sweep cleanup logs clean-runs live-start live-stop live-status live-populate live-agents live-agents-start live-agents-stop live-agents-status

# Build & Test
build:
	npm run build

test:
	npm test

validate:
	npm run validate

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

# Utility targets
RUN_ID ?=
logs:
	@if [ -z "$(RUN_ID)" ]; then \
		echo "Usage: make logs RUN_ID=<runId>"; \
		ls -t runs/*/out/*.log 2>/dev/null | head -5; \
	else \
		tail -f runs/$(RUN_ID)/out/*.log 2>/dev/null || echo "No logs found for $(RUN_ID)"; \
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
