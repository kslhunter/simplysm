---
name: sd-api-name-review
description: "Public API naming review (explicit invocation only)"
model: sonnet
---

# sd-api-name-review

## Overview

Compare a library/module's public API names against industry standards and review internal consistency, producing a standardization report. Uses **sd-explore** to extract the API surface, then dispatches research agents for industry comparison.

**Analysis only — no code modifications.**

## Principles

- **Breaking changes are irrelevant**: Do NOT dismiss findings because renaming would cause a breaking change.
- **Internal consistency first**: Internal naming consistency takes priority over external standards.

## Usage

- `/sd-api-name-review packages/solid` — full naming review
- `/sd-api-name-review packages/orm-common` — review specific package
- `/sd-api-name-review` — if no argument, ask the user for the target path

## Target Selection

- With argument: review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.

## Workflow

### Step 1: Prepare Context

Read these files:
- `CLAUDE.md` — project overview
- `.claude/rules/sd-refs-linker.md` — reference guide
- Target's `package.json` — version (v12/v13)

Based on version and target, read all applicable reference files (e.g., `sd-code-conventions.md`, `sd-solid.md`).

Keep the collected conventions in memory — they will inform the analysis in later steps.

### Step 2: API Extraction (via sd-explore)

Follow the **sd-explore** workflow to extract the target's public API surface.

**sd-explore input:**

- **Target path**: the review target directory
- **Name**: `api-name-review`
- **File patterns**: `**/*.ts`, `**/*.tsx` (exclude `node_modules`, `dist`)
- **Analysis instructions**:

"For each file, extract its public API surface:
- All exported identifiers (functions, classes, types, constants, etc.)
- Names and types of user-facing parameters/options/config
- Naming pattern classification (prefixes, suffixes, verb/adjective/noun usage, abbreviations, etc.)

Output format:
```
# API Surface: [directory names]

## Exports
- `path/to/file.ts` — `exportName`: type (function/class/type/const), signature summary

## Naming Patterns
- Pattern: description (e.g., 'create-' prefix for factory functions)
- Examples: list of identifiers using this pattern
```
"

### Step 3: Industry Standard Research

Based on Step 2 results:

1. Identify **recurring naming patterns** from the extracted API
2. Determine the target's domain and tech stack to **select comparable libraries**
3. Dispatch **parallel agents** to web-search/fetch official docs for each comparable library, investigating naming conventions for the same pattern categories

Each research agent receives:

```
Research naming conventions in [library name] for these pattern categories:
[list of patterns from Step 2]

For each pattern, document:
- What naming convention the library uses
- Specific examples from the API
- Any documented rationale for the convention

Write results to: .tmp/api-name-review/research-{library_name}.md
```

### Step 4: Comparative Analysis & Verification

Cross-compare Step 2 (API surface) and Step 3 (industry research) results.

Classify each naming pattern:

| Priority | Criteria                                               |
| -------- | ------------------------------------------------------ |
| **P0**   | Misaligned with majority of surveyed libraries         |
| **P1**   | Internal inconsistency (same concept, different names) |
| **P2**   | Better industry term exists (optional)                 |
| **Keep** | Already aligned with standards                         |

**MANDATORY: Read actual code for EVERY finding.** For each finding, `Read` the file at the referenced location before finalizing. Do NOT rely on explore descriptions alone — verify against the actual code.

Each finding includes: current name, recommended change, rationale (usage patterns per library).

### Step 5: Report & User Confirmation

Present **Keep** items to the user as a summary.

Then present each **P0/P1/P2** finding to the user **one at a time**, ordered by priority (P0 → P1 → P2).

For each finding, explain:
1. **What the problem is** — the current name and why it's misaligned or inconsistent
2. **How it could be fixed** — recommended name(s) with rationale from surveyed libraries
3. **Ask**: address this or skip?

Collect only findings the user confirms. If the user skips all findings, report that and end.

### Step 6: Brainstorm Handoff

Invoke **sd-brainstorm** with all user-confirmed findings as context:

_
"Design naming changes for the following review findings.

**For each finding, you MUST:**
1. Review it thoroughly — examine the code, understand the context, assess the real impact
2. If any aspect is unclear or ambiguous, ask the user (one question at a time, per brainstorm rules)
3. If a finding has low cost-benefit (adds complexity for marginal gain, pure style preference, scope too small), drop it. After triage, briefly list all dropped findings with one-line reasons (no user confirmation needed).
4. For findings worth fixing, explore approaches and design solutions

Findings that survive your triage become the design scope. Apply your normal brainstorm process (gap review → approaches → design presentation) to the surviving findings as a group.

<include all confirmed findings with their priority, file:line, current name, recommended name, and rationale>"

sd-brainstorm then owns the full cycle: triage (with user input as needed) → design.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using git diff to limit scope | Review ALL source files under target |
| Skipping context preparation | Always read conventions and refs before analysis |
| Skipping verification | Always verify findings against actual code |
| Dismissing findings due to breaking changes | Breaking changes are irrelevant — report the naming issue |
| Not writing research results to files | Research agents MUST write to disk — prevents context bloat |
