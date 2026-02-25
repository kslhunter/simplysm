---
name: sd-discuss
description: "Technical discussion with industry research (explicit invocation only)"
---

# Standards-Based Technical Discussion

## Overview

Facilitate balanced, evidence-based technical discussions by researching industry standards and project conventions BEFORE forming opinions.

## The Process

### 1. Understand the Question

Ask ONE question to understand the user's motivation:

- What problem triggered this question?
- What constraints matter most?

### 2. Research Before Opinions

**MANDATORY before forming any opinion:**

**Project research** (Read/Grep tools):

- Read the actual source code related to the question
- Check CLAUDE.md for project conventions
- Find similar patterns in the codebase

**Industry research** (WebSearch tool):

- Search for current community consensus and trends
- Check relevant specifications (TC39, W3C, RFCs)
- Find recent benchmarks, migration case studies, or survey data
- Check how popular libraries/frameworks approach this

### 3. Present Balanced Arguments

Present each option as if you were **advocating FOR it**. Equal depth, equal effort.

For each option:

- **Industry support**: Libraries, standards, and projects that use this approach (with sources)
- **Technical advantages**: Concrete benefits with evidence
- **When this wins**: Specific scenarios where this is clearly better

### 4. Project Context Analysis

- How does the current codebase align with each option?
- What would migration cost look like?
- What existing patterns favor one approach?

### 5. Decision Criteria

Provide a decision matrix — NOT a single recommendation:

| Criteria            | Option A | Option B |
| ------------------- | -------- | -------- |
| Industry alignment  | ...      | ...      |
| Project consistency | ...      | ...      |
| Migration cost      | ...      | ...      |
| Long-term trend     | ...      | ...      |

Then ask: "Which criteria matter most to you?"

## Key Rules

1. **Research FIRST, opinion LAST** — No opinions before WebSearch + project code reading
2. **Equal advocacy** — Each option gets the same depth of analysis
3. **Evidence over intuition** — Cite sources, show data
4. **No "obvious" answers** — If it were obvious, there'd be no discussion
5. **Interactive** — Ask questions, don't monologue
6. **Project-aware** — Ground the discussion in the actual codebase

## Red Flags - STOP and Research More

- Presenting one side with more depth than the other
- Claiming "industry standard" without citing sources
- Recommending without checking the project's current patterns
- Giving a conclusion without asking user's priorities

## Common Mistakes

| Mistake                                  | Fix                                         |
| ---------------------------------------- | ------------------------------------------- |
| Jump to recommendation                   | Research first, present balanced options    |
| "Industry standard is X" without sources | WebSearch for actual data and citations     |
| Ignoring project context                 | Read codebase patterns before discussing    |
| Monologue instead of discussion          | Ask about user's priorities and constraints |
| Treating "modern" as "better"            | Evaluate on actual trade-offs, not trends   |
