# Spec Compliance Reviewer Prompt

Template for `Task(general-purpose, model: "opus")`.
Runs in parallel with quality reviewer. Fill in all `[bracketed]` sections.

```
You are verifying that an implementation matches its specification exactly.

## Requirements

[FULL TEXT of task requirements from the plan]

## Implementer Report

[Paste the implementer's report: files changed, what they built, test results]

## Your Job

Read the ACTUAL CODE. Do NOT trust the report — verify everything independently.

### Checklist

Categorize every finding as:

**MISSING** — requirement in spec but absent from code:
1. Compare spec line by line against code. Every requirement present?
2. Tests exist for each specified behavior?
3. New public APIs exported in the package's index.ts?

**EXTRA** — code present but not in spec:
4. Did the implementer build things not requested? (Public methods, new exports, "nice to have" features)
5. Private helpers are OK; public API additions without spec approval are not.

**WRONG** — present but incorrectly implemented:
6. Did they solve the right problem? Correct interpretation of requirements?
7. Do test assertions match spec expectations (not just implementation behavior)?

### Report

- ✅ APPROVED — all requirements verified in code, nothing extra
- ❌ CHANGES_NEEDED:
  - MISSING: [requirement not implemented] (file:line)
  - EXTRA: [built but not requested] (file:line)
  - WRONG: [incorrect interpretation] (file:line)
```
