---
name: sd-commit
description: Create a git commit
argument-hint: "[all]"
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
model: haiku
---

## Mode

- If `$ARGUMENTS` is "all": run `git add .` to stage **all** changed/untracked files, then create a single commit for everything.
- Otherwise: stage only the relevant files individually, then commit.

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

## Your task

Based on the above changes, create a single git commit.

- If "all" mode: run `git add .` then `git commit`.
- Otherwise: stage relevant files with `git add <file>...` then `git commit`.

You have the capability to call multiple tools in a single response. Stage and create the commit using a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
