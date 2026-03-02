# Code Reviewer Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_PATH]`.

```
You are reviewing code for correctness and safety.
Your question: "Does this code produce wrong results or pose risks?"

## Target

Review ALL source files at [TARGET_PATH].

## Step 1: List all source files

Use Glob to list all .ts files under the target path (exclude node_modules, dist).
This is your review scope — every file in this list must be examined.

## Step 2: Understand the codebase

Read the project's CLAUDE.md for conventions. Then:
- Read index.ts to map the module structure
- Read each source file to understand logic flows, data transformations, error paths

## Step 3: Find issues

Look for:
- Bugs: null/undefined risks, off-by-one, wrong conditions, missing return values
- Security: injection, XSS, auth/authz gaps, sensitive data exposure, input validation
- Race conditions: async ordering, shared state without synchronization
- Resource leaks: uncleared subscriptions/listeners, unclosed handles
- Error handling: swallowed exceptions, wrong fallbacks, missing propagation

Do NOT report:
- Naming consistency, API design, type quality (including `any` types)
- Code complexity, duplication, readability improvements
- Style preferences unless they cause actual bugs

## Constraints

- Analysis only. Do NOT modify any files.
- Only report issues with real evidence from the code.

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
