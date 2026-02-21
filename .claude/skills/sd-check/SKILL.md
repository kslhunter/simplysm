---
name: sd-check
description: Use when verifying code quality via typecheck, lint, and tests - before deployment, PR creation, after code changes, or when type errors, lint violations, or test failures are suspected. Applies to whole project or specific paths.
allowed-tools: Bash(pnpm check), Bash(pnpm typecheck), Bash(pnpm lint --fix), Bash(pnpm vitest)
---

# sd-check

Verify code quality through parallel execution of typecheck, lint, and test checks.

## Overview

**This skill provides EXACT STEPS you MUST follow - it is NOT a command to invoke.**

**Foundational Principle:** Violating the letter of these steps is violating the spirit of verification.

When the user asks to verify code, YOU will manually execute **EXACTLY THESE 3 STEPS** (no more, no less):

**Step 1:** Run the unified check script (single background command)
**Step 2:** Collect results, fix errors in priority order
**Step 3:** Re-verify (go back to Step 1) until all pass

**Core principle:** Always re-run ALL checks after any fix - changes can cascade.

**CRITICAL:**
- This skill verifies ONLY typecheck, lint, and test
- **NO BUILD. NO DEV SERVER. NO TEAMS. NO TASK LISTS.**
- Do NOT create your own "better" workflow - follow these 3 steps EXACTLY

## Usage

- `/sd-check` — verify entire project (all 3 checks)
- `/sd-check packages/core-common` — verify specific path (all 3 checks)
- `/sd-check test` — run only tests (entire project)
- `/sd-check packages/core-common test` — run only tests for specific path
- `/sd-check typecheck` — run only typecheck
- `/sd-check lint` — run only lint

**Default:** If no path argument provided, verify entire project. If no type argument provided, run all 3 checks.
**Valid types:** `typecheck`, `lint`, `test`

## Quick Reference

| Check | Purpose |
|-------|---------|
| Typecheck | Type errors |
| Lint | Code quality (with auto-fix) |
| Test | Functionality |

**All 3 run in PARALLEL** inside the unified script (single command).

## Workflow

### Step 1: Run Unified Check Script

Launch the single check command in background:

```
Bash tool:
  command: "pnpm check [path] [--type type]"
  description: "Run typecheck + lint + test"
  timeout: 600000
```

Replace `[path]` with user's path argument, `[--type type]` with check type (`typecheck`, `lint`, `test`).
Omit `[path]` for full project, omit `[--type type]` for all checks.
If only type is given (no path), use `pnpm check --type <type>`.
Multiple types: `pnpm check --type typecheck,lint`.

**Output format:**
```
====== TYPECHECK ======
✔ 0 errors, 0 warnings

====== LINT ======
✖ 3 errors, 1 warning
(error details...)

====== TEST ======
✔ passed

====== SUMMARY ======
✖ 1/3 FAILED (lint)
Total: 3 errors, 1 warnings
```

- Failed checks show full error details inline
- **SUMMARY: ALL PASSED**: Complete (see Completion Criteria).
- **SUMMARY: N/3 FAILED**: Proceed to Step 2.

### Step 2: Fix Errors

1. **Analyze by priority:** Typecheck → Lint → Test
   - Typecheck errors may cause lint/test errors (cascade)

2. **Read the error output** from the check result, then **read failing source files** to identify root cause

3. **Fix with Edit:**
   - **Typecheck:** Fix type issues
   - **Lint:** Fix code quality (most auto-fixed by `--fix`)
   - **Test:**
     - Run `git diff` to check intentional changes
     - If changes not reflected in tests: Update test
     - If source bug: Fix source
     - **If root cause unclear OR 2-3 fix attempts failed:** Recommend `/sd-debug`

4. **Proceed to Step 3**

### Step 3: Re-verify (Loop Until All Pass)

**CRITICAL:** After ANY fix, re-run ALL 3 checks.

Go back to Step 1 and run the unified script again.

**Do NOT assume:** "I only fixed typecheck → skip lint/test". Fixes cascade.

Repeat Steps 1-3 until all 3 checks pass.

## Common Mistakes

### Fixing before reading full output
**Wrong:** See first error in output → fix immediately
**Right:** Read full SUMMARY → collect all errors → fix in priority order → re-verify

### Skipping re-verification after fixes
**Wrong:** Fix typecheck → assume lint/test still pass
**Right:** ALWAYS re-run the script after any fix

### Using agents instead of background Bash
**Wrong:** Launch haiku/sonnet/opus agents via Task tool to run the script
**Right:** Use `Bash` with `run_in_background: true` (no model overhead)

### Including build/dev steps
**Wrong:** Run `pnpm build` or `pnpm dev` as part of verification
**Right:** sd-check is ONLY typecheck, lint, test (no build, no dev)

### Asking user for path
**Wrong:** No path provided → ask "which package?"
**Right:** No path → verify entire project (omit path in command)

### Infinite fix loop
**Wrong:** Keep trying same fix when tests fail repeatedly
**Right:** After 2-3 failed attempts → recommend `/sd-debug`

### Claiming success without fresh evidence
**Wrong:** "All checks should pass now" or "Great, that fixes it!"
**Right:** Run script → read output → cite results (e.g., "0 errors, 47 tests passed") → THEN claim

## Red Flags - STOP and Follow Workflow

If you find yourself doing ANY of these, you're violating the skill:

- Including build or dev server in verification
- Using Task/agent instead of background Bash
- Not re-verifying after every fix
- Asking user for path when none provided
- Continuing past 2-3 failed fix attempts without recommending `/sd-debug`
- Expressing satisfaction ("Great!", "Perfect!", "Done!") before all 3 checks pass
- Using vague language: "should work", "probably passes", "seems fine"
- Claiming completion based on a previous run, not the current one

**All of these violate the skill's core principles. Go back to Step 1 and follow the workflow exactly.**

## Completion Criteria

**Complete when:**
- All 3 checks (typecheck, lint, test) pass without errors **in the most recent run**
- Report with evidence: "All checks passed" + cite actual output (e.g., "0 errors", "47 tests passed")

**Fresh evidence required:**
- "Passes" = you ran it THIS iteration and saw it pass in the output
- Previous run results are NOT evidence for current state
- Confidence is NOT evidence — run the check

**Do NOT complete if:**
- Any check has errors
- Haven't re-verified after a fix
- Environment pre-checks failed
- Using "should", "probably", or "seems to" instead of actual output

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "I'm following the spirit, not the letter" | Violating the letter IS violating the spirit - follow EXACTLY |
| "I'll create a better workflow with teams/tasks" | Follow the 3 steps EXACTLY - no teams, no task lists |
| "Agents can analyze output better" | Background Bash is sufficient - analysis happens in main context |
| "I only fixed lint, typecheck still passes" | Always re-verify ALL - fixes can cascade |
| "Build is part of verification" | Build is deployment, not verification - NEVER include it |
| "Let me ask which path to check" | Default to full project - explicit behavior |
| "I'll try one more fix approach" | After 2-3 attempts → recommend /sd-debug |
| "Tests are independent of types" | Type fixes affect tests - always re-run ALL |
| "I'm confident it passes" | Confidence is not evidence — run the check |
| "It should work now" | "Should" = no evidence — run the check |
| "I already verified earlier" | Earlier is not now — re-run after every change |
