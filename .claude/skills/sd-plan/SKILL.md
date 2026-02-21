---
name: sd-plan
description: Use when you have a spec or requirements for a multi-step task, before touching code
model: opus
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the sd-plan skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Clarification Phase

**Before writing the plan**, read the design doc and explore the codebase. Then identify implementation decisions the design didn't specify.

**Ask the user about:**
- Core behavior choices (state management approach, error handling strategy, validation UX)
- User-facing behavior not specified (what the user sees on error, how navigation works)
- Architectural choices with multiple valid options (which pattern, which abstraction level)

**Don't ask — just decide:**
- Internal details covered by project conventions (file naming, export patterns)
- Pure YAGNI decisions (features not mentioned = don't add)
- Implementation details with only one reasonable option

**Format:** Present all discovered gaps as a single numbered list with your recommended option for each. Wait for user confirmation before writing the plan.

```
Before writing the plan, I found these implementation decisions not covered in the design:

1. **[Topic]**: [The gap]. I'd recommend [option A] because [reason]. Alternatively, [option B].
2. **[Topic]**: [The gap]. I'd recommend [option] because [reason].
...

Should I proceed with these recommendations, or would you like to change any?
```

If no gaps are found, skip this phase and proceed directly to writing the plan.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

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

Run: `pnpm vitest exact/path/to/tests/file.spec.ts --run`
Expected: FAIL with "functionUnderTest is not defined"

**Step 3: Write minimal implementation**

```typescript
function functionUnderTest(input: InputType): OutputType {
  return expected;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest exact/path/to/tests/file.spec.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add exact/path/to/tests/file.spec.ts exact/path/to/file.ts
git commit -m "feat: add specific feature"
```
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

After saving the plan:

- If in **yolo mode** (user chose "yolo" from sd-brainstorm): Immediately proceed to sd-plan-dev without asking. No confirmation needed.
- Otherwise: Display this message **in the system's configured language** (detect from the language setting and translate accordingly):
  **"Plan complete and saved to `docs/plans/<filename>.md`. Ready to execute with sd-plan-dev?"**

- **REQUIRED SUB-SKILL:** Use sd-plan-dev
- Fresh fork per task + two-stage review (spec compliance → code quality)
