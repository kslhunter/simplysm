---
name: sd-check
description: Used when requesting "check", "sd-check", "typecheck+lint+test", "full check", etc.
---

# SD Check — Automated Check and Error Fix Loop

Detects the package manager, runs the check script, reviews the results, and if there are code errors, invokes sd-debug to analyze the root cause, applies fixes, and re-runs the check. This loop repeats until all errors are resolved.

ARGUMENTS: Target paths (optional, multiple allowed). If not specified, determined from the conversation context. If no specific target exists or "all" is specified, run without targets.

---

## Step 1: Preparation (PM Detection + Script Verification + Target Resolution)

1. **PM Detection**: Determine the package manager from the lock file in the project root.
   - `pnpm-lock.yaml` exists → `pnpm`
   - `yarn.lock` exists → `yarn`
   - `package-lock.json` exists → `npm`
   - None found → `npm` (default)
2. **Script Verification**: Check whether `scripts.check` exists in `package.json`. If not, inform the user with `"The check script is not defined in package.json."` and **stop**.
3. **Target Resolution**: Determine targets in the following priority order.
   1. Targets explicitly specified in ARGUMENTS
   2. Inferred from the current conversation context (e.g., user is working on a specific package)
   3. If neither applies or "all" is specified → run without targets (full check)

## Step 2: Run Check

1. `mkdir -p .tmp/check` (Bash)
2. Run the following command via Bash:
   ```
   TS=$(date +%y%m%d%H%M%S); $PM check [targets...] > .tmp/check/${TS}.txt 2>&1; echo "EXIT_CODE:$?" >> .tmp/check/${TS}.txt
   ```
   - `$PM` = the package manager detected in Step 1
   - `$TS` = timestamp variable (e.g., `260312143025`)
   - Include targets in the command if present; omit otherwise
3. Read the result file (`.tmp/check/${TS}.txt`) using the Read tool.

## Step 3: Analyze Results

Read the result file content and classify it into one of the following three categories:

- **Success**: All checks passed without errors → proceed to **Step 5 (Completion)**
- **Environment Error**: The issue is an environment/infrastructure problem rather than a code problem (e.g., missing dependencies, out of memory, command not found, network issues, etc.) → show the error details to the user and **stop immediately**. Do not attempt code fixes.
- **Code Error**: The issue is a source code problem such as type errors, lint violations, or test failures → proceed to **Step 4**

> The classification above should be determined by reading and interpreting the result content freely, not by hardcoded pattern matching.

**Iteration Limit**: If the current iteration count exceeds 5, report the remaining errors to the user, inform them with `"Errors remain after 5 iterations. Please review the remaining errors."`, and **stop**.

## Step 4: Error Analysis and Fix (Using sd-debug)

Invoke `sd-debug` via the Skill tool. Pass the following content as args:

```
Analyze the code errors from the check results below.
**Important workflow instructions:**
1. Perform Steps 1-2 thoroughly — gather problem information and conduct in-depth codebase analysis to identify the root cause. Do NOT skip or rush these steps.
2. Output the diagnostic report from Step 3, but skip the user confirmation (do not call AskUserQuestion).
3. Skip Steps 4-5 (do not invoke sd-plan).
4. Based on the analysis results and diagnostic report, apply fixes directly.

<Include the error content from the check result file here>
```

After sd-debug completes → return to **Step 2** (re-run check with a new txt file)

## Step 5: Completion Report

When all checks pass, output the following:
- Total number of iterations
- Summary of fixes made in each iteration
- Format: `"Check complete: all checks passed after {N} iteration(s)."` + bullet list of fix details
