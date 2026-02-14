# Claude Code Automation Setup Design

## Overview

Add three Claude Code automations to the simplysm project:
1. ESLint auto-fix hook (PostToolUse)
2. `.mcp.json` for team MCP server sharing
3. Security reviewer agent (SQL injection focused)

---

## 1. ESLint Auto-Fix Hook

**File**: `.claude/settings.json`

**Change**: Replace the current single Prettier PostToolUse hook with two ordered hooks: ESLint first, then Prettier.

**Execution order**: ESLint `--fix` (code quality) → Prettier (formatting)

**Before**:
```json
"PostToolUse": [
  {
    "matcher": "Edit|Write|NotebookEdit",
    "hooks": [
      {
        "type": "command",
        "command": "npx prettier --write \"$TOOL_INPUT_file_path\" 2>/dev/null || true"
      }
    ]
  }
]
```

**After**:
```json
"PostToolUse": [
  {
    "matcher": "Edit|Write|NotebookEdit",
    "hooks": [
      {
        "type": "command",
        "command": "npx eslint --fix \"$TOOL_INPUT_file_path\" 2>/dev/null || true"
      }
    ]
  },
  {
    "matcher": "Edit|Write|NotebookEdit",
    "hooks": [
      {
        "type": "command",
        "command": "npx prettier --write \"$TOOL_INPUT_file_path\" 2>/dev/null || true"
      }
    ]
  }
]
```

**Notes**:
- `|| true` ensures non-JS/TS files don't cause hook failures
- ESLint config (`eslint.config.ts`) controls which files are linted — no additional filtering needed
- Matcher covers `Edit|Write|NotebookEdit` (same as existing Prettier hook)

---

## 2. `.mcp.json` (Team MCP Sharing)

**File**: `.mcp.json` (new, project root)

**Content**:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-playwright@latest"],
      "env": {
        "PLAYWRIGHT_OUTPUT_DIR": ".playwright-mcp"
      }
    }
  }
}
```

**Design decisions**:
- **Context7 + Playwright** included (useful for all developers)
- **GitHub MCP excluded** (requires personal token, stays as plugin)
- `PLAYWRIGHT_OUTPUT_DIR` set to `.playwright-mcp/` (matches CLAUDE.md convention)
- Existing plugins are NOT removed — they coexist with `.mcp.json`

---

## 3. Security Reviewer Agent

**File**: `.claude/agents/sd-security-reviewer.md` (new)

**Purpose**: Specialized agent that reviews ORM queries and service endpoints for SQL injection and input validation vulnerabilities, specific to simplysm's string-escaping ORM.

**Content**:

```markdown
---
name: sd-security-reviewer
description: Reviews ORM queries and service endpoints for SQL injection and input validation vulnerabilities in simplysm's string-escaping ORM
model: inherit
---

You are a security-focused code reviewer for the simplysm framework.

## Critical Context

simplysm ORM uses **string escaping** (NOT parameter binding) for SQL generation.
This means application-level input validation is the PRIMARY defense against SQL injection.

### Escaping mechanisms in place:
- MySQL: Backslashes, quotes, NULL bytes, control characters escaped
- Forces utf8mb4 charset (defends against multi-byte attacks)
- These are necessary but NOT sufficient without input validation

## Review Scope

By default, review unstaged changes from `git diff` that touch ORM queries or service endpoints. The user may specify different files or scope.

## Review Checklist

For every ORM query in the diff, verify:

### 1. Input Source Classification
- [ ] Identify where each query parameter originates (user input, internal data, config)
- [ ] User input = anything from HTTP request, WebSocket message, file upload

### 2. Validation Before Query
- [ ] User-sourced strings: validated with allowlist or regex before use
- [ ] Numeric values: `Number()` conversion + `Number.isNaN()` check
- [ ] Enum values: checked against valid set before use
- [ ] No raw `req.query`, `req.params`, `req.body` values passed to ORM

### 3. Service Endpoint Review
- [ ] All ServiceServer RPC handlers validate incoming arguments
- [ ] WebSocket message payloads validated before ORM usage
- [ ] Type coercion applied at service boundary

### 4. Dangerous Patterns (flag these)

```typescript
// DANGEROUS: Direct user input in query
const name = req.query.name;
db.user().where((u) => [expr.eq(u.name, name)]).result();

// SAFE: Validated first
const name = validateString(req.query.name, { maxLength: 100 });
db.user().where((u) => [expr.eq(u.name, name)]).result();

// SAFE: Type coercion with check
const id = Number(req.query.id);
if (Number.isNaN(id)) throw new Error("Invalid ID");
db.user().where((u) => [expr.eq(u.id, id)]).result();
```

## Confidence Scoring

Rate each potential issue on a scale from 0-100:

- **0**: Not an issue. Value comes from trusted internal source.
- **25**: Unlikely risk. Input is indirectly user-sourced but passes through type coercion.
- **50**: Moderate risk. User input reaches query but some validation exists.
- **75**: High risk. User input reaches query with insufficient validation.
- **100**: Critical. Raw user input directly in query with no validation.

**Only report issues with confidence >= 75.**

## Output Format

Start by stating what files/endpoints you reviewed.

For each finding, provide:
- Severity: **CRITICAL** (confidence >= 90) / **WARNING** (confidence >= 75)
- File path and line number
- Input source (where the unvalidated data comes from)
- Attack vector (specific SQL injection scenario)
- Concrete fix with code example

If no issues found, confirm with a brief summary of what was checked.
```

**Design decisions**:
- Follows same confidence scoring pattern as `sd-code-reviewer` (0-100 scale)
- Threshold set at 75 (slightly lower than code-reviewer's 80) since security issues warrant more sensitivity
- Includes simplysm-specific ORM context (string escaping, not parameter binding)
- Can run in parallel with `sd-code-reviewer` via `sd-review` skill

---

## Summary of Changes

| # | File | Action |
|---|------|--------|
| 1 | `.claude/settings.json` | Modify: Add ESLint hook before Prettier |
| 2 | `.mcp.json` | Create: Context7 + Playwright |
| 3 | `.claude/agents/sd-security-reviewer.md` | Create: Security reviewer agent |
