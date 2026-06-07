# @simplysm/capacitor-plugin-auto-update

Android APK 자동 업데이트 Capacitor 플러그인. 부팅 시 서버 또는 외부 저장소의 최신 APK 를 받아 설치하는 오케스트레이터(`AutoUpdate`)와, APK 설치·설치 권한·앱 버전 조회를 다루는 저수준 정적 클래스(`ApkInstaller`)·타입을 제공. 공개 심볼은 모두 `static` 멤버만 가진 abstract 클래스이거나 인터페이스라 인스턴스 없이 클래스명으로 직접 호출. 비-Android(웹)에서는 폴백 구현으로 설치는 no-op, 권한은 항상 통과.

## 사용 트리거 인덱스

- **AutoUpdate** — 앱 부팅 시점에 "최신 확인 → 권한 → 다운로드 → 설치 → 앱 멈춤" 까지 한 번에 도는 진입점. 서버(`ServiceClient`) 연동 업데이트면 `run`, USB/외장 저장소 폴더에서 가져오면 `runByExternalStorage`.
- **ApkInstaller** — `AutoUpdate` 를 거치지 않고 설치 권한 확인/요청, 특정 APK 설치, 현재 앱 버전 직접 조회가 필요할 때 쓰는 저수준 정적 클래스.
- **ApkInstallerPlugin / VersionInfo** — Capacitor 네이티브 브리지 인터페이스와 버전 정보 형태. `ApkInstaller` 가 감싸므로 직접 호출보다는 반환 타입 참조용.

## AutoUpdate

`abstract class AutoUpdate` — 정적 메서드만 가진 부트 시 업데이트 오케스트레이터. 두 진입점 모두 Android 여부 확인 → 설치 권한 확인/요청 → 버전 비교 → 다운로드/설치 → 무한 freeze 순으로 일괄 처리. 진행 단계는 `log` 콜백으로 HTML 문자열을 흘려보내고, 도중 발생한 모든 예외를 잡아 `log` 로 오류 메시지를 표시한 뒤 영원히 resolve 되지 않는 무한 대기로 진입해 구버전 실행을 막음.

```typescript
static run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>
static runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>
```

- opt.log: (messageHtml: string) => void — 진행/오류 상태를 HTML 문자열로 받는 콜백. 매 단계마다 여러 번 호출되며 `"최신 버전 확인 중..."`, `"권한 확인 중..."`, 다운로드 진행률 `(NN.NN%)`, 권한 활성화·재시도 버튼 HTML, 오류 메시지 등이 인자로 들어옴. 부팅 스플래시 등에 그대로 `innerHTML` 로 렌더하는 용도 — 재시도/다운로드 버튼이 HTML 이므로 텍스트가 아닌 HTML 로 렌더해야 동작.
- opt.serviceClient: ServiceClient (`run` 전용) — `@simplysm/service-client` 의 서비스 클라이언트. 내부에서 `getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 로 최신 버전·다운로드 경로를 조회하고 `serviceClient.hostUrl + downloadPath` 로 `fetchUrlBytes` 다운로드. 서버 연동 배포일 때 사용.
- opt.dirPath: string (`runByExternalStorage` 전용) — `external` 저장소(`FileSystem.getStoragePath("external")`) 루트 기준 상대 디렉토리 경로. 이 폴더의 비-디렉토리 항목 중 확장자가 `.apk` 이고 파일명(확장자 제외)이 `^[0-9.]*$`(숫자·점) 인 것을 버전으로 보고 `semver.maxSatisfying(..., "*")` 로 최신을 선정. 서버 없이 USB/SD 등으로 사이드로딩 배포할 때 사용.

동작 차이: `run` 은 다운로드한 바이트를 `appCache` 저장소의 `latest.apk` 로 써서 설치하고, `runByExternalStorage` 는 외부 저장소의 `<dirPath>/<version>.apk` 를 직접 설치 대상으로 삼음. 두 경로 모두 현재 버전(`ApkInstaller.getVersionInfo().versionName`)과 비교해 `semver.gt(최신, 현재)` 가 아니면(이미 최신·동일·낮음) 반환하고, 어느 한쪽이라도 유효한 semver 가 아니면 업데이트 확인을 건너뜀.

```typescript
// 앱 부트스트랩에서 (서버 기반)
await AutoUpdate.run({ log: (h) => (statusEl.innerHTML = h), serviceClient });
// 또는 오프라인 배포 폴더 기준
await AutoUpdate.runByExternalStorage({ log: (h) => (statusEl.innerHTML = h), dirPath: "myapp-apks" });
```

주의사항:

- 업데이트가 없거나 이미 최신이면 그냥 반환(freeze 안 함)하므로 후속 정상 부트로 이어가면 됨. 반대로 설치를 진행하거나 오류가 나면 무한 대기로 들어가 영원히 resolve 되지 않으니 호출 후속 코드에 의존하지 말 것 — 후속 코드는 "업데이트 없음" 경로에서만 실행됨.
- Android 외 환경(`navigator.userAgent` 에 "android" 없음)이면 `"Android만 지원됩니다."` throw → catch 에서 표시 후 freeze.
- 권한 미승인 시 설정 화면으로 보낸 뒤 최대 5분(1초 간격 300회) 동안 권한 부여를 폴링 대기.
- manifest 에 `REQUEST_INSTALL_PACKAGES` 가 없거나(`manifest:false`) 권한 확인 자체가 실패하면 "APK 파일을 다시 다운로드하여 설치해야 합니다(코드)." 안내(코드 1·2, `run` 은 다운로드 링크 버튼 포함)와 함께 throw.

## ApkInstaller

`abstract class ApkInstaller` — APK 설치 관련 네이티브 호출을 감싼 저수준 정적 클래스. Android 는 실제 인텐트/권한을 다루고, 브라우저(web)는 폴백 구현(설치 시 미지원 alert 후 정상 반환, 권한은 항상 `granted:true`/`manifest:true`, 버전은 `__VER__` env 또는 `0.0.0`). `AutoUpdate` 가 내부에서 쓰며, 자동 업데이트 UX 를 직접 구성하거나 권한·설치만 단독으로 다룰 때 직접 호출.

```typescript
static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>
static requestPermissions(): Promise<void>
static install(apkUri: string): Promise<void>
static getVersionInfo(): Promise<VersionInfo>
```

- checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> — 설치 권한 상태 조회. `granted` = `REQUEST_INSTALL_PACKAGES` 권한이 사용자에게 승인되었는지(false 면 `requestPermissions` 로 유도), `manifest` = 해당 권한이 앱 manifest 에 선언되어 있는지(false 면 권한 요청 자체가 불가 → APK 재설치 필요). 설치 전 사전 점검·재시도 폴링에 사용. 웹에서는 둘 다 true.
- requestPermissions(): Promise<void> — 설치 권한 요청. Android 에서는 시스템 설정 화면으로 이동시키며 즉시 부여되지 않으므로 이후 `checkPermissions` 폴링으로 승인 여부를 확인해야 함. 웹에서는 동작 없음.
- install(apkUri: string): Promise<void> — APK 설치 인텐트 실행. `apkUri` 는 로컬 파일 경로가 아니라 `content://` FileProvider URI (보통 `@simplysm/capacitor-plugin-file-system` 의 `FileSystem.getUri(파일경로)` 결과). 내부에서 `{ uri: apkUri }` 로 래핑해 플러그인에 전달. 웹에서는 미지원 alert 후 반환.
- getVersionInfo(): Promise<VersionInfo> — 현재 설치된 앱 버전 조회. 서버/외부 버전과 비교할 현재 버전 기준값. 웹 구현은 `versionName` 을 빌드 시 주입된 `env("__VER__")`(없으면 `"0.0.0"`), `versionCode` 를 `"0"` 으로 응답.

```typescript
const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!manifest) throw new Error("앱을 재설치해야 합니다.");
if (!granted) await ApkInstaller.requestPermissions();
await ApkInstaller.install(await FileSystem.getUri(apkFilePath));
```

## ApkInstallerPlugin / VersionInfo

Capacitor `registerPlugin("ApkInstaller")` 로 등록되는 네이티브 브리지 인터페이스와 버전 정보 타입. `ApkInstaller` 의 정적 메서드가 이 인터페이스 구현체(네이티브 또는 웹 폴백)에 위임하므로, 직접 구현·호출할 일은 드물고 주로 `getVersionInfo` 반환 형태 참조·웹 구현체 작성 시 본다.

```typescript
interface VersionInfo {
  versionName: string;
  versionCode: string;
}

interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

- VersionInfo.versionName: string — 사람이 읽는 표시 버전(semver, 예 `"1.2.3"`). `AutoUpdate` 의 버전 비교(`semver.gt`/`semver.valid`)는 이 값을 semver 로 사용.
- VersionInfo.versionCode: string — Android 빌드 버전 코드의 문자열 표현. 웹 구현에서는 `"0"` 고정. 현재 업데이트 판정 로직은 `versionName` 만 사용하며 이 값은 표시·식별용.
- ApkInstallerPlugin.install(options: { uri: string }): Promise<void> — content URI APK 설치(네이티브 측 진입점). `ApkInstaller.install(apkUri)` 가 `{ uri: apkUri }` 로 래핑해 호출하며 uri 는 `content://` FileProvider URI.
- ApkInstallerPlugin.checkPermissions / requestPermissions / getVersionInfo — 각각 `ApkInstaller` 의 동명 정적 메서드가 그대로 위임하는 원본 브리지 메서드(권한 조회 / 권한 요청 / 현재 버전 조회). 의미는 위 `ApkInstaller` 항목과 동일.
