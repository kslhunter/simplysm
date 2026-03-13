# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Simplysm

Yarn 4 monorepo. All 21 packages live in `packages/*`. Published to npm as `@simplysm/*`.
Config: `simplysm.js` (defines package types and publish targets).

## Commands

All commands run through `sd-cli` internally (`yarn run _sd-cli_ <command>`).
The `--debug` flag is available globally for verbose logging.

### Development

```bash
yarn watch                                # Watch-build all packages (dev mode)
yarn watch --packages sd-angular          # Watch a specific package
yarn watch --emitOnly                     # Emit only (skip checks)
yarn watch --noEmit                       # Check only (skip emit)
```

### Build & Publish

```bash
yarn build                                # Production build (all packages)
yarn build --packages sd-core-common      # Build a specific package
yarn publish                              # Build + publish to npm
yarn publish --noBuild                    # Publish without rebuilding
```

### Code Quality

```bash
yarn check                                # Typecheck + lint (all packages)
yarn check packages/sd-core-common        # Check a specific package path
yarn check --type lint                    # Lint only
yarn check --type typecheck               # Typecheck only
yarn eslint:fix                           # Auto-fix ESLint issues
```

### Tests

```bash
npx vitest                                # Watch mode
npx vitest run                            # Run all tests once
npx vitest run packages/sd-core-common    # Run tests for a specific package
```

Test files: `**/*.spec.ts`, environment: Node, globals enabled, uses `vite-tsconfig-paths` for `@simplysm/*` path resolution.

## Architecture

Dependency direction: top -> bottom. `sd-core-common` is the foundation with no internal dependencies.

```
UI:       sd-angular (Angular 20)
Service:  sd-service-server (Fastify) / sd-service-client (WebSocket) / sd-service-common
ORM:      sd-orm-node (MySQL/SQLite/MSSQL) / sd-orm-common / sd-orm-common-ext
Core:     sd-core-common (neutral) / sd-core-browser / sd-core-node
Tools:    sd-cli (build/check/publish), eslint-plugin, sd-excel, sd-storage (FTP/SFTP)
Mobile:   capacitor-plugin-* (Capacitor 7) / cordova-plugin-* (legacy)
```

Path alias: `@simplysm/*` maps to `packages/*/src/index.ts` (defined in `tsconfig.base.json`).

## TypeScript

- `strict: true`, `noImplicitAny: false`, `noImplicitReturns: true`, `noImplicitOverride: true`
- `experimentalDecorators: true`, `emitDecoratorMetadata: true`
- `useDefineForClassFields: false` (class fields use assignment semantics, not define)
- `verbatimModuleSyntax` is NOT enabled — but `import type` is preferred by convention
- Target: ES2022, Module: ESNext, all packages are ESM (`"type": "module"`)

## Coding Rules

- `console.*` is a lint warning — use `SdLogger` from `@simplysm/sd-core-node` instead
- `eqeqeq` enforced (`===`/`!==`) except for null checks (`== null` / `!= null` allowed)
- `strict-boolean-expressions`: `if (str)` forbidden for strings/numbers — use explicit comparison like `str !== ""`. Nullable booleans and objects are allowed
- `#private` fields forbidden (`no-hard-private`) — use TypeScript `private` keyword
- `@simplysm/no-subpath-imports-from-simplysm`: no deep subpath imports from @simplysm packages
- `unused-imports/no-unused-imports` enforced; unused vars must be prefixed with `_`
- All promises must be handled (`no-floating-promises`, `return-await` always required)
- `prefer-readonly` enforced for class members that are never reassigned
- Prettier: 100 chars, 2-space indent, semicolons, trailing commas, LF line endings
