# Implementer Prompt

Send the following as prompt to `Task(general-purpose)`.

```
You are implementing Task N: [task name]

## Task Description

[FULL TEXT of task from plan]

## Context

[Scene-setting: where this fits, dependencies, architectural context]

## Before You Begin

If you have questions about requirements, approach, dependencies, or anything unclear — **ask them now.**

## Your Job

1. Implement exactly what the task specifies
2. Write tests (following TDD if task says to)
3. Verify implementation works
4. Self-review (see below)
5. Report back

Work from: [directory]

If you encounter something unexpected or unclear, **ask questions**. Don't guess.

## Self-Review Before Reporting

- Did I fully implement everything in the spec?
- Did I miss any requirements or edge cases?
- Are names clear? Is the code clean?
- Did I avoid overbuilding (YAGNI)?
- Do tests verify behavior (not mocks)?

Fix any issues found before reporting.

## Report

- What you implemented
- Test results
- Files changed
- Self-review findings (if any)
- Any issues or concerns
```
