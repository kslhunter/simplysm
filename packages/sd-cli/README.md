# @simplysm/sd-cli

CLI tool -- monorepo build, dev server, publish, and code quality tooling for Simplysm projects.

## Installation

```bash
npm install @simplysm/sd-cli
```

## API Overview

### Configuration Types

| API | Type | Description |
|-----|------|-------------|
| `BuildTarget` | type | Build target: `"node"`, `"browser"`, `"neutral"` |
| `SdNpmPublishConfig` | interface | npm registry publish configuration |
| `SdPublishConfig` | type | Union of all publish configs (npm, local-directory, storage) |
| `SdLocalDirectoryPublishConfig` | interface | Copy to local directory publish configuration |
| `SdStoragePublishConfig` | interface | FTP/FTPS/SFTP publish configuration |
| `SdPostPublishScriptConfig` | interface | Post-publish script configuration |
| `SdBuildPackageConfig` | interface | Package config for node/browser/neutral targets |
| `SdCapacitorSignConfig` | interface | Capacitor Android APK/AAB signing configuration |
| `SdCapacitorPermission` | interface | Capacitor Android permission configuration |
| `SdCapacitorIntentFilter` | interface | Capacitor Android Intent Filter configuration |
| `SdCapacitorAndroidConfig` | interface | Capacitor Android platform configuration |
| `SdCapacitorConfig` | interface | Capacitor configuration (appId, plugins, icon, platform) |
| `SdElectronConfig` | interface | Electron configuration (appId, portable, installer) |
| `SdClientPackageConfig` | interface | Client package configuration (Vite dev server) |
| `SdServerPackageConfig` | interface | Server package configuration (Fastify server) |
| `SdWatchHookConfig` | interface | Watch hook configuration for scripts packages |
| `SdScriptsPackageConfig` | interface | Scripts-only package configuration |
| `SdPackageConfig` | type | Union of all package configs |
| `SdConfig` | interface | Root `sd.config.ts` configuration |
| `SdConfigParams` | interface | Parameters passed to sd.config.ts function |
| `SdConfigFn` | type | Type of the default export function in sd.config.ts |

### Vite Utilities

| API | Type | Description |
|-----|------|-------------|
| `ViteConfigOptions` | interface | Options for creating Vite config |
| `createViteConfig` | function | Create Vite config for SolidJS + TailwindCSS client packages |

## `BuildTarget`

```typescript
type BuildTarget = "node" | "browser" | "neutral";
```

## `SdPublishConfig`

```typescript
type SdPublishConfig =
  | SdNpmPublishConfig
  | SdLocalDirectoryPublishConfig
  | SdStoragePublishConfig;
```

## `SdPackageConfig`

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

## `SdConfig`

```typescript
interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

Root configuration type for `sd.config.ts`. The `packages` field maps package subdirectory names (e.g., `"core-common"`) to their build configuration. The `replaceDeps` field enables local symlink replacement for development.

## `SdConfigFn`

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

The `sd.config.ts` file must default-export a function of this type.

## `SdConfigParams`

```typescript
interface SdConfigParams {
  cwd: string;
  dev: boolean;
  options: string[];
}
```

## `ViteConfigOptions`

```typescript
interface ViteConfigOptions {
  pkgDir: string;
  name: string;
  tsconfigPath: string;
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  mode: "build" | "dev";
  serverPort?: number;
  replaceDeps?: string[];
  onScopeRebuild?: () => void;
  outDir?: string;
  base?: string;
}
```

## `createViteConfig`

```typescript
function createViteConfig(options: ViteConfigOptions): ViteUserConfig;
```

Create Vite config for SolidJS + TailwindCSS client packages. Includes plugins for tsconfig paths, SolidJS, PWA, scope package watching, Tailwind config dependency tracking, and public-dev directory serving.

## Usage Examples

### Define sd.config.ts

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": {
      target: "client",
      server: "my-server",
    },
    "my-server": {
      target: "server",
      pm2: { name: "my-app" },
    },
  },
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```

### Create a Vite config for a client package

```typescript
import { createViteConfig } from "@simplysm/sd-cli";

const config = createViteConfig({
  pkgDir: "/path/to/my-client",
  name: "my-client",
  tsconfigPath: "/path/to/my-client/tsconfig.json",
  compilerOptions: { jsx: "preserve" },
  mode: "dev",
  serverPort: 3000,
});
```

### Configure Capacitor build

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "my-app": {
      target: "client",
      server: "my-server",
      capacitor: {
        appId: "com.example.myapp",
        appName: "My App",
        icon: "resources/icon.png",
        platform: {
          android: {
            sign: {
              keystore: "keystore.jks",
              storePassword: "pass",
              alias: "key0",
              password: "pass",
            },
          },
        },
      },
    },
  },
});

export default config;
```
