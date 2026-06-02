# @simplysm/capacitor-plugin-auto-update

Android 앱(Capacitor)에서 APK 설치 및 자동 업데이트를 수행하는 플러그인. APK 설치 인텐트 실행·설치 권한 관리·서버/외부저장소 기반 최신 버전 감지 후 다운로드·설치 흐름을 제공. 모든 공개 심볼은 `static` 멤버만 가진 abstract 클래스이거나 타입이므로 인스턴스 생성 없이 클래스명으로 직접 호출.

## 사용 트리거 인덱스

- **AutoUpdate** — 앱 시작 시 최신 버전을 감지해 APK 를 받아 설치하는 전체 자동 업데이트 흐름을 돌릴 때. 서버 조회 방식(`run`)과 외부 저장소 디렉토리 방식(`runByExternalStorage`).
- **ApkInstaller** — 자동 업데이트 흐름을 직접 구성할 때 쓰는 저수준 API. 설치 권한 확인·요청, APK 설치 인텐트 실행, 현재 앱 버전 조회.
- **ApkInstallerPlugin / VersionInfo** — Capacitor 네이티브 브리지 인터페이스 타입과 버전 정보 형태. 플러그인을 직접 등록·구현하거나 반환 타입을 참조할 때.

## AutoUpdate

`abstract class AutoUpdate` — 정적 메서드만 가진 고수준 오케스트레이터. 두 진입점 모두 내부에서 Android 여부 확인 → 설치 권한 확인/요청 → 버전 비교 → 다운로드/설치 → 무한 freeze 까지 일괄 처리. 도중 발생한 모든 예외를 잡아 `log` 로 표시한 뒤 `_freezeApp()`(영원히 resolve 되지 않는 무한 대기)으로 진입함. Android 가 아니면(`navigator.userAgent` 에 "android" 없음) `"Android만 지원됩니다."` throw. 버전 비교는 `semver.gt` 로 대상 버전이 현재보다 클 때만 진행.

```ts
static run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>
static runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>
```

- `run` — 서버 `AutoUpdate` 서비스에서 최신 버전을 조회해 업데이트. 서버 연동 배포일 때 사용.
  - `log: (messageHtml: string) => void` — 진행/오류 상태를 HTML 문자열로 전달받는 콜백. "최신 버전 확인 중...", "권한 확인 중...", 다운로드 진행률 `(NN.NN%)`, 권한 활성화/재시도 버튼 HTML, 오류 메시지 등이 인자로 들어옴. 화면에 그대로 innerHTML 로 렌더하는 용도.
  - `serviceClient: ServiceClient` — `@simplysm/service-client` 의 서비스 클라이언트. 내부에서 `getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 로 최신 버전·다운로드 경로를 조회하고, `serviceClient.hostUrl + downloadPath` 로 `fetchUrlBytes` 다운로드. 받은 바이트는 `appCache` 저장소의 `latest.apk` 로 써서 설치. 서버 버전 정보 없으면 무동작 반환.
- `runByExternalStorage` — 외부 저장소의 지정 디렉토리에서 APK 파일들을 스캔해 업데이트. 서버 없이 외부 저장소로 사이드로딩 배포할 때 사용.
  - `log: (messageHtml: string) => void` — `run` 과 동일한 진행/오류 상태 콜백.
  - `dirPath: string` — 외부 저장소(`FileSystem.getStoragePath("external")`) 기준 상대 디렉토리 경로. 이 폴더의 비-디렉토리 항목 중 확장자가 `.apk` 이고 파일명(확장자 제외)이 `[0-9.]` 로만 이뤄진 것을 버전으로 보고 `semver.maxSatisfying(..., "*")` 로 최신을 선정. 파일 없거나 유효 semver 없으면 반환. 설치 파일은 `<dirPath>/<version>.apk`.

```ts
// 앱 부트스트랩에서
await AutoUpdate.run({ log: (h) => (statusEl.innerHTML = h), serviceClient });
await AutoUpdate.runByExternalStorage({ log: (h) => (statusEl.innerHTML = h), dirPath: "myapp-apks" });
```

주의: 업데이트가 없으면 그냥 반환하지만, 업데이트를 진행하거나 오류가 나면 `_freezeApp()` 으로 영원히 resolve 되지 않음 — 호출 후속 코드에 의존하지 말 것. 권한 미승인 시 설정 화면으로 보낸 뒤 최대 5분(1초 간격 폴링) 동안 권한 부여를 대기. APK manifest 에 `REQUEST_INSTALL_PACKAGES` 가 없거나(`manifest:false`) 권한 확인 자체가 실패하면 "APK 파일을 다시 다운로드하여 설치해야 합니다(코드)" 안내(다운로드 링크 버튼 포함)와 함께 throw.

## ApkInstaller

`abstract class ApkInstaller` — 정적 메서드만 가진 저수준 설치 래퍼. Android 는 네이티브 인텐트/권한을 다루고, 브라우저(web)는 `ApkInstallerWeb` 가 대체 구현(설치 시 알림 표시 후 정상 반환, 권한은 항상 `granted:true`/`manifest:true`). `AutoUpdate` 가 내부적으로 사용하며, 자동 업데이트 UX 를 직접 구성할 때 사용.

```ts
static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>
static requestPermissions(): Promise<void>
static install(apkUri: string): Promise<void>
static getVersionInfo(): Promise<VersionInfo>
```

- `checkPermissions()` — 설치 권한 상태 조회. 설치 시도 전 사전 점검에 사용.
  - `granted: boolean` — `REQUEST_INSTALL_PACKAGES` 설치 권한이 사용자에게 승인되었는지. false 면 `requestPermissions` 로 유도해야 함.
  - `manifest: boolean` — 해당 권한이 앱 manifest 에 선언되어 있는지. false 면 권한 요청 자체가 불가하므로 APK 재설치가 필요한 상황.
- `requestPermissions()` — 권한 미승인 시 호출. 시스템 설정 화면으로 이동시키며 즉시 부여되진 않으므로 이후 `checkPermissions` 폴링이 필요.
- `install(apkUri)` — APK 설치 인텐트 실행.
  - `apkUri: string` — `content://` 형태의 FileProvider URI. 로컬 파일 경로가 아니라 `@simplysm/capacitor-plugin-file-system` 의 `FileSystem.getUri(filePath)` 로 변환한 content URI 를 넘겨야 함.
- `getVersionInfo()` — 현재 설치된 앱의 버전 정보(`VersionInfo`) 조회. 서버/외부 버전과 비교할 현재 버전 기준값. (web 구현은 `env("__VER__") ?? "0.0.0"` / `versionCode "0"` 반환.)

```ts
const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!granted) await ApkInstaller.requestPermissions();
const uri = await FileSystem.getUri(apkFilePath);
await ApkInstaller.install(uri);
```

## ApkInstallerPlugin / VersionInfo

Capacitor 네이티브 브리지 타입. `ApkInstaller` 의 정적 메서드는 `registerPlugin("ApkInstaller")` 로 등록된 이 인터페이스 구현체(네이티브 또는 `ApkInstallerWeb`)에 위임함. 일반적으로 직접 쓰지 않고 `ApkInstaller` 를 통해 접근하며, 타입 참조·웹 구현체 작성 시에만 사용.

```ts
interface VersionInfo { versionName: string; versionCode: string; }
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

- `VersionInfo.versionName: string` — 사람이 읽는 표시 버전(semver, 예 `"1.2.3"`). `AutoUpdate` 의 버전 비교(`semver.gt`)는 이 값을 semver 로 사용.
- `VersionInfo.versionCode: string` — Android 빌드 버전 코드의 문자열 표현. 표시·식별용.
- `ApkInstallerPlugin.install(options: { uri: string })` — content URI APK 설치. `uri` 는 `content://` FileProvider URI.
- `ApkInstallerPlugin.checkPermissions()` — 설치 권한 승인 여부(`granted`)와 manifest 선언 여부(`manifest`) 조회.
- `ApkInstallerPlugin.requestPermissions()` — 설치 권한 요청(설정 화면 이동).
- `ApkInstallerPlugin.getVersionInfo()` — 현재 앱 버전 정보(`VersionInfo`) 조회.
