# Server Build: Native Module Externals & Production File Generation

## Summary

Add two missing features to the CLI server build pipeline:
1. Auto-detect and externalize node-gyp native modules (binding.gyp detection)
2. Generate production deployment files (package.json, mise.toml, openssl.cnf, pm2.config.cjs)

## Changes

### 1. Config Type Extension (`sd-config.types.ts`)

Add to `SdServerPackageConfig`:

```typescript
export interface SdServerPackageConfig {
  target: "server";
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;

  /** Modules to externalize from bundle (in addition to auto-detected native modules) */
  externals?: string[];
  /** PM2 config (generates dist/pm2.config.cjs when specified) */
  pm2?: {
    /** PM2 process name (defaults to package name) */
    name?: string;
    /** Paths to ignore in PM2 watch */
    ignoreWatchPaths?: string[];
    /** Skip interpreter path (use system PATH node) */
    noInterpreter?: boolean;
  };
}
```

### 2. Native Module Detection (`esbuild-config.ts`)

New function `collectNativeModuleExternals(pkgDir)`:

- Separate from `collectUninstalledOptionalPeerDeps()` (different traversal logic)
- Recursively scans `dependencies` tree
- Detects `binding.gyp` file in each module directory
- Returns list of native module package names

```typescript
export function collectNativeModuleExternals(pkgDir: string): string[] {
  // Traverse dependencies recursively
  // Check existsSync(path.join(depDir, "binding.gyp"))
  // Return native module names
}
```

### 3. Production File Generation (`server.worker.ts`)

Extended `ServerBuildInfo` with `externals?: string[]` and `pm2?` fields.

In `build()` function, after esbuild completes (production build only):

#### External collection flow:
```
collectUninstalledOptionalPeerDeps()  -> uninstalled optional peer deps
+ collectNativeModuleExternals()      -> binding.gyp native modules
+ info.externals                      -> manual externals from sd.config.ts
= final external list (used for esbuild + package.json)
```

#### Generated files:

1. **`dist/package.json`** - minimal, with externalized deps as `"*"` version
   ```json
   {
     "name": "@scope/my-server",
     "version": "1.0.0",
     "type": "module",
     "dependencies": { "native-addon": "*" }
   }
   ```

2. **`dist/mise.toml`** - Node version from root mise.toml
   ```toml
   [tools]
   node = "20"
   ```

3. **`dist/openssl.cnf`** - Legacy OpenSSL provider activation (for MSSQL etc.)

4. **`dist/pm2.config.cjs`** (only when `pm2` config present)
   - `mise which node` for interpreter path
   - `--openssl-config=openssl.cnf` as interpreter_args
   - Watch mode with configurable ignore paths
   - Environment: NODE_ENV=production, TZ=Asia/Seoul, SD_VERSION

### 4. Build Pipeline (`build.ts`)

Pass new config fields from `SdServerPackageConfig` to `ServerBuildInfo`:

```typescript
const buildResult = await serverWorker.build({
  name,
  cwd,
  pkgDir,
  env: { ...baseEnv, ...config.env },
  configs: config.configs,
  externals: config.externals,  // new
  pm2: config.pm2,              // new
});
```

## Notes

- Production file generation only runs in one-shot build, NOT in watch mode (same as legacy)
- `collectNativeModuleExternals` is a separate function from `collectUninstalledOptionalPeerDeps` due to different traversal criteria
- Legacy `.yarnrc.yml` replaced with `mise.toml`
- Legacy `volta which node` replaced with `mise which node`
- IIS support (`web.config`) not included (can be added later if needed)
