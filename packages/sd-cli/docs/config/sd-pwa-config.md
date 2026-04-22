# SdPwaConfig

PWA(Progressive Web App) 설정. [`SdClientPackageConfig`](./sd-client-package-config.md)의 `pwa` 필드에 사용한다.

```typescript
export interface SdPwaConfig {
  manifest?: SdPwaManifestConfig;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `manifest` | `SdPwaManifestConfig?` | PWA manifest 설정 |

## Related Types

### `SdPwaManifestConfig`

PWA `manifest.json` 설정.

```typescript
export interface SdPwaManifestConfig {
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
| `name` | `string?` | 앱 이름 |
| `short_name` | `string?` | 앱 짧은 이름 |
| `display` | `"standalone" \| "fullscreen" \| "minimal-ui" \| "browser"?` | 디스플레이 모드 |
| `theme_color` | `string?` | 테마 색상 (hex 코드) |
| `background_color` | `string?` | 배경 색상 (hex 코드) |
| `icons` | `Array<{ src: string; sizes: string; type?: string }>?` | 아이콘 목록 |
