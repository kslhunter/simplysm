# @simplysm/capacitor-plugin-auto-update

Simplysm Package - Capacitor Auto Update Plugin

## Installation

pnpm add @simplysm/capacitor-plugin-auto-update

**Peer Dependencies:** `@capacitor/core ^7.4.4`

## Source Index

### APK Installer

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/ApkInstaller.ts` | `ApkInstaller` | Static class to check/request install permission and trigger APK installation | - |
| `src/IApkInstallerPlugin.ts` | `IVersionInfo`, `IApkInstallerPlugin` | Interfaces for app version info and the native APK installer plugin contract | - |

### Auto Update

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/AutoUpdate.ts` | `AutoUpdate` | Downloads and installs the latest APK from a server or external storage | - |

## License

Apache-2.0
