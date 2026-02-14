# sd-review Skill Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Improve sd-review SKILL.md to comply with sd-skill guidelines (CSO, structure, clarity).

**Architecture:** Four edits to a single file — YAML frontmatter fix, two new sections, one section rewrite.

**Tech Stack:** Markdown (skill definition)

---

### Task 1: Fix YAML frontmatter and rewrite description

**Files:**
- Modify: `.claude/skills/sd-review/SKILL.md:1-5`

**Step 1: Edit YAML frontmatter**

Replace:
```yaml
---
name: sd-review
description: Use when performing a comprehensive code review of a package or path - uses sd-explore for code analysis in a forked context, then dispatches to specialized reviewer agents
model: inherit
---
```

With:
```yaml
---
name: sd-review
description: Use when performing a comprehensive code review of a package or path for bugs, security issues, code quality, DX, and simplification opportunities
---
```

Changes:
- Remove `model: inherit` (sd-skill rules: only `name` and `description` allowed in frontmatter)
- Remove workflow summary from description (CSO violation)
- List review categories as search keywords

**Step 2: Verify**

Read the file and confirm frontmatter has exactly 2 fields: `name` and `description`.

---

### Task 2: Add "When to Use" section and clarify Target Selection

**Files:**
- Modify: `.claude/skills/sd-review/SKILL.md`

**Step 1: Add "When to Use" section after the Usage section**

Insert after the Usage section (`/sd-review` — if no argument, ask the user for the target path):

```markdown
## When to Use

- Before merging major features or after significant refactoring
- When assessing overall code quality of a package
- When onboarding to unfamiliar code and want a quality overview

**When NOT to use:**
- Single-file or trivial changes (typo, config tweak)
- When you need code modifications (sd-review is analysis-only)
```

**Step 2: Replace Target Selection section**

Replace the current Target Selection content:

```markdown
## Target Selection

1. If `$ARGUMENTS` contains a path, use that path
2. Otherwise, ask the user for the target path

**Important: the review scope is ALL source files under the target path.** Do not use git status or git diff to limit to changed files. Analyze every source file in the target path.
```

With:

```markdown
## Target Selection

- With argument: `/sd-review packages/solid` — review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.
```

**Step 3: Verify**

Read the file and confirm:
- "When to Use" section exists between Usage and Target Selection
- Target Selection uses bullet format (not numbered list)

---

### Task 3: Add "Common Mistakes" section

**Files:**
- Modify: `.claude/skills/sd-review/SKILL.md`

**Step 1: Add "Common Mistakes" section before Completion Criteria**

Insert before the `## Completion Criteria` section:

```markdown
## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using git diff to limit review scope | Review ALL source files under target path |
| Skipping verification step | Always verify subagent findings against actual code |
| Reporting unverified issues | Only include verified findings in final report |
```

**Step 2: Verify**

Read the file and confirm "Common Mistakes" section exists with 3-row table before Completion Criteria.
