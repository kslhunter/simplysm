# CLI Commands

All commands accept a global `--debug` flag that enables verbose debug logging.

---

## `lint [targets..]`

Run ESLint and Stylelint across the workspace.

```bash
sd-cli lint
sd-cli lint packages/core-common packages/solid
sd-cli lint --fix
sd-cli lint --timing
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Paths to lint (e.g., `packages/core-common`). Empty targets everything. |
| `--fix` | `boolean` | `false` | Auto-fix issues. |
| `--timing` | `boolean` | `false` | Print execution time per ESLint rule. |

- Reads `eslint.config.ts` (or `.js`/`.mts`/`.mjs`) from the project root.
- ESLint cache is stored in `.cache/eslint.cache`.
- Sets `process.exitCode = 1` on errors.

---

## `typecheck [targets..]`

Run TypeScript type checking using `tsconfig.json`.

```bash
sd-cli typecheck
sd-cli typecheck packages/core-common
sd-cli typecheck -o key=value
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Paths to typecheck. Empty targets all files in `tsconfig.json`. |
| `--opt`, `-o` | `string[]` | `[]` | Options to pass to `sd.config.ts` (e.g., `-o key=value`). |

- Loads `tsconfig.json` compiler options.
- Loads `sd.config.ts` to determine per-package typecheck environment (`node` or `browser`).
- `neutral` packages are typechecked in both environments.
- Uses incremental compilation (`.cache/typecheck-{env}.tsbuildinfo`).
- Runs typecheck tasks in parallel (up to 7/8 of CPU cores).
- Sets `process.exitCode = 1` on errors.

---

## `check [targets..]`

Run typecheck, lint, and tests in parallel, then print a summary.

```bash
sd-cli check
sd-cli check packages/core-common
sd-cli check --type typecheck,lint
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Paths to check. |
| `--type` | `string` | `"typecheck,lint,test"` | Comma-separated check types to run (`typecheck`, `lint`, `test`). |

- Runs the selected checks concurrently.
- Outputs results in sections: `TYPECHECK`, `LINT`, `TEST`, then a `SUMMARY`.
- Sets `process.exitCode = 1` if any check fails.

---

## `watch [targets..]`

Build library packages in watch mode (esbuild + `.d.ts` generation).

```bash
sd-cli watch
sd-cli watch core-common solid
sd-cli watch -o key=value
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Package names to watch (subdirectory names under `packages/`). Empty watches all library packages. |
| `--opt`, `-o` | `string[]` | `[]` | Options to pass to `sd.config.ts`. |

- Targets `node`, `browser`, and `neutral` packages only (client/server excluded).
- Requires `sd.config.ts` in the project root.
- Terminate with `Ctrl+C` (SIGINT/SIGTERM).

---

## `dev [targets..]`

Run client and server packages in development mode.

```bash
sd-cli dev
sd-cli dev solid-demo solid-demo-server
sd-cli dev -o key=value
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Package names to run. Empty runs all client/server packages. |
| `--opt`, `-o` | `string[]` | `[]` | Options to pass to `sd.config.ts`. |

- `client` target: starts a Vite dev server.
- `server` target: builds with esbuild, then spawns a server runtime worker.
- Server-connected clients proxy requests through the server (Fastify with `@fastify/http-proxy`).
- Initializes Capacitor if configured.
- Terminate with `Ctrl+C` (SIGINT/SIGTERM).

---

## `build [targets..]`

Run a production build.

```bash
sd-cli build
sd-cli build core-common solid
sd-cli build -o key=value
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Package names to build. Empty builds all packages. |
| `--opt`, `-o` | `string[]` | `[]` | Options to pass to `sd.config.ts`. |

**Build behavior by target:**

| Target | Steps |
|--------|-------|
| `node` / `browser` / `neutral` | Clean `dist/`, esbuild JS build + `.d.ts` generation (parallel) |
| `client` | Clean `dist/`, Vite production build + typecheck (parallel); Capacitor/Electron build if configured |
| `server` | Clean `dist/`, esbuild JS build |
| `scripts` | Excluded |

- Lint runs concurrently with all builds.
- Sets `process.exitCode = 1` on any failure.

---

## `device`

Run an app on an Android device or Electron desktop app.

```bash
sd-cli device --package solid-demo
sd-cli device --package solid-demo --url http://192.168.1.10:5173/solid-demo/
sd-cli device -p solid-demo -o key=value
```

**Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--package`, `-p` | `string` | Yes | Package name (`client` target). |
| `--url`, `-u` | `string` | No | Development server URL. If omitted, derived from `server` config in `sd.config.ts`. |
| `--opt`, `-o` | `string[]` | No | Options to pass to `sd.config.ts`. |

- For Capacitor: connects Android device's WebView to the dev server URL for Hot Reload.
- For Electron: opens the Electron window pointed at the dev server URL.
- The `.capacitor/` directory must exist (run `pnpm watch <package>` first).

---

## `init`

Initialize a new Simplysm project in the current (empty) directory.

```bash
mkdir my-project && cd my-project
sd-cli init
```

Interactive prompts:
- **Project description**
- **Server port** (default: `40080`)

Generates a complete project structure from Handlebars templates and runs `pnpm install`.

---

## `publish [targets..]`

Publish packages to npm, a local directory, or FTP/FTPS/SFTP.

```bash
sd-cli publish
sd-cli publish core-common solid
sd-cli publish --dry-run
sd-cli publish --no-build
sd-cli publish -o key=value
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `targets` | `string[]` | `[]` | Packages to publish. Empty publishes all packages with `publish` config. |
| `--build` / `--no-build` | `boolean` | `true` | Run build before publishing. `--no-build` skips the build (dangerous). |
| `--dry-run` | `boolean` | `false` | Simulate without actual deployment. |
| `--opt`, `-o` | `string[]` | `[]` | Options to pass to `sd.config.ts`. |

**Deployment order:**

1. Pre-validation (npm auth check, SSH key check, uncommitted changes check)
2. Version upgrade (`patch` increment; `prerelease` increment if current version is pre-release)
3. Build
4. Git commit + tag + push
5. Publish (sequential by dependency level, parallel within a level; 3 retries per package)
6. `postPublish` scripts (failures only warn, do not abort)

---

## `replace-deps`

Replace `node_modules` packages with symlinks to local source directories, based on `replaceDeps` config in `sd.config.ts`.

```bash
sd-cli replace-deps
sd-cli replace-deps -o key=value
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--opt`, `-o` | `string[]` | `[]` | Options to pass to `sd.config.ts`. |
