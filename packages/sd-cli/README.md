# @simplysm/sd-cli

CLI tool for the Simplysm framework. Provides project initialization, lint, typecheck, watch, dev server, build, publish, and device commands. Also exports configuration types and Vite utilities for use in `sd.config.ts` and `vite.config.ts` files.

## Installation

```
pnpm add @simplysm/sd-cli
```

## Usage

```
npx sd-cli <command> [options]
```

Commands: `init`, `add client`, `add server`, `lint`, `typecheck`, `check`, `watch`, `dev`, `build`, `publish`, `replace-deps`, `device`

## Source Index

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/sd-config.types.ts` | `BuildTarget`, `SdConfig`, `SdConfigFn`, `SdConfigParams`, `SdPackageConfig`, `SdBuildPackageConfig`, `SdClientPackageConfig`, `SdServerPackageConfig`, `SdScriptsPackageConfig`, `SdPublishConfig`, `SdLocalDirectoryPublishConfig`, `SdStoragePublishConfig`, `SdPostPublishScriptConfig`, `SdCapacitorConfig`, `SdCapacitorAndroidConfig`, `SdCapacitorSignConfig`, `SdCapacitorPermission`, `SdCapacitorIntentFilter`, `SdElectronConfig` | All TypeScript types for `sd.config.ts` (packages, publish, Capacitor, Electron) | - |
| `src/utils/vite-config.ts` | `ViteConfigOptions`, `createViteConfig` | Generates a Vite config for SolidJS + Tailwind CSS client packages | - |

## License

Apache-2.0
