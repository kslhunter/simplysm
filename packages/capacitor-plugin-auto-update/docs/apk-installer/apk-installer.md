# ApkInstaller

APK 설치 플러그인 정적 파사드 클래스. Android에서는 네이티브 플러그인을 실행하고, 브라우저 환경에서는 `ApkInstallerWeb`으로 폴백한다.

```typescript
export abstract class ApkInstaller {
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static async requestPermissions(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<VersionInfo>;
}
```

## Members

| Member | Kind | Parameters | Return | Description |
|--------|------|-----------|--------|-------------|
| `checkPermissions` | static method | 없음 | `Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 승인 여부(`granted`)와 AndroidManifest 선언 여부(`manifest`) 동시 확인. `manifest: false`이면 APK를 재설치해야 한다. |
| `requestPermissions` | static method | 없음 | `Promise<void>` | `REQUEST_INSTALL_PACKAGES` 권한 요청. 시스템 설정 화면으로 이동하므로 이후 `checkPermissions`로 결과를 폴링해야 한다. |
| `install` | static method | `apkUri: string` | `Promise<void>` | `content://` URI(FileProvider URI)로 APK 설치 인텐트 실행. `FileSystem.getUri(filePath)`로 URI를 얻는다. |
| `getVersionInfo` | static method | 없음 | `Promise<VersionInfo>` | 현재 설치된 앱의 버전 정보 조회. 브라우저 환경에서는 `env("__VER__") ?? "0.0.0"`을 `versionName`으로 반환한다. |

**브라우저 폴백 동작:**
- `install()` — `alert()` 메시지 표시 후 반환
- `checkPermissions()` — 항상 `{ granted: true, manifest: true }` 반환
- `requestPermissions()` — 무동작
- `getVersionInfo()` — `versionName: env("__VER__") ?? "0.0.0"`, `versionCode: "0"` 반환

## Related Types

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

| Method | Return | Description |
|--------|--------|-------------|
| `install(options: { uri: string })` | `Promise<void>` | `content://` URI(FileProvider URI)로 APK 설치 인텐트 실행 |
| `checkPermissions()` | `Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 승인 여부(`granted`)와 AndroidManifest 선언 여부(`manifest`) 동시 확인 |
| `requestPermissions()` | `Promise<void>` | `REQUEST_INSTALL_PACKAGES` 권한 요청 — 시스템 설정 화면으로 이동 |
| `getVersionInfo()` | `Promise<VersionInfo>` | PackageManager에서 현재 앱 버전 정보 조회 |

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

## Usage

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";
import { FileSystem } from "@simplysm/capacitor-plugin-file-system";

// 권한 확인
const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!manifest) {
  // AndroidManifest.xml에 REQUEST_INSTALL_PACKAGES 미선언 → APK 재설치 필요
  throw new Error("앱을 재설치해야 합니다.");
}
if (!granted) {
  await ApkInstaller.requestPermissions();
}

// 현재 버전 확인
const versionInfo = await ApkInstaller.getVersionInfo();
// versionInfo.versionName → "1.2.3"
// versionInfo.versionCode → "42"

// APK 설치 (filePath는 FileSystem으로 저장한 경로)
const apkUri = await FileSystem.getUri("/path/to/latest.apk");
await ApkInstaller.install(apkUri);
```
