# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Important: `.claude/` Folder Scope

The `.claude/` folder contains **cross-project shared rules** used across multiple repositories. Do NOT add project-specific content to `.claude/rules/`. Project-specific guidelines belong in this `CLAUDE.md` file.

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

### Demo Page Rules
- No raw HTML elements → use `@simplysm/solid` components
- Read existing demos before writing new ones

## Testing

| Project | Environment | Pattern |
|---------|-------------|---------|
| node | Node.js | `packages/*/tests/**/*.spec.ts` |
| browser | Playwright | `packages/*/tests/**/*.spec.ts` |
| solid | Playwright + vite-plugin-solid | `packages/solid/tests/**/*.spec.tsx` |
| orm | Node.js + Docker | `tests/orm/**/*.spec.ts` |
| service | Playwright | `tests/service/**/*.spec.ts` |

When modifying code, review and update related tests (`packages/{pkg}/tests/`) and demos (`packages/solid-demo/src/`).

## Migration Rules

When porting/migrating code from another codebase (e.g., v12 Angular → v13 SolidJS):

1. **Before starting**: Read the original source thoroughly and list ALL features, props, callbacks, and behaviors.
2. **Feature parity check**: After implementation, compare 1:1 with the original. Every omission or behavioral difference must be explicitly reported to the user.
3. **No silent omissions**: Never silently drop features, props, or behaviors. If something is intentionally excluded, explain why and get approval.
4. **No silent additions**: Never add new props or behaviors that didn't exist in the original without explaining the reason and getting approval.
5. **Design changes require discussion**: If the migration requires a different design approach (e.g., changing from key-based selection to object-reference selection), discuss the trade-offs with the user before proceeding.

## Workflow

After writing code: verify with `/sd-check`.