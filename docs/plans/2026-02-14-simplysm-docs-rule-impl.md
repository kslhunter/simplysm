# Simplysm Docs Rule Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Replace `sd-context7.md` rule with `sd-simplysm-docs.md` that reads package docs from local `node_modules/` README.md files.

**Architecture:** A `.claude/rules/` file with embedded package list + instructions to Read README.md from node_modules. Distributed to consumer apps via `@simplysm/claude` postinstall.

**Tech Stack:** Claude Code rules (.md files), no code logic changes

---

### Task 1: Create new rule file `sd-simplysm-docs.md`

**Files:**
- Create: `.claude/rules/sd-simplysm-docs.md`

**Step 1: Create the rule file**

```markdown
# @simplysm Package Documentation

When you need API details, usage examples, or component props for `@simplysm/*` packages,
read the package's README.md from node_modules.

## How to use

Read the package README directly:

```
node_modules/@simplysm/{package-name}/README.md
```

## When to use

- Before writing code that uses an unfamiliar `@simplysm/*` API
- When unsure about component props, method signatures, or configuration
- When looking for usage patterns or code examples

## Available Packages

| Package | Description |
|---------|-------------|
| `core-common` | Common utilities, custom types (DateTime, DateOnly, Time, Uuid) |
| `core-browser` | Browser-specific extensions |
| `core-node` | Node.js utilities (filesystem, workers) |
| `orm-common` | ORM query builder, table schema definitions |
| `orm-node` | DB connectors (MySQL, MSSQL, PostgreSQL) |
| `service-common` | Service protocol, type definitions |
| `service-client` | WebSocket client |
| `service-server` | Fastify-based HTTP/WebSocket server |
| `solid` | SolidJS UI components + Tailwind CSS |
| `excel` | Excel (.xlsx) read/write |
| `storage` | FTP/SFTP client |
| `sd-cli` | Build, lint, typecheck CLI tool |
| `eslint-plugin` | Custom ESLint rules |
```

**Step 2: Commit**

```bash
git add .claude/rules/sd-simplysm-docs.md
git commit -m "feat(claude): add sd-simplysm-docs rule for local README documentation"
```

---

### Task 2: Delete old rule file `sd-context7.md`

**Files:**
- Delete: `.claude/rules/sd-context7.md`

**Step 1: Delete the file**

```bash
git rm .claude/rules/sd-context7.md
```

**Step 2: Commit**

```bash
git commit -m "refactor(claude): remove sd-context7 rule (replaced by sd-simplysm-docs)"
```

---

### Task 3: Update CLAUDE.md — remove Context7 references

**Files:**
- Modify: `CLAUDE.md:347` (Verification Procedure item 4)
- Modify: `CLAUDE.md:349-357` (README.md Writing Rules section)

**Step 1: Update Verification Procedure item 4 (line 347)**

Change:
```
4. When changing public APIs (adding/modifying/deleting functions/classes, props changes, export changes), update the package's `README.md` as well — It's the Context7 documentation source, so code and docs must stay in sync
```

To:
```
4. When changing public APIs (adding/modifying/deleting functions/classes, props changes, export changes), update the package's `README.md` as well — README.md serves as the documentation source for consumer apps (read by Claude via `sd-simplysm-docs` rule), so code and docs must stay in sync
```

**Step 2: Update README.md Writing Rules section (lines 349-357)**

Change:
```markdown
### README.md Writing Rules

Each package's `README.md` is used as a **documentation source for the Context7 MCP server**.
When Claude calls `query-docs(libraryId="/kslhunter/simplysm", query="...")`, these READMEs are searched/referenced, so they must be written for good Context7 indexing.

- Write in **English** (for Context7 indexing and search quality)
- Document the package's **public API, key functions/classes, props, configuration options** with code examples
- Code examples must include **import paths** (Context7 uses these for package mapping)
- Before writing/modifying, Read existing README patterns to maintain consistent structure
```

To:
```markdown
### README.md Writing Rules

Each package's `README.md` is used as a **documentation source for consumer apps**.
When Claude works in a consumer app that uses `@simplysm/*` packages, the `sd-simplysm-docs` rule instructs it to read these READMEs from `node_modules/`.

- Write in **English** (for consistent documentation quality)
- Document the package's **public API, key functions/classes, props, configuration options** with code examples
- Code examples must include **import paths** (helps Claude understand which package to import from)
- Before writing/modifying, Read existing README patterns to maintain consistent structure
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reference sd-simplysm-docs instead of Context7"
```

---

### Task 4: Update `.claude/rules/language.md` — remove Context7 reference

**Files:**
- Modify: `.claude/rules/language.md:7`

**Step 1: Update line 7**

Change:
```
- Files in `.claude/` folder and each package's `README.md` are written in English for Context7 documentation
```

To:
```
- Files in `.claude/` folder and each package's `README.md` are written in English for consistent documentation
```

**Step 2: Commit**

```bash
git add .claude/rules/sd-language.md
git commit -m "docs: update language rule to remove Context7 reference"
```

---

### Task 5: Update `packages/claude/README.md` — reflect rule change

**Files:**
- Modify: `packages/claude/README.md:37` (directory structure)
- Modify: `packages/claude/README.md:304-311` (Rules section)

**Step 1: Update directory structure (line 37)**

Change:
```
      sd-context7.md          # Context7 MCP rule
```

To:
```
      sd-simplysm-docs.md     # Local README documentation rule
```

**Step 2: Update Rules section (lines 304-311)**

Change:
```markdown
## Rules

### sd-context7

Configures Context7 MCP for looking up `@simplysm/*` package documentation. The library ID is pre-configured as `/kslhunter/simplysm`.

\```
query-docs(libraryId="/kslhunter/simplysm", query="<your question>")
\```
```

To:
```markdown
## Rules

### sd-simplysm-docs

Instructs Claude to read `@simplysm/*` package documentation from local `node_modules/` README.md files. Includes an embedded package list so Claude can immediately identify which package to look up.

\```
# Claude automatically reads when needing @simplysm/* docs:
node_modules/@simplysm/{package-name}/README.md
\```
```

**Step 3: Commit**

```bash
git add packages/claude/README.md
git commit -m "docs(claude): update README to reflect sd-simplysm-docs rule"
```

---

## Notes

- **No TDD**: All tasks are documentation-only changes with no code logic to test.
- **postinstall.mjs**: No changes needed — existing `sd-*` sync handles the new file name automatically.
- **context7 MCP in `.mcp.json`**: Kept for other (non-simplysm) library lookups.
- **`context7.json`**: Kept for GitHub repo documentation indexing on Context7's servers.
- **Task independence**: Tasks 1-2 are independent. Tasks 3-5 are independent of each other but depend on Task 1 conceptually (they reference the new rule name).
