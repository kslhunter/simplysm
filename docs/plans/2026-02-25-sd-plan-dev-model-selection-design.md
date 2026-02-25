# sd-plan-dev: Model Selection + Review Process Cleanup

## Summary

Two changes to sd-plan-dev:

1. **Model selection**: implementer uses `min(sonnet, current model)`, all other agents inherit current model
2. **Review process cleanup**: orchestrator manages all agents directly (fix contradiction between SKILL.md and implementer-prompt.md)

## Background

### Problem 1: No model differentiation

All task agents use `model: sonnet` regardless of the user's selected model. If the user chose haiku for cost savings, sd-plan-dev still uses sonnet.

### Problem 2: Review process contradiction

- SKILL.md says task agent launches reviewer sub-Tasks internally
- implementer-prompt.md has no mention of launching reviewers
- Original source (superpowers/subagent-driven-development) has orchestrator managing all agents

## Design

### Model Selection Rule

```
implementer model = min(sonnet, current model)
  - current = opus  → sonnet
  - current = sonnet → sonnet
  - current = haiku  → haiku

all other agents = inherit current model (no explicit model parameter)
```

### Review Process: Orchestrator Manages All Agents

```
Orchestrator:
  Extract tasks + dependency analysis + batch grouping

  Per Batch:
    Parallel implementer Task calls (single message, model: min(sonnet, current))
      Each implementer: implement → commit → report

    After each implementer completes:
      Parallel reviewer Task calls (spec + quality, single message)

      If issues found:
        Re-dispatch implementer (fix) → re-review loop

    Batch integration check (typecheck + lint)

  After all batches:
    Final reviewer Task call
```

### File Changes

#### SKILL.md — Execution Method (lines 29-31)

Before:
```
- task agent: Task(general-purpose, model: sonnet) — implements one task, launches sub-Tasks for review, fixes issues
- spec reviewer: Task(general-purpose) — sub-Task launched by task agent (read-only)
- quality reviewer: Task(general-purpose) — sub-Task launched by task agent (read-only)
```

After:
```
- implementer: Task(general-purpose, model: min(sonnet, current)) — implements one task
- spec reviewer: Task(general-purpose) — dispatched by orchestrator after implementer completes (read-only)
- quality reviewer: Task(general-purpose) — dispatched by orchestrator in parallel with spec reviewer (read-only)
- final reviewer: Task(general-purpose) — dispatched by orchestrator after all batches complete (read-only)

Model selection:
- implementer: use min(sonnet, current model). If current model is haiku, use haiku. Otherwise use sonnet.
- All other agents: inherit current model (no explicit model parameter).
```

#### SKILL.md — The Process diagram

Move `cluster_nested_review` out of `cluster_task_agent`. Fix loop managed at orchestrator level. Review order: spec + quality in parallel (unchanged).

#### SKILL.md — Task Agent Prompt section (lines 127-156)

Remove review-related steps (6-8). Simplify to reference `./implementer-prompt.md` only. Rename section from "Task Agent Prompt" to "Implementer Prompt".

#### implementer-prompt.md — No change

Already contains only implement + test + self-review + commit + report.

#### reviewer prompt files — No change

spec-reviewer-prompt.md, code-quality-reviewer-prompt.md, final-review-prompt.md unchanged. Only the caller changes (task agent → orchestrator).
