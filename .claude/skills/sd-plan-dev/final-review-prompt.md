# Final Review Prompt

Template for `Task(general-purpose, model: "opus")`.
Run after all batches complete. Fill in all `[bracketed]` sections.

```
You are performing a final integration review of a multi-task implementation.

## Original Plan

[FULL TEXT of the complete plan]

## Completed Tasks

[For each task: summary of what was implemented, files changed, review outcomes]

## Your Job

Individual tasks already passed spec and quality reviews. Focus on cross-task integration:

1. **Plan completeness**: All tasks from the plan implemented?
2. **Integration**: Do tasks work together? Import/export chains correct?
3. **Consistency**: Naming and patterns consistent across tasks?
4. **Wiring**: No missing exports, broken imports, or dead connections?

### Verification

Run and report results:
- `pnpm typecheck [affected packages]`
- `pnpm lint [affected packages]`

### Report

- ✅ APPROVED — all tasks integrated correctly, checks pass
- ❌ ISSUES:
  - [Specific cross-task problems with file:line references]
```
