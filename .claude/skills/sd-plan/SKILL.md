---
name: sd-plan
description: This skill is used when the user requests "make a plan", "create a plan", "sd-plan", "implementation plan", "work plan", etc.
---

# SD Plan — Clear Plan Generation

Receives a task request from the user, generates an initial plan, then iteratively reviews and asks questions about unclear parts to produce a perfectly clear plan.

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
  1. **Task request**: The task description provided by the user when invoking the skill
  2. **Current conversation**: If no task request is provided, determine the task from the current conversation context
  3. **AskUserQuestion**: If neither of the above is sufficient, ask "What task should I create a plan for? Please describe the task."
- Proceed to Step 2 after obtaining a sufficient task description.

---

## Step 2: Plan Generation + Clarification Loop

### 2-1. Draft Creation

Draft the plan. **Every implementation item MUST be structured as 3 sub-steps: RED → Implement → GREEN.** NEVER skip or merge these sub-steps regardless of task simplicity.

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
1. **RED** — `git stash` your changes → launch Agent with a sample task against the **original** file → confirm the Agent's output shows the **problematic** behavior (FAIL)
2. **Implement** — `git stash pop` to restore changes, then apply your edits
3. **GREEN** — launch same Agent with the same task against the **modified** file → confirm the Agent's output shows the **desired** behavior (PASS). If FAIL → fix implementation → re-run GREEN until PASS.

### 2-2. Clarification Cycle

**This is a single-item loop. Each iteration handles exactly ONE unclear item, then restarts from scratch.**

1. **Extract**: Compare the plan against all 12 "Ambiguity Criteria" below → enumerate unclear items.
   - 0 unclear items → **STOP this loop. Go to Step 2.5.**
2. **Dependency analysis**: Identify dependencies. ("A must be decided before B" → B depends on A)
3. **Ask exactly ONE question**: Pick the single most important item with no unresolved dependencies.
   a. Present a brief explanation of why this item is unclear.
   b. Call AskUserQuestion with `questions` array containing **exactly 1 item**. Include 2-5 options.
   c. **STOP and WAIT** for the user's answer. Do NOT plan, prepare, or output anything about the next question.
4. **Apply**: Incorporate the answer into the plan.
5. **RESTART from step 1** — re-extract ALL unclear items from scratch. The previous answer may have resolved multiple items or created new ones. Never assume the remaining questions are still valid.

**NEVER ask 2+ questions before restarting the loop. NEVER plan ahead for "the next question". Each loop iteration = 1 Extract + 1 Question + 1 Answer.**

### Ambiguity Criteria

> **Core principle**: Anything not explicitly stated by the user and not confirmed in the codebase is **treated as speculation/assumption** and classified as an unclear item. Even if Claude wrote it confidently, it is unclear if the source is unverified.
>
> **Exception — implementation details are NOT unclear items**: Technical decisions about HOW to achieve the goal (code placement, internal structure, naming conventions, file organization, etc.) are Claude's engineering judgment. Only user-facing requirements (WHAT behavior the user wants) should be classified as unclear. If the user did not specify it and it is purely a technical approach decision, Claude decides — do NOT ask the user.

Compare against all 12 items below **during every review**. To skip an item as "not applicable", there must be concrete evidence (user statement or codebase confirmation).

1. **Unstated user assumptions**: Decisions filled in by Claude that the user did not specify
2. **Lack of specificity**: Expressions like "handle appropriately", "as needed" without explaining HOW
3. **Ambiguous scope**: IN/OUT scope is not defined
4. **Unspecified behavior**: Errors, invalid inputs, default values, etc. are not specified
5. **Unknown constraints**: Performance, compatibility, or platform requirements are unclear
6. **Missing edge cases**: Boundary conditions, concurrency, empty states, etc.
7. **Vague file/function references**: "Modify related files" without specific paths
8. **Unclear ordering/dependencies**: Precedence between steps is not specified
9. **Speculative expressions**: "Probably", "might be", "TBD", "???", etc.
10. **Missing integration details**: API contracts, data formats, interfaces are undefined
11. **No failure/rollback strategy**: No response plan for failures
12. **Undefined verification methods**: No verification method corresponding to an implementation step

---

## Step 2.5: Final Verification (Required Before Declaring No Ambiguities)

**Immediately before** declaring "no ambiguities", you must perform the following:

1. Re-read **every step of the plan from beginning to end**, comparing against the 12 criteria one more time.
2. Pay special attention to the following:
   - Are there any parts that Claude decided on its own without user confirmation?
   - Do all definitive statements (e.g., "will do X", "will handle as Y") have supporting evidence from user statements or the codebase?
   - Are there any places missing specific file paths, function names, or data structures?
3. If **even one** unclear item is found during this verification, return to the question cycle in Step 2.
4. If truly none remain → Move to Step 3.

---

## Step 3: Final Output

Once all unclear items have been resolved, present the completed plan to the user and request implementation approval via AskUserQuestion.

If the user approves, Write the plan to `.tmp/plans/${TS}_{topic}.md`.
- Generate the timestamp first: `TS=$(date +%y%m%d%H%M%S)`
- Filename example: `260311143052_add-progress-component.md`
- `{topic}`: Short kebab-case based on the task content (e.g., add-progress-component)

---

## Step 4: Post-Implementation Guidance

If the user approves implementation, implement according to the plan. Follow the TDD approach defined in Step 2-1 for the task type. **Do NOT proceed to the next item until the current item reaches GREEN.**

### TDD Execution Rules

**RED and GREEN must be actually executed. NEVER skip or substitute them.**

- "User already confirmed the issue" is NOT a valid RED. Run the test yourself.
- "Needs a separate session to verify" is NOT a valid GREEN. Run the test yourself.
- If GREEN fails → fix the implementation → re-run GREEN. Repeat until it passes.

Once all items are complete, output the following guidance:

- **If code changes are included**:
  ```
  Implementation is complete. It is recommended to run the following steps in order:
  1. /sd-check — Type check + lint + test inspection and auto-fix
  2. /sd-simplify — Simplification review of changed code
  3. /sd-commit — Commit changes
  ```

- **If no code changes are involved** (configuration, documentation, etc.):
  ```
  Implementation is complete. Run /sd-commit to commit the changes.
  ```
