---
name: sd-simplify
description: Used when requesting "code simplification", "simplify", "sd-simplify", "code refinement", etc. Analyzes code at a specified path, creates a plan, and applies modifications.
---

# SD Simplify — Path-Specific Code Simplification

Analyzes code at a specified path using the built-in `/simplify`, then creates and executes a plan via the `/sd-plan` process.

ARGUMENTS: Target path (required). Specify any path within the repository.

---

## Step 1: Validate Arguments

1. Extract the target path from ARGUMENTS.
2. If no path is provided, display the message "Please specify a target path. Example: `/sd-simplify packages/my-pkg`" and stop.

## Step 2: simplify Analysis (Do Not Modify)

Invoke `simplify` using the Skill tool. Pass the following instructions as args:

```
Review the current codebase at the <target path> path. (Not recently changed code)
Do NOT modify any code. Only compile and output a list of items to fix.
Write each item in the following format:
- **file-path:line**
  - Current code: (excerpt of the relevant code)
  - Problem description:
  - Suggested improvement:
  - Reasons to change: Rationale for applying the improvement
  - Reasons not to change: Rationale for keeping the current code
```

Replace the `<target path>` placeholder with the actual path extracted in Step 1.

## Step 3: Create a Plan with sd-plan

Using the list of items to fix from Step 2 as the task description, invoke `sd-plan` using the Skill tool. Pass the following as args:

```
The following are code improvement suggestions **proposed by an LLM analysis**.
Since these suggestions were not explicitly requested by the user, treat them as unclear.

## Target
<target path>

## LLM-Suggested Improvements
When asking the user about unclear suggestions, **always present** the following details first so the user can understand the context.

```
Suggestion:
- File path:line:
- Current code: (excerpt of the relevant code)
- Problem description:
- Suggested improvement:
- Reasons to change:
- Reasons not to change:
```

<Full list of items to fix from Step 2>
```

Once sd-plan completes, follow its post-completion guidance.
