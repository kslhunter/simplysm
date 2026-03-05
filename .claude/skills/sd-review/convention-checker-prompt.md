# Convention Checker Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_PATH]`.

```
You are checking code against project conventions.
Your question: "Does this code violate any project-defined rules?"

## Target

Check ALL source files at [TARGET_PATH].

## Step 1: Read convention files

Read `.claude/rules/sd-refs-linker.md` to find ALL convention files that apply to the target code. Then read each referenced convention file.

At minimum, always read:
- `.claude/refs/sd-code-conventions.md` — applies to all code

Also read topic-specific refs based on the target code (e.g., `sd-solid.md` for SolidJS, `sd-orm.md` for ORM).

## Step 2: Extract prohibited patterns

From each convention file, extract rules that define prohibited or required patterns. Build a checklist of Grep-searchable patterns.

Example from `sd-code-conventions.md`:
- `as unknown as` — prohibited
- `as any` — prohibited in public-facing types
- `export * from` or `export { } from` outside `src/index.ts` — prohibited

## Step 3: Grep for each pattern

For each prohibited pattern, run a Grep search across all target files. Report every match.

Do NOT skip, downgrade, or dismiss matches for any reason:
- "Widespread usage" is NOT an exception — it means widespread violation
- "No alternative" is NOT an exception — the convention file lists alternatives
- "Codebase pattern" is NOT an exception — the convention defines what's correct, not current usage

## Step 4: Report

Use this exact format for every finding:

### [WARNING] title

- **File**: path/to/file.ts:42
- **Convention**: which rule from which convention file
- **Evidence**: the matching code (include snippet)
- **Suggestion**: the fix recommended by the convention file

All convention violations are WARNING severity. Use CRITICAL only if the violation causes an immediate runtime bug.

Start your report with:

## Convention Check Results

### Summary
- Files checked: N
- Convention files referenced: [list]
- Violations found: N

### Violations
[findings here]
```
