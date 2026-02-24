# CLAUDE.md Slim-down Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Reduce CLAUDE.md from ~137 lines to ~30 lines by moving project-specific references to `docs/references/`.

**Architecture:** Move content out of auto-loaded CLAUDE.md into on-demand reference files. Shared conventions go to `.claude/refs/`, project-specific details go to `docs/references/`.

**Tech Stack:** Markdown files only — no code changes.

---

### Task 1: Create `docs/references/project-structure.md`

**Files:**
- Create: `docs/references/project-structure.md`

**Step 1: Create the file**

Move the following sections from CLAUDE.md (lines 33–72) into the new file:

```markdown
# Project Structure

## Packages (`packages/`)

| Package | Target |
|---------|--------|
| `core-common` | neutral |
| `core-browser` | browser |
| `core-node` | node |
| `cli` | node |
| `lint` | node |
| `orm-common` | neutral |
| `orm-node` | node |
| `service-common` | neutral |
| `service-client` | neutral |
| `service-server` | node |
| `solid` | browser |
| `solid-demo` | client |
| `excel` | neutral |
| `storage` | node |

## Custom Types (`core-common`)

Immutable types: `DateTime`, `DateOnly`, `Time`, `Uuid`, `LazyGcMap`

## Dependency Layers

```
core-common → core-browser / core-node → orm-common / service-common → orm-node / service-server / service-client → solid
```

## Build Targets (sd.config.ts)

- `node`: Node.js only (no DOM, includes `@types/node`)
- `browser`: Browser only (includes DOM, excludes `@types/node`)
- `neutral`: Node/browser shared
- `client`: Vite dev server
```

---

### Task 2: Create `docs/references/commands.md`

**Files:**
- Create: `docs/references/commands.md`

**Step 1: Create the file**

Move the Key Commands section from CLAUDE.md (lines 19–31):

```markdown
# Key Commands

```bash
pnpm install                    # Install dependencies
pnpm lint [path] [--fix]        # ESLint
pnpm typecheck [path]           # TypeScript typecheck
pnpm build [name]               # Production build
pnpm watch [name]               # Watch mode (library build + .d.ts)
pnpm dev                        # Dev mode (Vite dev server)
pnpm pub                        # Build then publish
pnpm pub:no-build               # Publish without build
pnpm vitest [path] [--project=node|browser|solid|orm|service] [-t "name"]
```
```

---

### Task 3: Create `docs/references/code-rules.md`

**Files:**
- Create: `docs/references/code-rules.md`

**Step 1: Create the file**

Move the Code Conventions section from CLAUDE.md (lines 74–90):

```markdown
# Code Rules

## ESLint Rules (`@simplysm/lint`)

- ECMAScript private fields (`#field`) prohibited → Use TypeScript `private`
- `@simplysm/*/src/` path imports prohibited → Read package's `index.ts` to check exports first
- `no-console`, `eqeqeq`, `no-shadow` enforced
- `Buffer` prohibited → Use `Uint8Array` (exception: `eslint-disable` with reason when library requires it)
- `await` required in async functions

## TypeScript Configuration

- `strict: true`, `verbatimModuleSyntax: true`
- Path aliases: `@simplysm/*` → `packages/*/src/index.ts`
- JSX: SolidJS (`jsxImportSource: "solid-js"`)
```

---

### Task 4: Create `docs/references/solid-guide.md`

**Files:**
- Create: `docs/references/solid-guide.md`

**Step 1: Create the file**

Move the SolidJS Guidelines section from CLAUDE.md (lines 92–113):

```markdown
# SolidJS Guide

## `solid` Package Directory Structure (`packages/solid/src/`)

Classification is based on how the user perceives each unit.

| Directory | Role | Examples |
|-----------|------|----------|
| `components/` | Pure UI building blocks | Button, Sheet, Select, Dialog, Calendar |
| `components/features/` | Wrapper components combining multiple pure components | CrudSheet, CrudDetail, SharedDataSelect, PermissionTable |
| `directives/` | DOM behavior attachment | ripple |
| `hooks/` | Reusable logic | createPointerDrag, useLocalStorage |
| `providers/` | App-wide state/service injection | ThemeContext, ServiceClient, SharedDataProvider |
| `helpers/` | Utility functions | createAppStructure, mergeStyles |
| `styles/` | Shared style tokens/patterns | tokens.styles, patterns.styles |

- **components vs features**: Standalone UI units go in `components/`. Pre-built wrappers that combine multiple components for common patterns go in `components/features/`.
- Place new files in the directory matching the criteria above.

## Demo Page Rules

- No raw HTML elements → use `@simplysm/solid` components
- Read existing demos before writing new ones
```

---

### Task 5: Create `docs/references/testing.md`

**Files:**
- Create: `docs/references/testing.md`

**Step 1: Create the file**

Move the Testing section from CLAUDE.md (lines 115–125):

```markdown
# Testing

## Test Projects

| Project | Environment | Pattern |
|---------|-------------|---------|
| node | Node.js | `packages/*/tests/**/*.spec.ts` |
| browser | Playwright | `packages/*/tests/**/*.spec.ts` |
| solid | Playwright + vite-plugin-solid | `packages/solid/tests/**/*.spec.tsx` |
| orm | Node.js + Docker | `tests/orm/**/*.spec.ts` |
| service | Playwright | `tests/service/**/*.spec.ts` |

## Integration Tests (`tests/`)

- `tests/orm/`: ORM integration tests (Docker DB required)
- `tests/service/`: Service integration tests (browser tests)

When modifying code, review and update related tests (`packages/{pkg}/tests/`) and demos (`packages/solid-demo/src/`).
```

---

### Task 6: Update `.claude/refs/sd-code-conventions.md`

**Files:**
- Modify: `.claude/refs/sd-code-conventions.md` (append after line 41)

**Step 1: Append index.ts Export Pattern section**

Add at the end of the file:

```markdown
## index.ts Export Pattern

- Large packages: `#region`/`#endregion` for sections + `//` for sub-groups
- Small packages (≤10 exports): `//` comments only
- Always `export *` (wildcard), never explicit `export type { ... } from "..."`
```

---

### Task 7: Create `.claude/refs/sd-migration.md`

**Files:**
- Create: `.claude/refs/sd-migration.md`

**Step 1: Create the file**

```markdown
# Migration Rules

When porting/migrating code from another codebase (e.g., v12 Angular → v13 SolidJS):

1. **Analyze every line**: Read the original source and all its dependencies (imports, base classes, etc.) line by line. Understand every feature, prop, and behavior. If a dependency cannot be found, ask the user.
2. **Ask about every difference**: Any change from the original (API, pattern, design, omission, addition) must be asked to the user. Never decide silently.
3. **Verify after completion**: Compare the result 1:1 with the original and report any omissions or differences to the user.
```

---

### Task 8: Update `.claude/rules/sd-refs-linker.md`

**Files:**
- Modify: `.claude/rules/sd-refs-linker.md` (line 20, Common table)

**Step 1: Add migration entry to Common table**

Add a new row after the last entry in the Common table (after line 20):

```
| Migrating/porting code from another codebase | `.claude/refs/sd-migration.md`          |
```

---

### Task 9: Rewrite `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Replace entire content**

Replace the full content of CLAUDE.md with:

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

---

### Task 10: Commit all changes

**Step 1: Stage and commit**

```bash
git add CLAUDE.md docs/references/ .claude/refs/sd-code-conventions.md .claude/refs/sd-migration.md .claude/rules/sd-refs-linker.md
git commit -m "docs: slim down CLAUDE.md by moving project refs to docs/references/"
```
