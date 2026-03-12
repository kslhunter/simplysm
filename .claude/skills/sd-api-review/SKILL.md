---
name: sd-api-review
description: Used when requesting "API review", "api-review", "sd-api-review", "API improvement", "public API review", "API intuitiveness", etc.
---

# SD API Review — Public API Intuitiveness Review and Improvement

Extracts the public API from the specified path (package/folder/file), compares it against relevant standards and similar libraries to derive intuitiveness improvements, then establishes an implementation plan via the `/sd-plan` process. Breaking changes are permitted, and user intuitiveness is the top priority.

ARGUMENTS: Target path (required). Example: `/sd-api-review packages/my-pkg`

---

## Step 1: Validate Arguments

1. Extract the **target path** from ARGUMENTS. If no path is provided, display "Please specify a target path. Example: `/sd-api-review packages/my-pkg`" and terminate.

## Step 2: Extract Public API

Collect the public API of the target.
- **Folder/file target**: Directly analyze exports from the given path
- **Depth**: Exported symbols (classes, functions, interfaces, types, constants) + public methods/properties of exported classes

If there are no exports, display "The target has no exported API." and terminate.

## Step 3: Comparative Analysis and Improvement Derivation

### 3-1. Determine Comparison Targets

- Analyze package metadata and code contents to infer the domain, then automatically select multiple widely-used libraries in that domain.
- Automatically include relevant standards (HTML, WAI-ARIA, Web API, TC39, JavaScript, CSS, etc.) based on the domain.

### 3-2. External API Research

Use WebSearch and WebFetch to research the following two axes with **equal weight**.
Compare at the **category/pattern level** (do not search for each individual symbol).

1. **Standards**: Research naming, attributes, and patterns from official specifications of domain-related standards.
2. **Libraries**: Research APIs from official documentation of the selected libraries.

### 3-3. Derive Improvements

Compare the API catalog from Step 2 against external APIs to derive improvements. Review from the perspectives of naming, structure, consistency, patterns, usability, and type quality.

Precautions:
- Breaking changes are not a concern. They are fully permitted.
- When input/output/purpose differs or behavior differs, proposals may be incorrect — this must always be recognized. (A common mistake)

Each improvement must include the following:
- **Current**: Current API state (code example)
- **Proposed**: Improved API (code example)
- **Reasons to change**: Rationale for the change (including standard/library comparisons)
- **Reasons not to change**: Rationale for maintaining the current state

## Step 4: Establish Implementation Plan via sd-plan

Using the improvements derived in Step 3 as the task description, invoke `sd-plan` via the Skill tool. Pass the following in args:

```
The following are API improvements **proposed by LLM analysis**.
Since the improvements are not explicitly requested modifications by the user, treat them as unclear.

## Target
<target path>

## LLM-Proposed Improvements — Comparative Analysis Table
When asking the user about unclear improvements, **always present** the following content first so the user can understand the context.

```
Improvement:
- Current:
- Proposed:
- Reasons to change:
- Reasons not to change:
```

## Required Considerations for Implementation
1. Breaking changes are not a concern. They are fully permitted.
2. Use Grep to search for usages of the changed API across the entire monorepo and update them together.
3. Do not leave deprecated wrappers (clean break).
```

## Step 5: Execute the Plan

Once sd-plan is complete and a finalized plan is produced, modify the code according to that plan.

## Step 6: Recommend README Update

If code modifications were made, recommend the user to run `/sd-readme`.
