---
name: sd-readme
description: "Sync README.md with source code (explicit invocation only)"
argument-hint: "<package-name or path> (optional - omit to update all)"
model: sonnet
---

# sd-readme

Sync package README.md source index with current exports from `index.ts`.

## Purpose

`@simplysm/*` packages ship `.ts` source and test files. Claude Code reads source files directly from `node_modules/` for API details (props, types, signatures, usage patterns).

**README.md is a source file index** — it tells Claude Code **which files to read**, not the API itself.

## Modes

- **Single package** (`$ARGUMENTS` = package name or path): Update one package's README
- **Batch** (`$ARGUMENTS` empty): Discover and update all packages in parallel

## What Goes Where

| In README | NOT in README (read from source) |
|-----------|----------------------------------|
| Package description (one-line) | Prop tables |
| Installation + peer dependencies | Code examples |
| Setup/configuration (Provider tree, Tailwind preset) | Type/interface definitions |
| **Source index table** | API signatures |
| License | Behavioral descriptions |

## README Structure

```markdown
# @simplysm/{package-name}

{One-line description from package.json}

## Installation

pnpm add @simplysm/{package-name}

**Peer Dependencies:** (if any)

## Configuration

{Only for setup patterns — Provider wrapping, Tailwind preset, etc.}
{Include brief code snippets for wiring, NOT per-component API}

## Source Index

### {Category matching index.ts #region}

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/path/to/File.tsx` | `ComponentA`, `ComponentB` | Brief one-line description | `File.test.tsx` |
| `src/path/to/types.ts` | `TypeA`, `TypeB` | Type definitions for X | - |

## License
```

**Source index table rules:**
- One row per `export *` statement in `index.ts`
- Exports column: list all exported symbols from that file
- Description column: brief one-line summary of what the file provides (enough for Claude Code to decide whether to read the source)
- Test column: test file name if exists, `-` if not
- Source paths relative to package root

## General Rules

- Written in **English**
- Sections follow `index.ts` `#region` structure
- **Every `export *`** from `index.ts` must appear in source index
- No changelog, version history, or "recently updated" sections
- Configuration section: only setup/wiring patterns, NOT per-component API

## Single Package Mode

### Step 1: Resolve Path

`$ARGUMENTS` may be a package name or path (e.g., `core-common`, `packages/core-common`).
If not starting with `packages/`, prepend it.

### Step 2: Build Export Map (Source of Truth)

1. Read `<pkg-path>/src/index.ts` — get all `export *` statements and their `#region` grouping
2. For each `export * from "./path/to/file"`:
   - Resolve actual file path (`.ts`, `.tsx`)
   - Read file to extract exported symbol names
   - Write a brief one-line description of what the file provides
   - Check if test file exists (e.g., `File.test.tsx`, `File.spec.ts`)

### Step 3: Build Index Map

Read `<pkg-path>/README.md` (if exists).
Extract existing source index table entries — map each source file to its row.

### Step 4: Diff and Report

Compare export map (Step 2) against index map (Step 3):

| Status | Meaning |
|--------|---------|
| **ADDED** | `export *` in index.ts but source file not in README index |
| **REMOVED** | In README index but no longer in index.ts |
| **CHANGED** | Same file, but exported symbols changed |
| **OK** | Index entry matches source |

**Report to user before editing:**

```
ADDED (2):
  - src/providers/i18n/I18nContext.tsx (useI18n, useI18nOptional, I18nProvider)
  - src/providers/i18n/I18nContext.types.ts (I18nContextValue, I18nConfigureOptions, FlatDict)

REMOVED (1):
  - src/components/SelectList.tsx (no longer exported)

CHANGED (1):
  - src/features/shared-data/SharedDataSelectList.tsx: exports changed

OK: 42 entries unchanged
```

**Wait for user confirmation before proceeding to edit.**

### Step 5: Apply Updates

- **ADDED**: Add row to source index table in the section matching the item's `#region` in index.ts.
- **REMOVED**: Delete row from source index table.
- **CHANGED**: Update exports column.
- **OK**: Do not touch.

### Step 6: Cleanup Check

If `docs/` subfolder exists from old full-documentation approach, report it:

```
NOTE: docs/ subfolder exists with old-style full documentation.
  Source index approach makes docs/ redundant.
  Files: docs/form-controls.md, docs/providers.md, ...
  Remove docs/ folder? (requires user confirmation)
```

**Do not auto-delete docs/ — always ask user first.**

## Batch Mode

When `$ARGUMENTS` is empty:

1. Discover all packages: Glob `packages/*/package.json`
2. Launch **parallel subagents** (`subagent_type: "general-purpose"`, `model: "sonnet"`) — one per package + one for project root:

**Per-package subagent prompt template:**

```
Update README.md source index for package {pkg-name} at {pkg-path}.

PURPOSE: README.md is a source file index. @simplysm/* packages ship .ts source + tests.
Claude Code reads source files directly. README tells Claude WHICH files to read.

STEPS:
1. Read {pkg-path}/src/index.ts — get all `export *` statements and #region grouping.
2. For each export, resolve source file path and find test file.
3. Read each source file to extract exported symbol names.
4. Read {pkg-path}/README.md (if exists).
5. Compare exports vs README source index:
   - ADDED: add row to source index table.
   - REMOVED: delete row.
   - CHANGED: update exports/description column.
   - OK: don't touch.
6. Section organization follows index.ts #region structure.
7. Write in English. No changelog sections.
8. If README doesn't exist, create with structure:
   # @simplysm/{pkg-name}
   {description from package.json}
   ## Installation
   ## Source Index (tables per #region)
   ## License
9. Do NOT write prop tables, code examples, or type definitions.
   Source index table only: Source | Exports | Description | Test
   Description: brief one-line summary of what the file provides.
10. Report: list of ADDED/REMOVED/CHANGED items.
```

**Project root subagent prompt:**

```
Update the project root README.md at {project-root}/README.md.
Read CLAUDE.md for project context.
Compare current README against project structure and packages.
Edit only sections that are outdated. Write in English.
Report what was changed.
```

3. Collect all results. Report summary: which READMEs were updated, which had no changes.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing prop tables or code examples | README is a source index — Claude reads source files for API details |
| Missing or vague Description | Each row needs a brief description so Claude can decide whether to read the file |
| Skipping exports from index.ts | Every `export *` must appear in the source index |
| Putting per-component API in Configuration | Configuration = setup patterns only (Provider tree, Tailwind preset) |
| Arbitrary section reorganization | Follow index.ts `#region` structure |
| Writing in Korean | README must be in English |
| Adding changelog sections | Never add version history |
| Editing before reporting diff | Always report and wait for confirmation |
| Auto-deleting docs/ folder | Report docs/ existence, ask user before removing |
