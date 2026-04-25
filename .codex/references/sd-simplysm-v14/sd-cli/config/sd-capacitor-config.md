# `SdCapacitorConfig`

> **읽어야 하는 상황**: 클라이언트 패키지에 Capacitor 모바일 앱(Android) 설정을 추가할 때. Electron 데스크톱 앱은 [`SdElectronConfig`](.$sd-electron-config.md) 참조.

Capacitor 모바일 앱 설정. [`SdClientPackageConfig`](.$sd-client-package-config.md)의 `capacitor` 필드에 사용한다.

```typescript
export interface SdCapacitorConfig {
  appId: string;
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;
  debug?: boolean;
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | 앱 ID (예: `"com.example.app"`) |
| `appName` | `string` | 앱 이름 |
| `plugins` | `Record<string, Record<string, unknown> \| true>?` | Capacitor 플러그인 설정. key: 패키지명, value: `true` 또는 플러그인 옵션 객체 |
| `icon` | `string?` | 앱 아이콘 경로 (패키지 디렉토리 기준 상대 경로) |
| `debug` | `boolean?` | 디버그 빌드 플래그 |
| `platform` | `{ android?: SdCapacitorAndroidConfig }?` | 플랫폼별 설정 |

## Related Types

### `SdCapacitorAndroidConfig`

Capacitor Android 플랫폼 설정.

```typescript
export interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;
  bundle?: boolean;
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;
  permissions?: SdCapacitorPermission[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `config` | `Record<string, string>?` | AndroidManifest.xml `application` 태그 속성 (예: `{ requestLegacyExternalStorage: "true" }`) |
| `bundle` | `boolean?` | AAB 번들 빌드 플래그. `false`이면 APK |
| `intentFilters` | `SdCapacitorIntentFilter[]?` | Intent Filter 설정 |
| `sign` | `SdCapacitorSignConfig?` | APK/AAB 서명 설정 |
| `sdkVersion` | `number?` | Android SDK 버전 (minSdk, targetSdk에 동시 적용) |
| `permissions` | `SdCapacitorPermission[]?` | 추가 권한 설정 |

### `SdCapacitorSignConfig`

Android APK/AAB 서명 설정.

```typescript
export interface SdCapacitorSignConfig {
  keystore: string;
  storePassword: string;
  alias: string;
  password: string;
  keystoreType?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `keystore` | `string` | keystore 파일 경로 (패키지 디렉토리 기준 상대 경로) |
| `storePassword` | `string` | keystore 비밀번호 |
| `alias` | `string` | 키 별칭 |
| `password` | `string` | 키 비밀번호 |
| `keystoreType` | `string?` | keystore 타입 (기본값: `"jks"`) |

### `SdCapacitorPermission`

Android 권한 설정.

```typescript
export interface SdCapacitorPermission {
  name: string;
  maxSdkVersion?: number;
  ignore?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 권한 이름 (예: `"CAMERA"`, `"WRITE_EXTERNAL_STORAGE"`) |
| `maxSdkVersion` | `number?` | 이 권한을 적용할 최대 SDK 버전 |
| `ignore` | `string?` | `tools:ignore` 속성 값 |

### `SdCapacitorIntentFilter`

Android Intent Filter 설정.

```typescript
export interface SdCapacitorIntentFilter {
  action?: string;
  category?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string?` | intent 액션 (예: `"android.intent.action.VIEW"`) |
| `category` | `string?` | intent 카테고리 (예: `"android.intent.category.DEFAULT"`) |
