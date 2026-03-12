# CLI Commands

All commands support the `--debug` flag for verbose logging.

## dev

Run client and server packages in development mode.

```
sd-cli dev [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to run (e.g., `packages/solid-demo`). Omit for all. |
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

- **client** targets start a Vite dev server with HMR.
- **server** targets run an esbuild watch build and spawn a server runtime process.
- Server-connected clients are proxied through the server automatically.
- Capacitor projects are initialized if configured.
- Terminates on SIGINT / SIGTERM.

## watch

Build library packages in watch mode.

```
sd-cli watch [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to watch. Omit for all. |
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

- Applies to `node`, `browser`, and `neutral` target packages only.
- Runs esbuild in watch mode and generates `.d.ts` declaration files.
- Terminates on SIGINT / SIGTERM.

## build

Run a production build.

```
sd-cli build [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to build. Omit for all. |
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

Build pipeline:
1. Clean `dist/` folders.
2. Run lint and build concurrently.
3. **node/browser/neutral** targets: esbuild JS bundle + `.d.ts` generation (with type checking).
4. **client** targets: Vite production build + type checking + optional Capacitor/Electron build.
5. **server** targets: esbuild JS bundle.
6. Sets `process.exitCode = 1` on any failure.

## publish

Build and publish packages.

```
sd-cli publish [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to publish. Omit for all with `publish` config. |
| `--no-build` | | Skip the build step (dangerous). |
| `--dry-run` | | Simulate without actual deployment. |
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

Deployment order:
1. Pre-validation (npm auth, Git status, SSH key setup for SFTP).
2. Version upgrade (patch or prerelease bump in all `package.json` files and templates).
3. Build.
4. Git commit, tag, and push.
5. Publish packages by dependency level (npm / local-directory / FTP / FTPS / SFTP).
6. Run `postPublish` scripts (failures are warned but do not block).

## lint

Run ESLint (with Stylelint support).

```
sd-cli lint [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to lint. Omit for all. |
| `--fix` | | Auto-fix issues. |
| `--timing` | | Print execution time per ESLint rule. |

- Reads `eslint.config.ts` (or `.mts`, `.js`, `.mjs`) for global ignore patterns.
- Uses ESLint cache (`.cache/eslint.cache`).

## typecheck

Run TypeScript type checking.

```
sd-cli typecheck [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to check. Omit for all. |
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

- Loads `tsconfig.json` and `sd.config.ts` to determine per-package environments.
- **neutral** packages are checked in both `node` and `browser` environments.
- Uses parallel Worker threads for concurrent type checking.
- Uses incremental compilation (`.cache/typecheck-{env}.tsbuildinfo`).

## check

Run typecheck, lint, and test in parallel.

```
sd-cli check [targets..]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `targets` | | Package paths to check. Omit for all. |
| `--type <types>` | | Comma-separated check types: `typecheck`, `lint`, `test`. Default: all three. |

Runs the selected checks concurrently and prints a combined summary.

## device

Run an app on an Android device or Electron.

```
sd-cli device -p <package>
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--package <name>` | `-p` | Package name (required). |
| `--url <url>` | `-u` | Development server URL (optional; derived from config if omitted). |
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

- Only works with **client** target packages that have `capacitor` or `electron` configuration.
- Connects the development server URL to the native WebView for hot reload.

## init

Initialize a new Simplysm project.

```
sd-cli init
```

- Must be run from an empty directory.
- Prompts for project description and server port.
- Generates project scaffolding from built-in Handlebars templates.
- Runs `pnpm install` after file generation.

## replace-deps

Replace `node_modules` packages with symlinks to local source directories.

```
sd-cli replace-deps
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--opt <value>` | `-o` | Options to pass to `sd.config.ts` (repeatable). |

Uses the `replaceDeps` mapping from `sd.config.ts` to create symlinks.
