# @simplysm/sd-cli

Build, check, publish, and deploy tool for Simplysm monorepo projects. Provides a single `sd-cli` binary that orchestrates TypeScript compilation, Angular bundling, ESLint checks, npm publishing, and native mobile packaging (Electron, Cordova, Capacitor).

## Installation

```bash
npm install @simplysm/sd-cli
```

This is a CLI-only package with no library API exports. All functionality is accessed through the `sd-cli` command.

## CLI Overview

| Command | Description |
|---------|-------------|
| `local-update` | Performs local library update |
| `watch` | Watch-builds packages in development mode |
| `build` | Production build for packages |
| `check [path]` | Runs typecheck and/or lint |
| `publish` | Builds and publishes packages to npm |
| `run-electron <package>` | Launches a watch-built platform as an Electron app |
| `build-electron-for-dev <package>` | Builds an Electron app for dev testing |
| `run-cordova <platform> <package> [url]` | Deploys to a Cordova device |
| `run-capacitor <platform> <package> [url]` | Deploys to a Capacitor device |
| `commit` | AI-assisted commit message generation, commit, and push |
| `postinstall` | Runs post-install tasks automatically |

## Global Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--help`, `-h` | boolean | -- | Show help |
| `--debug` | boolean | `false` | Enable debug-level logging |

## CLI Reference

### `local-update`

Performs local library update using linked packages.

```bash
sd-cli local-update [--config <path>] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config` | string | `simplysm.js` | Configuration file path |
| `--options` | string[] | -- | Additional option settings |

### `watch`

Watch-builds all or selected packages for development.

```bash
sd-cli watch [--config <path>] [--packages <names...>] [--emitOnly] [--noEmit] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config` | string | `simplysm.js` | Configuration file path |
| `--packages` | string[] | -- | Specific packages to watch |
| `--emitOnly` | boolean | `false` | Only emit output (skip checks) |
| `--noEmit` | boolean | `false` | Only check (skip emit) |
| `--options` | string[] | -- | Additional option settings |

### `build`

Production build for all or selected packages.

```bash
sd-cli build [--config <path>] [--packages <names...>] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--config` | string | `simplysm.js` | Configuration file path |
| `--packages` | string[] | -- | Specific packages to build |
| `--options` | string[] | -- | Additional option settings |

### `check [path]`

Runs typecheck and/or lint on the project or a specific package path.

```bash
sd-cli check [path] [--config <path>] [--type <lint|typecheck>] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | string | -- | Package path or file path (positional) |
| `--config` | string | `simplysm.js` | Configuration file path |
| `--type` | `"lint"` \| `"typecheck"` | -- | Check type (omit for both) |
| `--options` | string[] | -- | Additional option settings |

### `publish`

Builds and publishes packages to npm.

```bash
sd-cli publish [--noBuild] [--config <path>] [--packages <names...>] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--noBuild` | boolean | `false` | Publish without rebuilding |
| `--config` | string | `simplysm.js` | Configuration file path |
| `--packages` | string[] | -- | Specific packages to publish |
| `--options` | string[] | -- | Additional option settings |

### `run-electron <package>`

Launches a watch-built platform as an Electron desktop application.

```bash
sd-cli run-electron <package> [--config <path>] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `package` | string | -- | Package name (required) |
| `--config` | string | `simplysm.js` | Configuration file path |
| `--options` | string[] | -- | Additional option settings |

### `build-electron-for-dev <package>`

Builds an Electron app from a watch-built platform for dev testing.

```bash
sd-cli build-electron-for-dev <package> [--config <path>] [--options <values...>]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `package` | string | -- | Package name (required) |
| `--config` | string | `simplysm.js` | Configuration file path |
| `--options` | string[] | -- | Additional option settings |

### `run-cordova <platform> <package> [url]`

Deploys a watch-built platform to a Cordova device as a webview app.

```bash
sd-cli run-cordova <platform> <package> [url]
```

| Option | Type | Description |
|--------|------|-------------|
| `platform` | string | Build platform (e.g., `android`) (required) |
| `package` | string | Package name (required) |
| `url` | string | URL to open in webview (required) |

### `run-capacitor <platform> <package> [url]`

Deploys a watch-built platform to a Capacitor device as a webview app.

```bash
sd-cli run-capacitor <platform> <package> [url]
```

| Option | Type | Description |
|--------|------|-------------|
| `platform` | string | Build platform (e.g., `android`) (required) |
| `package` | string | Package name (required) |
| `url` | string | URL to open in webview (required) |

### `commit`

Uses AI to generate a commit message from current changes, then commits and pushes.

```bash
sd-cli commit
```

### `postinstall`

Runs automated post-install tasks. Typically called from `package.json` scripts.

```bash
sd-cli postinstall
```

## Usage Examples

### Development workflow

```bash
# Watch all packages
sd-cli watch

# Watch a specific package with debug logging
sd-cli watch --packages sd-angular --debug

# Check only (no output emit)
sd-cli watch --noEmit
```

### Build and publish

```bash
# Full production build
sd-cli build

# Build specific packages
sd-cli build --packages sd-core-common sd-core-node

# Publish without rebuilding
sd-cli publish --noBuild
```

### Code quality

```bash
# Run both typecheck and lint
sd-cli check

# Lint only on a specific package
sd-cli check packages/sd-core-common --type lint
```
