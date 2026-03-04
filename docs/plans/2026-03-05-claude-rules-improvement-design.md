# Claude Rules Improvement (Insights-Based)

## Goal

Apply insights report suggestions to improve Claude Code behavior rules, targeting the top friction patterns: shallow analysis, external-first search, unnecessary agent routing, and band-aid timeout fixes.

## Changes

### 1. sd-claude-rules.md — New rules (under `## Scope of Work`)

Add two new subsections after `### General Rules`:

#### `### Analysis & Comparison`

- When analyzing, comparing, diffing, or auditing: **enumerate all items exhaustively**. Never provide a shallow summary — list every difference, even minor ones.
  - Example: v12 vs v13 migration gap → list ALL API, type, pattern differences item by item

#### `### Direct Action Requests`

- When the user provides a specific action (e.g., "rename X to Y", "delete this file"), **execute it directly**. Do not route through skill agents or sub-agent workflows for trivial operations.

### 2. sd-workflow.md — Strengthen existing rules

#### Pre-coding Checklist — Add local-first rule

Add before the "If confidence is low" line:

```
- **Always search the local codebase first.** Do not search the web or external docs until you have confirmed the answer is not in local code.
```

#### No band-aid fixes — Add timeout example

Change from:
```
Avoid techniques like suppressing errors, adding defensive checks to hide symptoms, or bypassing validation.
```

To:
```
Avoid techniques like suppressing errors, adding defensive checks to hide symptoms, bypassing validation, or inflating timeout values.
```

## Files Modified

- `.claude/rules/sd-claude-rules.md`
- `.claude/refs/sd-workflow.md`
