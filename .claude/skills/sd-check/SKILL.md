---
name: sd-check
description: Use when verifying code quality via typecheck, lint, and tests - before deployment, PR creation, after code changes, or when type errors, lint violations, or test failures are suspected. Applies to whole project or specific paths.
allowed-tools: Bash(node .claude/skills/sd-check/env-check.mjs)
---

# sd-check

Verify code quality through parallel execution of typecheck, lint, and test checks.

## Overview

**This skill provides EXACT STEPS you MUST follow - it is NOT a command to invoke.**

**Foundational Principle:** Violating the letter of these steps is violating the spirit of verification.

When the user asks to verify code, YOU will manually execute **EXACTLY THESE 4 STEPS** (no more, no less):

**Step 1:** Environment Pre-check (4 checks in parallel)
**Step 2:** Launch 3 haiku agents in parallel (typecheck, lint, test ONLY)
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

| Check | Command | Agent Model | Purpose |
|-------|---------|-------------|---------|
| Typecheck | `pnpm typecheck [path]` | haiku | Type errors |
| Lint | `pnpm lint --fix [path]` | haiku | Code quality |
| Test | `pnpm vitest [path] --run` | haiku | Functionality |

**All 3 run in PARALLEL** (separate haiku agents, single message)

## Workflow

### Step 1: Environment Pre-check

Before ANY verification, run the environment check script:

```bash
node .claude/skills/sd-check/env-check.mjs
```

- **Exit 0 + "Environment OK"**: Proceed to Step 2
- **Exit 1 + "FAIL"**: STOP, report the listed errors to user

The script checks: package.json version (v13), pnpm workspace files, typecheck/lint scripts, vitest config.

### Step 2: Launch 3 Haiku Agents in Parallel

Launch ALL 3 agents in a **single message** using Task tool.

**Replace `[path]` with user's argument, or OMIT if no argument (defaults to full project).**

**Agent 1 - Typecheck:**
```
Task tool:
  subagent_type: Bash
  model: haiku
  description: "Run typecheck"
  prompt: "Run `pnpm typecheck [path]` and return full output. Do NOT analyze or fix - just report raw output."
```

**Agent 2 - Lint:**
```
Task tool:
  subagent_type: Bash
  model: haiku
  description: "Run lint with auto-fix"
  prompt: "Run `pnpm lint --fix [path]` and return full output. Do NOT analyze or fix - just report raw output."
```

**Agent 3 - Test:**
```
Task tool:
  subagent_type: Bash
  model: haiku
  description: "Run tests"
  prompt: "Run `pnpm vitest [path] --run` and return full output. Do NOT analyze or fix - just report raw output."
```

### Step 3: Collect Results and Fix Errors

Wait for ALL 3 agents. Collect outputs.

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

Go back to Step 2 and launch 3 haiku agents again.

**Do NOT assume:** "I only fixed typecheck → skip lint/test". Fixes cascade.

Repeat Steps 2-4 until all 3 checks pass.

## Common Mistakes

### ❌ Running checks sequentially
**Wrong:** Launch agent 1, wait → agent 2, wait → agent 3
**Right:** Launch ALL 3 in single message (parallel Task calls)

### ❌ Fixing before collecting all results
**Wrong:** Agent 1 returns error → fix immediately → re-verify
**Right:** Wait for all 3 → collect all errors → fix in priority order → re-verify

### ❌ Skipping re-verification after fixes
**Wrong:** Fix typecheck → assume lint/test still pass
**Right:** ALWAYS re-run all 3 checks after any fix

### ❌ Using wrong model
**Wrong:** `model: opus` or `model: sonnet` for verification agents
**Right:** `model: haiku` (cheaper, faster for command execution)

### ❌ Including build/dev steps
**Wrong:** Run `pnpm build` or `pnpm dev` as part of verification
**Right:** sd-check is ONLY typecheck, lint, test (no build, no dev)

### ❌ Asking user for path
**Wrong:** No path provided → ask "which package?"
**Right:** No path → verify entire project (omit path in commands)

### ❌ Infinite fix loop
**Wrong:** Keep trying same fix when tests fail repeatedly
**Right:** After 2-3 failed attempts → recommend `/sd-debug`

## Red Flags - STOP and Follow Workflow

If you find yourself doing ANY of these, you're violating the skill:

- Treating sd-check as a command to invoke (`Skill: sd-check Args: ...`)
- Including build or dev server in verification
- Running agents sequentially instead of parallel
- Not re-verifying after every fix
- Asking user for path when none provided
- Continuing past 2-3 failed fix attempts without recommending `/sd-debug`
- Spawning 4+ agents (only 3: typecheck, lint, test)

**All of these violate the skill's core principles. Go back to Step 1 and follow the workflow exactly.**

## Completion Criteria

**Complete when:**
- All 3 checks (typecheck, lint, test) pass without errors
- Report: "All checks passed - code verified"

**Do NOT complete if:**
- Any check has errors
- Haven't re-verified after a fix
- Environment pre-checks failed

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "I'm following the spirit, not the letter" | Violating the letter IS violating the spirit - follow EXACTLY |
| "I'll create a better workflow with teams/tasks" | Follow the 4 steps EXACTLY - no teams, no task lists |
| "I'll split tests into multiple agents" | Only 3 agents total: typecheck, lint, test |
| "Stratified parallel is faster" | Run ALL 3 in parallel via separate agents - truly parallel |
| "I only fixed lint, typecheck still passes" | Always re-verify ALL - fixes can cascade |
| "Build is part of verification" | Build is deployment, not verification - NEVER include it |
| "Let me ask which path to check" | Default to full project - explicit behavior |
| "I'll try one more fix approach" | After 2-3 attempts → recommend /sd-debug |
| "Tests are independent of types" | Type fixes affect tests - always re-run ALL |
| "I'll invoke sd-check skill with args" | sd-check is EXACT STEPS, not a command |
| "4 agents: typecheck, lint, test, build" | Only 3 agents - build is FORBIDDEN |
