---
name: sd-api-name-review
description: Use when reviewing a library or module's public API naming for consistency and industry standard alignment - function names, parameter names, option keys, enum values, type names
model: haiku
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

## Phase 3: Comparative Analysis & Report

Cross-compare Phase 1 and Phase 2 results to produce the report.

| Priority | Criteria |
|----------|----------|
| **P0** | Misaligned with majority of surveyed libraries |
| **P1** | Internal inconsistency (same concept, different names) |
| **P2** | Better industry term exists (optional) |
| **Keep** | Already aligned with standards |

Each item includes: current name, recommended change, rationale (usage patterns per library).

## Completion Criteria

Present the report to the user. No code modifications.
