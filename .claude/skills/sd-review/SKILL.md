---
name: sd-review
description: Use when performing a comprehensive code review of a package or path - leader analyzes code directly and dispatches to specialized reviewer agents
---

# sd-review

## Overview

Perform a multi-perspective code review of a package or specified path, producing a comprehensive report. **Analysis only — no code modifications.**

Team-based workflow: the leader reads and analyzes the code directly, then sends the analysis to reviewer agents. Reviewers identify issues from their specialized perspectives and report back. The leader verifies reported issues against the actual code and writes the final report.

## Usage

- `/sd-review packages/solid` — review source code at the given path
- `/sd-review` — if no argument, ask the user for the target path

## Target Selection

1. If `$ARGUMENTS` contains a path, use that path
2. Otherwise, ask the user for the target path

**Important: the review scope is ALL source files under the target path.** Do not use git status or git diff to limit to changed files. Analyze every source file in the target path.

## Team Composition

Create a team with TeamCreate, then spawn the following 3 teammates via the Task tool:

| Name | Agent Type | Role |
|------|-----------|------|
| **code-reviewer** | `feature-dev:code-reviewer` | Bugs, security, logic errors, convention issues |
| **simplifier** | `code-simplifier:code-simplifier` | Complexity, duplication, readability issues |
| **dx-reviewer** | `sd-api-reviewer` | DX/usability, naming, type hints |

The leader performs code analysis directly (replaces the former explorer role).

## Workflow

### Step 1: Leader Analyzes Code

The leader uses Glob, Grep, Read, etc. to directly analyze the target path:

- **Feature Discovery**: entry points (APIs, UI components, CLI commands), core files, module boundaries
- **Code Flow Tracing**: call chains, data transformation paths, state changes and side effects
- **Architecture Analysis**: abstraction layers, design patterns, interfaces between components, dependency graph
- **Implementation Details**: error handling patterns, public API surface, performance considerations

**No code modifications — analysis only.**

### Step 2: Dispatch Analysis to Reviewers

The leader sends the analysis results to each of the 3 reviewers via SendMessage, with the following instructions:

- **code-reviewer**: Based on the analysis, find bugs, security vulnerabilities, logic errors, and convention issues. For each finding, include **file:line** and **evidence**.
- **simplifier**: Based on the analysis, find unnecessary complexity, code duplication, and readability issues. For each finding, include **file:line** and **evidence**. **No code modifications.**
- **dx-reviewer**: Based on the analysis, review API intuitiveness, naming consistency, type hints, error messages, and configuration complexity. For each finding, include **file:line** and **evidence**.

### Step 3: Leader Verifies Issues

After collecting findings from all 3 reviewers, the leader verifies each issue by checking the actual code:

- **Valid**: the issue is real → include in the report
- **Invalid — already handled**: handled elsewhere in the codebase (provide evidence)
- **Invalid — intentional pattern**: by-design architectural decision
- **Invalid — misread**: the reviewer misinterpreted the code

### Step 4: Final Report

The leader compiles **verified findings** into a comprehensive report.

### Report Structure

| Section | Priority | Source |
|---------|----------|--------|
| **Architecture Summary** | — | Leader's analysis |
| **Critical Issues** | P0 | Bugs, security vulnerabilities |
| **Quality Issues** | P1 | Logic errors, missing error handling, performance |
| **DX/Usability Issues** | P2 | API intuitiveness, naming, type hints |
| **Simplification Opportunities** | P3 | Complexity removal, duplicate code, abstractions |
| **Convention Issues** | P4 | Project convention mismatches |

Each issue includes **file:line**, **description**, and **suggestion**.

Optionally include an **Invalid Findings Summary** appendix showing which findings were filtered out and why.

### Step 5: Team Shutdown

After the report is written, send shutdown_request to all teammates and clean up with TeamDelete.

## Completion Criteria

Present the comprehensive report to the user. No code modifications.
