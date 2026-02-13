---
name: sd-review
description: Use when performing a comprehensive code review of a package or path - uses sd-explore for code analysis in a forked context, then dispatches to specialized reviewer agents
model: inherit
---

# sd-review

## Overview

Perform a multi-perspective code review of a package or specified path, producing a comprehensive report. **Analysis only — no code modifications.**

Analyzes code via the `sd-explore` skill, then runs up to 4 subagents in parallel for specialized review. Collects subagent results, verifies each finding against actual code, and writes the final report.

## Usage

- `/sd-review packages/solid` — review source code at the given path
- `/sd-review` — if no argument, ask the user for the target path

## Target Selection

1. If `$ARGUMENTS` contains a path, use that path
2. Otherwise, ask the user for the target path

**Important: the review scope is ALL source files under the target path.** Do not use git status or git diff to limit to changed files. Analyze every source file in the target path.

## Reviewer Agents

Run subagents in parallel via the Task tool:

| Agent Type               | Role | Condition |
|--------------------------|------|-----------|
| `sd-code-reviewer`       | Bugs, security, logic errors, convention issues | Always |
| `sd-code-simplifier`     | Complexity, duplication, readability issues | Always |
| `sd-api-reviewer`        | DX/usability, naming, type hints | Always |
| `sd-security-reviewer`   | ORM SQL injection, input validation vulnerabilities | When target path contains ORM queries or service endpoints |

## Workflow

### Step 1: Code Analysis via sd-explore

Invoke the `sd-explore` skill via the Skill tool to analyze the target path:

```
Skill: sd-explore
Args: <target-path>
```

This runs in a **separate context**, so it does not consume the main context window. The analysis covers:

- Feature Discovery: entry points, core files, module boundaries
- Code Flow Tracing: call chains, data transformations, state changes
- Architecture Analysis: abstraction layers, design patterns, dependency graph
- Implementation Details: error handling, public API surface, performance

### Step 2: Dispatch Analysis to Reviewers

Run subagents **in parallel** via the Task tool. Include the sd-explore analysis results in each subagent's prompt:

- **sd-code-reviewer**: Based on the analysis, find bugs, security vulnerabilities, logic errors, and convention issues. Each finding must include **file:line** and **evidence**.
- **sd-code-simplifier**: Based on the analysis, find unnecessary complexity, code duplication, and readability issues. Each finding must include **file:line** and **evidence**. **No code modifications.**
- **sd-api-reviewer**: Based on the analysis, review API intuitiveness, naming consistency, type hints, error messages, and configuration complexity. Each finding must include **file:line** and **evidence**.
- **sd-security-reviewer** *(conditional)*: If the sd-explore analysis reveals ORM queries (`orm-common`, `orm-node`, query builders, `expr.eq`, `.where()`, `.result()`) or service endpoints (`ServiceServer`, RPC handlers), also dispatch this agent. Based on the analysis, find SQL injection risks, missing input validation, and unvalidated user input reaching ORM queries. Each finding must include **file:line** and **evidence**.

### Step 3: Verify Issues

After collecting results from all 3 subagents, verify each issue against the actual code:

- **Valid**: the issue is real → include in the report
- **Invalid — already handled**: handled elsewhere in the codebase (provide evidence)
- **Invalid — intentional pattern**: by-design architectural decision
- **Invalid — misread**: the reviewer misinterpreted the code

### Step 4: Final Report

Compile only **verified findings** into a comprehensive report.

### Report Structure

| Section | Priority | Source |
|---------|----------|--------|
| **Architecture Summary** | — | sd-explore analysis |
| **Critical Issues** | P0 | Bugs, security vulnerabilities |
| **Security Issues** | P0 | SQL injection, input validation (when sd-security-reviewer ran) |
| **Quality Issues** | P1 | Logic errors, missing error handling, performance |
| **DX/Usability Issues** | P2 | API intuitiveness, naming, type hints |
| **Simplification Opportunities** | P3 | Complexity removal, duplicate code, abstractions |
| **Convention Issues** | P4 | Project convention mismatches |

Each issue includes **file:line**, **description**, and **suggestion**.

Optionally include an **Invalid Findings Summary** appendix showing which findings were filtered out and why.

## Completion Criteria

Present the comprehensive report to the user. No code modifications.
