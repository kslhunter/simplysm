# Design: Replace Context7 with Local README Documentation Rule

## Summary

Replace `sd-context7.md` rule with `sd-simplysm-docs.md` that instructs Claude to read
`@simplysm/*` package README.md files directly from `node_modules/` instead of using Context7 MCP.

## Motivation

- `@simplysm/claude` package is distributed to consumer apps via postinstall
- Consumer apps have `@simplysm/*/README.md` in node_modules — always up-to-date with installed version
- No external service dependency (Context7 MCP)
- Users don't explicitly invoke this — Claude automatically uses it when needing `@simplysm/*` docs

## Changes

### 1. New rule: `.claude/rules/sd-simplysm-docs.md`

Contains:
- Package list with descriptions (~20 lines) — always loaded in system prompt
- Instructions to read `node_modules/@simplysm/{package}/README.md` when docs needed
- Fallback path: `packages/*/node_modules/@simplysm/{package}/README.md` (pnpm hoisting)
- When to use triggers

### 2. Delete: `.claude/rules/sd-context7.md`

Replaced by the new rule. Context7 MCP itself stays in `.mcp.json` (useful for other libraries).

### 3. Update: `packages/claude/scripts/sync-claude-assets.mjs`

No change needed — existing `sd-*` sync logic handles the new file automatically.

### 4. Keep: postinstall context7 MCP setup in `.mcp.json`

Context7 MCP is useful for non-simplysm libraries. Only the simplysm-specific rule is replaced.

## Rule Content

```markdown
# @simplysm Package Documentation

When you need API details, usage examples, or component props for `@simplysm/*` packages,
read the README.md from node_modules.

## How to use

Read the package README directly:
- `node_modules/@simplysm/{package-name}/README.md`

If not found (pnpm hoisting), try:
- `packages/*/node_modules/@simplysm/{package-name}/README.md`

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

## Files to Modify

1. **Create** `.claude/rules/sd-simplysm-docs.md` — new rule
2. **Delete** `.claude/rules/sd-context7.md` — replaced
3. **Update** `CLAUDE.md` — remove sd-context7 references, update documentation lookup instructions
4. **Update** `packages/claude/README.md` — reflect rule change
