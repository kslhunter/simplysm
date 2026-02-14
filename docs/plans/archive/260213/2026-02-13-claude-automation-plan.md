# Claude Code Automation Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Add ESLint auto-fix hook, team MCP config, and security reviewer agent to the Claude Code setup.

**Architecture:** Three independent config files — a JSON settings edit, a new JSON file, and a new Markdown agent. No code dependencies between tasks; all can be implemented in parallel.

**Tech Stack:** Claude Code hooks (JSON), MCP server config (JSON), Claude Code agents (Markdown)

---

### Task 1: Add ESLint auto-fix hook to PostToolUse

**Files:**
- Modify: `.claude/settings.json:42-54` (hooks.PostToolUse section)

**Step 1: Edit settings.json to add ESLint hook before Prettier**

In `.claude/settings.json`, replace the `hooks` section (lines 42-54) with:

```json
  "hooks": {
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
  }
```

Key points:
- ESLint hook comes FIRST (code quality fixes), Prettier hook comes SECOND (formatting)
- Both use the same `Edit|Write|NotebookEdit` matcher
- `2>/dev/null || true` ensures non-JS/TS files don't cause failures
- ESLint config (`eslint.config.ts`) controls which files are processed — no extra filtering needed

**Step 2: Verify the JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

```
git add .claude/settings.json
git commit -m "chore: add ESLint auto-fix hook before Prettier in PostToolUse"
```

---

### Task 2: Create .mcp.json for team MCP server sharing

**Files:**
- Create: `.mcp.json` (project root)

**Step 1: Create .mcp.json**

Create `.mcp.json` at the project root with:

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

Key points:
- Context7: `-y` flag for non-interactive npx install
- Playwright: `PLAYWRIGHT_OUTPUT_DIR` set to `.playwright-mcp/` (matches CLAUDE.md convention, already in `.gitignore`)
- GitHub MCP excluded (requires personal token — stays as plugin)
- Existing plugins are NOT removed

**Step 2: Verify the JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Commit**

```
git add .mcp.json
git commit -m "chore: add .mcp.json for team MCP server sharing (Context7 + Playwright)"
```

---

### Task 3: Create security reviewer agent

**Files:**
- Create: `.claude/agents/sd-security-reviewer.md`

**Step 1: Create the agent file**

Create `.claude/agents/sd-security-reviewer.md` with:

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

Key points:
- Follows `sd-code-reviewer` pattern: confidence scoring (0-100), severity grouping
- Threshold at 75 (lower than code-reviewer's 80) — security warrants more sensitivity
- Includes simplysm-specific ORM context (string escaping, not parameter binding)
- Includes concrete DANGEROUS vs SAFE code examples for pattern matching

**Step 2: Verify frontmatter is valid**

Run: `head -4 .claude/agents/sd-security-reviewer.md`
Expected:
```
---
name: sd-security-reviewer
description: Reviews ORM queries and service endpoints for SQL injection and input validation vulnerabilities in simplysm's string-escaping ORM
model: inherit
```

**Step 3: Commit**

```
git add .claude/agents/sd-security-reviewer.md
git commit -m "chore: add sd-security-reviewer agent for ORM SQL injection review"
```
