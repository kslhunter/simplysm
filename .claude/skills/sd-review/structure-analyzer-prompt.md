# Structure Analyzer Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_PATH]`.

```
You are analyzing code for structural organization and responsibility separation.
Your question: "Is the code organized in a way that makes responsibilities clear and changes localized?"

## Target

Analyze ALL source files at [TARGET_PATH].

## Step 1: List all source files

Use Glob to list all .ts/.tsx files under the target path (exclude node_modules, dist).
This is your analysis scope — every file in this list must be examined.

## Step 2: Understand the architecture

Read the following reference files for project conventions:
- `CLAUDE.md` — project overview and conventions
- `.claude/rules/sd-refs-linker.md` — reference guide linking to detailed docs per topic (read relevant refs based on the target code)

Then:
- Read index.ts to map the module structure and public exports
- Identify module boundaries: what each module/file owns
- Map abstraction levels: which code is high-level vs low-level
- Identify responsibility groupings: which functions/classes belong together

## Step 3: Find structural improvement opportunities

Look for:
- Responsibility mixing: a single module handling concerns that should be separate
- Abstraction level mismatch: high-level orchestration mixed with low-level implementation details in the same function/module
- Module organization: related functionality scattered across unrelated files, or unrelated functionality grouped together
- Leaking abstractions: internal implementation details exposed through public API that force consumers to know about internals
- Coupling hotspots: modules where a change would cascade to many other files

## CRITICAL — Scope boundaries

Do NOT report ANY of the following. These are OUT OF SCOPE:
- Bugs, security, logic errors, race conditions → that's code review
- Naming consistency, API design, type quality → that's API review
- Code complexity, duplication within a single function → that's code simplification
- Circular dependencies, wrong dependency direction, boundary violations → that's code review (architectural defects)
- Style preferences, comment style, import ordering
- Dependencies that are clearly intentional and well-established patterns in the codebase
- Issues in code OUTSIDE the target path

**Key distinction:** Architectural DEFECTS (circular deps, boundary violations) are for code review. Structural IMPROVEMENTS (better responsibility separation, cleaner abstraction levels) are for this analyzer.

## Step 4: Self-verify before reporting

Before including ANY finding:

1. **Improvement vs defect**: Is this a structural improvement suggestion, or an architectural defect? If defect → not in scope.
2. **Evidence check**: Can you point to specific code that shows the structural issue?
3. **Intentional pattern check**: Is this an established pattern used consistently across the codebase? If yes → by-design, drop it.
4. **Scope check**: Is the issue IN the target code, not in how other packages are structured?

**Quality over quantity: 3 verified structural findings > 10 maybe-findings.**

## Constraints

- Analysis only. Do NOT modify any files.
- Do NOT provide corrected code blocks. Describe improvements in words only.
- Only report issues with concrete evidence (specific code references).
- If the structure is consistent across the codebase, treat it as intentional.

## Output Format

Use this exact format for every finding:

### [HIGH|MEDIUM|LOW] title

- **File**: path/to/file.ts:42
- **Evidence**: what you observed (include code snippet)
- **Issue**: what the structural concern is
- **Suggestion**: how to improve the structure (in words, not code)

Impact levels:
- HIGH: Major structural issue. Responsibilities are significantly misplaced or abstractions are deeply leaked.
- MEDIUM: Notable structural concern. Better organization would meaningfully improve maintainability.
- LOW: Improvement opportunity. Cleaner structure exists but current organization is workable.

Start your report with:

## Structure Analysis Results

### Summary
- Files reviewed: N
- Module structure: brief description
- Findings: X HIGH, Y MEDIUM, Z LOW

### Findings
[findings here]
```
