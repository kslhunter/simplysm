# Configuration: `sd.config.ts`

Every `sd-cli` command (except `init`) reads `sd.config.ts` from the project root. The file must default-export a function matching `SdConfigFn`.

```typescript
import type { SdConfig, SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

const config: SdConfigFn = (params: SdConfigParams) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "solid": { target: "browser" },
    "solid-demo": {
      target: "client",
      server: "solid-demo-server",
    },
    "solid-demo-server": {
      target: "server",
      publish: {
        type: "sftp",
        host: "example.com",
        user: "deploy",
        path: "/var/www/app",
      },
    },
  },
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
  },
});

export default config;
```

---

## `SdConfigFn`

Type of the function that `sd.config.ts` must default-export.

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

---

## `SdConfigParams`

Parameters passed to the `sd.config.ts` function.

```typescript
interface SdConfigParams {
  /** Current working directory */
  cwd: string;
  /** true in dev/watch mode, false in build/publish */
  dev: boolean;
  /** Additional options from the CLI's -o flag (e.g., ["key=value"]) */
  opt: string[];
}
```

---

## `SdConfig`

Root configuration object.

```typescript
interface SdConfig {
  /** Per-package configuration (key: subdirectory name under packages/) */
  packages: Record<string, SdPackageConfig | undefined>;
  /**
   * Replace node_modules packages with local source symlinks.
   * Key: package glob pattern (e.g., "@simplysm/*")
   * Value: source directory path (glob captures substituted into *)
   * Example: { "@simplysm/*": "../simplysm/packages/*" }
   */
  replaceDeps?: Record<string, string>;
  /** Scripts to execute after all deployments complete */
  postPublish?: SdPostPublishScriptConfig[];
}
```

---

## `SdPackageConfig`

Union of all package configuration types.

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

---

## `BuildTarget`

```typescript
type BuildTarget = "node" | "browser" | "neutral";
```

| Value | Description |
|-------|-------------|
| `"node"` | Node.js-only package |
| `"browser"` | Browser-only package |
| `"neutral"` | Shared package (runs in both environments) |

---

## `SdBuildPackageConfig`

Configuration for `node`, `browser`, and `neutral` library packages.

```typescript
interface SdBuildPackageConfig {
  /** Build target */
  target: BuildTarget;
  /** Publish configuration */
  publish?: SdPublishConfig;
  /** Glob patterns for files to copy from src/ to dist/ (relative to src/) */
  copySrc?: string[];
}
```

---

## `SdClientPackageConfig`

Configuration for client packages (Vite-based SolidJS apps).

```typescript
interface SdClientPackageConfig {
  target: "client";
  /**
   * Server configuration:
   * - string: server package name to proxy requests through (e.g., "solid-demo-server")
   * - number: Vite port to use directly (backward compatibility)
   */
  server: string | number;
  /** Environment variables substituted at build time (replaces process.env) */
  env?: Record<string, string>;
  /** Publish configuration */
  publish?: SdPublishConfig;
  /** Capacitor (Android/iOS) configuration */
  capacitor?: SdCapacitorConfig;
  /** Electron (desktop) configuration */
  electron?: SdElectronConfig;
  /** Runtime config written to dist/.config.json during build */
  configs?: Record<string, unknown>;
}
```

---

## `SdServerPackageConfig`

Configuration for server packages (Fastify-based Node.js servers).

```typescript
interface SdServerPackageConfig {
  target: "server";
  /** Environment variables substituted at build time */
  env?: Record<string, string>;
  /** Publish configuration */
  publish?: SdPublishConfig;
  /** Runtime config written to dist/.config.json during build */
  configs?: Record<string, unknown>;
  /** External modules excluded from the esbuild bundle */
  externals?: string[];
  /** PM2 configuration (generates dist/pm2.config.cjs when specified) */
  pm2?: {
    /** PM2 process name (derived from package.json name if omitted) */
    name?: string;
    /** Paths excluded from PM2 watch */
    ignoreWatchPaths?: string[];
  };
  /** Package manager for mise.toml/volta settings generation */
  packageManager?: "volta" | "mise";
}
```

---

## `SdScriptsPackageConfig`

Marks a package as scripts-only. Excluded from watch and typecheck.

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
}
```

---

## `SdPublishConfig`

```typescript
type SdPublishConfig = "npm" | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

| Value | Description |
|-------|-------------|
| `"npm"` | Publish to the npm registry |
| `SdLocalDirectoryPublishConfig` | Copy `dist/` to a local directory |
| `SdStoragePublishConfig` | Upload `dist/` to FTP, FTPS, or SFTP |

---

## `SdLocalDirectoryPublishConfig`

```typescript
interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  /** Destination path. Supports %VER% and %PROJECT% substitution. */
  path: string;
}
```

---

## `SdStoragePublishConfig`

```typescript
interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  pass?: string;
}
```

For SFTP without `pass`, an SSH key pair (`~/.ssh/id_ed25519`) is generated automatically. If the key is not registered on the server, you are prompted for a password to register it.

---

## `SdPostPublishScriptConfig`

Script executed after all packages are published.

```typescript
interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  /** Arguments. Supports %VER% and %PROJECT% substitution. */
  args: string[];
}
```

---

## `SdCapacitorConfig`

Configuration for Capacitor (Android/iOS) packaging.

```typescript
interface SdCapacitorConfig {
  /** App ID (e.g., "com.example.app") */
  appId: string;
  /** App name */
  appName: string;
  /** Capacitor plugin configuration (key: package name, value: true or options object) */
  plugins?: Record<string, Record<string, unknown> | true>;
  /** App icon path (relative to package directory) */
  icon?: string;
  /** Debug build flag */
  debug?: boolean;
  /** Per-platform configuration */
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}
```

---

## `SdCapacitorAndroidConfig`

```typescript
interface SdCapacitorAndroidConfig {
  /** AndroidManifest.xml application tag attributes */
  config?: Record<string, string>;
  /** true = AAB bundle, false/omitted = APK */
  bundle?: boolean;
  /** Intent Filter configuration */
  intentFilters?: SdCapacitorIntentFilter[];
  /** APK/AAB signing configuration */
  sign?: SdCapacitorSignConfig;
  /** Android SDK version (minSdk and targetSdk) */
  sdkVersion?: number;
  /** Additional permissions */
  permissions?: SdCapacitorPermission[];
}
```

---

## `SdCapacitorSignConfig`

```typescript
interface SdCapacitorSignConfig {
  /** Keystore file path (relative to package directory) */
  keystore: string;
  storePassword: string;
  alias: string;
  password: string;
  /** Keystore type (default: "jks") */
  keystoreType?: string;
}
```

---

## `SdCapacitorPermission`

```typescript
interface SdCapacitorPermission {
  /** Permission name (e.g., "CAMERA", "WRITE_EXTERNAL_STORAGE") */
  name: string;
  maxSdkVersion?: number;
  /** tools:ignore attribute value */
  ignore?: string;
}
```

---

## `SdCapacitorIntentFilter`

```typescript
interface SdCapacitorIntentFilter {
  /** e.g., "android.intent.action.VIEW" */
  action?: string;
  /** e.g., "android.intent.category.DEFAULT" */
  category?: string;
}
```

---

## `SdElectronConfig`

Configuration for Electron desktop packaging.

```typescript
interface SdElectronConfig {
  /** Electron app ID (e.g., "com.example.myapp") */
  appId: string;
  /** true = portable .exe, false/omitted = NSIS installer */
  portable?: boolean;
  /** Installer icon path (.ico, relative to package directory) */
  installerIcon?: string;
  /** npm packages to reinstall inside Electron (for native modules) */
  reinstallDependencies?: string[];
  /** npm postinstall script */
  postInstallScript?: string;
  /** NSIS options (when portable is false) */
  nsisOptions?: Record<string, unknown>;
  /** Environment variables accessible via process.env in electron-main.ts */
  env?: Record<string, string>;
}
```
