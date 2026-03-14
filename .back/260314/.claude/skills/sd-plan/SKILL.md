---
name: sd-plan
description: Used when requesting "make a plan", "create a plan", "sd-plan", "implementation plan", "work plan", "requirements specification", "sd-spec", "requirement analysis", "requirement clarification", etc.
---

# SD Plan — Requirements & Implementation Planning

Receives a task description, clarifies requirements through iterative questioning, investigates the codebase, clarifies implementation details, and produces an implementation plan with acceptance criteria and dependency information.

## MANDATORY RULE — ONE QUESTION PER AskUserQuestion CALL

**Every AskUserQuestion call MUST have exactly 1 item in the `questions` array. NEVER bundle 2+ questions.**

WRONG — bundling multiple questions:
```
questions: [
  { question: "Which API style?" ... },
  { question: "Which styling approach?" ... },
  { question: "What default value?" ... }
]
```

RIGHT — one question per call, sequential:
```
// Call 1
questions: [{ question: "Which API style?" ... }]
// Wait for answer → apply → re-extract unclear items
// Call 2
questions: [{ question: "Which styling approach?" ... }]
// Wait for answer → apply → re-extract unclear items
// Call 3
questions: [{ question: "What default value?" ... }]
```

**Violating this rule makes the output unusable. There is NO exception.**

---

## Step 1: Input Verification

- Obtain the task description in the following priority order:
  1. **File path**: If a `_req.md` file path is provided in args, read the file as the task input
  2. **Task request**: Direct task description provided by the user or calling skill
  3. **Current conversation**: If no args are provided, determine the task from the current conversation context
  4. **AskUserQuestion**: If none of the above is sufficient, ask "What task should I create an implementation plan for? Please describe the task."
- Proceed to Step 2 after obtaining a sufficient task description.

---

## Step 2: Requirement Clarification

### 2-1. Determine Requirement Type and Read Templates

Classify the task into one or more types:

| Type | When to use |
|------|-------------|
| process | Workflow, state machine, multi-step procedure |
| ui | UI component, page, visual element |
| api | REST endpoint, service interface, data contract |
| bug-fix | Error correction, unexpected behavior fix |
| data | ETL, data migration, transformation pipeline |
| refactoring | Code restructuring without behavior change |

Read the following template files using the Read tool:
1. **Always**: `refs/req-common.md` (from this skill's directory)
2. **Per type**: `refs/req-{type}.md` for each applicable type
3. **No match**: If none of the types apply, use common sections only
4. **Multiple types**: Read all applicable templates and merge sections (deduplicate overlapping content)

### 2-2. Draft Requirements Specification

Using the template sections from 2-1, draft the requirements specification. Fill in each section based on the task description and conversation context.

### 2-3. Requirement Clarification Cycle

**This is a single-item loop. Each iteration handles exactly ONE unclear item, then restarts from scratch.**

1. **Extract**: Compare the requirements specification against all 7 "Requirement Ambiguity Criteria" below → enumerate unclear items.
   - 0 unclear items → **STOP this loop. Go to Step 2-4.**
2. **Dependency analysis**: Identify dependencies. ("A must be decided before B" → B depends on A)
3. **Ask exactly ONE question**: Pick the single most important item with no unresolved dependencies.
   a. Present a brief explanation of why this item is unclear.
   b. Call AskUserQuestion with `questions` array containing **exactly 1 item**. Include 2-5 options.
   c. **STOP and WAIT** for the user's answer. Do NOT plan, prepare, or output anything about the next question.
4. **Apply**: Incorporate the answer into the requirements specification.
5. **RESTART from step 1** — re-extract ALL unclear items from scratch. The previous answer may have resolved multiple items or created new ones. Never assume the remaining questions are still valid.

**NEVER ask 2+ questions before restarting the loop. NEVER plan ahead for "the next question". Each loop iteration = 1 Extract + 1 Question + 1 Answer.**

### Requirement Ambiguity Criteria

> **Core principle**: Anything not explicitly stated by the user and not confirmed in the codebase is **treated as speculation/assumption** and classified as an unclear item. Even if Claude wrote it confidently, it is unclear if the source is unverified.

Compare against all 7 items below **during every review**. To skip an item as "not applicable", there must be concrete evidence (user statement or codebase confirmation).

1. **Unstated user assumptions**: Decisions filled in by Claude that the user did not specify
2. **Lack of specificity**: Expressions like "handle appropriately", "as needed" without explaining HOW
3. **Ambiguous scope**: IN/OUT scope is not defined
4. **Unspecified behavior**: Errors, invalid inputs, default values, etc. are not specified
5. **Unknown constraints**: Performance, compatibility, or platform requirements are unclear
6. **Missing edge cases**: Boundary conditions, concurrency, empty states, etc.
7. **Speculative expressions**: "Probably", "might be", "TBD", "???", etc.

### 2-4. Final Requirement Verification

**Immediately before** declaring "no ambiguities", perform the following:

1. Re-read **every section of the requirements specification**, comparing against the 7 criteria one more time.
2. Pay special attention to:
   - Are there any parts that Claude decided on its own without user confirmation?
   - Do all definitive statements have supporting evidence from user statements or the codebase?
3. If **even one** unclear item is found, return to the clarification cycle in Step 2-3.
4. If truly none remain → Move to Step 3.

---

## Step 3: Implementation Planning

### 3-1. Investigate Codebase

Before drafting the implementation plan, investigate the codebase to understand:
- Existing patterns and conventions relevant to the task
- File structure and organization
- Related existing code that will be modified or extended
- Available utilities, frameworks, and libraries

Use the Explore agent or direct Glob/Grep/Read tools as appropriate.

### 3-2. Draft Implementation Plan

**Every implementation item MUST include the following metadata:**
- **Depends on**: List of item numbers this item depends on (or "none")
- **Target files**: List of specific file paths this item will create or modify
- **Acceptance Criteria**: Verification statement list — concise, verifiable statements derived from the requirements

Acceptance criteria format:
```
### Acceptance Criteria
- `parseConfig(valid)` returns parsed object
- `parseConfig(invalid)` throws `ConfigError`
- Empty input returns default config
```

### 3-3. Implementation Clarification Cycle

**This is a single-item loop. Each iteration handles exactly ONE unclear item, then restarts from scratch.**

1. **Extract**: Compare the implementation plan against all 5 "Implementation Ambiguity Criteria" below → enumerate unclear items.
   - 0 unclear items → **STOP this loop. Go to Step 3-4.**
2. **Dependency analysis**: Identify dependencies.
3. **Resolve the top item**:
   a. **First, investigate the codebase** to try to resolve the ambiguity (read files, search patterns, check conventions).
   b. If investigation resolves it → apply the finding and RESTART from step 1.
   c. If **2+ equally viable approaches remain** after investigation → ask the user via AskUserQuestion (same rules: 1 question, 2-5 options).
   d. **STOP and WAIT** for the answer.
4. **Apply**: Incorporate the finding or answer.
5. **RESTART from step 1** — re-extract ALL unclear items from scratch.

**NEVER ask 2+ questions before restarting the loop.**

### Implementation Ambiguity Criteria

> **Core principle**: Investigate the codebase first. Ask the user only when 2+ equally viable approaches remain after investigation.

1. **Vague file/function references**: Implementation targets are not specific (search codebase to identify exact locations)
2. **Unclear ordering/dependencies**: Precedence between implementation steps is not determined
3. **Missing integration details**: API contracts, data formats, or interfaces needed for implementation are undefined
4. **No failure/rollback strategy**: No response plan for implementation failures
5. **Undefined acceptance criteria**: No verifiable acceptance criteria corresponding to an implementation step

### 3-4. Final Implementation Verification

**Immediately before** declaring "no ambiguities", perform the following:

1. Re-read **every step of the implementation plan**, comparing against the 5 criteria one more time.
2. Pay special attention to:
   - Are there any implementation decisions without codebase evidence?
   - Are there specific file paths, function names, and data structures for all implementation targets?
   - Does every item have concrete, verifiable acceptance criteria?
   - Does every item have `Depends on` and `Target files` filled in?
3. If **even one** unclear item is found, return to the clarification cycle in Step 3-3.
4. If truly none remain → Move to Step 3-5.

### 3-5. Output Implementation Plan

Present the completed implementation plan to the user and request approval via AskUserQuestion.

- If approved: Save to `.tmp/plans/${TS}_{topic}_plan.md`
  - Generate timestamp first: `TS=$(date +%y%m%d%H%M%S)`
  - `{topic}`: Short kebab-case based on the task content
- If rejected: Incorporate the user's feedback and return to Step 3-3.

---

## Step 4: Post-Completion Guidance

Once the implementation plan is saved, output the following:

```
Implementation plan is complete. Next step:
1. /sd-plan-dev — Execute the plan (parallel implementation)
```
