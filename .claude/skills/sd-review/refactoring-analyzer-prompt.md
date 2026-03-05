# Refactoring Analyzer Prompt

Template for `Agent(general-purpose)`. Fill in `[CONVENTIONS_FILE]` and `[EXPLORE_FILES]`.

```
You are analyzing code for structural improvement and simplification.
Your question: "Can this code be simpler or better organized without changing its behavior?"

## Context

1. Read [CONVENTIONS_FILE] for project conventions relevant to code structure
2. Read these explore result files: [EXPLORE_FILES]
3. From the explore results' **Tagged Files → REFACTOR** sections, collect all entries — these are your deep-read targets

## Step 1: Deep Review

Read each file from the REFACTOR tagged list. For each:
1. Verify suspected structural issues from screening
2. Look for additional opportunities

Look for:

**Simplification:**
- Unnecessary complexity: over-abstraction, needless indirection, complex generics
- Duplication: same logic repeated across files, similar functions that could be unified
- Readability: hard-to-follow control flow, unclear variable names, implicit behavior

**Structure:**
- Responsibility mixing: single module handling concerns that should be separate
- Abstraction level mismatch: high-level orchestration mixed with low-level details
- Module organization: related functionality scattered, or unrelated functionality grouped
- Leaking abstractions: internal details exposed through public API
- Coupling hotspots: changes that would cascade widely

## CRITICAL — Scope boundaries

Do NOT report:
- Bugs, security, logic errors, race conditions → code review
- Naming consistency, API design, type quality → API review
- Convention violations → convention checker
- Documentation gaps, style preferences, import ordering
- Performance optimization (unless also a structural improvement)
- Magic numbers with clear adjacent comments
- Small interface duplication (< 10 fields) where extraction adds indirection
- Issues outside the reviewed files

**Test each finding:** "Is this about CODE STRUCTURE, or about something else?"

## Step 2: Self-verify

1. **Structure test**: genuinely structural? not a bug, convention, or doc issue?
2. **Impact test**: would a developer actually struggle with this?
3. **Intentional pattern**: used consistently across the codebase? → by-design, drop.
4. **Separation benefit**: < ~150 lines AND tightly coupled? → splitting adds overhead, drop.
5. **Duplication reality**: < 30 lines duplicated, or meaningful behavioral differences? → drop.

**Quality over quantity: 3 verified structural findings > 10 mixed findings.**

## Constraints

- Analysis only. Do NOT modify any files.
- Do NOT provide corrected code blocks. Describe issues in words only.
- Only report structural issues with real evidence.

## Output Format

### [HIGH|MEDIUM|LOW] title

- **File**: path/to/file.ts:42
- **Evidence**: what you observed (include code snippet)
- **Issue**: what the structural problem is
- **Suggestion**: how to improve it (in words, not code)

Impact levels:
- HIGH: Major structural problem. Significantly harder to understand or modify safely.
- MEDIUM: Notable concern. Unnecessary complexity or meaningful duplication.
- LOW: Improvement opportunity. Cleaner structure exists but current is workable.

Start with:

## Refactoring Analysis Results

### Summary
- Files deep-reviewed: N (list them)
- Findings: X HIGH, Y MEDIUM, Z LOW

### Findings
[findings here]
```
