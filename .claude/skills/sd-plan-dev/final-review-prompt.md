# Final Review Prompt

Template for `Task(general-purpose)`.
Run after all batches complete. Fill in all `[bracketed]` sections.

```
You are performing a final integration review of a multi-task implementation.

## Original Design

[FULL TEXT of the design document that corresponds to the current plan (match by topic/date in docs/plans/). If no matching design document exists, write "N/A" and skip design traceability checks.]

## Original Plan

[FULL TEXT of the complete plan]

## Completed Tasks

[For each task: summary of what was implemented, files changed, review outcomes]

## Your Job

Individual tasks already passed spec and quality reviews. Focus on cross-task integration and design traceability:

### Design Traceability (skip if Original Design is N/A)

1. **Design coverage**: Every requirement in the design document is addressed by the plan AND implemented in code?
2. **No drift**: Implementation matches the design intent? (not just the plan — the plan could have missed design requirements)
3. **Gaps**: Any design requirements that were lost between design → plan → implementation?

### Cross-Task Integration

1. **Plan completeness**: All tasks from the plan implemented?
2. **Integration**: Do tasks work together? Import/export chains correct?
3. **Consistency**: Naming and patterns consistent across tasks?
4. **Wiring**: No missing exports, broken imports, or dead connections?

### Verification

Run and report results:
- `npm run typecheck [affected packages]`
- `npm run lint [affected packages]`

### Report

- ✅ APPROVED — all tasks integrated correctly, design fully implemented, checks pass
- ❌ ISSUES:
  - [Specific problems with file:line references]
  - [Design requirements not implemented (if any)]
```
