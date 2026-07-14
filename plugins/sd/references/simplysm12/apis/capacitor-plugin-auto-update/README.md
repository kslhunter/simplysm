# @simplysm/capacitor-plugin-auto-update

Android 앱의 APK 자동 업데이트(버전 확인 → 다운로드 → 설치 인텐트 실행)와 그 하부의 APK 설치/권한 제어를 제공하는 Capacitor 플러그인. 웹 환경에서는 설치/권한을 no-op 처리.

## 사용 트리거 인덱스

- **AutoUpdate** — Android 앱 시작 시 최신 버전을 확인하고, 신버전이면 APK를 받아 설치하도록 흐름을 구동할 때. 서버(`SdAutoUpdateService`) 기반과 외부저장소 기반 두 경로 제공.
- **ApkInstaller** — APK 설치 인텐트 실행, `REQUEST_INSTALL_PACKAGES` 권한 확인/요청, 현재 앱 버전 조회 같은 저수준 작업을 직접 다룰 때.
- **IApkInstallerPlugin / IVersionInfo** — 네이티브 플러그인(`ApkInstaller`)의 메서드 시그니처/버전정보 타입. 플러그인 직접 호출이나 웹 구현 작성 시 참조.

## AutoUpdate

`abstract class AutoUpdate` — 인스턴스화 없이 static 메서드만 사용. 두 진입점 모두 성공/실패와 무관하게 신버전 설치 흐름에 진입하면 무한 대기로 앱을 정지(`_freezeApp`)시켜 재시작/재설치를 유도함. `navigator.userAgent`에 `android`가 없으면 "안드로이드만 지원합니다." 예외.

### `static runAsync(opt: { log: (messageHtml: string) => void; serviceClient: SdServiceClient }): Promise<void>`

서버에서 최신 버전을 받아 업데이트하는 경로.

- `log: (messageHtml: string) => void` — 진행 상태 HTML 문자열을 받는 콜백. "최신버전 확인 중...", "권한 확인 중...", 다운로드 진행률(`(NN.NN%)`), 권한/설치 안내 버튼 HTML, 오류 메시지 등을 전달. UI에 그대로 렌더링하는 용도.
- `serviceClient: SdServiceClient` — 서버 통신 클라이언트. `getService<ISdAutoUpdateService>("SdAutoUpdateService")`로 `getLastVersion("android")` 호출해 `{ version, downloadPath }`를 얻고, `serviceClient.hostUrl + downloadPath`로 APK를 다운로드.
- 동작: 최신 버전 정보 없으면 콘솔 로그 후 그냥 반환(업데이트 안 함). `process.env["SD_VERSION"]`이 서버 버전과 같으면 반환(이미 최신). 다르면 `NetUtils.downloadBufferAsync`로 내려받아 `FileSystem.getStoragePathAsync("appCache")` 아래 `latest.apk`로 저장 후 설치 인텐트 실행.
- 권한 누락 시: Manifest에 `REQUEST_INSTALL_PACKAGES` 미선언이면 "APK파일을 다시 다운로드 받아, 설치해야 합니다(코드)" 예외에 다운로드 버튼(`intent://...#Intent;scheme=http;end`) 포함(코드 1=미선언, 2=확인 중 예외). 권한 미허용이면 설정 화면으로 `requestPermission` 후 허용될 때까지 1초 간격 폴링.

### `static runByExternalStorageAsync(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>`

외부저장소 디렉토리의 APK 파일들 중 최신 버전을 골라 설치하는 경로(서버 없이).

- `log: (messageHtml: string) => void` — 위와 동일한 진행 상태 콜백.
- `dirPath: string` — 외부저장소(`FileSystem.getStoragePathAsync("external")`) 기준 상대 디렉토리 경로. 이 디렉토리를 `readdir`하여 `.apk` 확장자이며 파일명(확장자 제외)이 `/^[0-9.]*$/`(숫자·점만)인 파일을 버전으로 인식.
- 동작: 후보가 없으면 반환. `semver.maxSatisfying(versions, "*")`로 최신 버전 선택. `process.env["SD_VERSION"]`과 같으면 반환(이미 최신). 다르면 `<dirPath>/<version>.apk`를 설치 인텐트로 실행. `runAsync`와 달리 권한 확인을 먼저 수행하고, 다운로드 버튼용 `targetHref`는 전달하지 않음.

## ApkInstaller

`abstract class ApkInstaller` — static 메서드만 사용. 네이티브 `ApkInstaller` 플러그인 래퍼이며, 웹에서는 `ApkInstallerWeb`로 폴백(설치는 alert 안내, 권한 체크는 항상 허용/선언으로 통과).

- `static hasPermissionManifest(): Promise<boolean>` — AndroidManifest에 `REQUEST_INSTALL_PACKAGES` 권한이 선언돼 있는지. 플러그인의 `{ declared }`를 그대로 반환. 미선언이면 권한 요청 자체가 불가하므로 재설치가 필요한 상황 판별에 사용. 웹은 항상 `true`.
- `static hasPermission(): Promise<boolean>` — `REQUEST_INSTALL_PACKAGES` 권한이 현재 허용돼 있는지(`{ granted }`). 설치 전 사전 확인용. 웹은 항상 `true`.
- `static requestPermission(): Promise<void>` — 권한 요청. 안드로이드에서는 설정 화면으로 이동(즉시 결과를 반환하지 않으므로 호출 후 `hasPermission` 폴링 필요). 웹은 no-op.
- `static install(apkUri: string): Promise<void>` — APK 설치 인텐트 실행. `apkUri`는 `content://` 형태의 FileProvider URI(예: `FileSystem.getFileUriAsync(path)` 결과). 웹은 alert로 미지원 안내.
- `static getVersionInfo(): Promise<IVersionInfo>` — 현재 설치된 앱의 버전 정보 조회. 웹은 `{ versionName: process.env["SD_VERSION"] ?? "0.0.0", versionCode: "0" }`.

## IApkInstallerPlugin / IVersionInfo

네이티브 플러그인 계약 타입. `ApkInstaller`가 내부적으로 이 인터페이스로 등록(`registerPlugin<IApkInstallerPlugin>("ApkInstaller", ...)`)되며, 보통 `ApkInstaller` static 래퍼를 쓰면 되고 직접 다룰 일은 적다.

- `interface IVersionInfo { versionName: string; versionCode: string }` — `versionName`은 표시용 버전 문자열, `versionCode`는 정수 빌드 번호(문자열로 전달).
- `interface IApkInstallerPlugin`
  - `install(options: { uri: string }): Promise<void>` — `uri`는 설치할 APK의 content URI.
  - `hasPermission(): Promise<{ granted: boolean }>` — `granted`: 설치 권한 허용 여부.
  - `requestPermission(): Promise<void>` — 권한 요청(설정 화면 이동).
  - `hasPermissionManifest(): Promise<{ declared: boolean }>` — `declared`: Manifest 권한 선언 여부.
  - `getVersionInfo(): Promise<IVersionInfo>` — 앱 버전 정보 반환.
