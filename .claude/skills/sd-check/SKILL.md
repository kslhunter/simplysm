---
name: sd-check
description: Verify code via typecheck, lint, and tests
argument-hint: "[path]"
model: opus
---

## Usage

- `/sd-check` — verify the entire project
- `/sd-check packages/core-common` — verify a specific path only

If an argument is provided, run against that path. Otherwise, run against the entire project.

## Environment Pre-check

Before running any verification, confirm the project environment is properly set up.
Run these checks **in parallel** and report results before proceeding.

### 1. Root package.json version

Read the root `package.json` and check the `version` field.
The major version must be `13` (e.g., `13.x.x`). If the major version is not `13`, stop and report:

> "This skill requires simplysm v13. Current version: {version}"

### 2. pnpm workspace

Verify this is a pnpm project:

```
ls pnpm-workspace.yaml pnpm-lock.yaml
```

Both files must exist. If missing, stop and report to the user.

### 3. package.json scripts

Read the root `package.json` and confirm these scripts are defined:

- `typecheck`
- `lint`

If either is missing, stop and report to the user.

### 4. Vitest config

Verify vitest is configured:

```
ls vitest.config.ts
```

If missing, stop and report to the user.

---

If all pre-checks pass, report "Environment OK" and proceed to code verification.

## Code Verification

Run verification checks using haiku agents for command execution, then analyze and fix errors.
Repeat until all checks pass.

### Step 1: Launch Verification Agents (Parallel)

Launch 3 haiku agents in parallel using the Task tool.

**Important**: Replace `[path]` in the commands below with the actual path argument provided by the user. If no argument was provided, omit the path (runs on entire project).

**Agent 1 - Typecheck:**
```
Task tool with:
  subagent_type: Bash
  model: haiku
  description: "Run typecheck"
  prompt: "Run `pnpm typecheck [path]` and return the full output. Do NOT analyze or fix errors - just report the raw output."
```

**Agent 2 - Lint:**
```
Task tool with:
  subagent_type: Bash
  model: haiku
  description: "Run lint with auto-fix"
  prompt: "Run `pnpm lint --fix [path]` and return the full output. Do NOT analyze or fix errors - just report the raw output."
```

**Agent 3 - Test:**
```
Task tool with:
  subagent_type: Bash
  model: haiku
  description: "Run tests"
  prompt: "Run `pnpm vitest [path] --run` and return the full output. Do NOT analyze or fix errors - just report the raw output."
```

### Step 2: Collect Results and Fix Errors

Wait for all 3 agents to complete. Collect their outputs.

If any errors are found:

1. **Analyze errors by priority**: typecheck → lint → test
   - Typecheck errors may cause lint/test errors, so fix them first
2. **Read failing files** to identify root causes
3. **Fix with Edit**:
   - Typecheck errors: Fix type issues
   - Lint errors: Fix linting issues (most should be auto-fixed by `--fix`)
   - Test failures:
     - Run `git diff` to check for intentional code changes
     - If intentional changes not reflected in tests: Update test code
     - If source code bug: Fix source code
     - **If root cause is unclear or multiple fix attempts failed**: Recommend the user invoke `/sd-debug` for systematic root cause investigation
4. Proceed to Step 3

If all checks passed: Proceed to Completion.

### Step 3: Re-verify (Loop)

Go back to Step 1 and launch the 3 haiku agents again.
Repeat until all checks pass with no errors.

## Common Mistakes

### Running checks sequentially instead of parallel
❌ **Wrong**: Launch agent 1, wait, then agent 2, wait, then agent 3
✅ **Right**: Launch all 3 agents in a single message with multiple Task tool calls

### Fixing before collecting all results
❌ **Wrong**: Agent 1 returns error → fix immediately → launch agents again
✅ **Right**: Wait for all 3 agents → collect all errors → fix in priority order → re-verify

### Skipping re-verification after fixes
❌ **Wrong**: Fix typecheck error → assume lint/test still pass
✅ **Right**: Always re-run all 3 checks after any fix (fixes can introduce new errors)

### Using wrong model for agents
❌ **Wrong**: `model: opus` or `model: sonnet` for verification agents
✅ **Right**: `model: haiku` for command execution (cheaper, faster)

## Completion Criteria

Complete when all 3 checks pass without errors.
