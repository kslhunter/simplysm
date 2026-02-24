---
name: sd-readme
description: Package README.md sync with current source code exports
disable-model-invocation: true
argument-hint: "<package-name or path> (optional - omit to update all)"
model: sonnet
---

# sd-readme

Sync package README.md with current source code by comparing exports against documentation.

## Purpose

README.md is the **sole API documentation source for Claude Code**. When Claude Code works in a consumer app using `@simplysm/*` packages, it reads README.md from `node_modules/` to understand the library API. Claude Code does NOT read JSDoc from source files.

**Therefore: every exported symbol must be documented in README.**

## Modes

- **Single package** (`$ARGUMENTS` = package name or path): Update one package's README
- **Batch** (`$ARGUMENTS` empty): Discover and update all packages in parallel

## README Writing Rules

- Written in **English**
- All code examples must include **import paths**: `import { ... } from "@simplysm/..."`
- **Every export** from `index.ts` must be documented — including those with `@internal` JSDoc
- No changelog, version history, or "recently updated" sections
- Section organization follows `index.ts` `#region` structure
- Heading levels: `##` for major sections, `###` for sub-sections

### Standard Structure

```markdown
# @simplysm/{package-name}

{One-line description}

## Installation

## Main Modules

### {Category matching index.ts #region}

- Description + code examples per export

## Types

## Dependencies (only when peer deps exist)
```

### docs/ Subfolder Rules

When README exceeds ~500 lines, split detailed documentation into `docs/`:

- README.md becomes an **overview/index** with links: `[functionName](docs/category.md#anchor)`
- docs/ files contain detailed descriptions, full code examples, parameter tables
- File organization follows index.ts `#region` (e.g., `docs/types.md`, `docs/utils.md`)

When README is under ~500 lines, keep everything inline.

**If docs/ already exists, maintain and update it. Do not remove an existing docs/ structure.**

## Single Package Mode

### Step 1: Resolve Path

`$ARGUMENTS` may be a package name or path (e.g., `core-common`, `packages/core-common`).
If not starting with `packages/`, prepend it.

### Step 2: Build Export Map (Source of Truth)

1. Read `<pkg-path>/src/index.ts` — get all exports and their `#region` grouping
2. For each exported module, read the source file to extract:
   - Function signatures (params, return type, overloads)
   - Class public API (constructor, methods, properties)
   - Type/interface definitions
   - Default values, options objects

### Step 3: Build Documentation Map

Read `<pkg-path>/README.md` (if exists). If docs/ exists, read those files too.
Map each documented item to its current documentation content.

### Step 4: Diff and Report

Compare export map (Step 2) against documentation map (Step 3):

| Status      | Meaning                              |
| ----------- | ------------------------------------ |
| **ADDED**   | Exported in source but not in README |
| **REMOVED** | In README but no longer exported     |
| **CHANGED** | Both exist but API signature differs |
| **OK**      | Documentation matches source         |

**Report to user before editing:**

```
ADDED (3):
  - strToCamelCase (from utils/str.ts)
  - objGetChainValueByDepth (from utils/obj.ts)
  - ZipArchiveProgress type (from zip/sd-zip.ts)

REMOVED (1):
  - oldFunction (no longer exported)

CHANGED (2):
  - objMerge: added `deep` parameter
  - Set.toggle: added `addOrDel` optional parameter

OK: 45 items unchanged
```

**Wait for user confirmation before proceeding to edit.**

### Step 5: Apply Updates

- **ADDED**: Write documentation matching existing style. Place in the section matching the item's `#region` in index.ts. Include description + code example with import path.
- **REMOVED**: Delete the documentation entry.
- **CHANGED**: Update existing entry to match current API. Preserve code examples if still valid.
- **OK**: Do not touch.

**If README uses docs/ links**: update the corresponding docs/ file, not just README.

### Step 6: Size Check

After updates, if README exceeds ~500 lines and no docs/ exists:
suggest splitting to the user (do not auto-split without confirmation).

## Batch Mode

When `$ARGUMENTS` is empty:

1. Discover all packages: Glob `packages/*/package.json`
2. Launch **parallel subagents** (`subagent_type: "general-purpose"`, `model: "sonnet"`) — one per package + one for project root:

**Per-package subagent prompt template:**

```
Update README.md for package {pkg-name} at {pkg-path}.

PURPOSE: README.md is the sole API documentation source for Claude Code.
Every exported symbol must be documented. Claude Code does NOT read JSDoc.

STEPS:
1. Read {pkg-path}/src/index.ts — get all exports and #region grouping.
2. For each export, read the source file for signatures, classes, types.
3. Read {pkg-path}/README.md (and docs/ if exists).
4. Compare exports vs documentation:
   - ADDED (in source, not in README): add documentation with description + code example.
     Include import path: import { X } from "@simplysm/{pkg-name}"
   - REMOVED (in README, not in source): delete documentation.
   - CHANGED (both exist, API differs): update to match current API.
   - OK: don't touch.
5. Section organization follows index.ts #region structure.
6. Write in English. No changelog sections.
7. If README doesn't exist, create with standard structure:
   # @simplysm/{pkg-name}
   {description from package.json}
   ## Installation
   ## Main Modules (sections per #region)
   ## Types
8. If docs/ subfolder exists, update those files too.
9. Report: list of ADDED/REMOVED/CHANGED items.
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

| Mistake                               | Fix                                                                 |
| ------------------------------------- | ------------------------------------------------------------------- |
| Skipping exports with @internal JSDoc | Document ALL exports — Claude Code doesn't read JSDoc               |
| Rewriting OK sections                 | Only touch ADDED/REMOVED/CHANGED items                              |
| Ignoring existing docs/ structure     | If docs/ exists, update those files too                             |
| Arbitrary section reorganization      | Follow index.ts `#region` structure                                 |
| Missing import paths in examples      | Always: `import { X } from "@simplysm/..."`                         |
| Writing in Korean                     | README must be in English                                           |
| Adding changelog sections             | Never add version history                                           |
| Editing before reporting diff         | Always report ADDED/REMOVED/CHANGED and wait for confirmation       |
| Destroying docs/ link format          | If README uses `[name](docs/file.md#anchor)`, preserve that pattern |
