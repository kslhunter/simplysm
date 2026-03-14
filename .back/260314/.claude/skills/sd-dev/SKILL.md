---
name: sd-dev
description: Used when requesting "sd-dev", "implement item", "develop", "TDD implementation", etc.
---

# SD Dev — TDD Implementation

Receives a task with acceptance criteria, determines the appropriate TDD approach, and executes RED → Implement → GREEN. Can be invoked directly by users or by sd-plan-dev subagents.

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
  1. **Args from calling skill**: Task description + acceptance criteria + target files provided by sd-plan-dev or other calling skill
  2. **Task request**: Direct task description provided by the user
  3. **Current conversation**: If no args, determine from conversation context
  4. **AskUserQuestion**: If none sufficient, ask for task description
- Required information: task description, acceptance criteria (verification statement list), target files
- Proceed to Step 2.

---

## Step 2: TDD Approach Classification

Classify the task, then apply the matching approach:

**If code + test env exists:**
A valid test imports the target code, calls its functions/methods with specific inputs, and asserts on the output or behavior (return values, thrown errors, side effects, state changes). **grep, Read, file-existence checks, or any file-content inspection are NOT valid tests.**
If the change has no testable logic (e.g., JSX class changes, markup restructuring, style-only edits), skip the RED/GREEN steps — do not force a meaningless test.

**If code + no test env:**
Use CLI commands or dry-run execution to verify behavior.

**If non-code (config, docs, prompts, SKILL.md, etc.):**
Prompt/config files cannot be unit-tested. Use **Agent behavioral simulation**: launch an Agent that reads the file and naturally follows its instructions with a sample task. **Do NOT tell the Agent what behavior you are testing** (this biases the result and invalidates the test).

---

## Step 3: TDD Execution

Execute RED → Implement → GREEN based on the classified approach:

**If code + test env exists:**
1. **RED** — Write a failing test that imports the target module, calls the function/method under test, and asserts on expected behavior (derived from acceptance criteria). Run it → confirm FAIL
2. **Implement** — Write the minimum code to pass
3. **GREEN** — Run the test → confirm PASS

**If code + no test env:**
1. **RED** — Define a CLI/dry-run command, run it → confirm FAIL
2. **Implement** — Write the minimum code to pass
3. **GREEN** — Run the same command → confirm PASS

**If non-code:**
1. **RED** — Launch Agent with a sample task against the **current** file → confirm the Agent's output shows the **problematic** behavior (FAIL)
2. **Implement** — Apply your edits
3. **GREEN** — Launch same Agent with the same task against the **modified** file → confirm the Agent's output shows the **desired** behavior (PASS). If FAIL → fix implementation → re-run GREEN until PASS.

### TDD Execution Rules

**RED and GREEN must be actually executed. NEVER skip or substitute them.**

- "User already confirmed the issue" is NOT a valid RED. Run the test yourself.
- "Needs a separate session to verify" is NOT a valid GREEN. Run the test yourself.
- If GREEN fails → fix the implementation → re-run GREEN. Repeat until it passes.

---

## Step 4: Check

Run `/sd-check` on the item's target files/packages.
- Identify the package(s) containing the target files
- Run: `/sd-check <package-path>`
- If check fails, fix the issues and re-run until pass
- For non-code files (.md, config), skip this step if not applicable

---

## Step 5: Post-Completion Guidance

Output the following guidance. Include only the items whose conditions are met, numbered sequentially:

| Condition | Recommendation |
|-----------|----------------|
| Invoked standalone (not from sd-plan-dev) | `/sd-commit` — Commit changes |

(When invoked from sd-plan-dev, sd-plan-dev handles post-completion guidance itself.)
