.PHONY: up down bootstrap scenario sweep cleanup

# Usage examples:
#   make up
#   make bootstrap
#   make scenario SCENARIO=switch_basic DURATION_SEC=120
#   make sweep SCENARIO=switch_basic N=10

SCENARIO ?= switch_basic
RUN_ID ?= $(shell date +%Y%m%d_%H%M%S)
DURATION_SEC ?= 120
N ?= 10

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
