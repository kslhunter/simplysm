---
name: sd-review
description: "Comprehensive multi-perspective code review (explicit invocation only)"
---

# sd-review

## Overview

Perform a multi-perspective code review of a package or specified path, producing a comprehensive report. **Analysis only — no code modifications.**

Analyzes code via the built-in Explore agent, then runs up to 4 subagents in parallel for specialized review. Collects subagent results, verifies each finding against actual code, and writes the final report.

## Usage

- `/sd-review packages/solid` — review source code at the given path
- `/sd-review` — if no argument, ask the user for the target path

## When to Use

- Before merging major features or after significant refactoring
- When assessing overall code quality of a package
- When onboarding to unfamiliar code and want a quality overview

**When NOT to use:**

- Single-file or trivial changes (typo, config tweak)
- When you need code modifications (sd-review is analysis-only)

## Target Selection

- With argument: `/sd-review packages/solid` — review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.

## Reviewer Agents

Run subagents in parallel via the Task tool:

| Agent Type             | Role                                                | Condition                                                  |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `sd-code-reviewer`     | Bugs, security, logic errors, convention issues     | Always                                                     |
| `sd-code-simplifier`   | Complexity, duplication, readability issues         | Always                                                     |
| `sd-api-reviewer`      | DX/usability, naming, type hints                    | Always                                                     |
| `sd-security-reviewer` | ORM SQL injection, input validation vulnerabilities | When target path contains ORM queries or service endpoints |

## Workflow

### Step 1: Code Analysis via Explore Agent

Invoke the built-in Explore agent via the Task tool to analyze the target path:

```
Task(subagent_type=Explore)
Prompt: "very thorough" analysis of <target-path>:
- Entry points, core files, module boundaries
- Call chains, data transformations, state changes
- Abstraction layers, design patterns, dependency graph
- Error handling, public API surface
```

This runs in a **separate context**, so it does not consume the main context window.

### Step 2: Dispatch Analysis to Reviewers

Run subagents **in parallel** via the Task tool. Include the Explore analysis results in each subagent's prompt:

- **sd-code-reviewer**: Based on the analysis, find bugs, security vulnerabilities, logic errors, and convention issues. Each finding must include **file:line** and **evidence**.
- **sd-code-simplifier**: Based on the analysis, find unnecessary complexity, code duplication, and readability issues. Each finding must include **file:line** and **evidence**. **No code modifications.**
- **sd-api-reviewer**: Based on the analysis, review API intuitiveness, naming consistency, type hints, error messages, and configuration complexity. Each finding must include **file:line** and **evidence**.
- **sd-security-reviewer** _(conditional)_: If the Explore analysis reveals ORM queries (`orm-common`, `orm-node`, query builders, `expr.eq`, `.where()`, `.result()`) or service endpoints (`ServiceServer`, RPC handlers), also dispatch this agent. Based on the analysis, find SQL injection risks, missing input validation, and unvalidated user input reaching ORM queries. Each finding must include **file:line** and **evidence**.

### Step 3: Verify Issues

After collecting results from all 3 subagents, verify each issue against the actual code:

- **Valid**: the issue is real → include in the report
- **Invalid — already handled**: handled elsewhere in the codebase (provide evidence)
- **Invalid — intentional pattern**: by-design architectural decision
- **Invalid — misread**: the reviewer misinterpreted the code

### Step 4: Final Report

Compile only **verified findings** into a comprehensive report.

### Report Structure

| Section                          | Priority | Source                                                          |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| **Architecture Summary**         | —        | Explore analysis                                                |
| **Critical Issues**              | P0       | Bugs, security vulnerabilities                                  |
| **Security Issues**              | P0       | SQL injection, input validation (when sd-security-reviewer ran) |
| **Quality Issues**               | P1       | Logic errors, missing error handling, performance               |
| **DX/Usability Issues**          | P2       | API intuitiveness, naming, type hints                           |
| **Simplification Opportunities** | P3       | Complexity removal, duplicate code, abstractions                |
| **Convention Issues**            | P4       | Project convention mismatches                                   |

Each issue includes **file:line**, **description**, and **suggestion**.

Optionally include an **Invalid Findings Summary** appendix showing which findings were filtered out and why.

## Common Mistakes

| Mistake                              | Fix                                                 |
| ------------------------------------ | --------------------------------------------------- |
| Using git diff to limit review scope | Review ALL source files under target path           |
| Skipping verification step           | Always verify subagent findings against actual code |
| Reporting unverified issues          | Only include verified findings in final report      |

## Completion Criteria

Present the comprehensive report to the user. No code modifications.
