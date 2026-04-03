# @simplysm/sd-cli

Simplysm monorepo build, development, and deployment CLI tool. Reads `sd.config.ts` to determine per-package build strategies and orchestrates TypeScript compilation, esbuild bundling, Vite dev server, Angular AOT, linting, and publishing.

## Installation

```bash
npm install @simplysm/sd-cli
```

## CLI Commands

All commands are run via `pnpm sd-cli <command>`. The `--debug` flag is available on all commands. Omitting `[targets..]` runs against all packages defined in `sd.config.ts`. Targets are specified by package name (e.g., `core-common`).

| Command | Description |
|---|---|
| `pnpm dev [targets..]` | Run server packages in development mode |
| `pnpm watch [targets..]` | Watch-build library packages |
| `pnpm build [targets..]` | Production build |
| `pnpm pub [targets..]` | Build and publish (npm/sftp) |
| `pnpm check [targets..]` | Run typecheck + lint + test in parallel |
| `pnpm typecheck [targets..]` | TypeScript type checking |
| `pnpm lint [targets..]` | ESLint |
| `pnpm test [targets..]` | Vitest single run |

## API Overview

The package exports configuration types for `sd.config.ts` and a Vitest plugin for Angular AOT compilation.

### Config

| API | Type | Description |
|-----|------|-------------|
| `BuildTarget` | type | Build target platform: `"node"`, `"browser"`, or `"neutral"` |
| `SdBuildPackageConfig` | interface | Configuration for buildable packages (node/browser/neutral) |
| `SdClientPackageConfig` | interface | Configuration for client (Angular/Solid + Vite) packages |
| `SdServerPackageConfig` | interface | Configuration for server (Fastify) packages |
| `SdScriptsPackageConfig` | interface | Configuration for scripts-only packages (no build output) |
| `SdWatchHookConfig` | interface | Watch hook for running commands on file changes |
| `SdPackageConfig` | type | Union of all package configuration types |
| `SdConfig` | interface | Main configuration object for `sd.config.ts` |
| `SdConfigParams` | interface | Parameters passed to the `sd.config.ts` function |
| `SdConfigFn` | type | Type for the default export of `sd.config.ts` |
| `SdBrowserSupportConfig` | interface | Browser compatibility settings for client packages |
| `SdCapacitorConfig` | interface | Capacitor mobile build configuration |
| `SdCapacitorAndroidConfig` | interface | Capacitor Android platform configuration |
| `SdCapacitorSignConfig` | interface | APK/AAB signing configuration |
| `SdCapacitorPermission` | interface | Android permission configuration |
| `SdCapacitorIntentFilter` | interface | Android Intent Filter configuration |
| `SdElectronConfig` | interface | Electron desktop build configuration |

-> See [docs/config.md](./docs/config.md) for details.

### Publish Configuration Types

| API | Type | Description |
|-----|------|-------------|
| `SdPublishConfig` | type | Union of all publish configuration types |
| `SdNpmPublishConfig` | interface | npm registry publish configuration |
| `SdLocalDirectoryPublishConfig` | interface | Copy build output to a local directory |
| `SdStoragePublishConfig` | interface | Upload build output to FTP/FTPS/SFTP server |
| `SdPostPublishScriptConfig` | interface | Script to run after publish completes |

-> See [docs/publish-configuration-types.md](./docs/publish-configuration-types.md) for details.

### PWA Configuration Types

| API | Type | Description |
|-----|------|-------------|
| `SdPwaConfig` | interface | PWA configuration |
| `SdPwaManifestConfig` | interface | PWA manifest options (subset of VitePWA manifest) |
| `SdPwaWorkboxConfig` | interface | PWA workbox service worker options |

-> See [docs/pwa-configuration-types.md](./docs/pwa-configuration-types.md) for details.

### Vitest Plugin

| API | Type | Description |
|-----|------|-------------|
| `angularVitestPlugin` | function | Vite plugin for Angular AOT compilation in Vitest |
| `AngularVitestPluginOptions` | interface | Options for `angularVitestPlugin` |

-> See [docs/vitest-plugin.md](./docs/vitest-plugin.md) for details.

## Usage Examples

### sd.config.ts

```typescript
import type { SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

const config: SdConfigFn = (params: SdConfigParams) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": {
      target: "client",
      server: "my-server",
      capacitor: {
        appId: "com.example.app",
        appName: "My App",
      },
    },
    "my-server": {
      target: "server",
      publish: { type: "npm" },
      pm2: { name: "my-server" },
    },
  },
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```

### Vitest with Angular

```typescript
import { angularVitestPlugin } from "@simplysm/sd-cli/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [angularVitestPlugin({ tsconfig: "./tsconfig.json" })],
});
```
