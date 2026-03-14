# @simplysm/capacitor-plugin-auto-update

Capacitor 앱 자동 업데이트 플러그인. 서버에서 최신 APK를 확인하고 다운로드/설치하거나, 외부 스토리지의 APK 파일로 업데이트한다.

## 설치

```bash
npm install @simplysm/capacitor-plugin-auto-update
```

**의존성:** `@simplysm/service-client`, `@simplysm/service-common`, `@simplysm/capacitor-plugin-file-system`, `@simplysm/core-common`, `@simplysm/core-browser`, `semver`
**Peer:** `@capacitor/core` ^7.4.4

## Export 목록

```typescript
// index.ts
export { ApkInstaller } from "./ApkInstaller";
export { AutoUpdate } from "./AutoUpdate";
export type { ApkInstallerPlugin, VersionInfo } from "./ApkInstallerPlugin";
```

## 주요 사용법

### 서버 기반 자동 업데이트

서버의 `AutoUpdateService`를 통해 최신 버전을 확인하고 APK를 다운로드/설치한다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import type { ServiceClient } from "@simplysm/service-client";

await AutoUpdate.run({
  serviceClient, // ServiceClient 인스턴스
  log: (messageHtml) => {
    // 진행 상태를 HTML로 표시 (에러, 다운로드 진행률 등)
  },
});
```

동작 흐름:
1. 서버에서 최신 버전 조회 (`AutoUpdateService.getLastVersion("android")`)
2. `REQUEST_INSTALL_PACKAGES` 권한 확인/요청 (매니페스트 미선언 시 재설치 유도)
3. 현재 앱 버전과 semver 비교 (최신이면 조기 반환)
4. APK 다운로드 (`fetchUrlBytes`, 진행률 콜백)
5. `appCache` 경로에 `latest.apk`로 저장
6. APK 설치 인텐트 실행 후 앱 정지 (`await new Promise(() => {})`)

서버 서비스 인터페이스 (`@simplysm/service-common`):
```typescript
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}
```

### 외부 스토리지 기반 업데이트

USB 또는 SD카드 등 외부 스토리지의 APK 파일로 업데이트한다. 파일명이 semver 형식이어야 한다 (예: `1.2.3.apk`).

```typescript
await AutoUpdate.runByExternalStorage({
  dirPath: "updates", // 외부 스토리지 루트 기준 상대 경로
  log: (messageHtml) => {
    // 진행 상태 HTML 표시
  },
});
```

동작 흐름:
1. `REQUEST_INSTALL_PACKAGES` 권한 확인/요청
2. 외부 스토리지의 `dirPath`에서 `.apk` 파일 목록 조회
3. 파일명(`1.2.3.apk` -> `1.2.3`)을 semver로 파싱하여 최신 버전 선택
4. 현재 앱 버전과 비교 후 설치

### APK 설치 (저수준 API)

`ApkInstaller`는 `AutoUpdate` 내부에서 사용되지만, 직접 호출도 가능하다.

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

// 권한 확인 (granted: 설치 허용됨, manifest: 매니페스트에 권한 선언됨)
const perms = await ApkInstaller.checkPermissions();
// { granted: boolean; manifest: boolean }

// 권한 요청 (Android 8+: 설정 화면으로 이동)
await ApkInstaller.requestPermissions();

// APK 설치 (content:// URI 필요, FileProvider URI)
await ApkInstaller.install(apkUri);

// 앱 버전 정보 조회
const info = await ApkInstaller.getVersionInfo();
// { versionName: "1.0.0", versionCode: "1" }
```

## API 레퍼런스

### `AutoUpdate` (abstract class, static 메서드)

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `run` | `(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }) => Promise<void>` | 서버 기반 자동 업데이트 |
| `runByExternalStorage` | `(opt: { log: (messageHtml: string) => void; dirPath: string }) => Promise<void>` | 외부 스토리지 기반 업데이트 |

### `ApkInstaller` (abstract class, static 메서드)

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `checkPermissions` | `() => Promise<{ granted: boolean; manifest: boolean }>` | 설치 권한 확인 |
| `requestPermissions` | `() => Promise<void>` | 설치 권한 요청 |
| `install` | `(apkUri: string) => Promise<void>` | APK 설치 (content:// URI) |
| `getVersionInfo` | `() => Promise<VersionInfo>` | 앱 버전 정보 조회 |

### `VersionInfo` (interface)

```typescript
interface VersionInfo {
  versionName: string; // semver 문자열 (예: "1.0.0")
  versionCode: string; // 빌드 번호 문자열
}
```

## 플랫폼 지원

| 기능 | Android | Web |
|------|---------|-----|
| APK 설치 | FileProvider URI + ACTION_VIEW 인텐트 | alert 표시 후 정상 반환 |
| 버전 확인 | PackageManager API | `import.meta.env.__VER__` (기본값 `"0.0.0"`) |
| 권한 관리 | REQUEST_INSTALL_PACKAGES (Android 8+) | 항상 granted/manifest = true |
| 권한 설정 이동 | ACTION_MANAGE_UNKNOWN_APP_SOURCES | no-op |

## Android 네이티브 구현

- **패키지:** `kr.co.simplysm.capacitor.apkinstaller`
- **플러그인명:** `ApkInstaller`
- `install`: `ACTION_VIEW` 인텐트로 APK 설치 (`FLAG_GRANT_READ_URI_PERMISSION`)
- `checkPermissions`: `canRequestPackageInstalls()` (Android 8+) + 매니페스트 검사
- `requestPermissions`: `ACTION_MANAGE_UNKNOWN_APP_SOURCES` 설정 화면 이동
- `getVersionInfo`: `PackageManager.getPackageInfo`로 versionName/versionCode 조회
