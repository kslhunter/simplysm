# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simplysm is a TypeScript-based full-stack framework monorepo. Managed with pnpm workspaces, it provides packages for SolidJS UI, ORM, service communication, Excel processing, and more.

### Design Philosophy

- **Standard patterns first**: Leverage standard TypeScript/JavaScript/SolidJS patterns and idiomatic code style to lower the learning curve. Prefer familiar patterns over custom ones.
- **Explicit and predictable code**: Prefer explicit code over implicit behavior so that intent is easily understood.
- **Incremental learning**: Each package is independently usable, allowing you to learn and apply only what you need.

## Key Commands

```bash
# Install dependencies
pnpm install

# ESLint lint (all or specific path)
pnpm lint
pnpm lint packages/core-common
pnpm lint --fix              # Auto-fix

# TypeScript typecheck
pnpm typecheck
pnpm typecheck packages/core-common

# Build (production)
pnpm build
pnpm build solid              # Build specific package

# Watch mode (library build + .d.ts generation, change detection)
pnpm watch
pnpm watch solid              # Watch specific package

# Dev mode (client: Vite dev server, server: build)
pnpm dev                      # solid-demo: URL printed, port may vary

# NPM publish
pnpm pub                  # Build then publish
pnpm pub:no-build         # Publish without build

# Tests (Vitest)
pnpm vitest                     # All projects
pnpm vitest --project=node      # Node environment tests only
pnpm vitest --project=browser   # Browser environment tests only
pnpm vitest --project=solid     # SolidJS component tests
pnpm vitest --project=orm       # ORM integration tests (Docker DB required)
pnpm vitest --project=service   # Service integration tests
pnpm vitest packages/core-common      # Package tests
pnpm vitest packages/core-common/tests/DateTime.spec.ts --project=node  # Single file
pnpm vitest -t "DateTime" --project=node   # Filter by test name
```

## Project Structure

### Library Packages (`packages/`)
| Package | Target | Description |
|---------|--------|-------------|
| `core-common` | neutral | Common utilities, types, error classes |
| `core-browser` | browser | Browser-specific extensions |
| `core-node` | node | Node.js utilities (filesystem, workers) |
| `cli` | node | Build/lint/typecheck CLI tools |
| `lint` | node | Lint config (ESLint + Stylelint) |
| `orm-common` | neutral | ORM query builder, schema definition |
| `orm-node` | node | DB connections (MySQL, MSSQL, PostgreSQL) |
| `service-common` | neutral | Service protocol, type definitions |
| `service-client` | neutral | WebSocket client |
| `service-server` | node | Fastify-based HTTP/WebSocket server |
| `solid` | browser | SolidJS UI components |
| `solid-demo` | client | SolidJS demo app (http://localhost:40081) |
| `excel` | neutral | Excel(.xlsx) read/write |
| `storage` | node | FTP/SFTP client |

### Integration Tests (`tests/`)
- `tests/orm/`: ORM integration tests (Docker DB required, `orm-node` package itself has no unit tests)
- `tests/service/`: Service integration tests (browser tests)

### Custom Types (`core-common`)
Immutable types provided by `@simplysm/core-common`:
- `DateTime`, `DateOnly`, `Time`: Date/time handling
- `Uuid`: UUID v4
- `LazyGcMap`: LRU cache (auto-expiry)

## Architecture

### Dependency Layers
```
core-common (lowest level, common utilities)
    ↑
core-browser / core-node (environment-specific extensions)
    ↑
orm-common / service-common (domain-specific common)
    ↑
orm-node / service-server / service-client (implementations)
    ↑
solid (UI components)
```

### Build Targets (sd.config.ts)
- `node`: Node.js only (no DOM, includes `@types/node`)
- `browser`: Browser only (includes DOM, excludes `@types/node`)
- `neutral`: Node/browser shared
- `client`: Developed with Vite dev server

## Code Conventions

### ESLint Rules (`@simplysm/lint`)
- ECMAScript private fields (`#field`) prohibited → Use TypeScript `private`
- `@simplysm/*/src/` path imports prohibited (*.ts, *.tsx files only)
  → Before adding imports: Read the package's `index.ts` to check exports
- `no-console`, `eqeqeq`, `no-shadow` enforced
- Node.js built-in `Buffer` → Use `Uint8Array`
  - Exception: When an external library requires `Buffer`, use `eslint-disable` comment
  - Pattern: `// eslint-disable-next-line no-restricted-globals -- {library} requires Buffer`
- `await` required in async functions

### TypeScript Configuration
- `strict: true`, `verbatimModuleSyntax: true`
- Path aliases: `@simplysm/*` → `packages/*/src/index.ts`
- JSX: SolidJS (`jsxImportSource: "solid-js"`)

### index.ts Export Pattern

- Large packages (many exports): Use `#region`/`#endregion` for major sections + `//` comments for sub-groups
- Small packages (≤10 exports): Use `//` comments only
- Always use `export *` (wildcard) — avoid explicit `export type { ... } from "..."`

```typescript
// Large package example
//#region ========== Schema ==========

// Table
export * from "./schema/table-builder";
export * from "./schema/view-builder";

// Factory
export * from "./schema/factory/column-builder";

//#endregion

// Small package example
// Core
export * from "./excel-workbook";
export * from "./excel-worksheet";
```

## SolidJS Guidelines

**SolidJS is NOT React! Do not infer SolidJS behavior from React knowledge.**

### Core Concepts
- **Component functions run only once at mount** (React re-runs on every state change)
- **Fine-grained Reactivity**: If a signal doesn't change, the expression itself is not re-evaluated
- **`createMemo`**: Needed when expensive computations are used in multiple places
  - If the same function is called in 3 places on signal change, it runs 3 times; `createMemo` computes once + returns cached value
  - Simple conditions or lightweight operations are fine as plain functions `() => count() * 2`
- **Props destructuring prohibited** → Access via `props.label` instead of `{ label }` (preserves reactivity)
- **Conditionals: `<Show when={...}>`**, Lists: **`<For each={...}>`**
- **No SSR support**: Browser APIs like `window`, `document` can be used directly
- Responsive: Mobile UI below 520px
- Chrome 84+ target
  - TypeScript is transpiled via esbuild → Modern JS syntax like `?.`, `??` is usable
  - CSS is NOT transpiled → Do not use CSS features unsupported in Chrome 84
    - Usable: Flexbox gap
    - Prohibited: `aspect-ratio`, `inset`, `:is()`, `:where()` (Chrome 88+)

### Implementation Rules
- Prefer simple signals/stores over Provider/Context pattern
- Do not introduce unnecessary abstraction layers — check existing codebase for the same pattern first
- **Compound Components pattern**: Complex components explicitly express parent-child relationships

→ Before modifying components: Always Read the file to check existing props/patterns

### Hook Naming Conventions
- `create*`: Reactive hooks that wrap/compose SolidJS primitives (`createControllableSignal`, `createMountTransition`, `createTrackedWidth`)
- `use*`: Hooks that depend on Provider Context (`useConfig`, `usePersisted`, `useTheme`)
- General utility functions are named without hook prefixes

### Compound Component Naming Rules

All sub-components are accessed only via dot notation (`Parent.Child`).

- Define `interface ParentComponent { Child: typeof ChildComponent }` on the parent component
- Assign `Parent.Child = ChildComponent;`
- Do not export sub-components separately in `index.ts` (export parent only)
- Import only the parent when using: `import { Select } from "@simplysm/solid"`
- Examples: `Select.Item`, `Select.Action`, `List.Item`, `DataSheet.Column`, `Sidebar.Container`, `Topbar.Menu`, `Tabs.Tab`

### Tailwind CSS

**Configuration (`packages/solid/tailwind.config.ts`):**
- `darkMode: "class"` → Toggle dark mode with `<html class="dark">`
- `aspectRatio` plugin disabled due to Chrome 84 incompatibility
- Default size unit is `rem`. Use `em` when size should scale relative to surrounding text (e.g., Icon)

**Custom Theme:**
```typescript
// Semantic colors (based on Tailwind colors)
colors: {
  primary: colors.blue,
  info: colors.sky,
  success: colors.green,
  warning: colors.amber,
  danger: colors.red,
  base: colors.zinc,       // Neutral gray (backgrounds, borders, secondary text, etc.)
}
// → Do not use zinc-* directly → Use base-*

// Form field heights
height/size: {
  field: "...",      // Default (py-1 basis)
  "field-sm": "...", // Small (py-0.5 basis)
  "field-lg": "...", // Large (py-2 basis)
}

// z-index layers
zIndex: {
  sidebar: "100",
  "sidebar-backdrop": "99",
  dropdown: "1000",
}
```

**Style Writing Patterns:**
```typescript
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// Combine base and conditional classes
const baseClass = clsx("inline-flex items-center", "px-2 py-1");

// Define theme/variant classes as objects
const themeClasses = {
  primary: {
    solid: clsx("bg-primary-500", "hover:bg-primary-600", "dark:hover:bg-primary-400"),
    outline: clsx("bg-transparent", "border border-primary-300"),
  },
};

// Resolve class conflicts with twMerge
const className = twMerge(baseClass, themeClasses.primary.solid, props.class);
```

**`clsx` Template Mandatory Usage Rule:**
- When listing multiple Tailwind classes, always wrap them in `clsx()`
- Separate strings by semantic groups (layout, colors, spacing, dark mode, etc.) for readability
```typescript
// Good: Separate by semantic groups with clsx
const cls = clsx(
  "bg-primary-100 text-primary-900",
  "dark:bg-primary-900/40 dark:text-primary-100",
);

// Bad: All classes in a single long string
const cls = "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100";
```

**Using as preset in apps:**
```typescript
// solid-demo/tailwind.config.ts
import simplysmPreset from "@simplysm/solid/tailwind.config";

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [..., ...simplysmPreset.content],
};
```

→ Before modifying styles: Read existing class patterns of the same component

### Demo Page Rules
- Do not use raw HTML elements (`<button>`, `<input>`, `<select>`, `<textarea>`) directly → Use `@simplysm/solid` library components
- No excessive custom inline styles
- Before writing new demo pages, Read existing demo files to check patterns

## ORM Guidelines

### Table Definition
```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");
```

### SQL Injection Prevention

orm-common generates SQL using string escaping. Follow these rules:

**Safe Usage:**
- Use ORM after validating values in application code
- Type-guaranteed values (number, boolean, DateTime, etc.)
- Trusted internal data

**Unsafe Usage:**
- Using user input directly in WHERE conditions without validation
- Using external API responses without validation
- Using file upload content without validation

**Recommended Patterns:**
```typescript
// Bad: Direct user input
const userInput = req.query.name; // "'; DROP TABLE users; --"
await db.user().where((u) => [expr.eq(u.name, userInput)]).result();

// Good: Validate first
const userName = validateUserName(req.query.name); // Throws on invalid
await db.user().where((u) => [expr.eq(u.name, userName)]).result();

// Better: Type coercion
const userId = Number(req.query.id); // NaN check required
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
```

**Technical Constraints:**
orm-common does not use parameter binding due to dynamic query characteristics.
Instead, it uses enhanced string escaping:
- MySQL: Escapes backslashes, quotes, NULL bytes, control characters
- Forces utf8mb4 charset to defend against multi-byte attacks
- **Application-level input validation is required**

## Service Guidelines

- `ServiceServer`: Fastify-based HTTP/WebSocket server
- `ServiceClient`: WebSocket client, RPC calls
- `ServiceProtocol`: Message split/merge (300KB chunks when >3MB)

## Testing

### Test Environment (vitest.config.ts)

| Project | Environment | Pattern |
|---------|-------------|---------|
| node | Node.js | `packages/*/tests/**/*.spec.ts` (node packages) |
| browser | Playwright | `packages/*/tests/**/*.spec.ts` (browser packages) |
| solid | Playwright + vite-plugin-solid | `packages/solid/tests/**/*.spec.tsx` |
| orm | Node.js + Docker | `tests/orm/**/*.spec.ts` |
| service | Playwright | `tests/service/**/*.spec.ts` |

### Test & Demo Review Requirements

When modifying code, always review and update related tests and demos:

| Change Scope | What to Review | Location |
|-------------|----------------|----------|
| Any package code | Unit tests for the modified package | `packages/{pkg}/tests/` |
| `orm-common`, `orm-node` | ORM integration tests | `tests/orm/` |
| `service-common`, `service-client`, `service-server` | Service integration tests | `tests/service/` |
| `solid` (components, hooks, providers) | Demo pages in solid-demo | `packages/solid-demo/src/` |

- **Unit tests**: If the modified function/class has corresponding test files, review them for correctness and update if behavior changed
- **ORM integration tests**: Changes to query builder, schema definitions, or DB connectors may break integration tests that run against real databases
- **Service integration tests**: Changes to protocols, client/server communication, or RPC may affect end-to-end service tests
- **Solid demo**: When component props, behavior, or API changes, ensure demo pages still work correctly and reflect the updated usage

## Documentation

### README.md

Files in `.claude/` folder and each package's `README.md` are written in English for consistent documentation.

Each package's `README.md` is the **sole API documentation source for Claude Code**.
When Claude works in a consumer app that uses `@simplysm/*` packages, the `sd-simplysm-docs` rule reads these READMEs from `node_modules/`.

- When changing public APIs, update the package's `README.md` to keep code and docs in sync
- For detailed README writing rules and update workflow, use `/sd-readme`

## Workflow

### Verification Procedure
1. After writing code, verify with `pnpm typecheck` or `pnpm lint`
2. When introducing new patterns, search the existing codebase for similar examples
3. When writing test code, check the project configuration in `vitest.config.ts`
4. When changing public APIs (adding/modifying/deleting functions/classes, props changes, export changes), update the package's `README.md` as well
