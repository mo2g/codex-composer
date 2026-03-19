SHELL := /bin/bash
BASE_DIR ?= /tmp/codex-composer

.PHONY: test live-smoke validate-tmp

test:
	node --test

live-smoke:
	@echo "Opt-in only: run scripts/live-smoke.sh once Codex auth is configured."

validate-tmp:
	BASE_DIR="$(BASE_DIR)" scripts/validate-tmp-examples.sh
