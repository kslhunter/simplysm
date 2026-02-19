# sd-review Skill Improvements Design

## Date: 2026-02-15

## Summary

Improve the sd-review skill based on sd-skill guidelines review. Five changes addressing CSO violations, missing sections, and clarity issues.

## Changes

### 1. YAML Frontmatter Cleanup

**Before:**
```yaml
---
name: sd-review
description: Use when performing a comprehensive code review of a package or path - uses sd-explore for code analysis in a forked context, then dispatches to specialized reviewer agents
model: inherit
---
```

**After:**
```yaml
---
name: sd-review
description: Use when performing a comprehensive code review of a package or path for bugs, security issues, code quality, DX, and simplification opportunities
---
```

**Rationale:**
- Remove `model: inherit` (sd-skill rules: only `name` and `description` allowed)
- Remove workflow summary from description (CSO violation — Claude may follow description instead of reading full skill)
- List review categories as keywords for better search discovery

### 2. Add "When to Use" Section (after Usage)

```markdown
## When to Use

- Before merging major features or after significant refactoring
- When assessing overall code quality of a package
- When onboarding to unfamiliar code and want a quality overview

**When NOT to use:**
- Single-file or trivial changes (typo, config tweak)
- When you need code modifications (sd-review is analysis-only)
```

### 3. Clarify Target Selection

Replace current numbered list with cleaner format:

```markdown
## Target Selection

- With argument: `/sd-review packages/solid` — review source code at the given path
- Without argument: ask the user for the target path

**Important:** Review ALL source files under the target path. Do not use git status or git diff to limit scope.
```

### 4. Add "Common Mistakes" Section (before Completion Criteria)

```markdown
## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using git diff to limit review scope | Review ALL source files under target path |
| Skipping verification step | Always verify subagent findings against actual code |
| Reporting unverified issues | Only include verified findings in final report |
```

## Files to Modify

| File | Change |
|------|--------|
| `.claude/skills/sd-review/SKILL.md` | All 4 changes above |

## Out of Scope

- sd-security-reviewer agent creation (already recovered separately)
- Agent file modifications (reviewed and found satisfactory)
