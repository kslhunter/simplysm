---
name: sd-pipeline-test
description: "Use when testing the sd-plan to sd-commit pipeline against a design document and refactoring skills based on findings. Triggers: pipeline quality check, skill improvement, workflow validation, skill refactoring after dry run."
---

# Pipeline Testing and Skill Refactoring

## Overview

Test the sd-plan → sd-plan-dev → sd-check → sd-commit pipeline by running it against a real design document, evaluating each step's output, and refactoring skills based on evidence.

**Core principle:** Testing ≠ Executing. Testing = Execute + Evaluate + Trace issues to skill text + Refactor + Re-verify.

## When to Use

- After creating or modifying an sd-* skill and wanting to validate it works in the full pipeline
- When pipeline output quality seems degraded
- When a new design document type reveals skill gaps
- Periodic pipeline health checks

## Process

```
1. Select design document
2. Create worktree (isolation)
3. For each step: Run → Evaluate → Record findings
4. WRITE FINDINGS REPORT (before refactoring — captures evidence even if budget runs low)
5. Trace issues → Skill text
6. Refactor skills
7. Re-run affected step → Verify
8. Update findings report with refactoring results
9. Clean up worktree
```

### Turn Budget Allocation

The #1 failure mode is spending all turns on execution with nothing left for evaluation. Plan ahead:

| Phase | Budget | Why |
|-------|--------|-----|
| Read skills + design | 15% | Understand the inputs |
| Run pipeline step(s) | 25% | Generate output to evaluate |
| Evaluate + write findings | 35% | Core value — this is what testing IS |
| Trace + refactor + verify | 25% | Apply and validate improvements |

If budget is running low during execution, **STOP executing and start evaluating what you have**. Partial execution with thorough evaluation is more valuable than full execution with no evaluation.

### Step 1: Select Design Document

Pick a validated design from `docs/plans/*-design.md`. Prefer:
- Small, self-contained designs (faster feedback)
- Designs that exercise common patterns (Provider, hooks, i18n)
- Designs that haven't been implemented yet (no bias from existing code)

### Step 2: Isolate

If already in a worktree (check: `git rev-parse --show-toplevel` differs from main repo root), use the current worktree. Otherwise create one:

```bash
git worktree add .claude/worktrees/pipeline-test -b pipeline-test-<date>
```

All pipeline execution happens in the worktree. The main repo stays clean. Skill edits (Step 6) go to the MAIN repo.

### Step 3: Run and Evaluate Each Step

**CRITICAL: Do NOT just run the pipeline. After EACH step, stop and evaluate.**

For each pipeline step, use a subagent (`Task(general-purpose)`) in the worktree:

#### sd-plan Evaluation

Run sd-plan against the design document. Then evaluate:

| Criterion | Check |
|-----------|-------|
| Design coverage | Every requirement in design → at least one task |
| Task granularity | Each step is 2-5 minutes, single action |
| File paths | All paths exist or are clearly new files |
| Code completeness | No "add validation here" placeholders |
| Test inclusion | Every task includes test step |
| Dependency order | Tasks ordered so dependencies come first |
| Missing context | Would a zero-context engineer understand each step? |

Score: count passing criteria / total. Record failing criteria with specific evidence (quote the problematic section from the generated plan).

#### sd-plan-dev Evaluation

Run sd-plan-dev on the generated plan. Then evaluate:

| Criterion | Check |
|-----------|-------|
| Dependency analysis | Correct batching (no file overlap in same batch) |
| Parallel execution | Independent tasks actually ran in parallel |
| Review dispatch | Both spec + quality reviewers dispatched per task |
| Fix loop | Issues found → fix → re-review cycle completed |
| Integration check | Typecheck + lint between batches |
| Final review | Design traceability check at the end |

#### sd-check Evaluation

Run sd-check on the implemented code. Then evaluate:

| Criterion | Check |
|-----------|-------|
| Format first | Prettier ran before checks |
| All checks ran | Typecheck + lint + test all executed |
| Fix priority | Typecheck → lint → test order respected |
| Re-run cycle | ALL checks re-ran after EACH fix |
| Evidence | Actual numbers reported, not "should work" |

#### sd-commit Evaluation

Run sd-commit on the changes. Then evaluate:

| Criterion | Check |
|-----------|-------|
| Conventional format | `type(scope): description` |
| Scope accuracy | Package name matches changed files |
| Description language | System language, imperative, lowercase |
| File selection | No unrelated files included |

### Step 4: Trace Issues to Skill Text

For each failing criterion:

1. Open the relevant SKILL.md
2. Find the section that SHOULD have prevented this failure
3. If the section exists: the instruction is unclear → rewrite it
4. If the section is missing: the skill has a gap → add it
5. Record: `[criterion] → [skill file]:[section] → [proposed fix]`

**Example:**
```
"Task granularity violated (Task 4 has 8 steps)"
→ sd-plan/SKILL.md:"Bite-Sized Task Granularity"
→ Add: "If a task has >5 steps, split it. No exceptions."
```

### Step 5: Write Findings Report

**Write the findings report BEFORE making any skill edits.** This ensures evidence is captured even if you run out of budget during refactoring.

Save to `.cache/pipeline-test-<date>.md` using the template in the Output section. Fill in all evaluated criteria with PASS/FAIL and evidence. Leave the "Skill Refactoring Applied" and "Re-verification Results" sections empty — fill them in Steps 6-7.

### Step 6: Refactor Skills

Apply the proposed fixes from Step 4. Rules:
- Edit the skill file in the MAIN repo (not worktree)
- Make minimal, targeted changes (not wholesale rewrites)
- Each edit addresses ONE specific failing criterion
- Update the findings report with what you changed

### Step 7: Re-verify

Run the affected pipeline step again (in a fresh worktree) with the updated skill. The failing criterion should now pass.

If it still fails → the fix was insufficient → iterate.

**Do NOT skip re-verification.** If budget is too low for a full re-run, at minimum re-read the edited skill section and confirm the instruction is unambiguous.

### Step 8: Clean Up

```bash
git worktree remove .claude/worktrees/pipeline-test --force
```

## Selective Testing

You don't have to test ALL steps every time:

- **Testing sd-plan only**: Run step 3 for sd-plan, skip the rest
- **Testing sd-plan-dev only**: Use an existing plan file, skip sd-plan
- **Testing sd-check only**: Use an existing implementation, skip sd-plan + sd-plan-dev

Specify which steps to test based on what changed.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running pipeline without evaluating | STOP after each step. Evaluate BEFORE proceeding |
| Evaluating based on "feels right" | Use the criteria tables. Score objectively |
| Editing skills without evidence | Every edit must trace to a specific failing criterion |
| Rewriting entire skill sections | Minimal, targeted edits only |
| Skipping re-verification | Always re-run the step after editing the skill |
| Testing in main repo | Always use a worktree |
| Spending all budget on execution | Evaluation is more important than execution. Plan your turn budget: 40% execution, 60% evaluation |

## Red Flags

If you find yourself:
- Running the full pipeline without stopping to evaluate → STOP
- Making skill edits without recording which criterion failed → STOP
- Writing a findings document without specific evidence → STOP
- Skipping worktree because "it's just a test" → STOP
- Testing only sd-plan and calling it "pipeline tested" → test the requested scope

## Output

Save findings to `.cache/pipeline-test-<date>.md`:

```markdown
# Pipeline Test Report — YYYY-MM-DD

## Design Used
[filename and summary]

## Results Per Step

### sd-plan: X/7 pass
- [criterion]: [PASS/FAIL] [evidence]

### sd-plan-dev: X/6 pass
- [criterion]: [PASS/FAIL] [evidence]

### sd-check: X/5 pass
- [criterion]: [PASS/FAIL] [evidence]

### sd-commit: X/4 pass
- [criterion]: [PASS/FAIL] [evidence]

## Skill Refactoring Applied
| Criterion | Skill File | Section | Change |
|-----------|-----------|---------|--------|

## Re-verification Results
[Pass/fail after refactoring]
```
