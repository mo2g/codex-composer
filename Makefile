SHELL := /bin/bash
BASE_DIR ?= /tmp/codex-composer

.PHONY: test example-plan live-smoke validate-tmp

test:
	node --test

example-plan:
	scripts/composer-new-run.sh --run demo-login --repo examples/react-go-login --requirement "Implement a React frontend login flow and a Go backend login API"

live-smoke:
	@echo "Opt-in only: run scripts/live-smoke.sh once Codex auth is configured."

validate-tmp:
	BASE_DIR="$(BASE_DIR)" scripts/validate-tmp-examples.sh
