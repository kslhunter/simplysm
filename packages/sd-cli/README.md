# @simplysm/sd-cli

Simplysm CLI tool — build, watch, dev server, lint, typecheck, publish, and project scaffolding for Simplysm monorepo projects.

## Installation

```bash
pnpm add -D @simplysm/sd-cli
```

The CLI is available as `sd-cli` after installation (or via `pnpm exec sd-cli`).

---

## Quick Command Reference

All commands accept a global `--debug` flag for verbose logging.

| Command | Description |
|---------|-------------|
| `sd-cli lint [targets..]` | Run ESLint and Stylelint across the workspace. |
| `sd-cli typecheck [targets..]` | Run TypeScript type checking. |
| `sd-cli check [targets..]` | Run typecheck, lint, and tests in parallel with a summary. |
| `sd-cli watch [targets..]` | Build library packages in watch mode (esbuild + `.d.ts`). |
| `sd-cli dev [targets..]` | Run client (Vite) and server packages in development mode. |
| `sd-cli build [targets..]` | Run a production build. |
| `sd-cli device` | Run an app on an Android device or Electron desktop. |
| `sd-cli init` | Scaffold a new Simplysm project interactively. |
| `sd-cli publish [targets..]` | Publish packages to npm, a local directory, or FTP/SFTP. |
| `sd-cli replace-deps` | Replace `node_modules` packages with symlinks to local source directories. |

For full option details see [docs/commands.md](./docs/commands.md).

---

## Configuration

Every command (except `init`) reads `sd.config.ts` from the project root:

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "solid": { target: "browser" },
    "solid-demo": { target: "client", server: "solid-demo-server" },
    "solid-demo-server": {
      target: "server",
      publish: { type: "sftp", host: "example.com", user: "deploy", path: "/var/www/app" },
    },
  },
});

export default config;
```

For the full type reference (`SdConfig`, `SdPackageConfig`, `SdClientPackageConfig`, `SdCapacitorConfig`, etc.) see [docs/config.md](./docs/config.md).

---

## Programmatic API

`@simplysm/sd-cli` exports builders, orchestrators, and lint/typecheck functions for use in code:

- **Config types** — all `Sd*Config` types re-exported from the package.
- **`createViteConfig(options)`** — create a Vite config for SolidJS + TailwindCSS client packages.
- **Builders** — `LibraryBuilder`, `DtsBuilder`, `BaseBuilder`, `IBuilder`.
- **Orchestrators** — `BuildOrchestrator`, `WatchOrchestrator`, `DevOrchestrator`.
- **Infrastructure** — `ResultCollector`, `SignalHandler`, `WorkerManager`.
- **Lint API** — `runLint()`, `executeLint()`.
- **Typecheck API** — `runTypecheck()`, `executeTypecheck()`.
- **Check API** — `runCheck()`.

For full API documentation see [docs/api.md](./docs/api.md).
