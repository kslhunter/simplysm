# CLAUDE.md Slim-down Design

## Goal

Reduce auto-loaded initial context size so that behavioral rules in `sd-claude-rules.md` are better followed. Move project-specific reference content from `CLAUDE.md` to `docs/references/`, keeping only essential summary + pointers.

## Boundary

- `.claude/` = shared across projects using `@simplysm/*` packages
- `docs/references/` = this monorepo only
- `CLAUDE.md` = this monorepo only (slim summary + pointers)

## Changes

### 1. CLAUDE.md → ~30 lines

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Important: `.claude/` Folder Scope

The `.claude/` folder contains **cross-project shared rules** used across multiple repositories. Do NOT add project-specific content to `.claude/rules/`. Project-specific guidelines belong in this `CLAUDE.md` file or `docs/references/`.

## Project Overview

Simplysm is a TypeScript-based full-stack framework monorepo. Managed with pnpm workspaces, it provides packages for SolidJS UI, ORM, service communication, Excel processing, and more.

### Design Philosophy

- **Standard patterns first**: Prefer familiar patterns over custom ones.
- **Explicit and predictable code**: Prefer explicit code over implicit behavior.
- **Incremental learning**: Each package is independently usable.

## Project References

When working on this monorepo, read the relevant reference before starting:

| When | Read |
|------|------|
| Understanding project structure | `docs/references/project-structure.md` |
| Running build/dev commands | `docs/references/commands.md` |
| Writing code (ESLint, TS config) | `docs/references/code-rules.md` |
| Working on solid package | `docs/references/solid-guide.md` |
| Writing/running tests | `docs/references/testing.md` |

## Workflow

After writing code: verify with `/sd-check`.
```

### 2. `docs/references/` — 5 files (project-specific, English)

| File | Contents (moved from CLAUDE.md) |
|------|------|
| `project-structure.md` | Packages table, Custom Types, Dependency Layers, Build Targets |
| `commands.md` | Key Commands |
| `code-rules.md` | ESLint Rules, TypeScript Configuration |
| `solid-guide.md` | SolidJS Directory Structure table, components vs features, Demo Page Rules |
| `testing.md` | Testing project table, Integration Tests, "update related tests/demos" rule |

### 3. `.claude/refs/` — 2 changes (shared)

**`sd-code-conventions.md`** — append section:

```markdown
## index.ts Export Pattern

- Large packages: `#region`/`#endregion` for sections + `//` for sub-groups
- Small packages (≤10 exports): `//` comments only
- Always `export *` (wildcard), never explicit `export type { ... } from "..."`
```

**`sd-migration.md`** — new file:

```markdown
# Migration Rules

When porting/migrating code from another codebase (e.g., v12 Angular → v13 SolidJS):

1. **Analyze every line**: Read the original source and all its dependencies (imports, base classes, etc.) line by line. Understand every feature, prop, and behavior. If a dependency cannot be found, ask the user.
2. **Ask about every difference**: Any change from the original (API, pattern, design, omission, addition) must be asked to the user. Never decide silently.
3. **Verify after completion**: Compare the result 1:1 with the original and report any omissions or differences to the user.
```

### 4. `.claude/rules/sd-refs-linker.md` — add 1 row to Common table

```
| Migrating/porting code from another codebase | `.claude/refs/sd-migration.md` |
```

## Expected Result

- CLAUDE.md: ~137 lines → ~30 lines
- Initial auto-loaded context significantly reduced
- `sd-claude-rules.md` behavioral rules gain more prominence
- Project details available on-demand via `docs/references/`
