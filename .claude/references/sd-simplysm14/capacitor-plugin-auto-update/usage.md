# @simplysm/capacitor-plugin-auto-update

Capacitor 자동 업데이트 플러그인. 서버 버전 비교 후 APK 다운로드/설치를 처리하며, 외부 저장소(USB 등)에서도 업데이트할 수 있다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

## API Overview

### APK 설치

| API | Type | Description |
|-----|------|-------------|
| `VersionInfo` | interface | 앱 버전 정보 (versionName, versionCode) |
| `ApkInstallerPlugin` | interface | Capacitor 네이티브 플러그인 인터페이스 |
| `ApkInstaller` | abstract class | APK 설치 플러그인 정적 파사드 |

### 자동 업데이트

| API | Type | Description |
|-----|------|-------------|
| `AutoUpdate` | abstract class | 자동 업데이트 오케스트레이터 (서버/외부 저장소) |

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
| `versionName` | `string` | 앱 버전 이름 (예: `"1.2.3"`) |
| `versionCode` | `string` | 앱 버전 코드 (정수 문자열) |

## `ApkInstallerPlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `ApkInstaller` 파사드를 통해 접근한다.

```typescript
export interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `install` | `(options: { uri: string }) => Promise<void>` | APK 설치 인텐트 실행 |
| `checkPermissions` | `() => Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 및 manifest 선언 여부 확인 |
| `requestPermissions` | `() => Promise<void>` | REQUEST_INSTALL_PACKAGES 권한 요청 |
| `getVersionInfo` | `() => Promise<VersionInfo>` | 앱 버전 정보 조회 |

## `ApkInstaller`

APK 설치 플러그인 정적 파사드 클래스. Android에서는 APK 설치 인텐트를 실행하고, 브라우저에서는 알림 메시지를 표시한다.

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
| `checkPermissions` | 없음 | `Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 승인 여부와 manifest 선언 여부 확인 |
| `requestPermissions` | 없음 | `Promise<void>` | REQUEST_INSTALL_PACKAGES 권한 요청 (설정 화면으로 이동) |
| `install` | `apkUri: string` (content:// URI) | `Promise<void>` | APK 설치 |
| `getVersionInfo` | 없음 | `Promise<VersionInfo>` | 앱 버전 정보 조회 |

## `AutoUpdate`

자동 업데이트 오케스트레이터. 서버 또는 외부 저장소에서 최신 APK를 확인하고 설치한다. 모든 메서드가 `static`이며, 인스턴스화하지 않는다.

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
| `run` | `opt: { log, serviceClient }` | 서버(`AutoUpdateService`)에서 버전 확인 후 APK 다운로드 및 설치. 업데이트 완료 후 앱을 무한 대기 상태로 전환하여 사용자가 재시작하도록 유도한다. |
| `runByExternalStorage` | `opt: { log, dirPath }` | 외부 저장소의 지정 디렉토리에서 `{version}.apk` 패턴의 최신 파일을 찾아 설치. semver 비교로 현재 버전보다 높은 경우에만 업데이트한다. |

`opt.log` 콜백은 HTML 문자열을 받아 사용자에게 진행 상황을 표시한다. 에러 발생 시에도 `log`를 통해 에러 메시지를 표시하고 앱을 무한 대기 상태로 전환한다.

## Usage Examples

### 서버 기반 자동 업데이트

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import type { ServiceClient } from "@simplysm/service-client";

// 앱 부트스트랩 시 호출
await AutoUpdate.run({
  log: (messageHtml) => {
    document.getElementById("status")!.innerHTML = messageHtml;
  },
  serviceClient: myServiceClient,
});
```

### 외부 저장소(USB) 기반 업데이트

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

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!manifest) {
  throw new Error("APK를 다시 다운로드하여 설치해야 합니다.");
}
if (!granted) {
  await ApkInstaller.requestPermissions();
}

const versionInfo = await ApkInstaller.getVersionInfo();
console.log(versionInfo.versionName); // "1.2.3"
```
