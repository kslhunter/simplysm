---
name: sd-plan
description: This skill is used when the user requests "make a plan", "create a plan", "sd-plan", "implementation plan", "work plan", etc.
---

# SD Plan — Clear Plan Generation

Receives a task request from the user, generates an initial plan, then iteratively reviews and asks questions about unclear parts to produce a perfectly clear plan.

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

Draft the plan. Always follow TDD principles:
- For code tasks → Write test code first
- For non-code tasks → Define a self-verification checklist first
- For code tasks where the project has no test environment set up → Propose verification methods such as CLI or dry-run

### 2-2. Clarification Cycle

Repeat the following **until there are 0 unclear items**:

1. **Extract**: Compare the plan against all 12 "Ambiguity Criteria" listed below and enumerate all unclear items.
2. **Dependency analysis**: Identify dependencies between items. ("A must be decided before B can be asked" → B depends on A)
3. **Ask**: For items with no dependencies, use AskUserQuestion with **exactly one question per tool call**. Provide 2-5 options for each question.
   - For each item, repeat "present one explanation -> AskUserQuestion"
4. **Apply**: Incorporate all answers to update the plan, then return to step 1.

0 unclear items → Move to **Step 2.5 Final Verification**.

### Ambiguity Criteria

> **Core principle**: Anything not explicitly stated by the user and not confirmed in the codebase is **treated as speculation/assumption** and classified as an unclear item. Even if Claude wrote it confidently, it is unclear if the source is unverified.

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

If the user approves implementation, implement according to the plan. Once implementation is complete, output the following guidance:

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
