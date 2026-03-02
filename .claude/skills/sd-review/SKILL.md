---
name: sd-review
description: "Comprehensive multi-perspective code review (explicit invocation only)"
---

# sd-review

## Overview

Perform a multi-perspective code review of a package or specified path, producing a comprehensive report. **Analysis only — no code modifications.**

Dispatches up to 3 reviewer agents in parallel using prompt templates. Each agent independently explores the codebase from its own perspective. Collects results, verifies findings against actual code, and compiles the final report.

## Usage

- `/sd-review packages/solid` — full review (all 3 perspectives)
- `/sd-review packages/solid 버그 위주로` — selective review based on request
- `/sd-review` — if no argument, ask the user for the target path

## Target Selection

- With argument: review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.

## Reviewer Perspectives

| Reviewer | Prompt Template | Perspective |
|----------|----------------|-------------|
| **Code Reviewer** | `code-reviewer-prompt.md` | Correctness & Safety — bugs, security, logic errors |
| **API Reviewer** | `api-reviewer-prompt.md` | Usability & DX — naming, types, consistency |
| **Code Simplifier** | `code-simplifier-prompt.md` | Maintainability — complexity, duplication, structure |

## Reviewer Selection

By default, run **all 3 reviewers**. If the user specifies a focus in natural language, select only the relevant reviewer(s):

| User says | Run |
|-----------|-----|
| "버그", "보안", "security", "bugs" | Code Reviewer only |
| "API", "네이밍", "타입", "DX" | API Reviewer only |
| "복잡도", "중복", "구조", "유지보수" | Code Simplifier only |
| "버그랑 API" | Code Reviewer + API Reviewer |
| (no specific focus) | All 3 |

Use judgment for ambiguous requests. When in doubt, run all 3.

## Workflow

### Step 1: Dispatch Reviewers

Read the prompt template files from this skill's directory. Replace `[TARGET_PATH]` with the actual target path. Then dispatch using `Agent(general-purpose)`:

```
Agent(subagent_type=general-purpose, prompt=<filled template>)
```

Run selected reviewers **in parallel** (multiple Agent calls in a single message).

### Step 2: Verify Findings

After collecting results from all reviewers, verify each finding against the actual code:

- **Valid**: the issue is real → include in the report
- **Invalid — already handled**: handled elsewhere in the codebase (provide evidence)
- **Invalid — intentional pattern**: by-design architectural decision
- **Invalid — misread**: the reviewer misinterpreted the code

### Step 3: Final Report

Compile only **verified findings** grouped by severity (not by reviewer):

```
## Review Report: <target-path>

### CRITICAL
[verified critical findings from all reviewers]

### WARNING
[verified warning findings from all reviewers]

### INFO
[verified info findings from all reviewers]

### Invalid Findings Summary (optional)
[findings filtered out and why]
```

Each finding includes: **source reviewer**, **file:line**, **evidence**, **issue**, and **suggestion**.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using git diff to limit review scope | Review ALL source files under target path |
| Skipping verification step | Always verify reviewer findings against actual code |
| Reporting unverified issues | Only include verified findings in final report |
| Running all reviewers for focused requests | Match reviewer selection to user's request |

## Completion Criteria

Present the comprehensive report to the user. No code modifications.
