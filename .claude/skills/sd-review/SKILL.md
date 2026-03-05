---
name: sd-review
description: "Use when the user explicitly requests code review, refactoring analysis, or structural improvement. Covers correctness, safety, API design, conventions, complexity, duplication, and code structure. Explicit invocation only."
---

# sd-review

## Overview

Comprehensive code analysis combining **defect review** (correctness, safety, API, conventions) and **refactoring analysis** (structure, simplification). Dispatches up to 5 reviewer agents in parallel, verifies findings against actual code, and compiles a unified report.

**Analysis only — no code modifications.**

## Principles

- **Breaking changes are irrelevant**: Reviewers must NOT dismiss, soften, or deprioritize findings because the suggested fix would cause a breaking change. Correctness, safety, usability, architecture, and maintainability always take priority over API stability. If something is wrong, report it — regardless of breaking change impact.

## Usage

- `/sd-review packages/solid` — full review (all perspectives)
- `/sd-review packages/solid focus on bugs` — selective review based on request
- `/sd-review packages/solid focus on refactoring` — structural analysis only
- `/sd-review` — if no argument, ask the user for the target path

## Target Selection

- With argument: review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.

## Reviewer Perspectives

| Reviewer | Prompt Template | Perspective |
|----------|----------------|-------------|
| **Code Reviewer** | `code-reviewer-prompt.md` | Correctness & Safety — bugs, security, logic errors, architectural defects (circular deps, boundary violations) |
| **API Reviewer** | `api-reviewer-prompt.md` | Usability & DX — naming, types, consistency |
| **Convention Checker** | `convention-checker-prompt.md` | Project rules — Grep-based systematic check against convention files (prohibited patterns, naming rules, export rules) |
| **Code Simplifier** | `code-simplifier-prompt.md` | Simplification — complexity, duplication, readability |
| **Structure Analyzer** | `structure-analyzer-prompt.md` | Organization — responsibility separation, abstraction levels, module structure |

## Reviewer Selection

By default, run **all 5 reviewers**. If the user specifies a focus in natural language, select only the relevant reviewer(s):

| User says | Run |
|-----------|-----|
| "bugs", "security", "safety", "architecture", "dependencies", "boundaries" | Code Reviewer only |
| "API", "naming", "types", "DX" | API Reviewer only |
| "conventions", "rules", "patterns" | Convention Checker only |
| "simplify", "complexity", "duplication", "readability" | Code Simplifier only |
| "structure", "responsibility", "module", "organization", "abstraction" | Structure Analyzer only |
| "defects", "correctness" | Code + API + Convention |
| "refactoring", "refactor", "maintainability" | Simplifier + Structure |
| (no specific focus) | All 5 |

Use judgment for ambiguous requests.

## Workflow

### Step 1: Dispatch Reviewers

Read the prompt template files from this skill's directory. Replace `[TARGET_PATH]` with the actual target path. Then dispatch using `Agent(general-purpose)`:

```
Agent(subagent_type=general-purpose, prompt=<filled template>)
```

Run selected reviewers **in parallel** (multiple Agent calls in a single message).

### Step 2: Verify Findings

After collecting results from all reviewers, **Read the actual code** for each finding and verify.

**For defect findings (Code, API, Convention reviewers):**

- **Valid**: the issue is real AND within scope → include in the report
- **Invalid — self-contradicted**: the reviewer's own analysis shows the issue is mitigated (e.g., "exploitability is limited because..."). Drop it.
- **Invalid — type-only**: reports a type definition as a runtime issue without showing actual runtime code that triggers it. Drop it.
- **Invalid — out of scope**: the issue is about code outside the target path (e.g., how other packages use this code). Drop it.
- **Invalid — duplicate**: another reviewer already reported the same issue. Keep only the one from the correct domain.
- **Invalid — bikeshedding**: minor style preference on stable, well-commented code (magic numbers with clear comments, small interface field duplication, naming when used consistently). Drop it.
- **Invalid — severity inflated**: downgrade or drop findings where the stated severity doesn't match the actual impact.
- **Invalid — already handled**: handled elsewhere in the codebase (provide evidence)
- **Invalid — intentional pattern**: by-design architectural decision
- **Invalid — misread**: the reviewer misinterpreted the code
- **Invalid — tradeoff-negative**: the fix introduces more complexity, risk, or cost than the issue itself warrants (e.g., large-scale refactor for marginal safety gain, performance regression to fix a rare edge case)

**For refactoring findings (Simplifier, Structure reviewers):**

**Check 1 — Scope**:
- Is this about code structure? Not bugs, conventions, documentation, or performance → if not, drop (out of scope)
- Is the issue within the target path? → if not, drop (out of target)
- Already reported by another reviewer? → keep the better-scoped one (duplicate)
- Minor style preference with no real structural impact? → drop (bikeshedding)

**Check 2 — Duplication reality** (for duplication findings):
- Count actual duplicated lines. If < 30 lines total, drop — not worth extracting.
- Compare side by side. If the "duplicates" have meaningful behavioral differences (different guards, parameters, error handling), drop — not true duplication.
- Check if "similar types" are an intentional Input/Normalized pattern (optional props → required internal def with defaults applied, `children` → `cell` rename). If yes, drop — by design.

**Check 3 — Separation benefit** (for "too big", "mixed responsibilities", "mixed abstraction" findings):
- Is the piece proposed for extraction < ~150 lines AND directly depends on the rest of the file (renders, calls, or shares state)? If yes, drop — splitting adds overhead without benefit.
- Do all the abstractions serve a single cohesive domain concept (all functions called from one entry point, all types used together)? If yes, drop — it's cohesion, not mixing.
- Would a realistic consumer reuse the extracted piece independently? If no, drop.

**Check 4 — Not by design**: Is this an established pattern used consistently across the codebase? (Provider+Component, Factory+Product, Input/Output types) If yes, drop.

**Check 5 — Tradeoff-negative** (all refactoring findings):
- Does the refactoring introduce significant complexity (new abstractions, indirection, generics) for marginal structural benefit? If yes, drop.
- Does it require touching many files/callsites relative to the improvement? If yes, drop.
- Would it degrade performance, readability, or debuggability more than the current structure costs? If yes, drop.

### Step 3: Invalid Findings Report

Present only the **filtered findings** to the user:

```
## Review: <target-path>

### Invalid Findings
[findings filtered out — grouped by rejection reason]
```

If there are **no valid findings**, report that the review found no actionable issues and end.

### Step 4: Brainstorm Handoff

Pass all **verified findings** to **sd-brainstorm** with the instruction: **"Present each finding to the user one at a time. For each, explain the problem, possible fixes, and tradeoffs, then ask whether to address or skip. Only proceed with confirmed findings."**

Each finding includes: **source reviewer**, **file:line**, **evidence**, **issue**, and **suggestion**.

sd-brainstorm will handle user confirmation, prioritization, grouping, approach exploration, and design.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using git diff to limit review scope | Review ALL source files under target path |
| Skipping verification step | Always verify reviewer findings against actual code |
| Reporting unverified issues | Only include verified findings in final report |
| Running all reviewers for focused requests | Match reviewer selection to user's request |
| Reporting bugs as refactoring | Ask: "Is the behavior wrong?" If yes → defect, not refactoring |
| Reporting style as refactoring | Ask: "Is this structural?" If no → lint, not refactoring |
| Presenting valid findings as final report | Valid findings must be handed off to sd-brainstorm for user confirmation |

## Completion Criteria

Report invalid findings, then hand off all verified findings to sd-brainstorm for user confirmation and design. No code modifications during review.
