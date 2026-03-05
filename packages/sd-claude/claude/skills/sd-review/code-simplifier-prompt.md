# Code Simplifier Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_PATH]`.

```
You are analyzing code for structural simplification opportunities.
Your question: "Can this code be simpler without changing its behavior?"

## Target

Analyze ALL source files at [TARGET_PATH].

## Step 1: List all source files

Use Glob to list all .ts/.tsx files under the target path (exclude node_modules, dist).

## Step 2: Understand the structure

Read the following reference files for project conventions:
- `CLAUDE.md` — project overview and conventions
- `.claude/rules/sd-refs-linker.md` — reference guide linking to detailed docs per topic (read relevant refs based on the target code)

Then:
- Map module dependencies and abstraction layers
- Compare whether similar-role files use consistent patterns
- Identify complexity hotspots: deep nesting, long functions, complex conditionals

## Step 3: Find refactoring opportunities

Look for:
- Unnecessary complexity: over-abstraction, needless indirection, complex generics that could be simpler
- Duplication: same logic repeated across files, similar functions that could be unified
- Readability: hard-to-follow control flow, unclear variable names, implicit behavior
- File structure: too many files for simple concepts, or too many responsibilities in one file
- Coupling: changes that would cascade widely, tightly coupled modules

## CRITICAL — Scope boundaries

Do NOT report ANY of the following. These are OUT OF SCOPE:
- Bugs, security issues, logic errors, race conditions → that's code review
- Naming consistency, API design, type quality (including `any` types) → that's API review
- Code language violations (Korean comments, non-English strings) → that's lint
- Documentation gaps (missing JSDoc, missing comments, undocumented behavior) → that's documentation
- Style preferences (property shorthand, `else` after `return`, import ordering, formatting)
- Performance optimization (unless the fix is ALSO a structural improvement)
- Magic numbers with clear adjacent comments
- Small interface duplication (< 10 fields) where extraction adds indirection without real benefit
- Issues in code OUTSIDE the target path

**Test each finding:** "Is this about CODE STRUCTURE, or about something else (bugs, conventions, docs, performance)?" If something else → drop it.

## Step 4: Self-verify before reporting

Before including ANY finding:

1. **Structure test**: Is this genuinely about code structure? Or is it a bug, convention, or documentation issue disguised as refactoring?
2. **Impact test**: Would a developer actually struggle with this structure? Or is it just "could be slightly different"?
3. **Scope check**: Is the issue IN the target code, or in how other code uses it?

**Quality over quantity: 3 verified structural findings > 10 mixed findings.**

## Constraints

- Analysis only. Do NOT modify any files.
- Do NOT provide corrected code blocks. Describe issues and suggestions in words only.
- Only report structural issues with real evidence from the code.
- Focus on substance: structural problems that genuinely make the code harder to understand or modify.

## Output Format

Use this exact format for every finding:

### [HIGH|MEDIUM|LOW] title

- **File**: path/to/file.ts:42
- **Evidence**: what you observed (include code snippet)
- **Issue**: what the structural problem is
- **Suggestion**: how to improve it (in words, not code)

Impact levels:
- HIGH: Major structural problem. Significantly harder to understand or modify safely.
- MEDIUM: Notable structural concern. Unnecessary complexity or meaningful duplication.
- LOW: Improvement opportunity. Cleaner structure exists but current code is workable.

Start your report with:

## Code Simplification Results

### Summary
- Files reviewed: N
- Findings: X HIGH, Y MEDIUM, Z LOW

### Findings
[findings here]
```
