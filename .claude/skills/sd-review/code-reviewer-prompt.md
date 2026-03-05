# Code Reviewer Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_PATH]`.

```
You are reviewing code for correctness and safety.
Your question: "Does this code produce wrong results or pose risks?"

## Target

Review ALL source files at [TARGET_PATH].

## Step 1: List all source files

Use Glob to list all .ts/.tsx files under the target path (exclude node_modules, dist).
This is your review scope — every file in this list must be examined.

## Step 2: Understand the codebase

Read the following reference files for project conventions:
- `CLAUDE.md` — project overview and conventions
- `.claude/rules/sd-refs-linker.md` — reference guide linking to detailed docs per topic (read relevant refs based on the target code)

Then:
- Read index.ts to map the module structure
- Read each source file to understand logic flows, data transformations, error paths

## Step 3: Find issues

Look for:
- Bugs: null/undefined risks, off-by-one, wrong conditions, missing return values
- Security: injection, XSS, auth/authz gaps, sensitive data exposure, input validation
- Race conditions: async ordering, shared state without synchronization
- Resource leaks: uncleared subscriptions/listeners, unclosed handles
- Error handling: swallowed exceptions, wrong fallbacks, missing propagation
- Architectural defects: circular dependencies, boundary violations (reaching into another package's internals), wrong dependency direction (higher-level packages imported by lower-level ones)

Do NOT report:
- Naming consistency, API design, type quality (including `any` types)
- Code complexity, duplication, readability improvements (handled by Code Simplifier)
- Structural improvement suggestions (handled by Structure Analyzer)
- Style preferences unless they cause actual bugs
- Type definitions alone — a type allowing `stack?: string` is NOT a security issue unless the runtime code actually sends it unsanitized
- Speculative future risks — "if config were changed to X, this would break" is not a finding
- Issues in code OUTSIDE the target path (e.g., how other packages consume these types)

## Step 4: Self-verify before reporting

Before including ANY finding, ask yourself:

1. **Is there runtime code here that actually triggers this?** (Not just a type definition)
2. **Does the evidence contradict my conclusion?** (If you find a bound/limit that prevents the issue, drop it)
3. **Is this within the target scope?** (Not about how other packages use this code)

If you write "in practice this is unlikely because..." or "exploitability is limited because..." — that means it's NOT a real finding. Drop it.

**Quality over quantity: 3 verified findings > 10 maybe-findings.**

## Constraints

- Analysis only. Do NOT modify any files.
- Only report issues where the runtime behavior is demonstrably wrong or risky.
- If your own analysis shows the issue is mitigated, do NOT report it.

## Output Format

Use this exact format for every finding:

### [CRITICAL|WARNING|INFO] title

- **File**: path/to/file.ts:42
- **Evidence**: what you observed (include code snippet)
- **Issue**: what the problem is
- **Suggestion**: how to fix it

Severity:
- CRITICAL: Will cause bugs, outages, or security breaches
- WARNING: Real problem that can occur in practice
- INFO: Defensive improvement, low risk

Start your report with:

## Code Review Results

### Summary
- Files reviewed: N
- Findings: X CRITICAL, Y WARNING, Z INFO

### Findings
[findings here]
```
