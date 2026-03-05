---
name: sd-use
description: "Route requests to sd-* skills/agents (explicit invocation only)"
model: haiku
---

# sd-use - Auto Skill Router

Analyze user request from ARGUMENTS, select the best matching skill, explain why, then execute it.

## Execution Flow

1. Read ARGUMENTS
2. If user names a specific skill (e.g., "sd-explore로..."), route to that skill directly
3. Otherwise, match against catalog below
4. Report selection with reason
5. Execute immediately

## Catalog (execute via `Skill` tool)

| Skill                | When to select                                                                                                                                  |
|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `sd-brainstorm`      | New feature, component, or behavior change — **creative work before implementation**                                                            |
| `sd-debug`           | Bug, test failure, unexpected behavior — **systematic root cause investigation**                                                                |
| `sd-tdd`             | Implementing a feature or fixing a bug — **before writing code**                                                                                |
| `sd-plan`            | Multi-step task with spec/requirements — **planning before code**                                                                               |
| `sd-plan-dev`        | Already have a plan — **executing implementation plan**                                                                                         |
| `sd-review`          | Code review + refactoring analysis — defects, safety, API design, conventions, complexity, duplication, code structure                           |
| `sd-check`           | Verify code — typecheck, lint, tests                                                                                                            |
| `sd-commit`          | Create a git commit                                                                                                                             |
| `sd-readme`          | Update a package README.md                                                                                                                      |
| `sd-discuss`         | Evaluate code design decisions against industry standards and project conventions                                                                |
| `sd-api-name-review` | Review public API naming consistency                                                                                                            |
| `sd-worktree`        | Start new work in branch isolation                                                                                                              |
| `sd-skill`           | Create or edit skills                                                                                                                           |
| `sd-email-analyze`   | Analyze, read, or summarize email files (`.eml` or `.msg`) — parsing and attachment extraction                                                  |
| `sd-document`        | Read or write document files (`.docx`, `.xlsx`, `.pptx`, `.pdf`) — content extraction, creation, data export                                    |
| `sd-explore`         | Explore, analyze, trace, or understand code structure, architecture, or implementation flow                                                     |

## Selection Rules

1. **Explicit skill name** — If user mentions a specific skill name (e.g., "sd-explore로...", "sd-plan 만들어줘"), route to that skill directly
2. Select **exactly one** skill — the most specific match wins
3. **Review & Refactor**: "find bugs", "review", "refactor", "improve structure", "remove duplication" → `sd-review`
4. **Sequential requests** (e.g., "brainstorm하고 plan 만들어줘"): Route to the **first** skill only. After completion, user can invoke the next
5. If nothing matches, use **default LLM behavior** and handle the request directly
6. Pass ARGUMENTS through as the skill's input

## Report Format

Before executing, output:

```
**Selected**: `{skill-name}`
**Reason**: {one-line explanation}
**Tip**: Next time you can call `/{skill-name} {request}` directly.
```

Then execute immediately.

If no match:

```
**Selected**: Default LLM
**Reason**: {one-line explanation}
```

Then handle the request directly.
