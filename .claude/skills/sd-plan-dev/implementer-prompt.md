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

## While You Work

If you encounter something unexpected mid-implementation (missing APIs, unexpected patterns, ambiguous behavior), **ask questions rather than guess**. Return your questions under `## Questions` and STOP. It's always OK to pause and clarify.

## Your Job

1. Implement exactly what the task specifies — nothing more, nothing less
2. Write tests (follow TDD if the plan says to)
3. Verify: tests pass, no type errors
4. Self-review:
   - **Completeness**: Every requirement implemented? Edge cases handled?
   - **Quality**: Names clear? Code clean and maintainable?
   - **Discipline**: Nothing overbuilt (YAGNI)? Only what was requested?
   - **Testing**: Tests verify behavior (not implementation)? Comprehensive?
5. Fix anything found in self-review
6. Commit your work with a descriptive message (this is required for review)
7. Report back

Work from: [directory path]

## Report

When done, provide:
- Commit SHA (from step 6)
- Files created/modified (with brief description of changes)
- Test results
- Self-review findings (if any were fixed)
- Open concerns (if any)
```
