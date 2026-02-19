---
name: sd-commit
description: Create a git commit
argument-hint: "[all]"
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
model: haiku
---

## Mode

- **"all" mode** (`$ARGUMENTS` is "all"): Target is **all** changed/untracked files. May split into multiple commits (see Commit Strategy).
- **Default mode** (no arguments): Target is only the files relevant to the current conversation context. Always a **single commit**.

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Commit Message Format

Follow the Conventional Commits style, matching the recent commit history above:

```
type(scope): short description
```

- **type**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `style`, `perf`
- **scope**: package name or area (e.g., `solid`, `core-common`, `orm-node`)
- **description**: imperative, lowercase, no period at end

Examples:
- `feat(solid): add Select component`
- `fix(orm-node): handle null values in bulk insert`
- `refactor(core-common): simplify DateTime parsing`
- `docs: update README with new API examples`

Use a HEREDOC for multi-line messages when needed.

## Commit Strategy (all mode only)

In "all" mode, analyze the changes and decide whether to create a **single commit** or **split into multiple commits**:

Group changes by **intent/purpose**, not by package. Files across multiple packages that share the same intent belong in one commit.

**Single commit examples:**
- Version bumps across all `package.json` files → `chore: bump version to x.y.z`
- A feature spanning `orm-common` + `orm-node` + `service-server` → one `feat` commit
- Dependency updates across multiple packages → one `chore` commit

**Split commit examples:**
- Version bumps + an unrelated bug fix in `solid` → separate `chore` + `fix` commits
- A `feat` in `solid` + a `refactor` in `core-common` with no relation → two commits
- `docs` changes + `feat` changes that are independent → two commits

## Your task

**Default mode:**
- Stage only the context-relevant files with `git add <file>...`, then `git commit` (single commit).

**All mode:**
1. Decide: single commit or split commits.
2. If single: run `git add .` then `git commit`.
3. If splitting: group files by logical unit, create commits in dependency order (foundations first). For each group, `git add <files>...` then `git commit`.

You have the capability to call multiple tools in a single response. When creating a single commit, stage and commit in one message. When splitting, execute each commit sequentially. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
