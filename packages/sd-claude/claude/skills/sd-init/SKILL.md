---
name: sd-init
description: Used when requesting "initialize", "init", "sd-init", "generate CLAUDE.md", etc.
---

# SD Init — Auto-generate CLAUDE.md

Analyze the project and auto-generate CLAUDE.md. Overwrite if the file already exists.

---

## Step 1: Detect Package Manager

Determine the PM from the lock file in the project root:

1. `pnpm-lock.yaml` → pnpm
2. `yarn.lock` → yarn
3. Otherwise → npm

## Step 2: Analyze Scripts

Read the `scripts` in `package.json`, and for each CLI tool invoked by a script, run `--help` or similar help commands via Bash to identify available arguments and flags.

Based on the gathered information, group scripts by category (development, build, test, lint, etc.), and organize the basic usage and key flag examples for each script.

## Step 3: Analyze Coding Rules

Find and read the following config files from the project root (only those that exist):

- ESLint: `eslint.config.*`, `.eslintrc.*`, `packages/*/eslint.*`, etc.
- Prettier: `.prettierrc*`, `prettier.config.*`
- EditorConfig: `.editorconfig`
- TypeScript: `compilerOptions` in the root `tsconfig.json` that affect code style, such as `strict`, `noImplicitAny`, etc.
- Stylelint: `.stylelintrc*`, `stylelint.config.*`

Summarize only the frequently violated rules that Claude is likely to suggest incorrectly — keep it highly concise.

## Step 4: Generate CLAUDE.md

Combine the information above and write `CLAUDE.md` in the project root:

- **Project info**: `name` and `description` from `package.json`
- **PM**: Package manager detected in Step 1
- **Monorepo structure**: If a `workspaces` field or `pnpm-workspace.yaml` exists, briefly describe the workspace paths
- **Tech stack**: Identify key technologies (frameworks, bundlers, test tools, etc.) from `dependencies`/`devDependencies` and describe them very briefly
- **Commands**: Script usage organized in Step 2
- **Coding rules**: Rules from Step 3 that Claude should follow. Write as a `## Coding Rules` section

### Reference Example

Below is an example of a well-written CLAUDE.md. Do not copy the format verbatim — adapt it flexibly to the project's characteristics.

```markdown
# Simplysm

pnpm monorepo. Package paths: `packages/*`, tests: `tests/*`

## Commands

All commands internally run `pnpm sd-cli <command>`. The `--debug` flag is available for all commands.
If `[targets..]` is not specified, all packages defined in `sd.config.ts` are targeted.
Targets are specified by package path (e.g., `packages/core-common`, `tests/orm`).

### Development

​```bash
pnpm dev [targets..]                     # Run client+server packages in dev mode
pnpm dev packages/solid-demo             # Dev mode for a specific package only
pnpm dev -o key=value                    # Pass options to sd.config.ts

pnpm watch [targets..]                   # Watch mode for library package builds
pnpm watch packages/core-common          # Watch a specific package only
​```

### Build & Deploy

​```bash
pnpm build [targets..]                   # Production build
pnpm build packages/solid                # Build a specific package only

pnpm pub [targets..]                     # Build then deploy (npm/sftp)
pnpm pub --no-build                      # Deploy only, skip build
pnpm pub --dry-run                       # Simulate without actual deployment
​```

### Code Quality Checks

​```bash
pnpm typecheck [targets..]               # TypeScript type check
pnpm lint [targets..]                    # Run ESLint + Stylelint
pnpm lint:fix [targets..]               # Auto-fix lint issues (--fix)
pnpm check [targets..]                   # Full check (typecheck + lint + test in parallel)
pnpm vitest [targets..]                  # vitest watch mode
pnpm vitest run [targets..]              # Run tests once
​```

## Architecture

Dependency direction: top → bottom. `core-common` is a leaf package with no internal dependencies.

​```
Apps:     solid-demo (client) / solid-demo-server (server)
UI:       solid (SolidJS + Tailwind)
Service:  service-server (Fastify) / service-client / service-common
ORM:      orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
Core:     core-common (neutral) / core-browser / core-node
Tools:    sd-cli, lint, excel, storage, sd-claude, mcp-playwright
​```


## Integration Tests

Located in the `tests/` folder. Run with `pnpm vitest run tests/orm`, etc.

- `tests/orm` — DB connection, DbContext, escape tests (MySQL, PostgreSQL, MSSQL). Requires Docker.
- `tests/service` — Service client-server communication tests.

## Coding Rules

- `import type` required (`verbatimModuleSyntax`), `#private` forbidden → use `private` keyword
- `console.*` forbidden, `if (str)` forbidden → use explicit comparison `str !== ""` (nullable boolean/object allowed)
- `Buffer` forbidden → `Uint8Array`, `events` forbidden → `EventEmitter` from `@simplysm/core-common`
- SolidJS: no props destructuring, use `<For>` instead of `.map()`, use `class` instead of `className`
- Prettier: 100 chars, 2-space indent, semicolons, trailing comma, LF
```

## Step 5: Completion Notice

When generation is complete, output the following:

```
CLAUDE.md has been generated. Run /sd-commit to commit.
```
