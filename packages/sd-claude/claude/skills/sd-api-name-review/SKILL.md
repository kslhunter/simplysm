---
name: sd-api-name-review
description: "Public API naming review (explicit invocation only)"
model: sonnet
---

# sd-api-name-review

## Overview

Compare a library/module's public API names against industry standards and review internal consistency, producing a standardization report. **Analysis only — no code modifications.**

## Target Selection

1. If args contain a path, use that path
2. Otherwise, ask the user for the target path

## Phase 1: API Extraction

Use an Explore agent to extract the target's public API surface:

- All exported identifiers (functions, classes, types, constants, etc.)
- Names and types of user-facing parameters/options/config
- Naming pattern classification (prefixes, suffixes, verb/adjective/noun usage, abbreviations, etc.)

## Phase 2: Industry Standard Research

Based on Phase 1 results, determine comparison targets and perspectives:

1. Identify **recurring naming patterns** from the extracted API
2. Determine the target's domain and tech stack to **select comparable libraries**
3. Use **parallel agents** to web-search/fetch official docs for each library, investigating naming conventions for the same pattern categories

## Phase 3: Comparative Analysis

Cross-compare Phase 1 and Phase 2 results and classify each item:

| Priority | Criteria                                               |
| -------- | ------------------------------------------------------ |
| **P0**   | Misaligned with majority of surveyed libraries         |
| **P1**   | Internal inconsistency (same concept, different names) |
| **P2**   | Better industry term exists (optional)                 |
| **Keep** | Already aligned with standards                         |

Each item includes: current name, recommended change, rationale (usage patterns per library).

## Phase 4: Report & User Confirmation

Present **Keep** items to the user as a summary.

Then present each **P0/P1/P2** finding to the user **one at a time**, ordered by priority (P0 → P1 → P2).

For each finding, explain:
1. **What the problem is** — the current name and why it's misaligned or inconsistent
2. **How it could be fixed** — recommended name(s) with rationale from surveyed libraries
3. **Ask**: address this or skip?

Collect only findings the user confirms. If the user skips all findings, report that and end.

## Phase 5: Brainstorm Handoff

Pass only the **user-confirmed findings** to **sd-brainstorm**.

sd-brainstorm will handle prioritization, grouping, approach exploration, and design.

## Completion Criteria

Report Keep items, confirm P0/P1/P2 findings with user one by one, then hand off confirmed findings to sd-brainstorm. No code modifications during review.
