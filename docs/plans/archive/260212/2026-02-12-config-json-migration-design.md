# `.config.json` Build-time Generation Migration

## Background

The legacy `sd-cli` (`SdServerBuildRunner`, `SdClientBuildRunner`) automatically generated `dist/.config.json` during builds from the `configs` field in the project config (`sd.config.ts`). This was used at runtime by `ServiceBase.getConfig()` to load configuration sections (orm, smtp, crypto, etc.).

The current `sd-cli` has migrated the **runtime** side (`ConfigManager`, `ServiceBase.getConfig()` in `service-server`), but the **build-time generation** was not migrated.

## Scope

Add `configs` field to server and client package config types, and generate `dist/.config.json` during build.

## Changes

### 1. Config Types (`packages/sd-cli/src/types/sd-config.types.ts`)

Add `configs` field to both:

```typescript
export interface SdServerPackageConfig {
  type: "server";
  // ... existing fields ...
  configs?: Record<string, any>;
}

export interface SdClientPackageConfig {
  type: "client";
  // ... existing fields ...
  configs?: Record<string, any>;
}
```

### 2. Server Worker (`packages/sd-cli/src/workers/server.worker.ts`)

- Add `configs` parameter to `build()` and `startWatch()`
- After build completes, write `dist/.config.json`:

```typescript
const confDistPath = path.resolve(pkgPath, "dist/.config.json");
fs.writeFileSync(confDistPath, JSON.stringify(configs ?? {}, undefined, 2));
```

- In watch mode, generate once at initial build

### 3. Client Worker (`packages/sd-cli/src/workers/client.worker.ts`)

- Same as server worker: add `configs` parameter and generate `dist/.config.json`

### 4. Build Orchestration (`packages/sd-cli/src/commands/build.ts`)

- Pass `configs` from package config to worker `build()` calls

### 5. Watch Orchestration (`packages/sd-cli/src/commands/watch.ts` or equivalent)

- Pass `configs` from package config to worker `startWatch()` calls

## Runtime Behavior (No Changes Needed)

- `ConfigManager` in `service-server` already reads `rootPath/.config.json`
- `ServiceBase.getConfig(section)` merges root + client configs
- Services (OrmService, SmtpService, CryptoService) access sections via `getConfig()`

## Files to Modify

| File | Change |
|------|--------|
| `sd-config.types.ts` | Add `configs` field to `SdServerPackageConfig`, `SdClientPackageConfig` |
| `server.worker.ts` | Add `configs` param, write `dist/.config.json` after build |
| `client.worker.ts` | Same as above |
| `build.ts` | Pass `configs` to worker calls |
| `watch.ts` (if applicable) | Pass `configs` to worker calls |
