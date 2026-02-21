---
name: sd-commit
description: Use when creating git commits — for staging and committing changed files with conventional commit messages, either for context-relevant files only (default) or all uncommitted changes at once (all mode).
argument-hint: "[all]"
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*)
model: haiku
---

# sd-commit

## Overview

Stages and commits changes using Conventional Commits format. Two modes: **default** (context-relevant files, single commit) and **all** (all changed files, split by intent if needed).

## Mode

- **Default mode** (no arguments): Stage files relevant to the current conversation context. Always a **single commit**.
- **"all" mode** (`$ARGUMENTS` is "all"): Target **all** changed/untracked files. May produce multiple commits.

## File Selection Rules

**NEVER arbitrarily exclude files.** The ONLY valid reason to exclude a file is:
- It is in `.gitignore`
- It is completely unrelated to the conversation context (default mode only)

**Do NOT exclude files based on:**
- File type or extension (e.g., `.styles.ts`, `.config.ts`)
- Folder name or path (e.g., `node_modules` is handled by `.gitignore`)
- Personal judgment about importance or "cleanliness"
- Assumption that generated/config/style files are unimportant

**When in doubt, INCLUDE the file.** Over-inclusion is always better than silent exclusion.

## Context

- Current status: !`git status`
- Current diff: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Commit Message Format

```
type(scope): short description
```

| Field | Values |
|-------|--------|
| `type` | `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `style`, `perf` |
| `scope` | package name or area (e.g., `solid`, `core-common`, `orm-node`) |
| `description` | imperative, lowercase, no period at end |

Examples:
- `feat(solid): add Select component`
- `fix(orm-node): handle null values in bulk insert`
- `docs: update README with new API examples`

Use a HEREDOC for multi-line messages when needed.

## Commit Strategy (all mode only)

Group by **intent/purpose**, not by package.

**Single commit** — all changes share the same intent:
- Version bumps across packages → `chore: bump version to x.y.z`
- One feature spanning multiple packages → single `feat`
- Dependency updates across packages → single `chore`

**Split commits** — changes have different intents:
- Version bump + unrelated bug fix → `chore` + `fix`
- New feature + unrelated refactor → two commits
- `docs` changes + independent `feat` changes → two commits

## Execution

**Default mode:** `git add <context-relevant files>` → `git commit`

**All mode:**
1. Decide: single or split.
2. Single: `git add .` → `git commit`.
3. Split: group by logical unit, commit in dependency order (foundations first). Per group: `git add <files>` → `git commit`.

Call multiple tools in one response when possible. Do not use other tools or output other text.
