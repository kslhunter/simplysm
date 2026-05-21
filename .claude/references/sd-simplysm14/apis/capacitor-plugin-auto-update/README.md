# @simplysm/capacitor-plugin-auto-update

Android Capacitor 앱의 APK 자동 업데이트 흐름(버전 비교 → 다운로드 → 권한 확인 → 설치)과 APK 설치 네이티브 플러그인 래퍼.

## 사용 트리거 인덱스

- **`AutoUpdate`** — 앱 부팅 직후 서버 또는 외부 저장소에서 최신 APK 버전을 확인·다운로드·설치하는 전체 흐름을 한 번에 실행할 때.
- **`ApkInstaller`** — 자체 UI/흐름을 만들면서 APK 설치 권한·설치·현재 앱 버전 조회를 개별로 호출할 때.
- **`ApkInstallerPlugin`, `VersionInfo`** — Capacitor 플러그인 인터페이스 타입을 참조하거나 모킹할 때.

## `AutoUpdate`

```ts
abstract class AutoUpdate {
  static run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>;
  static runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>;
}
```

- `run` — `serviceClient.getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 호출 → semver 비교 후 더 큰 버전이면 `serviceClient.hostUrl + downloadPath` 에서 APK 다운로드 → `appCache/latest.apk` 저장 → 설치. 서버 기반 배포용.
- `runByExternalStorage` — `FileSystem.getStoragePath("external")` 하위 `dirPath` 폴더에서 파일명이 `^[0-9.]*$` 인 `.apk` 들을 후보로 모아 semver 최댓값을 골라 설치. 서버 없이 사이드로드 배포용.
- `opt.log` — 진행/오류를 HTML 문자열로 받는 콜백. 다운로드 버튼·재시도 버튼 등 HTML 마크업이 포함되므로 호출측이 innerHTML 로 렌더해야 함.
- `opt.serviceClient` — `@simplysm/service-client` 의 `ServiceClient` 연결 인스턴스. 서버에 `AutoUpdateService` 가 등록되어 있어야 함.
- `opt.dirPath` — external 저장소 루트 기준 상대 경로.

동작 주의:

- UA 가 android 가 아니면 throw.
- 현재 또는 비교 대상 버전이 invalid semver 이거나 서버에서 버전 정보를 못 받으면 silent return (로그만 남김).
- 권한 미부여 시 `ApkInstaller.requestPermissions()` 호출 후 1초 간격 최대 300회(5분) polling.
- manifest 에 `REQUEST_INSTALL_PACKAGES` 미선언이거나 권한 확인 자체가 실패하면 "APK 재다운로드/재설치" 안내를 throw — `run` 의 경우 다운로드 링크 버튼 HTML 을 메시지에 포함.
- try/catch 종료 후 항상 `_freezeApp()`(무한 await) — 정상 경로·에러 경로 모두 호출부의 후속 코드는 실행되지 않음 전제로 사용.

사용 예:

```ts
await AutoUpdate.run({ log: (h) => (document.body.innerHTML = h), serviceClient });
```

## `ApkInstaller`

```ts
abstract class ApkInstaller {
  static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static requestPermissions(): Promise<void>;
  static install(apkUri: string): Promise<void>;
  static getVersionInfo(): Promise<VersionInfo>;
}
```

- `checkPermissions` — `granted` 는 사용자의 `REQUEST_INSTALL_PACKAGES` 승인 여부, `manifest` 는 AndroidManifest 에 권한이 선언돼 있는지. `manifest=false` 면 APK 자체를 재빌드/재설치 해야 함.
- `requestPermissions` — 시스템 설정의 "알 수 없는 앱 설치" 화면으로 이동. 결과를 await 하지 않으므로 호출측에서 `checkPermissions` polling 필요.
- `install` — `apkUri` 는 `content://` FileProvider URI. `@simplysm/capacitor-plugin-file-system` 의 `FileSystem.getUri(path)` 로 변환해 넘김. 설치 인텐트 실행 후 즉시 반환 — 실제 설치 완료를 await 하지 않음.
- `getVersionInfo` — 현재 설치된 앱 자체의 `versionName`/`versionCode` 반환.
- 웹(비-android) 환경에서는 `ApkInstallerWeb` 폴백이 알림만 표시하고 정상 반환(no-op).

사용 예:

```ts
const { granted } = await ApkInstaller.checkPermissions();
if (!granted) await ApkInstaller.requestPermissions();
await ApkInstaller.install(await FileSystem.getUri(apkFilePath));
```

## `ApkInstallerPlugin`, `VersionInfo`

```ts
interface VersionInfo { versionName: string; versionCode: string }
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

- `VersionInfo.versionName` — `build.gradle` 의 versionName 문자열. `AutoUpdate` 가 semver 비교에 사용하므로 semver 형식 권장.
- `VersionInfo.versionCode` — versionCode 를 문자열로 반환(정수 증가값).
- `ApkInstallerPlugin` — `registerPlugin<ApkInstallerPlugin>("ApkInstaller", ...)` 의 타입 파라미터. 직접 호출하지 말고 `ApkInstaller` 정적 메서드 사용. 타입 참조/모킹 시에만 import.
