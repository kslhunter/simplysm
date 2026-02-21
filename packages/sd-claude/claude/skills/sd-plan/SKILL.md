---
name: sd-plan
description: Use when you have a spec or requirements for a multi-step task, before touching code
model: opus
---

# Turning Designs Into Implementation Plans

## Overview

Turn a design doc into a step-by-step implementation plan through codebase exploration. Write bite-sized tasks assuming the implementing engineer has zero context — exact file paths, complete code, precise commands.

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## The Process

**Exploring the codebase:**
- Read the design doc, then explore relevant files, patterns, dependencies
- Ask questions one at a time as they arise during planning, with your recommendation
- Don't batch questions upfront — real questions emerge while deep in the details

**Ask about:**
- Conflicts with existing codebase patterns discovered while exploring
- Implementation choices the design didn't specify (which pattern, which abstraction level)
- Ambiguous behavior uncovered while designing tests or file structure

**Don't ask — just decide:**
- Internal details covered by project conventions (file naming, export patterns)
- YAGNI decisions (not mentioned = don't add)
- Implementation details with only one reasonable option

**Writing the plan:**
- Break into independent tasks
- Include exact file paths, complete code, exact commands with expected output
- Never write "add validation" — write the actual validation code

## Plan Document Format

**Header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** [One sentence]

**Architecture:** [2-3 sentences]

**Tech Stack:** [Key technologies/libraries]

---
```

**Each task (TDD steps):**

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `exact/path/to/test.spec.ts`

**Step 1: Write the failing test**

```typescript
test("specific behavior", () => {
  const result = fn(input);
  expect(result).toBe(expected);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest exact/path/to/test.spec.ts --project=node`
Expected: FAIL with "fn is not defined"

**Step 3: Write minimal implementation**

```typescript
export function fn(input: string): string {
  return expected;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest exact/path/to/test.spec.ts --project=node`
Expected: PASS

**Step 5: Commit**

```bash
git add exact/path/to/file.ts exact/path/to/test.spec.ts
git commit -m "feat: add specific feature"
```
````

## After the Plan

Save the plan, then present workflow paths. Check git status first. Display in the **system's configured language**:

```
Plan complete! Here's how to proceed:

--- Path A: With branch isolation (recommended for features/large changes) ---

1. /sd-worktree add <name>  — Create a worktree branch
2. /sd-plan-dev             — Execute tasks in parallel (includes TDD + review)
3. /sd-check                — Verify (modified + dependents)
4. /sd-commit               — Commit
5. /sd-worktree merge       — Merge back to main
6. /sd-worktree clean       — Remove worktree

--- Path B: Direct on current branch (quick fixes/small changes) ---

1. /sd-plan-dev             — Execute tasks in parallel (includes TDD + review)
2. /sd-check                — Verify (modified + dependents)
3. /sd-commit               — Commit

You can start from any step or skip steps as needed.

💡 "Path A: yolo" or "Path B: yolo" to auto-run all steps

⚠️ You have uncommitted changes. To use Path A, run `/sd-commit all` first.
```

- The `⚠️` line only when uncommitted changes exist
- **Recommend one** based on scope (1 sentence why)
- Do NOT auto-proceed. Wait for user's choice.

**Yolo mode:** Execute all steps sequentially.
- Each `/sd-*` step MUST be invoked via the Skill tool
- NEVER execute underlying commands (git, pnpm, etc.) directly, even if you know what the skill does internally
- If a step fails, stop and report — do not attempt manual recovery

**Yolo sd-check:** NEVER check only modified packages. Trace reverse dependencies and include all affected paths.

## Key Principles

- **One question at a time** — Ask inline during planning, not batched upfront
- **Exact everything** — File paths, complete code, commands with expected output
- **Bite-sized steps** — Each step is one action (2-5 minutes)
- **TDD always** — Test first, implement second, commit third
- **DRY, YAGNI** — No unnecessary features, no repetition
- **REQUIRED SUB-SKILL:** sd-plan-dev (fresh fork per task + two-stage review)
