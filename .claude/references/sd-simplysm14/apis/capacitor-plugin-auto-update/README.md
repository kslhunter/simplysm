# @simplysm/capacitor-plugin-auto-update

Capacitor 앱(Android)에서 APK 설치 인텐트를 실행하고, 서버 또는 외부 저장소의 최신 APK 를 받아 자동 업데이트하는 플러그인. 공개 심볼은 모두 `static` 멤버만 가진 abstract 클래스이거나 타입이라 인스턴스 없이 클래스명으로 직접 호출. 비-Android(웹) 환경에서는 `ApkInstallerWeb` 폴백으로 설치는 no-op, 권한은 항상 통과로 동작.

## 사용 트리거 인덱스

- **AutoUpdate** — 앱 부팅 시 "최신 확인 → 권한 → 다운로드 → 설치 → 앱 멈춤" 까지 한 번에 돌리는 자동 업데이트 오케스트레이터. 서버 기반(`run`) 또는 외부 저장소 기반(`runByExternalStorage`). 부트스트랩에서 1회 호출.
- **ApkInstaller** — APK 설치/권한 확인·요청/현재 버전 조회를 직접 호출하는 저수준 정적 클래스. 자동 업데이트 흐름을 직접 짜거나 단건 설치·권한 처리만 필요할 때.
- **ApkInstallerPlugin / VersionInfo** — Capacitor 네이티브 브리지 인터페이스 및 버전 정보 타입. 직접 호출보다는 `ApkInstaller` 가 감싸므로 반환 타입 참조·웹 구현체 작성 시 참조용.

## AutoUpdate

`abstract class AutoUpdate` — 정적 메서드만 가진 고수준 오케스트레이터. 두 진입점 모두 내부에서 Android 여부 확인 → 설치 권한 확인/요청 → 버전 비교 → 다운로드/설치 → 무한 freeze 순으로 일괄 처리. 진행 단계는 `log` 콜백으로 HTML 문자열을 흘려보내고, 도중 발생한 모든 예외를 잡아 `log` 로 에러 메시지를 표시한 뒤 영원히 resolve 되지 않는 무한 대기로 진입해 구버전 실행을 막는다. Android 가 아니면(`navigator.userAgent` 에 "android" 없음) `"Android만 지원됩니다."` 로 throw 되어 catch 에서 표시됨.

```typescript
static run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>
static runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>
```

- log: (messageHtml: string) => void — 진행/오류 상태를 HTML 문자열로 받는 콜백. 매 단계마다 여러 번 호출되며 `"최신 버전 확인 중..."`, `"권한 확인 중..."`, 다운로드 진행률 `(NN.NN%)`, 권한 활성화·재시도 버튼 HTML, 오류 메시지 등이 인자로 들어옴. 부팅 스플래시 등에 그대로 `innerHTML` 로 렌더하는 용도. 버튼 등 인터랙티브 HTML 이 포함되므로 텍스트가 아닌 HTML 로 렌더해야 재시도/다운로드 링크가 동작.
- serviceClient: ServiceClient (`run` 전용) — `@simplysm/service-client` 의 서비스 클라이언트. 내부에서 `getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 로 최신 버전·다운로드 경로를 조회하고, `serviceClient.hostUrl + downloadPath` 로 `fetchUrlBytes` 다운로드. 서버가 버전 정보를 안 주면(`undefined`) 무동작 반환(업데이트 없음). 서버 연동 배포일 때 사용.
- dirPath: string (`runByExternalStorage` 전용) — 외부 저장소(`FileSystem.getStoragePath("external")`) 기준 상대 디렉토리 경로. 이 폴더의 비-디렉토리 항목 중 확장자가 `.apk` 이고 파일명(확장자 제외)이 `^[0-9.]*$`(숫자·점) 인 것을 버전으로 보고 `semver.maxSatisfying(..., "*")` 로 최신을 선정. 서버 없이 USB/SD 등으로 사이드로딩 배포할 때 사용.

동작 차이: `run` 은 다운로드한 바이트를 `appCache` 저장소의 `latest.apk` 로 써서 설치하고, `runByExternalStorage` 는 외부 저장소의 `<dirPath>/<version>.apk` 를 직접 설치 대상으로 삼는다. 두 경로 모두 현재 버전(`ApkInstaller.getVersionInfo().versionName`)과 비교해 `semver.gt(최신, 현재)` 가 아니면(이미 최신·동일·낮음) 반환하고, 어느 한쪽이라도 유효한 semver 가 아니면 업데이트 확인을 건너뛴다.

```typescript
// 앱 부트스트랩에서 (서버 기반)
await AutoUpdate.run({ log: (h) => (statusEl.innerHTML = h), serviceClient });
// 또는 오프라인 배포 폴더 기준
await AutoUpdate.runByExternalStorage({ log: (h) => (statusEl.innerHTML = h), dirPath: "myapp-apks" });
```

주의: 업데이트가 없으면 그냥 반환하지만, 설치를 진행하거나 오류가 나면 무한 대기로 들어가 영원히 resolve 되지 않으므로 호출 후속 코드에 의존하지 말 것 — 후속 코드는 "업데이트 없음" 경로에서만 실행된다. 권한 미승인 시 설정 화면으로 보낸 뒤 최대 5분(1초 간격 300회) 동안 권한 부여를 폴링. APK manifest 에 `REQUEST_INSTALL_PACKAGES` 가 없거나(`manifest:false`) 권한 확인 자체가 실패하면 "APK 파일을 다시 다운로드하여 설치해야 합니다(코드)." 안내(코드 1·2, 다운로드 링크 버튼 포함)와 함께 throw.

## ApkInstaller

`abstract class ApkInstaller` — APK 설치 관련 네이티브 호출을 감싼 저수준 정적 클래스. Android 는 실제 인텐트/권한을 다루고, 브라우저(web)는 `ApkInstallerWeb` 가 대체 구현(설치 시 미지원 alert 후 정상 반환, 권한은 항상 `granted:true`/`manifest:true`). `AutoUpdate` 가 내부에서 쓰며, 자동 업데이트 UX 를 직접 구성하거나 권한·설치만 단독으로 다룰 때 직접 호출.

```typescript
static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>
static requestPermissions(): Promise<void>
static install(apkUri: string): Promise<void>
static getVersionInfo(): Promise<VersionInfo>
```

- checkPermissions() → { granted, manifest } — 설치 권한 상태 조회. granted: boolean = `REQUEST_INSTALL_PACKAGES` 권한이 사용자에게 승인되었는지(false 면 `requestPermissions` 로 유도), manifest: boolean = 해당 권한이 앱 manifest 에 선언되어 있는지(false 면 권한 요청 자체가 불가 → APK 재설치 필요). 설치 전 사전 점검·재시도 폴링에 사용. 웹에서는 둘 다 true.
- requestPermissions() → void — 설치 권한 요청. Android 에서는 시스템 설정 화면으로 이동시키며 즉시 부여되지 않으므로 이후 `checkPermissions` 폴링으로 승인 여부를 확인해야 함. 웹에서는 동작 없음.
- install(apkUri: string) → void — APK 설치 인텐트 실행. apkUri 는 로컬 경로가 아니라 `content://` FileProvider URI (보통 `@simplysm/capacitor-plugin-file-system` 의 `FileSystem.getUri(파일경로)` 결과). 내부에서 `{ uri: apkUri }` 로 래핑해 플러그인에 전달. 웹에서는 미지원 alert 후 반환.
- getVersionInfo() → VersionInfo — 현재 설치된 앱 버전 조회. 서버/외부 버전과 비교할 현재 버전 기준값. 웹 구현은 `versionName` 을 빌드 시 주입된 `env("__VER__")`(없으면 `"0.0.0"`), `versionCode` 를 `"0"` 으로 응답.

```typescript
const { granted, manifest } = await ApkInstaller.checkPermissions();
if (!manifest) throw new Error("앱을 재설치해야 합니다.");
if (!granted) await ApkInstaller.requestPermissions();
await ApkInstaller.install(await FileSystem.getUri(apkFilePath));
```

## ApkInstallerPlugin / VersionInfo

Capacitor `registerPlugin("ApkInstaller")` 로 등록되는 네이티브 브리지 인터페이스와 버전 정보 타입. `ApkInstaller` 의 정적 메서드가 이 인터페이스 구현체(네이티브 또는 `ApkInstallerWeb`)에 위임하므로, 직접 구현·호출할 일은 드물고 주로 `getVersionInfo` 반환 형태 참조·웹 구현체 작성 시에만 본다.

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
- ApkInstallerPlugin.install(options: { uri: string }) — content URI APK 설치. `ApkInstaller.install(apkUri)` 가 `{ uri: apkUri }` 형태로 래핑해 전달하며 uri 는 `content://` FileProvider URI.
- ApkInstallerPlugin.checkPermissions / requestPermissions / getVersionInfo — 각각 `ApkInstaller` 의 동명 정적 메서드가 그대로 위임하는 원본 브리지 메서드(권한 조회 / 권한 요청 / 현재 버전 조회).
