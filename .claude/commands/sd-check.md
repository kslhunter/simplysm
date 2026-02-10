---
description: Verify code via typecheck, lint, and tests
argument-hint: [path]
---

## Usage

- `/sd-check` — verify the entire project
- `/sd-check packages/core-common` — verify a specific path only

If an argument is provided, run against that path. Otherwise, run against the entire project.

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
pnpm vitest package/{{package-name}} --run $ARGUMENTS
```

Run with `--run` flag for single execution (no watch mode).
Some packages may require integration tests as configured in vitest.config.ts.

On failure: Read the failing test and related source files to identify the cause, fix with Edit, then re-run tests.

## Completion Criteria

Complete when all 3 steps pass without errors.
