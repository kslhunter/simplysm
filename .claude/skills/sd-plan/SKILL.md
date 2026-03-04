---
name: sd-plan
description: "Implementation plan from brainstorm designs (explicit invocation only)"
---

# Writing Plans

## Prerequisite Check

**MANDATORY:** Before proceeding, verify that `sd-brainstorm` has already been completed in this conversation.

- If a brainstorm design document exists (discussed or saved in this session) → proceed.
- If NOT → **STOP** and tell the user (in the system's configured language) that sd-plan requires sd-brainstorm to be completed first, then invoke sd-brainstorm instead.

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

When a task uses a codebase-specific utility (hook, helper, style token) or test pattern, add a one-line explanation of what it does and the source file path. Example: "`createMountTransition(open)` — manages mount/unmount with CSS transitions (`packages/solid/src/hooks/createMountTransition.ts`)". This applies to test utilities and patterns too — if a test uses a framework-specific pattern (e.g., SolidJS `createRoot` for reactive context), explain why that pattern is needed.

**Announce at start:** "I'm using the sd-plan skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

**Step size limit:** If a single step produces more than ~30 lines of code, it is too large. Split it into multiple steps (e.g., "Define types and interfaces" → "Create context and hook" → "Implement provider component").

**TDD means YAGNI per step:** Step 3 ("Write minimal implementation") must implement ONLY what's needed to pass Step 1's test — nothing more. If the component needs additional behavior (e.g., FIFO eviction, remove), that behavior goes in a SUBSEQUENT task with its own failing test first. Do NOT implement the full component in one task and then test it after the fact.

## Task Ordering

**Shared resources BEFORE consumers.** Tasks must be ordered so that every file a task imports already exists from a prior task.

- Types, config, i18n entries → before components that use them
- Provider → before components that call useX() hooks
- If Task B imports from Task A's file → Task A must come first

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Package Manager Detection

When writing run commands in the plan, detect the package manager:
- If `pnpm-lock.yaml` exists in project root → use `pnpm`
- If `yarn.lock` exists in project root → use `yarn`
- Otherwise → use `npm`

`$PM` in the task template below refers to the detected package manager.

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `exact/path/to/tests/file.spec.ts`

**Step 1: Write the failing test**

```typescript
test("specific behavior", () => {
  const result = functionUnderTest(input);
  expect(result).toBe(expected);
});
```

**Step 2: Run test to verify it fails**

Run: `$PM run vitest exact/path/to/tests/file.spec.ts --run`
Expected: FAIL with "functionUnderTest is not defined"

**Step 3: Write minimal implementation**

```typescript
function functionUnderTest(input: InputType): OutputType {
  return expected;
}
```

**Step 4: Run test to verify it passes**

Run: `$PM run vitest exact/path/to/tests/file.spec.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add exact/path/to/tests/file.spec.ts exact/path/to/file.ts
git commit -m "feat: add specific feature"
```
```

## Test Requirement

**Every task that creates or modifies logic MUST include a test.** No exceptions.

- If the logic is testable with unit tests → write a vitest test file. This includes: pure functions, state management, timers/lifecycle logic (use `vi.useFakeTimers()`), event handlers, and state transitions.
- If the logic is UI-only (visual rendering, Portal placement, CSS animation) → include a manual verification step with exact instructions ("Open the browser, click X, expect Y")
- The **Files:** section must list the test file: `Test: exact/path/to/tests/file.spec.ts`
- If you find yourself writing a task with no test step → **STOP and add one**

## Remember
- Exact file paths always
- Cross-check the design document's file structure — every file listed in the design MUST appear in the plan (create or modify)
- Complete code in plan (not "add validation")
- When modifying an existing file, show ALL necessary import additions/changes — not just the appended code
- Code must compile cleanly — no unused imports or variables
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Related Skills

- **sd-brainstorm** — prerequisite: creates the design this skill plans from
- **sd-explore** — for deeper codebase exploration when gathering context
- **sd-plan-dev** — executes the plan this skill creates

## Execution Handoff

After saving the plan, **commit the plan document to git** before proceeding.

Then:

- If in **yolo mode** (user chose "yolo" from sd-brainstorm): Immediately proceed to sd-plan-dev without asking. No confirmation needed.
- Otherwise: Display this message **in the system's configured language** (detect from the language setting and translate accordingly):
  **"Plan complete and saved to `docs/plans/<filename>.md`. Ready to execute with sd-plan-dev?"**

- **REQUIRED SUB-SKILL:** Use sd-plan-dev
- Fresh fork per task + two-stage review (spec compliance → code quality)
