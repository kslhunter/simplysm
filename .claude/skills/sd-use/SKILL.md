---
name: sd-use
description: You MUST invoke this for any user request that does not explicitly use a /sd-* slash command. Do not bypass by selecting other sd-* skills directly, even when the match seems obvious.
model: haiku
---

# sd-use - Auto Skill/Agent Router

Analyze user request from ARGUMENTS, select the best matching sd-\* skill or agent, explain why, then execute it.

## Execution Flow

1. Read ARGUMENTS
2. Match against catalog below
3. Report selection with reason
4. Execute immediately

## Catalog

### Skills (execute via `Skill` tool)

| Skill                | When to select                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ |
| `sd-brainstorm`      | New feature, component, or behavior change — **creative work before implementation** |
| `sd-debug`           | Bug, test failure, unexpected behavior — **systematic root cause investigation**     |
| `sd-tdd`             | Implementing a feature or fixing a bug — **before writing code**                     |
| `sd-plan`            | Multi-step task with spec/requirements — **planning before code**                    |
| `sd-plan-dev`        | Already have a plan — **executing implementation plan**                              |
| `sd-explore`         | Deep codebase analysis — tracing execution paths, architecture, dependencies         |
| `sd-review`          | **Large-scale** comprehensive review of an entire package or broad path — use only when user explicitly requests full/deep/comprehensive review |
| `sd-check`           | Verify code — typecheck, lint, tests                                                 |
| `sd-commit`          | Create a git commit                                                                  |
| `sd-readme`          | Update a package README.md                                                           |
| `sd-discuss`         | Evaluate code design decisions against industry standards and project conventions    |
| `sd-api-name-review` | Review public API naming consistency                                                 |
| `sd-worktree`        | Start new work in branch isolation                                                   |
| `sd-skill`           | Create or edit skills                                                                |

### Agents (execute via `Task` tool with matching `subagent_type`)

| Agent                | When to select                                                    |
| -------------------- | ----------------------------------------------------------------- |
| `sd-code-reviewer`   | Quick/focused review — specific files, recent changes, bugs, security, quality issues. **Default choice for most review requests** |
| `sd-code-simplifier` | Simplify, clean up, improve code readability                      |
| `sd-api-reviewer`    | Review library public API for DX quality                          |

## Selection Rules

1. Select **exactly one** skill or agent — the most specific match wins
2. **Review requests**: Default to `sd-code-reviewer` agent. Only use `sd-review` skill when the user explicitly asks for a full/comprehensive/deep review of an entire package
3. If nothing matches, use **default LLM behavior** and handle the request directly
4. Pass ARGUMENTS through as the skill/agent's input

## Report Format

Before executing, output:

```
**Selected**: `sd-{name}` (or agent name)
**Reason**: {one-line explanation}
**Tip**: Next time you can call `/sd-{name} {request}` directly.
```

Then execute immediately.

If no match:

```
**Selected**: Default LLM
**Reason**: {one-line explanation}
```

Then handle the request directly.
