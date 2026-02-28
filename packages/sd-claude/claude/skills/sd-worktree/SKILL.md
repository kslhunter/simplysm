---
name: sd-worktree
description: "Git worktree branch isolation (explicit invocation only)"
model: haiku
---

# sd-worktree

## CRITICAL SAFETY RULES — MERGE & STASH

**These rules are ABSOLUTE. No exceptions. Applies to ALL modes (yolo, normal, plan, etc.).**

1. **NEVER run `git stash drop`, `git stash pop`, or `git stash clear`.**
   - If you stashed something, ONLY use `git stash apply` (which keeps the stash intact).
   - If stash is no longer needed, ASK the user before dropping it.

2. **If `merge` fails or produces conflicts → STOP IMMEDIATELY and show this message:**
   ```
   ⚠️ A problem occurred during merge.
   Please proceed with the merge manually.
   (Error details: <print error/conflict info as-is>)
   ```
   - Show this message in the system's configured language.
   - Do NOT attempt to resolve conflicts yourself.
   - Do NOT run `git merge --abort` without asking.
   - Do NOT proceed to `clean` after a failed merge.
   - Do NOT retry or work around the error.
   - Just show the message above and STOP. Do nothing else.

3. **If `rebase` fails or produces conflicts → STOP IMMEDIATELY and show this message:**
   ```
   ⚠️ A problem occurred during rebase.
   Please proceed with the rebase manually.
   (Error details: <print error/conflict info as-is>)
   ```
   - Show this message in the system's configured language.
   - Same rules as merge. Do NOT auto-resolve. Just show the message and STOP.

4. **NEVER run destructive git commands during worktree workflows:**
   - `git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -f`
   - `git branch -D` (force delete) — only `-d` (safe delete) is allowed
   - `git stash drop`, `git stash pop`, `git stash clear`

5. **Before ANY merge/rebase, verify:**
   - Both main and worktree have NO uncommitted changes (`git status --porcelain`)
   - If uncommitted changes exist → ask the user (do NOT auto-stash)

6. **After merge completes, verify success before proceeding:**
   - Check `git status` — if merge conflicts exist, STOP and report
   - Do NOT proceed to `clean` until merge is confirmed successful

**Violation of these rules causes IRREVERSIBLE DATA LOSS.**

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
- **If rebase fails or conflicts → STOP. Report to user. Do NOT auto-resolve.**

### merge — Merge into main branch

```bash
# Can be run from inside the worktree (script sets cwd to main)
node .claude/skills/sd-worktree/sd-worktree.mjs merge [name]
```

- Merges the worktree branch into the main working tree's current branch with `--no-ff`
- Errors if uncommitted changes exist → commit or stash first
- After merge, always `cd <project-root>` (required for subsequent clean)

**MERGE SAFETY PROTOCOL:**
1. Before merge: check BOTH main and worktree for uncommitted changes
2. If the script exits with non-zero → show "Please proceed with the merge manually." message (in system language) and STOP.
3. After merge: run `git status` in main to confirm no conflicts
4. If conflicts or errors → show "Please proceed with the merge manually." message (in system language) and STOP.
5. Only proceed to `clean` after confirming merge was fully successful

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
