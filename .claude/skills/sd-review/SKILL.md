---
name: sd-review
description: Used when requesting "bug review", "sd-review", "code review", "find bugs", etc. Analyzes code at the specified path for potential bugs, then creates a plan and applies fixes.
---

# SD Review — Potential Bug Detection

Reads the code at the specified path, analyzes it for potential bugs, then creates and executes a plan via the `/sd-plan` process.

ARGUMENTS: Target path (required). Specify any path within the repo.

---

## Step 1: Validate Arguments

1. Extract the target path from ARGUMENTS.
2. If no path is provided, display "Please specify a target path. Example: `/sd-review packages/my-pkg`" and stop.

## Step 2: Bug Analysis (Do Not Modify Code)

Read the code at the target path and search for potential bugs from the following 5 perspectives.
Do not modify the code under any circumstances. Only compile and output a list of findings.

**Analysis Perspectives:**
1. **Logic/Correctness** — Incorrect conditions, off-by-one errors, wrong operators, unintended branching
2. **Null/Undefined Safety** — Missing null checks, unused optional chaining, misuse of type assertions
3. **Error Handling** — Swallowed errors, missing catch blocks, improper error propagation
4. **Edge Cases** — Empty arrays/strings, boundary values, concurrency/race conditions, missing await
5. **Resource Management** — Unclosed connections, event listener leaks, memory leak patterns

Write each finding in the following format:
```
- **filepath:line** — Problem description — Suggested fix
```

If no findings are discovered, display "No potential bugs were found." and stop.

## Step 3: Create Plan via sd-plan

Using the list of findings from Step 2 as the task description, invoke `sd-plan` via the Skill tool. Pass the following as args:

```
The following are potential bug fixes **analyzed and suggested by the LLM**.
Since these fixes were not explicitly requested by the user, treat them as uncertain.

## Target
<target path>

## LLM-Suggested Fixes
When asking the user about uncertain fixes, **always present** the following information first so the user can understand the context.

```
Fix:
- Filepath:line:
- Problem description:
- Current code: (excerpt of the relevant code)
- Suggested fix:
```

<Full list of findings from Step 2>
```

## Step 4: Execute Plan

Once sd-plan completes and produces a finalized plan, apply the code modifications according to that plan.
