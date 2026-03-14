# Simplysm

pnpm monorepo. Packages: `packages/*`, Tests: `tests/*`

## Commands

All commands internally run `pnpm sd-cli <command>`. All commands support the `--debug` flag.
If `[targets..]` is not specified, all packages defined in `sd.config.ts` are targeted.
Targets are specified by package path (e.g., `packages/core-common`, `tests/orm`).

### Development

```bash
pnpm dev [targets..]                     # Run client+server packages in dev mode
pnpm dev packages/solid-demo             # Dev mode for a specific package
pnpm dev -o key=value                    # Pass options to sd.config.ts

pnpm watch [targets..]                   # Watch mode for library package builds
pnpm watch packages/core-common          # Watch a specific package
```

### Build & Deploy

```bash
pnpm build [targets..]                   # Production build
pnpm build packages/solid                # Build a specific package

pnpm pub [targets..]                     # Build and deploy (npm/sftp)
pnpm pub --no-build                      # Deploy only, skip build
pnpm pub --dry-run                       # Simulate without actual deployment
pnpm pub:no-build                        # Shorthand for --no-build
```

### Code Quality

```bash
# Type check
pnpm typecheck [targets..]               # TypeScript type check
pnpm typecheck packages/core-common      # Specific package only

# Lint
pnpm lint [targets..]                    # Run ESLint + Stylelint
pnpm lint:fix [targets..]               # Auto-fix lint issues (--fix)
pnpm lint --timing                       # Show per-rule execution time

# Combined check (typecheck + lint + test in parallel)
pnpm check [targets..]                   # Run all checks
pnpm check packages/core-common          # Specific package only
pnpm check --type typecheck,lint         # Select check types (comma-separated: typecheck, lint, test)

# Test
pnpm vitest [targets..]                  # vitest watch mode
pnpm vitest run [targets..]              # Run tests once
pnpm vitest run packages/core-common     # Test a specific package
```

### Miscellaneous

```bash
pnpm sd-cli device -p <package-name>     # Run app on Android device
pnpm sd-cli device -p my-app -u <URL>    # Specify dev server URL directly
pnpm sd-cli replace-deps                 # Symlink node_modules to local sources per replaceDeps in sd.config.ts
pnpm sd-cli init                         # Initialize a new project
```

## Package Target Types (sd.config.ts)

| target | Description |
|--------|-------------|
| node | Node.js-only library |
| browser | Browser-only library |
| neutral | Universal library (Node + browser) |
| client | Client app (uses Vite for dev/build) |
| server | Server app (deployed via PM2) |

## Architecture

Dependency direction: top → bottom. `core-common` is a leaf package with no internal dependencies.

```
Apps:       solid-demo (client) / solid-demo-server (server)
UI:         solid (SolidJS + Tailwind)
Capacitor:  capacitor-plugin-auto-update / broadcast / file-system / usb-storage
Service:    service-server (Fastify) / service-client / service-common
ORM:        orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
Core:       core-common (neutral) / core-browser / core-node
Tools:      sd-cli, lint, excel, storage, sd-claude, mcp-playwright
```

## Integration Tests

Located in the `tests/` folder. Run with `pnpm vitest run tests/orm`, etc.

- `tests/orm` — DB connection, DbContext, and escape tests (MySQL, PostgreSQL, MSSQL). Requires Docker.
- `tests/service` — Service client-server communication tests.

## Import Path Aliases

tsconfig paths map `@simplysm/<package-name>` to `packages/<package-name>/src/index.ts`.

## Coding Conventions

- `import type` required (`verbatimModuleSyntax`), `#private` forbidden → use `private` keyword
- `console.*` forbidden (except test files), `===` required (`== null` is the only exception)
- `if (str)` forbidden → use explicit comparison `str !== ""` (`strict-boolean-expressions`; nullable boolean/object allowed)
- `Buffer` forbidden → use `Uint8Array`, `events`/`eventemitter3` forbidden → use `EventEmitter` from `@simplysm/core-common`
- Unused variables allowed with `_` prefix (e.g., `_unused`), unused imports auto-removed
- Prefer `readonly` (`prefer-readonly`), use bracket notation for index signatures (`noPropertyAccessFromIndexSignature`)
- Promises must be `await`ed or explicitly handled (`no-floating-promises`), only Error objects can be thrown (`only-throw-error`)
- SolidJS: no props destructuring, use `<For>` instead of `.map()`, `className` forbidden → use `class`
- Tailwind: auto-sort class order, no custom classes, no conflicting classes, use shorthand
- Prettier: 100 chars, 2-space indent, semicolons, trailing commas, LF
