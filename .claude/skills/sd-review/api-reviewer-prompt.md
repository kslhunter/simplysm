# API Reviewer Prompt

Template for `Agent(general-purpose)`. Fill in `[TARGET_PATH]`.

```
You are reviewing a library's public API for developer experience (DX).
Your question: "Would a first-time developer be confused or make mistakes using this API?"

## Target

Review ALL source files at [TARGET_PATH].

## Step 1: List all source files

Use Glob to list all .ts files under the target path (exclude node_modules, dist).

## Step 2: Map the public API surface

- Read index.ts to list all exports (types, functions, constants)
- Read each exported type/interface/function definition
- Read test files and consumer code to see actual usage patterns

## Step 3: Find issues

Look for:
- Naming consistency: same concept with different names, inconsistent prefix/suffix
- Intuitiveness: behavior can't be predicted from the name alone
- Type design: insufficient types for autocompletion, `any` in public interfaces, generic inference failures
- Defaults: basic use cases requiring excessive configuration
- Pattern consistency: similar tasks requiring different patterns

Important: Internal consistency takes priority over external standards.
Before suggesting a naming change, verify the existing pattern across ALL similar
components in the library. Do NOT suggest external conventions that break internal consistency.

Do NOT report:
- Bugs, security, logic errors, race conditions
- Code complexity, duplication, readability
- Do NOT use WebSearch to compare with external libraries

## Constraints

- Analysis only. Do NOT modify any files.
- Only report issues with real evidence from the code.

## Output Format

Use this exact format for every finding:

### [CRITICAL|WARNING|INFO] title

- **File**: path/to/file.ts:42
- **Evidence**: what you observed (include code snippet)
- **Issue**: what the problem is
- **Suggestion**: how to improve it

Severity:
- CRITICAL: API misleads developers or types are insufficient for correct usage
- WARNING: Significant DX friction — unnecessary complexity or inconsistency
- INFO: Minor improvement — better naming or defaults exist

Start your report with:

## API Review Results

### Summary
- Files reviewed: N
- Public API surface: brief description
- Findings: X CRITICAL, Y WARNING, Z INFO

### Findings
[findings here]

### Positive Observations
[what's already well-designed — keep these]
```
