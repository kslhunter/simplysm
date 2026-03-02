# sd-review System Refactoring Design

## Summary

Refactor the sd-review skill and its 3 agents (sd-code-reviewer, sd-api-reviewer, sd-code-simplifier) from a centralized Explore + dispatch architecture to an independent focused explorer architecture.

## Problem

- **Too heavy for quality**: 4 subagents (1 Explore + 3 reviewers) consume significant time and tokens, but review quality is low relative to cost
- **Centralized Explore misfit**: One generic analysis doesn't serve each reviewer's specific needs
- **Agent definition misalignments**:
  - sd-code-reviewer defaults to `git diff` scope
  - sd-code-simplifier is defined as a code modifier, conflicting with sd-review's analysis-only mandate
  - No standardized output contract across agents

## Architecture

### Before

```
sd-review
  +-- Step 1: Explore agent (centralized analysis)
  +-- Step 2: 3 reviewers parallel (receive analysis results)
  +-- Step 3: sd-review verifies findings
  +-- Step 4: Final report
```

### After

```
sd-review
  +-- Step 1: 3 reviewers parallel (independent exploration + analysis)
  |    +-- sd-code-reviewer  -> self-explore -> findings
  |    +-- sd-api-reviewer   -> self-explore -> findings
  |    +-- sd-code-simplifier -> self-explore -> findings
  +-- Step 2: sd-review collects + verifies findings
  +-- Step 3: Final report
```

### Key Changes

- Remove centralized Explore step (4 steps -> 3 steps)
- sd-review role reduced to: dispatch + verify + report
- Each agent explores independently, tailored to its review focus
- sd-review passes only target path (no analysis context)

## Agent Role Definitions

### Role Boundaries

| Agent | Question it answers | User impact | Priority |
|-------|-------------------|-------------|----------|
| **sd-code-reviewer** | Does this code produce wrong results or pose risks? | Direct user impact (bugs, outages) | 1st |
| **sd-api-reviewer** | Would a first-time developer be confused or make mistakes? | User experience (DX) | 2nd |
| **sd-code-simplifier** | Would a maintainer struggle to understand or modify this? | Developer-only impact | 3rd |

### Common Constraints (all 3 agents)

- Analysis only, no code modifications
- Review ALL source files under target path (no git diff)
- Self-reference CLAUDE.md and project conventions

## Output Contract

### Finding Format

```
### [severity] finding-title

- **File**: path/to/file.ts:42
- **Evidence**: concrete observation from actual code (include snippet)
- **Issue**: what the problem is
- **Suggestion**: how to improve
```

### Severity Levels

| Severity | Meaning | Example |
|----------|---------|---------|
| **CRITICAL** | Fix immediately. Outage/security risk | null deref, SQL injection, infinite loop |
| **WARNING** | Should fix. Real problem possible | race condition, inconsistent naming, unnecessary complexity |
| **INFO** | Improvement opportunity | better defaults, type improvement, duplicate code |

### Report Structure (per agent)

```
## [Agent Name] Review Results

### Summary
- Files reviewed count
- Findings summary (count by severity)

### Findings
[Finding 1]
[Finding 2]
...
```

## Agent Designs

### sd-code-reviewer

**Exploration strategy:**
1. Identify entry points (index.ts, exports) for module structure
2. Trace logic flows: call chains, branches, error paths
3. Search for risk patterns: external input handling, async flows, state mutations, resource management

**Review areas:** Bugs, security vulnerabilities, race conditions, resource leaks, error handling

**Excludes:** Naming consistency (api-reviewer), code complexity (code-simplifier)

### sd-api-reviewer

**Exploration strategy:**
1. Map public API surface: index.ts exports, public types/interfaces
2. Collect naming patterns: compare all similar APIs within the library
3. Analyze usage patterns: check test files for actual usage

**Review areas:** Naming consistency, intuitiveness, type design, defaults, pattern consistency

**Key principle (retained):** Internal consistency over external standards. Before suggesting a naming change, verify the existing pattern across ALL similar components.

**Removed:** WebSearch for industry standard comparison (conflicts with internal consistency principle)

### sd-code-simplifier

**Exploration strategy:**
1. Map structure: module dependencies, abstraction layers, file size distribution
2. Compare patterns: whether similar-role files use consistent patterns
3. Find complexity hotspots: deep nesting, long functions, complex conditionals

**Review areas:** Unnecessary complexity, code duplication, readability, structure, maintainability risk

**Key change:** Role transformed from "code modifier" to "maintainability analyst" (analysis only)

**Removed:** `model: sonnet` specification, "recently modified code" scope, code modification behavior

## sd-review SKILL.md Workflow

### Step 1: Dispatch Reviewers

Run 3 subagents in parallel via Agent tool. Each receives ONLY the target path.

### Step 2: Verify Findings

After collecting all results, verify each finding against actual code:
- Valid: issue is real -> include
- Invalid - already handled: handled elsewhere (provide evidence)
- Invalid - intentional: by-design architectural decision
- Invalid - misread: reviewer misinterpreted code

### Step 3: Final Report

Compile verified findings grouped by severity (not by agent):
1. CRITICAL findings (all agents)
2. WARNING findings (all agents)
3. INFO findings (all agents)

Each includes: source agent, file:line, evidence, suggestion.
Optional: Invalid Findings Summary appendix.

## Implementation Approach

Follow sd-skill TDD process (RED-GREEN-REFACTOR):
1. **RED**: Run baseline tests with current agents on a test package
2. **GREEN**: Rewrite agent definitions + sd-review SKILL.md
3. **VERIFY GREEN**: Test rewritten agents with sd-review-like dispatch
4. **REFACTOR**: Close loopholes from testing
