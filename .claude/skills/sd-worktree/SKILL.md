---
name: sd-worktree
description: Use when starting new feature work, bug fixes, or any task that benefits from branch isolation - creates a git worktree under .worktrees/ and guides to next planning step
model: haiku
---

# sd-worktree

## Overview

Create, merge, and clean up git worktrees under `.worktrees/`. Uses the current branch of the main working tree as the source branch.

**Important**: Claude Code's working directory (cd) shifts between main and worktree, so always verify the cd location before and after each command.

## Target Worktree Resolution

For all commands, the target worktree name is resolved in this order:

1. Explicitly provided in args → use as-is
2. Current cd is inside `.worktrees/<name>/` → use that `<name>` (auto-detected)
3. Neither applies → ask the user

## Commands

### add — Create a worktree

Take a work description from args, determine a kebab-case name, then run:

```bash
# Run from main
node .claude/skills/sd-worktree/sd-worktree.mjs add <name>
cd .worktrees/<name>   # Move into the worktree
```

- All subsequent work should be done inside the worktree

### rebase — Rebase onto main branch

```bash
# Can be run from inside the worktree
node .claude/skills/sd-worktree/sd-worktree.mjs rebase [name]
```

- Rebases the worktree branch onto the latest commit of the main branch
- Errors if uncommitted changes exist → commit or stash first
- Use when you want a clean history before merging

### merge — Merge into main branch

```bash
# Can be run from inside the worktree (script sets cwd to main)
node .claude/skills/sd-worktree/sd-worktree.mjs merge [name]
```

- Merges the worktree branch into the main working tree's current branch with `--no-ff`
- Errors if uncommitted changes exist → commit or stash first
- After merge, always `cd <project-root>` (required for subsequent clean)

### clean — Remove worktree and delete branch

```bash
# Must cd to main first (worktree directory will be deleted)
cd <project-root>
node .claude/skills/sd-worktree/sd-worktree.mjs clean <name>
```

- Runs `git worktree remove` + `git branch -d`
- Script blocks execution if run from inside the worktree → must cd to main first

## Full Workflow Example

```
(main: 13.x)  → /sd-worktree add modal-migration
               → cd .worktrees/modal-migration
(worktree)    → ... work ...
(worktree)    → /sd-worktree rebase          # (optional) rebase onto latest main
(worktree)    → /sd-worktree merge
(worktree)    → cd <project-root>
(main: 13.x)  → /sd-worktree clean modal-migration
```
