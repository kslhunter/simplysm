---
name: sd-check
description: Verify code via typecheck, lint, and tests
argument-hint: "[path]"
model: sonnet
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

Run the following 3 checks **in order**.
If errors occur at any step, **fix the code directly** and re-run that step.
Repeat until no errors remain, then proceed to the next step.

### Step 1: TypeScript Typecheck

```
pnpm typecheck $ARGUMENTS
```

On error: Read the failing file to identify the cause, fix with Edit, then re-run typecheck.

### Step 2: ESLint Lint

```
pnpm lint --fix $ARGUMENTS
```

On error: Read the failing file, fix with Edit, then re-run lint.

### Step 3: Tests (Vitest)

```
pnpm vitest $ARGUMENTS --run
```

Run with `--run` flag for single execution (no watch mode).
Some packages may require integration tests as configured in vitest.config.ts.

On failure:

1. **Check git diff**: Run `git diff` (staged + unstaged) to identify intentional code changes.
2. **Determine root cause**: Check whether the test failure is caused by intentional code changes (feature changes, API changes, behavior changes) that haven't been reflected in tests yet.
   - **Intentional changes not reflected in tests**: Update the **test code** to match the new behavior, not the source code.
   - **Source code bug**: Fix the source code.
3. Re-run tests after the fix.

## Completion Criteria

Complete when all 3 steps pass without errors.
