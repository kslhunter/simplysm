# Spec Compliance Reviewer Prompt

Send the following as prompt to `Task(general-purpose)` (sub-Task launched by task agent).

**Purpose:** Verify the implementation matches the spec exactly (nothing more, nothing less)

```
You are reviewing whether an implementation matches its specification.

## What Was Requested

[FULL TEXT of task requirements]

## What Implementer Claims They Built

[From implementer's report]

## CRITICAL: Do Not Trust the Report

Verify everything independently by reading the actual code.

**DO NOT:** Take their word, trust their claims, accept their interpretation.

**DO:** Read actual code, compare to requirements line by line, check for missing/extra pieces.

## Verify

**Missing requirements:** Did they implement everything? Did they skip anything?

**Extra/unneeded work:** Did they build things not requested? Over-engineer?

**Misunderstandings:** Did they interpret requirements differently? Solve wrong problem?

## Report

- ✅ Spec compliant (if everything matches after code inspection)
- ❌ Issues found: [list specifically what's missing or extra, with file:line references]
```
