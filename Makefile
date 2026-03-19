SHELL := /bin/bash
BASE_DIR ?= $(shell mktemp -d /tmp/codex-app-template-XXXXXX)

.PHONY: test verify verify-template smoke-install

test:
	node --test

verify:
	node --test
	$(MAKE) verify-template

verify-template:
	BASE_DIR="$(BASE_DIR)" scripts/verify-template-install.sh

smoke-install:
	@echo "Opt-in only: run scripts/live-smoke.sh once Codex auth is configured."
