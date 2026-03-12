---
name: sd-debug
description: Used when requesting "debug", "sd-debug", "error analysis", "error cause", "find bug", etc.
---

# SD Debug — Root Cause Analysis and Resolution Planning

Receives error messages, stack traces, or problem descriptions, performs in-depth codebase analysis to diagnose the root cause, and formulates a resolution plan via the `/sd-plan` process.

ARGUMENTS: Error message, stack trace, or problem description (optional). If not provided, the skill infers from the conversation context or asks the user.

---

## Step 1: Gather Problem Information

- Gather problem information in the following priority order:
  1. **ARGUMENTS**: Error message, stack trace, or problem description passed along with the skill invocation
  2. **Current conversation**: If no ARGUMENTS are provided, identify error messages, logs, or problem context from the current conversation
  3. **AskUserQuestion**: If neither of the above yields sufficient information, ask: "What problem would you like to debug? Please provide an error message, stack trace, or describe the issue."
- Extract the following from the gathered problem information:
  - **Error type**: Compilation error / runtime error / type error / logic error / build error / unexpected behavior, etc.
  - **Related clues**: Keywords useful for codebase exploration, such as file paths, function names, line numbers, package names, error codes, etc.

## Step 2: In-Depth Codebase Analysis

Based on the problem information and clues gathered in Step 1, autonomously determine and perform the investigation needed to identify the root cause of the problem. Use the Agent tool (subagent_type: Explore) to explore the codebase, deciding the scope and method of investigation freely based on the nature of the problem.

### Analysis Principles

> **Key rule**: Do not propose solutions until you fully understand the root cause. Always follow the order: "Analyze -> Understand -> Solve."

1. **Understand intended behavior first**: Before analyzing the bug, first understand what the problematic code is *supposed* to do. Read the surrounding context, callers, and tests to grasp the original intent. Document this intended behavior explicitly — it becomes the baseline that any fix must preserve.
2. **No speculative fixes**: Do not attempt to find the cause through trial-and-error by modifying code and checking results. Read the code and trace the logic to identify the cause.
3. **No workarounds**: Do not propose solutions that mask symptoms, such as `as` type assertions, `any`, `// @ts-ignore`, hardcoding, or swallowing exceptions (ignoring after `catch`).
4. **Test failure triage**: When tests fail, first compare the intended behavior the test validates against the code's actual behavior. If the behavior change was intentional, update the test; if unintentional, fix the code. If intent cannot be determined, ask the user.
5. **Distinguish symptoms from causes**: The point where the error message appears may not be the actual cause. Trace back from the error location to find the real cause.

### Organize Analysis Results

Once the analysis is complete, organize the following items:
- **Intended behavior**: What the problematic code is supposed to do (the baseline that must be preserved)
- **Error location**: The specific code location where the problem occurs (file_path:line)
- **Root cause**: Analysis of why this problem occurs
- **Impact scope**: List of files/functions affected by this problem
- **Resolution options**: Possible solutions (including target files for each)

## Step 3: Consolidate Diagnosis and User Confirmation

Consolidate the analysis results from Step 2 into a diagnostic report in the format below and present it to the user:

```
## Diagnosis Results

### Problem Summary
<Summarize the error/problem in one sentence>

### Intended Behavior
<Describe what the problematic code is supposed to do. This is the baseline — any fix must preserve this behavior.>

### Root Cause
<Explain the root cause clearly and specifically. Include file paths and line numbers.>

### Impact Scope
- <Affected file/function 1>
- <Affected file/function 2>

### Resolution Options

1. **<Option 1 title>**: <Description>
   - Target files: <List of file paths>
   - Behavioral change: <Does this change any existing behavior? "None — preserves intended behavior" or describe what changes>
   - Pros: ...
   - Cons: ...

2. **<Option 2 title>**: <Description> (if applicable)
   - Target files: <List of file paths>
   - Behavioral change: <Does this change any existing behavior? "None — preserves intended behavior" or describe what changes>
   - Pros: ...
   - Cons: ...

### Recommended Option
<The most appropriate option and the reasoning>
```

After outputting the diagnostic report, ask the following via AskUserQuestion:

```
Please review the diagnosis results.
1. The diagnosis is accurate — proceed with the recommended option
2. The diagnosis is accurate, but proceed with a different option (specify number)
3. The diagnosis is inaccurate — I will provide additional information
```

- **Option 1 selected**: Proceed to Step 4 based on the recommended option.
- **Option 2 selected**: Proceed to Step 4 based on the option specified by the user.
- **Option 3 selected**: Return to Step 2 incorporating the additional information provided by the user.

## Step 4: Formulate Resolution Plan via sd-plan

Using the user-confirmed diagnosis and the selected resolution option as the task description, invoke `sd-plan` via the Skill tool. Pass the following in args:

```
Formulate a plan to implement the resolution based on the following debugging diagnosis:

## Problem
<Problem summary from Step 3>

## Root Cause
<Root cause from Step 3>

## Resolution
<Detailed content of the resolution option selected by the user>

## Target Files
<List of target file paths from the resolution option>
```

## Step 5: Execute the Plan

Once sd-plan completes and produces a finalized plan, modify the code according to that plan.

After applying the fix, verify that the intended behavior documented in Step 2 is preserved. Review the changes and confirm they correct the defect without altering what the code is supposed to do.
