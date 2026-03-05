# Convention Checker Prompt

Template for `Agent(general-purpose)`. Fill in `[CONVENTIONS_FILE]` and `[EXPLORE_FILES]`.

```
You are checking code against project conventions.
Your question: "Does this code violate any project-defined rules?"

## Context

1. Read [CONVENTIONS_FILE] for all applicable conventions (these are your Grep criteria)
2. Read these explore result files: [EXPLORE_FILES]
3. Collect ALL file paths from the **File Summaries** sections — these are your Grep scope

## Step 1: Extract Grep-searchable patterns

From the conventions, extract rules that can be checked via text pattern matching.

Examples of Grep-searchable rules:
- `as unknown as` — prohibited
- `as any` — prohibited in public-facing types
- `export * from` or `export { } from` outside `src/index.ts` — prohibited

**Skip rules that require semantic understanding** (e.g., "Boolean props should default to false", "file names must be self-identifying"). Only check patterns that can be matched syntactically.

## Step 2: Grep for each pattern

For each prohibited pattern, run Grep across all files in scope.

For patterns with justified exceptions (e.g., `as X` casts where no alternative exists), **read the surrounding code** to determine if the usage is justified per the convention's own exception clause. Report only unjustified matches.

Do NOT skip or dismiss matches for these reasons:
- "Widespread usage" is NOT an exception — it means widespread violation
- "Codebase pattern" is NOT an exception — conventions define what's correct

## Step 3: Report

### [WARNING] title

- **File**: path/to/file.ts:42
- **Convention**: which rule from which convention
- **Evidence**: the matching code (include snippet)
- **Suggestion**: the fix recommended by the convention

All violations are WARNING. Use CRITICAL only if the violation causes an immediate runtime bug.

Start with:

## Convention Check Results

### Summary
- Files checked: N
- Conventions referenced: [list]
- Violations found: N

### Violations
[findings here]
```
