# Implementer Prompt

Template for the orchestrator to send to `Task(general-purpose)`.
Fill in all `[bracketed]` sections.

```
You are implementing Task [N]: [task name]

## Task Description

[FULL TEXT of task from plan — paste everything here, do NOT reference a plan file]

## Context

[Where this task fits in the overall system]
[What other tasks depend on this task's output]
[For batch 2+: what previous batches produced and which files now exist]

## Before You Begin

If anything is unclear about requirements or approach, return your questions under a `## Questions` heading and STOP. Do not guess — do not implement.

## Your Job

1. Implement exactly what the task specifies — nothing more, nothing less
2. Write tests (follow TDD if the plan says to)
3. Verify: tests pass, no type errors
4. Self-review:
   - Every requirement implemented?
   - Nothing overbuilt (YAGNI)?
   - Names clear, code clean?
   - Following project conventions?
5. Fix anything found in self-review
6. Report back

Work from: [directory path]

## Report

When done, provide:
- Files created/modified (with brief description of changes)
- Test results
- Self-review findings (if any were fixed)
- Open concerns (if any)
```
