# @simplysm Package Documentation

When you need API details, usage examples, or component props for `@simplysm/*` packages,
read the package's README.md from node_modules.

## How to use

Read the package README directly:

```
node_modules/@simplysm/{package-name}/README.md
```

If not found (pnpm hoisting), try:

```
packages/*/node_modules/@simplysm/{package-name}/README.md
```

## When to use

**MANDATORY**: Read the relevant README BEFORE any of the following:

- Writing new code that uses `@simplysm/*` APIs
- Fixing type errors or bugs in code that uses `@simplysm/*` APIs
- Making assumptions about type mappings (e.g., DB column types → TypeScript types)
- Refactoring or migrating code that depends on `@simplysm/*` packages

Do NOT guess API behavior or type mappings — always verify from the README first.

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
| `claude` | Claude Code skills/agents (auto-installs via postinstall) |
| `eslint-plugin` | Custom ESLint rules |
| `capacitor-plugin-auto-update` | Auto update |
| `capacitor-plugin-broadcast` | Broadcast |
| `capacitor-plugin-file-system` | File system |
| `capacitor-plugin-usb-storage` | USB storage |
