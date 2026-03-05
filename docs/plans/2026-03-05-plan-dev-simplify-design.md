# sd-plan-dev: Add /simplify Step

## Goal

Add a `/simplify` step to the `sd-plan-dev` workflow to catch cross-task code cleanup opportunities (reuse, quality, efficiency) that individual task reviewers miss.

## Design

### Position in Workflow

After **final review** passes, before **completion** report.

```
... → Final Review → /simplify → Completion
```

### Flow

1. Final review passes
2. Orchestrator runs `/simplify` via Skill tool
3. If simplify made changes:
   - Run typecheck/lint on affected packages
   - If typecheck/lint fails → fix and retry
   - Commit as separate commit (`refactor: simplify changed code`)
4. If simplify made no changes → skip to completion

### Changes to SKILL.md

1. **Process diagram**: Add simplify node between final review and Done
2. **New "Simplify" section**: Describe the step (between Final Review Dispatch and Completion)
3. **Example workflow**: Add simplify step to Final section
4. **Completion section**: Adjust wording to "After simplify completes"
