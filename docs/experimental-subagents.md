# Experimental Subagents

Subagents are not the default execution model for Codex Composer.

## Allowed Experimental Direction

- read-only review
- read-only research
- sidecar investigation that does not change the implementation flow

## Explicitly Not Allowed

- automatic merge
- direct writes to `main`
- autonomous cross-task closure
- replacing the default worktree/thread execution model

## Positioning

The default path remains:

- planner in the current Codex thread
- task `A` in the current repository
- optional task `B` in a user-opened thread inside a separate worktree

If subagents are explored in the future, they remain optional and non-default.
