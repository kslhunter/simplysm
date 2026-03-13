---
name: sd-plan
description: This skill is used when requesting "make a plan", "create a plan", "sd-plan", "implementation plan", "work plan", etc.
---

# SD Plan — Implementation Plan Generation

Receives a task description (from a requirements specification file, calling skill findings, or direct user input), investigates the codebase, clarifies implementation details, and produces an implementation plan with dependency information.

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
  4. **AskUserQuestion**: If none of the above is sufficient, ask "What task should I create an implementation plan for? Please describe the task or provide a requirements specification file path."
- Proceed to Step 2 after obtaining a sufficient task description.

---

## Step 2: Implementation Clarification

### 2-1. Investigate Codebase

Before drafting the implementation plan, investigate the codebase to understand:
- Existing patterns and conventions relevant to the task
- File structure and organization
- Related existing code that will be modified or extended
- Available utilities, frameworks, and libraries

Use the Explore agent or direct Glob/Grep/Read tools as appropriate.

### 2-2. Draft Implementation Plan

**Every implementation item MUST include the following metadata:**
- **Depends on**: List of item numbers this item depends on (or "none")
- **Target files**: List of specific file paths this item will create or modify

**Every implementation item MUST be structured as 3 sub-steps: RED → Implement → GREEN.** NEVER skip or merge these sub-steps regardless of task simplicity.

Classify the task first, then apply the matching TDD approach:

**If code + test env exists:**
1. **RED** — Write a failing test file, run it → confirm FAIL
2. **Implement** — Write the minimum code to pass
3. **GREEN** — Run the test → confirm PASS

**If code + no test env:**
1. **RED** — Define a CLI/dry-run command, run it → confirm FAIL
2. **Implement** — Write the minimum code to pass
3. **GREEN** — Run the same command → confirm PASS

**If non-code (config, docs, prompts, SKILL.md, etc.):**
Prompt/config files cannot be unit-tested. Use **Agent behavioral simulation**: launch an Agent that reads the file and naturally follows its instructions with a sample task. **Do NOT tell the Agent what behavior you are testing** (this biases the result and invalidates the test).
1. **RED** — Launch Agent with a sample task against the **current** file → confirm the Agent's output shows the **problematic** behavior (FAIL)
2. **Implement** — Apply your edits
3. **GREEN** — Launch same Agent with the same task against the **modified** file → confirm the Agent's output shows the **desired** behavior (PASS). If FAIL → fix implementation → re-run GREEN until PASS.

### 2-3. Implementation Clarification Cycle

**This is a single-item loop. Each iteration handles exactly ONE unclear item, then restarts from scratch.**

1. **Extract**: Compare the implementation plan against all 5 "Implementation Ambiguity Criteria" below → enumerate unclear items.
   - 0 unclear items → **STOP this loop. Go to Step 2-4.**
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
5. **Undefined verification methods**: No RED/GREEN verification method corresponding to an implementation step

### 2-4. Final Implementation Verification

**Immediately before** declaring "no ambiguities", perform the following:

1. Re-read **every step of the implementation plan**, comparing against the 5 criteria one more time.
2. Pay special attention to:
   - Are there any implementation decisions without codebase evidence?
   - Are there specific file paths, function names, and data structures for all implementation targets?
   - Does every item have a concrete RED and GREEN verification?
   - Does every item have `Depends on` and `Target files` filled in?
3. If **even one** unclear item is found, return to the clarification cycle in Step 2-3.
4. If truly none remain → Move to Step 2-5.

### 2-5. Output Implementation Plan

Present the completed implementation plan to the user and request approval via AskUserQuestion.

- If approved: Save to `.tmp/plans/${TS}_{topic}_plan.md`
  - Generate timestamp first: `TS=$(date +%y%m%d%H%M%S)`
  - `{topic}`: Short kebab-case based on the task content
- If rejected: Incorporate the user's feedback and return to Step 2-3.

---

## Step 3: Post-Completion Guidance

Once the implementation plan is saved, output the following:

```
Implementation plan is complete. Next step:
1. /sd-plan-dev — Execute the plan (parallel implementation)
```
