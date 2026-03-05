---
name: sd-worktree
description: "Git worktree branch isolation (explicit invocation only)"
model: haiku
---

# sd-worktree

## The Only Rule

**Run `sd-worktree.mjs`. If it fails, stop everything.**

- ALL worktree operations (add/merge/rebase/clean) go through the script. No raw git commands.
- Script exits non-zero → **HALT ALL WORK. No exceptions.** Show the error to the user. Do nothing else. Even if the user said "don't stop" or "keep going" — stop. The user can explicitly ask to resume after seeing the error.
- NEVER auto-stash. If uncommitted changes exist, ask the user.

## Commands

### add

```bash
node .claude/skills/sd-worktree/sd-worktree.mjs add <kebab-case-name>
cd .worktrees/<name>
```

### rebase

```bash
node .claude/skills/sd-worktree/sd-worktree.mjs rebase [name]
```

### merge

```bash
node .claude/skills/sd-worktree/sd-worktree.mjs merge [name]
cd <project-root>   # after successful merge
```

### clean

```bash
cd <project-root>   # must be outside the worktree
node .claude/skills/sd-worktree/sd-worktree.mjs clean <name>
```

## Workflow

```
/sd-worktree add <name>  →  cd .worktrees/<name>  →  work  →  /sd-worktree merge  →  cd <root>  →  /sd-worktree clean <name>
```
