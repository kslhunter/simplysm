# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Important: `.claude/` Folder Scope

The `.claude/` folder contains **cross-project shared rules** used across multiple repositories. Do NOT add project-specific content (SolidJS, ORM, Tailwind, etc.) to `.claude/rules/`. Project-specific guidelines belong in this `CLAUDE.md` file.

## Project Overview

Simplysm is a TypeScript-based full-stack framework monorepo. Managed with pnpm workspaces, it provides packages for SolidJS UI, ORM, service communication, Excel processing, and more.

### Design Philosophy

- **Standard patterns first**: Prefer familiar patterns over custom ones.
- **Explicit and predictable code**: Prefer explicit code over implicit behavior.
- **Incremental learning**: Each package is independently usable.

## Key Commands

```bash
pnpm install                    # Install dependencies
pnpm lint [path] [--fix]        # ESLint
pnpm typecheck [path]           # TypeScript typecheck
pnpm build [name]               # Production build
pnpm watch [name]               # Watch mode (library build + .d.ts)
pnpm dev                        # Dev mode (Vite dev server)
pnpm pub                        # Build then publish
pnpm pub:no-build               # Publish without build
pnpm vitest [path] [--project=node|browser|solid|orm|service] [-t "name"]
```

## Project Structure

### Packages (`packages/`)
| Package | Target |
|---------|--------|
| `core-common` | neutral |
| `core-browser` | browser |
| `core-node` | node |
| `cli` | node |
| `lint` | node |
| `orm-common` | neutral |
| `orm-node` | node |
| `service-common` | neutral |
| `service-client` | neutral |
| `service-server` | node |
| `solid` | browser |
| `solid-demo` | client |
| `excel` | neutral |
| `storage` | node |

### Integration Tests (`tests/`)
- `tests/orm/`: ORM integration tests (Docker DB required)
- `tests/service/`: Service integration tests (browser tests)

### Custom Types (`core-common`)
Immutable types: `DateTime`, `DateOnly`, `Time`, `Uuid`, `LazyGcMap`

## Architecture

### Dependency Layers
```
core-common → core-browser / core-node → orm-common / service-common → orm-node / service-server / service-client → solid
```

### Build Targets (sd.config.ts)
- `node`: Node.js only (no DOM, includes `@types/node`)
- `browser`: Browser only (includes DOM, excludes `@types/node`)
- `neutral`: Node/browser shared
- `client`: Vite dev server

## Code Conventions

### ESLint Rules (`@simplysm/lint`)
- ECMAScript private fields (`#field`) prohibited → Use TypeScript `private`
- `@simplysm/*/src/` path imports prohibited → Read package's `index.ts` to check exports first
- `no-console`, `eqeqeq`, `no-shadow` enforced
- `Buffer` prohibited → Use `Uint8Array` (exception: `eslint-disable` with reason when library requires it)
- `await` required in async functions

### TypeScript Configuration
- `strict: true`, `verbatimModuleSyntax: true`
- Path aliases: `@simplysm/*` → `packages/*/src/index.ts`
- JSX: SolidJS (`jsxImportSource: "solid-js"`)

### index.ts Export Pattern
- Large packages: `#region`/`#endregion` for sections + `//` for sub-groups
- Small packages (≤10 exports): `//` comments only
- Always `export *` (wildcard), never explicit `export type { ... } from "..."`

## SolidJS Guidelines

**SolidJS is NOT React!**

### Core Concepts
- Component functions run **once** at mount (not on every state change)
- Fine-grained reactivity: unchanged signals don't re-evaluate expressions
- `createMemo`: only for expensive computations used in multiple places
- **Props destructuring prohibited** → use `props.xxx`
- Conditionals: `<Show>`, Lists: `<For>`
- No SSR → browser APIs usable directly
- Responsive: Mobile UI below 520px
- Chrome 84+ target
  - CSS NOT transpiled → no `aspect-ratio`, `inset`, `:is()`, `:where()`

### Implementation Rules
- Prefer signals/stores over Provider/Context
- Check existing patterns before introducing abstractions
- Before modifying components: always Read the file to check existing props/patterns

### Hook Naming
- `create*`: Reactive hooks wrapping SolidJS primitives
- `use*`: Hooks depending on Provider Context
- Others: no hook prefix

### Compound Components
All sub-components via dot notation only (`Parent.Child`).
- Define `interface ParentComponent { Child: typeof ChildComponent }`
- Assign `Parent.Child = ChildComponent;`
- Don't export sub-components separately (export parent only)
- UI elements → compound sub-components, non-rendering config (state, behavior, callbacks) → props

### Tailwind CSS
- `darkMode: "class"`, `aspectRatio` plugin disabled (Chrome 84)
- Semantic colors: `primary`(blue), `info`(sky), `success`(green), `warning`(amber), `danger`(red), `base`(zinc) → never use `zinc-*` directly
- Heights: `field`, `field-sm`, `field-lg`
- z-index: `sidebar`(100), `sidebar-backdrop`(99), `dropdown`(1000)
- Default `rem`, use `em` for text-relative sizing (e.g., Icon)
- Use `clsx()` with semantic grouping + `twMerge()` for conflict resolution
- Before modifying styles: Read existing class patterns of the same component

### Demo Page Rules
- No raw HTML elements → use `@simplysm/solid` components
- Read existing demos before writing new ones

## ORM Guidelines

### Table Definition
```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({ id: c.bigint().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id");
```

### SQL Injection Prevention
ORM uses string escaping (not parameter binding). **Always validate user input before ORM queries.**
```typescript
const userId = Number(req.query.id);
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
```

## Service Guidelines

- `ServiceServer`: Fastify-based HTTP/WebSocket server
- `ServiceClient`: WebSocket client, RPC calls
- `ServiceProtocol`: Message split/merge (300KB chunks when >3MB)

## Testing

| Project | Environment | Pattern |
|---------|-------------|---------|
| node | Node.js | `packages/*/tests/**/*.spec.ts` |
| browser | Playwright | `packages/*/tests/**/*.spec.ts` |
| solid | Playwright + vite-plugin-solid | `packages/solid/tests/**/*.spec.tsx` |
| orm | Node.js + Docker | `tests/orm/**/*.spec.ts` |
| service | Playwright | `tests/service/**/*.spec.ts` |

When modifying code, review and update related tests (`packages/{pkg}/tests/`) and demos (`packages/solid-demo/src/`).

## Workflow

After writing code: verify with `pnpm typecheck` or `pnpm lint`.
