---
name: sd-review
description: "Use when the user explicitly requests code review, refactoring analysis, or structural improvement. Covers correctness, safety, API design, conventions, complexity, duplication, and code structure. Explicit invocation only."
---

# sd-review

## Overview

Comprehensive code analysis combining **defect review** (correctness, safety, API, conventions) and **refactoring analysis** (structure, simplification). Uses split-explore to minimize redundant file reads, then dispatches reviewers with pre-filtered context.

**Analysis only — no code modifications.**

## Principles

- **Breaking changes are irrelevant**: Reviewers must NOT dismiss findings because the fix would cause a breaking change.

## Usage

- `/sd-review packages/solid` — full review (all perspectives)
- `/sd-review packages/solid focus on bugs` — selective review
- `/sd-review packages/solid focus on refactoring` — structural analysis only
- `/sd-review` — if no argument, ask the user for the target path

## Target Selection

- With argument: review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.

## Reviewer Perspectives

| Reviewer | Prompt Template | Tag | Perspective |
|----------|----------------|-----|-------------|
| **Code Reviewer** | `code-reviewer-prompt.md` | `[CORRECTNESS]` | Correctness & Safety |
| **API Reviewer** | `api-reviewer-prompt.md` | `[API]` | Usability & DX |
| **Convention Checker** | `convention-checker-prompt.md` | *(all files)* | Project rules — Grep-based |
| **Refactoring Analyzer** | `refactoring-analyzer-prompt.md` | `[REFACTOR]` | Structure & Simplification |

## Reviewer Selection

By default, run **all 4 reviewers**. If the user specifies a focus, select relevant reviewer(s):

| User says | Run |
|-----------|-----|
| "bugs", "security", "safety", "architecture", "dependencies" | Code Reviewer |
| "API", "naming", "types", "DX" | API Reviewer |
| "conventions", "rules", "patterns" | Convention Checker |
| "simplify", "complexity", "duplication", "structure", "module" | Refactoring Analyzer |
| "defects", "correctness" | Code + API + Convention |
| "refactoring", "refactor", "maintainability" | Refactoring Analyzer |
| (no specific focus) | All 4 |

## Workflow

### Step 1: Prepare Context

Read these files:
- `CLAUDE.md` — project overview
- `.claude/rules/sd-refs-linker.md` — reference guide
- Target's `package.json` — version (v12/v13)

Based on version and target, read all applicable reference files (e.g., `sd-code-conventions.md`, `sd-solid.md`).

Keep the collected conventions in memory — they will be inlined into each reviewer's prompt in Step 3.

### Step 2: Split Explore (Parallel)

Glob all .ts/.tsx files under target (exclude node_modules, dist).

- **< 30 files**: run a single Explore agent (no split)
- **>= 30 files**: split into groups of ~30

**Splitting strategy**: Group files by subdirectory. If the target is mostly flat (few subdirectories), group by file proximity instead. The goal is balanced groups.

Dispatch each group as a parallel `Agent(subagent_type=Explore)` call. Each agent should:

1. Read all .ts/.tsx files in its assigned directories
2. Write a 1-2 line summary per file
3. Tag files that need deep review (~30-50% of files; a file can have multiple tags)

**Tag criteria:**

- **[CORRECTNESS]** — Unguarded null/`!` assertions, async races, DOM manipulation (SSR risks), resource lifecycle gaps, swallowed exceptions, mutable state for sync
- **[API]** — Public exports, complex type signatures/generics/overloads, props/options interfaces, naming inconsistency
- **[REFACTOR]** — File > 300 lines or function > 50 lines, deep nesting (> 3 levels), similar patterns across files, mixed abstraction levels, mixed responsibilities

**Output**: Write result to `.tmp/sd-review/explore-{group}.md` in this format:

```markdown
# Explore: [directory names]

## File Summaries
- `path/to/file.ts` — Brief description

## Tagged Files

### CORRECTNESS
- `path/to/file.ts:42` — Suspected issue description

### API
- `path/to/file.ts` — Why this needs API review

### REFACTOR
- `path/to/file.ts` — Structural concern
```

Files not listed under Tagged Files are considered clean. Do NOT add tags in File Summaries — Tagged Files is the single source of truth.

### Step 3: Dispatch Reviewers (Parallel)

Read each reviewer's prompt template. Replace:
- `[CONVENTIONS]` → the conventions text collected in Step 1 (inline, not a file path)
- `[EXPLORE_FILES]` → comma-separated list of explore output file paths

Dispatch selected reviewers in parallel.

### Step 4: Verify & Deduplicate

This is the **orchestrator-level** verification. Reviewers already self-verify, but findings can still be invalid or overlap. Read the actual code for each finding.

**Deduplication**: If multiple reviewers flag the same code location, keep the finding under the most specific reviewer:
- Convention violation + correctness concern → Convention Checker owns it
- API issue + structural concern → API Reviewer owns it
- When unclear, keep the one with stronger evidence

**For defect findings (Code, API, Convention):**

Drop if: self-contradicted, type-only (no runtime trigger), out of scope, duplicate, bikeshedding, severity inflated, already handled, intentional pattern, misread, tradeoff-negative.

**For refactoring findings:**

- **Scope**: structural issue? within target? not a duplicate?
- **Duplication reality**: < 30 lines → drop. Behavioral differences → drop. Intentional Input/Normalized pattern → drop.
- **Separation benefit**: < ~150 lines AND tightly coupled → drop. Single cohesive domain → drop. Not independently reusable → drop.
- **By design**: established pattern used consistently → drop.
- **Tradeoff-negative**: introduces more complexity than it removes → drop.

### Step 5: Report

Present **both** invalid and valid findings:

```
## Review: <target-path>

### Invalid Findings
[grouped by rejection reason — brief, one line each]

### Valid Findings
[full details for each verified finding]
```

If no valid findings, report that and end here.

**If valid findings exist, you MUST proceed to Step 6. Do NOT ask the user whether to apply findings directly.**

### Step 6: Brainstorm Handoff

Pass verified findings to **sd-brainstorm**: "Present each finding to the user one at a time. Explain the problem, possible fixes, tradeoffs, then ask whether to address or skip."

Each finding includes: **source reviewer**, **file:line**, **evidence**, **issue**, **suggestion**.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using git diff to limit scope | Review ALL source files under target |
| Skipping verification | Always verify against actual code |
| Running all reviewers for focused requests | Match selection to user's request |
| Building per-reviewer files from explore results | Reviewers read explore files directly — no intermediate step |
