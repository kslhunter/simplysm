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

## Commit Strategy

Analyze the changes above and decide whether to create a **single commit** or **split into multiple commits**:

**Split commits when** the changes clearly belong to different logical units:
- Different packages with unrelated changes (e.g., `solid` UI fix + `orm-node` query change)
- Different types of work (e.g., `feat` + `refactor` + `docs`)
- Independent bug fixes touching separate areas

**Use a single commit when:**
- All changes serve one purpose (e.g., a feature spanning multiple files)
- Changes are tightly coupled and wouldn't make sense separated
- Only a few files changed with a single intent

## Your task

Based on the above changes:

1. Decide: single commit or split commits.
2. If splitting, group files by logical unit and create commits in dependency order (foundations first).
3. For each commit:
   - Stage the relevant files with `git add <file>...` (or `git add .` if "all" mode with single commit)
   - Run `git commit` with an appropriate message

You have the capability to call multiple tools in a single response. When creating a single commit, stage and commit in one message. When splitting, execute each commit sequentially. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
