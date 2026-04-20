# @simplysm/capacitor-plugin-auto-update

심플리즘 패키지 - Capacitor 자동 업데이트 플러그인. 서버 버전 비교 후 APK 다운로드·설치를 처리하며, 외부 저장소(USB 등)에서도 업데이트할 수 있다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

피어 의존성으로 `@capacitor/core ^7`이 필요하다. Android 네이티브 플러그인이 포함되어 있으므로 `npx cap sync` 후 사용한다.

## API Overview

### APK 설치

| API | Type | Description |
|-----|------|-------------|
| `VersionInfo` | interface | 앱 버전 정보 (versionName, versionCode) |
| `ApkInstallerPlugin` | interface | Capacitor 네이티브 플러그인 인터페이스 (직접 사용하지 않음) |
| `ApkInstaller` | abstract class | APK 설치 플러그인 정적 파사드 — 권한 확인/요청, 설치, 버전 조회 |

### 자동 업데이트

| API | Type | Description |
|-----|------|-------------|
| `AutoUpdate` | abstract class | 자동 업데이트 오케스트레이터 — 서버 또는 외부 저장소에서 최신 APK를 확인하고 설치 |

---

## `VersionInfo`

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

## `ApkInstallerPlugin`

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

## `ApkInstaller`

APK 설치 플러그인 정적 파사드 클래스. Android에서는 네이티브 플러그인을 실행하고, 브라우저 환경에서는 `ApkInstallerWeb`으로 폴백한다. 브라우저 폴백: `install()`은 `alert()` 표시 후 반환, `checkPermissions()`는 항상 `{ granted: true, manifest: true }` 반환, `requestPermissions()`는 무동작, `getVersionInfo()`는 `env("__VER__") ?? "0.0.0"`을 `versionName`으로 반환.

```typescript
export abstract class ApkInstaller {
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static async requestPermissions(): Promise<void>;
  static async install(apkUri: string): Promise<void>;
  static async getVersionInfo(): Promise<VersionInfo>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `checkPermissions` | 없음 | `Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 승인 여부와 AndroidManifest 선언 여부 확인. `manifest: false`이면 APK를 재설치해야 한다. |
| `requestPermissions` | 없음 | `Promise<void>` | `REQUEST_INSTALL_PACKAGES` 권한 요청. 시스템 설정 화면으로 이동하므로 이후 `checkPermissions`로 결과를 폴링해야 한다. |
| `install` | `apkUri: string` | `Promise<void>` | `content://` URI(FileProvider URI)로 APK 설치. `FileSystem.getUri(filePath)`로 URI를 얻는다. |
| `getVersionInfo` | 없음 | `Promise<VersionInfo>` | 현재 설치된 앱의 버전 정보 조회. 브라우저 환경에서는 `env("__VER__") ?? "0.0.0"`을 `versionName`으로 반환한다. |

## `AutoUpdate`

자동 업데이트 오케스트레이터. 서버 또는 외부 저장소에서 최신 APK를 확인하고 설치한다. 모든 메서드가 `static`이며 인스턴스화하지 않는다. Android 환경 전용이며, 비-Android에서 호출하면 에러를 표시하고 앱을 무한 대기 상태로 전환한다.

```typescript
export abstract class AutoUpdate {
  static async run(opt: {
    log: (messageHtml: string) => void;
    serviceClient: ServiceClient;
  }): Promise<void>;

  static async runByExternalStorage(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }): Promise<void>;
}
```

| Method | Parameters | Description |
|--------|-----------|-------------|
| `run` | `opt.log: (messageHtml: string) => void`, `opt.serviceClient: ServiceClient` | `AutoUpdateService.getLastVersion("android")`로 서버에서 최신 버전 정보를 조회한 뒤, 현재 버전보다 높으면 APK를 다운로드하여 설치한다. 업데이트 후 `_freezeApp()`으로 앱을 무한 대기 상태로 전환한다. |
| `runByExternalStorage` | `opt.log: (messageHtml: string) => void`, `opt.dirPath: string` | 외부 저장소의 `opt.dirPath` 디렉토리에서 `{semver}.apk` 패턴 파일 중 최신 버전을 찾아 설치한다. 현재 버전보다 높은 경우에만 업데이트한다. |

**`opt.log` 콜백**: HTML 문자열을 받아 사용자에게 진행 상황을 표시한다. 버튼(`<button>`) 등 인터랙티브 HTML이 포함될 수 있다. 에러 발생 시에도 `log`로 에러 메시지를 표시한 뒤 `_freezeApp()`으로 전환한다.

**권한 처리**: 두 메서드 모두 내부적으로 `_checkPermission()`을 호출한다. `manifest: false`이면 재설치 에러를 throw하고, `granted: false`이면 권한 요청 후 최대 300초간 폴링한다.

**버전 비교**: `semver` 라이브러리를 사용한다. `versionName`이 유효한 semver 형식이 아니면 업데이트 확인을 건너뛴다.

## Usage Examples

### 서버 기반 자동 업데이트

앱 부트스트랩 시 `AutoUpdate.run()`을 호출한다. `AutoUpdateService`는 `@simplysm/service-common`의 서비스 인터페이스다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import type { ServiceClient } from "@simplysm/service-client";

async function checkForUpdate(serviceClient: ServiceClient) {
  const statusEl = document.getElementById("status")!;

  await AutoUpdate.run({
    log: (messageHtml) => {
      statusEl.innerHTML = messageHtml;
    },
    serviceClient,
  });

  // 업데이트가 없거나 업데이트가 완료되면(무한 대기 전환 전) 이 줄에 도달한다.
  statusEl.innerHTML = "";
}
```

### 외부 저장소(USB) 기반 업데이트

`opt.dirPath`는 외부 저장소 루트 기준 상대 경로다. 해당 경로에 `1.2.3.apk` 형식 파일이 있어야 한다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  dirPath: "updates/my-app",
});
```

### APK 설치 직접 제어

`AutoUpdate`를 사용하지 않고 `ApkInstaller`를 직접 제어하는 경우:

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
