# PWA Configuration Types

## `SdPwaConfig`

PWA configuration.

```typescript
interface SdPwaConfig {
  manifest?: SdPwaManifestConfig;
  workbox?: SdPwaWorkboxConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `manifest` | `SdPwaManifestConfig` | PWA manifest options |
| `workbox` | `SdPwaWorkboxConfig` | Workbox service worker options |

## `SdPwaManifestConfig`

PWA manifest configuration (subset of VitePWA manifest options).

```typescript
interface SdPwaManifestConfig {
  name?: string;
  short_name?: string;
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src: string; sizes: string; type?: string }>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | App name |
| `short_name` | `string` | Short app name |
| `display` | `"standalone" \| "fullscreen" \| "minimal-ui" \| "browser"` | Display mode |
| `theme_color` | `string` | Theme color |
| `background_color` | `string` | Background color |
| `icons` | `Array<{ src: string; sizes: string; type?: string }>` | App icons |

## `SdPwaWorkboxConfig`

PWA workbox configuration.

```typescript
interface SdPwaWorkboxConfig {
  globPatterns?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `globPatterns` | `string[]` | Glob patterns for precaching |
