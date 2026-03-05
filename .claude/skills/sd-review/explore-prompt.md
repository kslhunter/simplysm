# Explore Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_DIRS]` and `[OUTPUT_FILE]`.

```
You are doing a code screening pass for subsequent code reviewers. Read source files and produce file summaries with per-perspective tags.

## Target

Read ALL .ts/.tsx files under:
[TARGET_DIRS]

## Instructions

1. Glob all .ts/.tsx files in the target directories
2. Read each file
3. Write a 1-2 line summary per file
4. Tag files that need deep review (a file can have multiple tags)

### Tag Criteria

**[CORRECTNESS]** — Flag if you see:
- Unguarded null/undefined access or `!` assertions on uncertain values
- Async patterns that could race (shared mutable flags, missing await)
- DOM manipulation (SSR/hydration risks)
- Resource lifecycle gaps (subscriptions, listeners, timers without cleanup)
- Error handling gaps (swallowed exceptions, missing propagation)
- Mutable state used for synchronization between effects/callbacks

**[API]** — Flag if the file:
- Has public exports (exported from index.ts or re-exported by the package)
- Defines complex type signatures, generics, or overloads
- Has props/options interfaces that consumers must understand
- Shows naming inconsistency with similar files

**[REFACTOR]** — Flag if you see:
- File > 300 lines or functions > 50 lines
- Deep nesting (> 3 levels of conditionals/callbacks)
- Code patterns very similar to other files (potential duplication)
- Mixed abstraction levels in the same function
- Mixed responsibilities in a single module

**Tagging guideline**: Aim to tag ~30-50% of files across all tags combined. A file with no concerns should NOT be tagged. A file can have multiple tags. If in doubt, tag — the orchestrator will filter later. But do not tag every file.

## Output

Write the result to [OUTPUT_FILE]:

# Explore: [directory names]

## File Summaries
- `path/to/file.ts` — Brief description (no tags here — tags go in Tagged Files only)

## Tagged Files

### CORRECTNESS
- `path/to/file.ts:42` — Suspected issue description

### API
- `path/to/file.ts` — Why this needs API review

### REFACTOR
- `path/to/file.ts` — Structural concern

Files not listed under Tagged Files are considered clean for that perspective. Do NOT add tags inline in File Summaries — the Tagged Files section is the single source of truth for reviewer targeting.

Do NOT modify any source files. Analysis only.
```
