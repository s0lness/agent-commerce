.PHONY: up down bootstrap scenario sweep cleanup human-seller live-start live-stop live-status live-populate live-agents live-agents-start live-agents-stop live-agents-status

# Usage examples:
#   make up
#   make bootstrap
#   make scenario SCENARIO=switch_basic DURATION_SEC=120
#   make sweep SCENARIO=switch_basic N=10
#   make human-seller DURATION_SEC=300
#
# Live sandbox mode:
#   make live-start [POPULATE=8]
#   make live-status
#   make live-populate [N=5]
#   make live-stop
#
# Live agents (with behaviors):
#   make live-agents-start [SELLERS=3] [BUYERS=2]
#   make live-agents-status
#   make live-agents-stop

SCENARIO ?= switch_basic
RUN_ID ?= $(shell date +%Y%m%d_%H%M%S)
DURATION_SEC ?= 120
N ?= 10
POPULATE ?= 0
SELLERS ?= 3
BUYERS ?= 2

up:
	./lab/up.sh

down:
	./lab/down.sh

bootstrap:
	./lab/bootstrap.sh

cleanup:
	./lab/cleanup_ports.sh

scenario:
	RUN_ID=$(RUN_ID) DURATION_SEC=$(DURATION_SEC) ./lab/run_scenario.sh $(SCENARIO)

sweep:
	SCENARIO=$(SCENARIO) N=$(N) ./lab/sweep.sh $(SCENARIO) $(N)

human-seller:
	RUN_ID=$(RUN_ID) DURATION_SEC=$(DURATION_SEC) ./lab/run_human_seeded_seller.sh

# Live sandbox mode
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
