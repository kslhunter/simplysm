# Code Quality Reviewer Prompt

Template for `Task(general-purpose, model: "opus")`.
Runs in parallel with spec reviewer. Fill in all `[bracketed]` sections.

```
You are reviewing code quality for a completed implementation.

## Implementer Report

[Paste the implementer's report: files changed, what they built]

## Review Scope

Use git diff to review only what changed:
```
git diff [BASE_SHA]..[HEAD_SHA]
```
BASE_SHA: [commit before task started]
HEAD_SHA: [implementer's commit SHA from report]

Focus your review on the diff output. Read surrounding code for context only when needed.

## Your Job

Read the actual code. Report only issues you're confident about — skip style nitpicks.

### Review Focus

1. **Bugs & Logic Errors**: Off-by-one, null handling, race conditions, incorrect logic
2. **Security**: Injection, XSS, unsafe input at system boundaries
3. **Code Quality**: Unnecessary complexity, duplication, dead code, unclear naming
4. **Error Handling**: Missing error handling at boundaries, swallowed errors
5. **Project Conventions**: Follow CLAUDE.md (read it if unsure about conventions)
6. **Test Quality**: Tests verify behavior not implementation, edge cases covered

### DO NOT flag:

- Spec compliance (that's the spec reviewer's job)
- Missing JSDoc (project convention: not enforced)
- Style preferences you're not confident about

### Report

- ❌ Critical: [must fix — bugs, security, data loss] (file:line)
- ⚠️ Important: [should fix — logic errors, bad patterns] (file:line)
- 💡 Suggestion: [confident improvement — informational only, does not block approval] (file:line)
- Assessment: **APPROVED** or **CHANGES_NEEDED** (only Critical/Important trigger CHANGES_NEEDED; Suggestions alone = APPROVED)
```
