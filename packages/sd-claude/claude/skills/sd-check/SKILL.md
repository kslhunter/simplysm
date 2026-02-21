---
name: sd-check
description: Use when verifying code quality via typecheck, lint, and tests - before deployment, PR creation, after code changes, or when type errors, lint violations, or test failures are suspected. Applies to whole project or specific paths.
allowed-tools: Bash(node .claude/skills/sd-check/env-check.mjs), Bash(pnpm typecheck), Bash(pnpm lint --fix), Bash(pnpm vitest), Bash(pnpm lint:fix)
---

# sd-check

Verify code quality through parallel execution of typecheck, lint, and test checks.

## Overview

**This skill provides EXACT STEPS you MUST follow - it is NOT a command to invoke.**

**Foundational Principle:** Violating the letter of these steps is violating the spirit of verification.

When the user asks to verify code, YOU will manually execute **EXACTLY THESE 4 STEPS** (no more, no less):

**Step 1:** Environment Pre-check (4 checks in parallel)
**Step 2:** Launch 3 background Bash commands in parallel (typecheck, lint, test ONLY)
**Step 3:** Collect results, fix errors in priority order
**Step 4:** Re-verify (go back to Step 2) until all pass

**Core principle:** Always re-run ALL checks after any fix - changes can cascade.

**CRITICAL:**
- This skill verifies ONLY typecheck, lint, and test
- **NO BUILD. NO DEV SERVER. NO TEAMS. NO TASK LISTS.**
- Do NOT create your own "better" workflow - follow these 4 steps EXACTLY

## Usage

- `/sd-check` — verify entire project
- `/sd-check packages/core-common` — verify specific path only

**Default:** If no path argument provided, verify entire project.

## Quick Reference

| Check | Command | Purpose |
|-------|---------|---------|
| Typecheck | `pnpm typecheck [path]` | Type errors |
| Lint | `pnpm lint --fix [path]` | Code quality |
| Test | `pnpm vitest [path] --run` | Functionality |

**All 3 run in PARALLEL** (background Bash commands, single message)

## Workflow

### Step 1: Environment Pre-check

Before ANY verification, run the environment check script:

```bash
node .claude/skills/sd-check/env-check.mjs
```

- **Exit 0 + "Environment OK"**: Proceed to Step 2
- **Exit 1 + version error** (e.g., "simplysm v13+"): Tell the user this project is below v13 so automated checks are unavailable, and they should run typecheck, lint, and test manually. Then STOP — do not proceed to Step 2.
- **Exit 1 + other errors**: STOP, report the listed errors to user

The script checks: package.json version (v13+), pnpm workspace files, typecheck/lint scripts, vitest config.

### Step 2: Launch 3 Background Bash Commands in Parallel

Launch ALL 3 commands in a **single message** using Bash tool with `run_in_background: true`.

**Replace `[path]` with user's argument, or OMIT if no argument (defaults to full project).**

**Command 1 - Typecheck:**
```
Bash tool:
  command: "pnpm typecheck [path]"
  description: "Run typecheck"
  run_in_background: true
  timeout: 300000
```

**Command 2 - Lint:**
```
Bash tool:
  command: "pnpm lint --fix [path]"
  description: "Run lint with auto-fix"
  run_in_background: true
  timeout: 300000
```

**Command 3 - Test:**
```
Bash tool:
  command: "pnpm vitest [path] --run"
  description: "Run tests"
  run_in_background: true
  timeout: 300000
```

Each command returns a `task_id`. Use `TaskOutput` tool to collect results (with `block: true`).

### Step 3: Collect Results and Fix Errors

Collect ALL 3 outputs using `TaskOutput` tool (with `block: true, timeout: 300000`) in a **single message** (parallel calls).

**If all checks passed:** Complete (see Completion Criteria).

**If any errors found:**

1. **Analyze by priority:** Typecheck → Lint → Test
   - Typecheck errors may cause lint/test errors (cascade)

2. **Read failing files** to identify root cause

3. **Fix with Edit:**
   - **Typecheck:** Fix type issues
   - **Lint:** Fix code quality (most auto-fixed by `--fix`)
   - **Test:**
     - Run `git diff` to check intentional changes
     - If changes not reflected in tests: Update test
     - If source bug: Fix source
     - **If root cause unclear OR 2-3 fix attempts failed:** Recommend `/sd-debug`

4. **Proceed to Step 4**

### Step 4: Re-verify (Loop Until All Pass)

**CRITICAL:** After ANY fix, re-run ALL 3 checks.

Go back to Step 2 and launch 3 background Bash commands again.

**Do NOT assume:** "I only fixed typecheck → skip lint/test". Fixes cascade.

Repeat Steps 2-4 until all 3 checks pass.

## Common Mistakes

### ❌ Running checks sequentially
**Wrong:** Launch command 1, wait → command 2, wait → command 3
**Right:** Launch ALL 3 in single message (parallel background Bash calls)

### ❌ Fixing before collecting all results
**Wrong:** Command 1 returns error → fix immediately → re-verify
**Right:** Wait for all 3 → collect all errors → fix in priority order → re-verify

### ❌ Skipping re-verification after fixes
**Wrong:** Fix typecheck → assume lint/test still pass
**Right:** ALWAYS re-run all 3 checks after any fix

### ❌ Using agents instead of background Bash
**Wrong:** Launch haiku/sonnet/opus agents via Task tool to run commands
**Right:** Use `Bash` with `run_in_background: true` (no model overhead)

### ❌ Including build/dev steps
**Wrong:** Run `pnpm build` or `pnpm dev` as part of verification
**Right:** sd-check is ONLY typecheck, lint, test (no build, no dev)

### ❌ Asking user for path
**Wrong:** No path provided → ask "which package?"
**Right:** No path → verify entire project (omit path in commands)

### ❌ Infinite fix loop
**Wrong:** Keep trying same fix when tests fail repeatedly
**Right:** After 2-3 failed attempts → recommend `/sd-debug`

### ❌ Claiming success without fresh evidence
**Wrong:** "All checks should pass now" or "Great, that fixes it!"
**Right:** Run all 3 → read output → cite results (e.g., "0 errors, 47 tests passed") → THEN claim

## Red Flags - STOP and Follow Workflow

If you find yourself doing ANY of these, you're violating the skill:

- Treating sd-check as a command to invoke (`Skill: sd-check Args: ...`)
- Including build or dev server in verification
- Running commands sequentially instead of parallel
- Using Task/agent instead of background Bash
- Not re-verifying after every fix
- Asking user for path when none provided
- Continuing past 2-3 failed fix attempts without recommending `/sd-debug`
- Spawning 4+ commands (only 3: typecheck, lint, test)
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
| "I'll create a better workflow with teams/tasks" | Follow the 4 steps EXACTLY - no teams, no task lists |
| "I'll split tests into multiple commands" | Only 3 commands total: typecheck, lint, test |
| "Agents can analyze output better" | Background Bash is sufficient - analysis happens in main context |
| "I only fixed lint, typecheck still passes" | Always re-verify ALL - fixes can cascade |
| "Build is part of verification" | Build is deployment, not verification - NEVER include it |
| "Let me ask which path to check" | Default to full project - explicit behavior |
| "I'll try one more fix approach" | After 2-3 attempts → recommend /sd-debug |
| "Tests are independent of types" | Type fixes affect tests - always re-run ALL |
| "I'll invoke sd-check skill with args" | sd-check is EXACT STEPS, not a command |
| "4 commands: typecheck, lint, test, build" | Only 3 commands - build is FORBIDDEN |
| "I'm confident it passes" | Confidence ≠ evidence — run the check |
| "It should work now" | "Should" = no evidence — run the check |
| "I already verified earlier" | Earlier ≠ now — re-run after every change |
