# @simplysm/capacitor-plugin-auto-update

Android Capacitor 앱의 APK 자동 업데이트 플러그인 (서버 또는 외부 저장소 기반).

## 사용 트리거 인덱스

- **AutoUpdate** — 앱 부팅 시 최신 APK 확인·다운로드·설치 전 과정을 한 번에 실행할 때.
- **ApkInstaller** — APK 설치 권한 체크/요청, 임의 APK 파일 설치, 현재 앱 버전 조회 등 저수준 단위 동작이 필요할 때.
- **VersionInfo / ApkInstallerPlugin** — 위 두 API 호출 결과 타입을 참조할 때.

## AutoUpdate

`abstract class AutoUpdate` (static 메서드만). Android 전용. 호출 시 권한 확인 → 버전 비교 → 다운로드 → 설치 → 무한 대기(freeze)까지 자동 처리. 오류는 catch 후 `log` 로 메시지 노출 후 freeze.

```ts
AutoUpdate.run(opt: {
  log: (messageHtml: string) => void;
  serviceClient: ServiceClient;     // @simplysm/service-client
}): Promise<void>
```
서버의 `AutoUpdateService` 에 `getLastVersion("android")` 호출 → `{ version, downloadPath }` 수신 → `serviceClient.hostUrl + downloadPath` 에서 APK 다운로드 → `appCache/latest.apk` 로 저장 후 설치. 다운로드 진행률은 `log` 로 갱신.

```ts
AutoUpdate.runByExternalStorage(opt: {
  log: (messageHtml: string) => void;
  dirPath: string;                  // external 스토리지 기준 상대 경로
}): Promise<void>
```
외부 저장소 `external/<dirPath>` 폴더의 `<semver>.apk` 파일 중 가장 높은 버전을 골라 설치. 파일명이 semver 가 아니거나 없으면 조용히 반환.

공통:
- 현재 앱 버전(`ApkInstaller.getVersionInfo().versionName`) 보다 높은 버전만 설치.
- semver 유효성 실패 시 업데이트 스킵.
- 설치 권한이 없으면 설정 화면 이동 + "재시도" 버튼 HTML 을 `log` 로 표시하고 최대 5분 대기.
- 설치 후 `_freezeApp()` 으로 무한 대기 — 호출측에서 별도 후속 처리 불필요.
- `log` 인자에는 HTML 문자열이 전달됨 (innerHTML 로 렌더링하도록 구성할 것).

## ApkInstaller

`abstract class ApkInstaller` (static 메서드만). Capacitor 플러그인 `"ApkInstaller"` 래퍼. Web 환경에서는 알림만 표시 후 정상 반환.

```ts
ApkInstaller.checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>
```
`granted` = REQUEST_INSTALL_PACKAGES 승인 여부, `manifest` = AndroidManifest 에 권한 선언 여부. `manifest=false` 면 APK 재설치 필요.

```ts
ApkInstaller.requestPermissions(): Promise<void>
```
설정 화면으로 이동시켜 사용자에게 권한 요청. 사용자 응답을 await 하지 않으므로 호출측에서 polling 필요 (`checkPermissions` 반복).

```ts
ApkInstaller.install(apkUri: string): Promise<void>
```
`apkUri` 는 FileProvider 의 `content://` URI. `@simplysm/capacitor-plugin-file-system` 의 `FileSystem.getUri(path)` 로 변환해 전달.

```ts
ApkInstaller.getVersionInfo(): Promise<VersionInfo>
```
현재 설치된 앱 자체의 버전을 반환.

## 타입

```ts
interface VersionInfo {
  versionName: string;  // 예: "1.2.3"
  versionCode: string;
}

interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```
