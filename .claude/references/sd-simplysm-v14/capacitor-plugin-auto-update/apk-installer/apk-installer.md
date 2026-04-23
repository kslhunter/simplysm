# `ApkInstaller`

APK 설치 플러그인 정적 파사드 클래스. Android에서 APK 설치 권한 확인·요청, APK 설치 인텐트 실행, 앱 버전 정보 조회를 제공한다.

## When to use

- ✅ `AutoUpdate`를 사용하지 않고 APK 설치 흐름을 직접 제어할 때
- ✅ 앱의 현재 버전 정보(`versionName`, `versionCode`)를 조회할 때
- ❌ 서버 또는 외부 저장소에서 자동 업데이트 → [`AutoUpdate`](../auto-update/auto-update.md) — 버전 비교·다운로드·설치를 모두 처리한다

## Signature

```typescript
export abstract class ApkInstaller {
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static async requestPermissions(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<VersionInfo>;
}
```

## Members

| Member | Kind | Return | Description |
|--------|------|--------|-------------|
| `checkPermissions` | static method | `Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 승인 여부(`granted`)와 AndroidManifest 선언 여부(`manifest`) 동시 확인. `manifest: false`이면 APK를 재설치해야 한다. |
| `requestPermissions` | static method | `Promise<void>` | `REQUEST_INSTALL_PACKAGES` 권한 요청. 시스템 설정 화면으로 이동하므로 이후 `checkPermissions`로 결과를 폴링해야 한다. |
| `install` | static method | `Promise<void>` | `content://` URI(FileProvider URI)로 APK 설치 인텐트 실행. `FileSystem.getUri(filePath)`로 URI를 얻는다. |
| `getVersionInfo` | static method | `Promise<VersionInfo>` | 현재 설치된 앱의 버전 정보 조회. 브라우저 환경에서는 `env("__VER__") ?? "0.0.0"`을 `versionName`으로 반환한다. |

**브라우저 폴백 동작:**
- `install()` — `alert()` 메시지 표시 후 반환
- `checkPermissions()` — 항상 `{ granted: true, manifest: true }` 반환
- `requestPermissions()` — 무동작
- `getVersionInfo()` — `versionName: env("__VER__") ?? "0.0.0"`, `versionCode: "0"` 반환

## Usage

### 최소 예제

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

const versionInfo = await ApkInstaller.getVersionInfo();
// versionInfo.versionName → "1.2.3"
// versionInfo.versionCode → "42"
```

### 전형 예제

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// 1. 권한 확인
const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!manifest) {
  // AndroidManifest.xml에 REQUEST_INSTALL_PACKAGES 미선언 → APK 재설치 필요
  throw new Error("앱을 재설치해야 합니다.");
}
if (!granted) {
  await ApkInstaller.requestPermissions();
  // 시스템 설정 화면으로 이동하므로, 복귀 후 다시 checkPermissions()로 확인해야 한다
}

// 2. APK 설치 (filePath는 FileSystem으로 저장한 경로)
const apkUri = await FileSystem.getUri("/path/to/latest.apk");
await ApkInstaller.install(apkUri);
```

## 🚫 Anti-patterns

### `install()`에 파일 경로를 직접 전달

```typescript
// ❌ 파일 시스템 경로를 직접 전달
await ApkInstaller.install("/path/to/latest.apk");

// ✅ FileSystem.getUri()로 content:// URI를 얻어서 전달
const uri = await FileSystem.getUri("/path/to/latest.apk");
await ApkInstaller.install(uri);
```

**근거**: Android에서 APK 설치 인텐트는 `content://` URI(FileProvider)를 요구한다. 파일 경로를 직접 전달하면 보안 예외가 발생한다.

## Related Types

### `VersionInfo`

앱 버전 정보를 나타내는 인터페이스.

```typescript
export interface VersionInfo {
  versionName: string;
  versionCode: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `versionName` | `string` | 앱 버전 이름. semver 형식 (예: `"1.2.3"`). `AutoUpdate`의 버전 비교에 사용된다. |
| `versionCode` | `string` | 앱 버전 코드. 정수를 문자열로 표현 (예: `"42"`). |

### `ApkInstallerPlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `ApkInstaller` 파사드를 통해 접근한다. 타입 참조 목적으로만 export된다.

```typescript
export interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```
