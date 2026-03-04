---
name: sd-refactor
description: "Use when the user requests refactoring analysis, structural improvement, complexity reduction, duplication removal, or asks how to restructure code. Triggers: 'refactor this', 'simplify this', 'reduce complexity', 'clean up structure', 'improve maintainability', 'reorganize code'."
---

# sd-refactor

## Overview

Analyze code for structural improvement opportunities. The core question is: **"How can this code be better structured?"** — not "Is this code correct?"

This is distinct from review (finding defects) and lint (enforcing conventions). Refactoring focuses on **improving design without changing behavior**.

## When to Use

- "Refactor this code/package"
- "Simplify this", "reduce complexity"
- "How can I restructure this?"
- "Find duplication", "improve maintainability"

## When NOT to Use

- Finding bugs, security issues → use sd-review
- Enforcing conventions, style → use sd-check (lint)
- Fixing broken behavior → use sd-debug

## Usage

- `/sd-refactor packages/core-common` — full refactoring analysis
- `/sd-refactor packages/solid/src/components focus on duplication` — selective analysis
- `/sd-refactor` — if no argument, ask the user for the target path

## Target Selection

- With argument: analyze source code at the given path
- Without argument: ask the user for the target path

**Important:** Analyze ALL source files under the target path. Do not use git status or git diff to limit scope.

## Analyzer Perspectives

| Analyzer | Prompt Template | Perspective |
|----------|----------------|-------------|
| **Code Simplifier** | `code-simplifier-prompt.md` | Complexity, duplication, readability — "Can this be simpler?" |
| **Structure Analyzer** | `structure-analyzer-prompt.md` | Responsibility separation, abstraction levels, module organization — "Is the structure clean?" |

## Analyzer Selection

By default, run **both analyzers**. If the user specifies a focus:

| User says | Run |
|-----------|-----|
| "duplication", "complexity", "simplify", "readability" | Code Simplifier only |
| "structure", "responsibility", "module", "organization", "abstraction" | Structure Analyzer only |
| (no specific focus) | Both |

## Scope Rules — CRITICAL

Refactoring analysis has a strict scope. Violations of scope produce noise, not value.

**IN SCOPE — Report these:**
- Unnecessary complexity: over-abstraction, needless indirection, complex generics
- Duplication: same logic repeated, similar functions that could be unified
- Readability: hard-to-follow control flow, unclear variable names, implicit behavior
- Module structure: too many files for simple concepts, or too many responsibilities in one file
- Abstraction level mismatches: high-level and low-level logic mixed in one function
- Responsibility separation: a module doing things that belong elsewhere
- Coupling: changes that cascade widely, tightly coupled modules

**OUT OF SCOPE — Do NOT report these:**
- **Bugs, security, logic errors** → that's review, not refactoring
- **Naming conventions, API design, type quality** → that's API review, not refactoring
- **Code language violations** (Korean comments, non-English strings) → that's lint
- **Documentation gaps** (missing JSDoc, missing comments) → that's documentation
- **Style preferences** (import ordering, formatting) → that's lint
- **Performance optimization** (unless it's also a structural improvement) → separate concern
- **Issues OUTSIDE the target path** (how other packages use this code)

## Workflow

### Step 1: Dispatch Analyzers

Read the prompt template files from this skill's directory. Replace `[TARGET_PATH]` with the actual target path. Then dispatch using `Agent(general-purpose)`:

```
Agent(subagent_type=general-purpose, prompt=<filled template>)
```

Run selected analyzers **in parallel** (multiple Agent calls in a single message).

### Step 2: Verify Findings

After collecting results from all analyzers, **Read the actual code** for each finding and verify:

- **Valid**: the structural issue is real AND within scope → include
- **Invalid — out of scope**: bug, convention, documentation issue → drop
- **Invalid — out of target**: issue is about code outside the target path → drop
- **Invalid — duplicate**: another analyzer already reported the same → keep the better-scoped one
- **Invalid — bikeshedding**: minor style preference, no real structural impact → drop
- **Invalid — by design**: intentional architectural decision → drop

### Step 3: Final Report

Compile only **verified findings** grouped by impact:

```
## Refactoring Analysis: <target-path>

### HIGH IMPACT
[findings that significantly improve maintainability]

### MEDIUM IMPACT
[findings that noticeably improve structure]

### LOW IMPACT
[small improvements worth noting]
```

Each finding includes: **source analyzer**, **file:line**, **evidence**, **issue**, and **suggestion** (in words, not code blocks).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reporting bugs as refactoring | Ask: "Is the behavior wrong?" If yes → review, not refactoring |
| Reporting style/convention issues | Ask: "Is this a structural problem?" If no → lint, not refactoring |
| Suggesting documentation additions | Adding comments/JSDoc is not refactoring |
| Including performance-only findings | Unless the fix is also structural, it's optimization not refactoring |
| Providing code blocks in suggestions | Describe the improvement in words. Let the user decide the implementation |

## Completion Criteria

Present the refactoring analysis report to the user. No code modifications.
