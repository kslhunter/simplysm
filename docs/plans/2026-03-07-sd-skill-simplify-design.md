# sd-skill Simplification Design

## Goal

Simplify sd-skill from 5 files (~760 lines) to 1 file (~80 lines) by leveraging sd-tdd as the foundation and only documenting the differences.

## Core Insight

Writing skills IS TDD applied to process documentation. sd-tdd already covers the RED/GREEN/REFACTOR cycle — sd-skill only needs to explain what's different when the "production code" is a document and the "tests" are subagent pressure scenarios.

## Changes

### Delete (4 files)

- `cso-guide.md` (161 lines)
- `anthropic-best-practices.md` (157 lines)
- `writing-guide.md` (86 lines)
- `testing-skills-with-subagents.md` (159 lines)

### Rewrite (1 file)

`SKILL.md` — from 196 lines to ~80 lines with this structure:

#### 1. Overview (~3 lines)

- "sd-tdd applied to skill documents"
- REQUIRED BACKGROUND: sd-tdd

#### 2. Differences from Code TDD (~35 lines)

| Code TDD | Skill TDD |
|----------|-----------|
| Test = unit test | Test = subagent pressure scenario |
| Run test, assert passes/fails | Run subagent, observe behavior |
| Refactor code | Close rationalization loopholes via meta-testing |

Content to include:
- **Pressure scenario**: tests MUST create situations where the agent wants to violate the rule (not academic "what does the skill say?" questions)
- **Pressure types table**: Time, Sunk cost, Authority, Economic, Exhaustion, Social, Pragmatic — combine 3+
- **One example pressure scenario** (the existing A/B/C choice scenario, condensed)
- **Meta-testing**: when agent fails despite having skill, ask "how could the skill be written differently?"
- **Retrieval vs pressure test**: pure reference skills (API docs) need retrieval test only, not pressure test
- **No `isolation: "worktree"`** for subagents (one line)

#### 3. SKILL.md Format (~35 lines)

**Frontmatter:**
- `name`: letters, numbers, hyphens only
- `description`: MUST start with "Use when..." — triggering conditions only, NEVER workflow summary
- BAD/GOOD example (1 pair)
- Why: workflow summary in description causes Claude to skip the skill body

**Body structure template:**
```
# Skill Name
## Overview — core principle, 1-2 sentences
## When to Use — symptoms, use cases, when NOT to use
## Core Pattern — before/after or key technique
## Quick Reference — table or bullets
## Common Mistakes — what goes wrong + fixes
```

**CSO essentials (5 lines):**
- Use words Claude would search for (error messages, symptoms, tool names)
- Name by what you DO: `condition-based-waiting` not `async-test-helpers`
- Gerunds work well: `creating-skills`, `testing-skills`

**File organization:**
- Single file when everything fits inline
- Supporting file only for reusable tools or heavy reference (100+ lines)

### Removed content (rationale)

| Removed | Why |
|---------|-----|
| Gate checklist | sd-tdd already has one |
| Anti-patterns | TDD testing catches these naturally |
| Anthropic best practices | Generic guidance, not skill-specific |
| Writing guide (flowchart/code rules) | Low value, obvious to competent agents |
| CSO keyword/token sections | Over-detailed for inline reference |
| Discipline-enforcing persuasion section | Moved to sd-prompt-authoring-rules.md |
