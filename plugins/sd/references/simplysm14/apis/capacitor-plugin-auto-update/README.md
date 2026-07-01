# @simplysm/capacitor-plugin-auto-update

Android APK 설치 권한 확인·요청, `content://` URI 기반 APK 설치 호출, 그리고 서버/외부 저장소에서 최신 APK 를 찾아 설치까지 진행하는 자동 업데이트 흐름을 제공하는 Capacitor 플러그인 패키지. 웹에서는 모든 동작이 알림 또는 정상 반환으로 대체된다.

## 사용 트리거 인덱스

- **AutoUpdate** — 앱 시작 시 최신 APK 확인 → 권한 확인/요청 → 다운로드(서버) 또는 파일 선택(외부 저장소) → 설치까지 한 흐름으로 묶을 때. 서버 흐름은 `ServiceClient` 를 받는다(연결·서비스 배선은 [client-service.md](../../manuals/client-service.md)).
- **ApkInstaller** — 자동 업데이트 흐름 없이 설치 권한·설치 인텐트·앱 버전 정보를 직접 호출할 때.
- **ApkInstallerPlugin / VersionInfo** — Capacitor 저수준 플러그인 계약 또는 버전 정보 타입을 구현·참조할 때.

## AutoUpdate

`abstract class AutoUpdate` — 최신 APK 탐색·권한·다운로드·설치를 묶은 정적 오케스트레이터. 두 진입 메서드 모두 내부에서 예외를 잡아 `opt.log` 로 오류 HTML 을 전달한 뒤 끝나지 않는 Promise(`_freezeApp`)로 대기한다. 따라서 설치까지 도달하거나 오류가 나면 반환 Promise 가 resolve 되지 않고, 업데이트가 불필요해 조기 `return` 하는 경우에만 정상 resolve 된다.

### `static run(opt): Promise<void>` — 서버 기반 자동 업데이트

서버의 `AutoUpdate` 서비스에서 최신 버전을 조회해 다운로드·설치한다.

- `opt.log: (messageHtml: string) => void` — 진행/오류 상태를 HTML 문자열로 받는 콜백. 단계마다 호출됨: `"최신 버전 확인 중..."`, `"권한 확인 중..."`, 다운로드 진행률(`"...최신 버전 파일 다운로드 중...(NN.NN%)"`), 설치 안내, 오류 메시지. 권한·설치 안내 메시지에는 `location.reload()` 재시도 `<button>`, 재설치 안내에는 다운로드 `<a>` HTML 이 포함될 수 있다.
- `opt.serviceClient: ServiceClient` — 서버 호출용 클라이언트. `getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 로 최신 버전 정보를, `serviceClient.hostUrl + downloadPath` 로 다운로드 URL 을 만든다.

동작 순서:

1. `getLastVersion("android")` 결과가 없으면 info 로깅 후 반환(업데이트 없음).
2. 권한 확인(`_checkPermission`)에 다운로드 URL 을 재설치 안내 링크 후보로 넘긴다.
3. 현재 버전(`ApkInstaller.getVersionInfo().versionName`) 또는 서버 버전이 `semver.valid` 를 통과하지 못하면 info 로깅 후 반환.
4. `semver.gt(서버버전, 현재버전)` 가 `true` 가 아니면 반환(이미 최신이거나 서버 버전이 더 낮음).
5. `fetchUrlBytes` 로 다운로드(진행률 콜백 → `log`), `FileSystem.getStoragePath("appCache")` 아래 `latest.apk` 로 저장, `FileSystem.getUri` 결과를 `ApkInstaller.install` 에 전달.

### `static runByExternalStorage(opt): Promise<void>` — 외부 저장소 기반 자동 업데이트

외부 저장소의 지정 폴더에서 `<semver>.apk` 중 최신본을 골라 설치한다. 서버 호출이 없어 권한 확인 시 다운로드 링크를 제공하지 않는다.

- `opt.log: (messageHtml: string) => void` — `run` 과 동일한 진행/오류 HTML 콜백. `"권한 확인 중..."`, `"최신 버전 확인 중..."`, 설치 안내, 오류 시 호출된다.
- `opt.dirPath: string` — `FileSystem.getStoragePath("external")` 하위에서 APK 파일을 찾을 디렉토리 상대 경로. 파일 목록 조회와 설치 대상 경로(`<external>/<dirPath>/<최신>.apk`) 구성에 모두 쓰인다.

동작 순서:

1. 권한 확인(다운로드 링크 없음).
2. `external` 저장소 + `dirPath` 폴더를 `readdir`. 디렉토리가 아니고 확장자가 `.apk` 이며 확장자 제거 파일명이 `/^[0-9.]*$/` 인 파일만 버전 후보로 삼는다.
3. 후보가 없으면 반환. `semver.maxSatisfying(후보, "*")` 가 없으면 info 로깅 후 반환.
4. 현재 버전/최신 후보가 `semver.valid` 를 통과하지 못하면 info 로깅 후 반환. `semver.gt(최신, 현재)` 일 때만 설치한다.

### 권한 확인 동작 (내부 `_checkPermission`, 두 메서드 공통)

- `navigator.userAgent` 에 `"android"` 가 없으면 `Error("Android만 지원됩니다.")` 를 던진다.
- `ApkInstaller.checkPermissions()` 의 `manifest` 가 false 이면 코드 1 재설치 오류를 던지도록 작성돼 있으나, 이 throw 가 같은 함수의 `catch` 에 잡혀 다시 코드 2 로 던져진다(권한 확인 호출 자체가 예외여도 코드 2). 즉 소비자에게는 항상 코드 2 재설치 오류가 도달한다.
- `granted` 가 false 이면 권한 활성화 안내를 `log` 로 보내고 `ApkInstaller.requestPermissions()` 호출 후, 1초 간격 최대 300회(≈5분) `checkPermissions().granted` 를 폴링한다.

## ApkInstaller

`abstract class ApkInstaller` — `registerPlugin<ApkInstallerPlugin>("ApkInstaller", { web })` 로 등록된 플러그인에 위임하는 정적 래퍼. Android 는 설치 인텐트와 `REQUEST_INSTALL_PACKAGES` 권한을 다루고, 웹은 알림/정상 반환으로 대체된다.

- `static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>` — 설치 권한 상태 확인.
  - `granted: boolean` — `REQUEST_INSTALL_PACKAGES` 권한 승인 여부. `true` 면 설치 진행 가능, `false` 면 `requestPermissions` 가 필요할 때 분기한다.
  - `manifest: boolean` — AndroidManifest 에 권한이 선언돼 있는지. `false` 면 APK 재설치가 필요(자동 업데이트 흐름이 재설치 오류로 처리). 웹은 `{ granted: true, manifest: true }` 고정.
- `static requestPermissions(): Promise<void>` — 권한 요청(설정 화면으로 이동). 웹은 동작 없음.
- `static install(apkUri: string): Promise<void>` — APK 설치 인텐트 실행.
  - `apkUri: string` — 설치할 APK 의 `content://` FileProvider URI. 플러그인에 `{ uri: apkUri }` 로 전달된다. 웹은 미지원 알림 후 정상 반환.
- `static getVersionInfo(): Promise<VersionInfo>` — 현재 앱 버전 정보 조회. 웹은 `versionName = env("__VER__") ?? "0.0.0"`, `versionCode = "0"` 을 반환한다.

## VersionInfo

현재 앱 버전 정보 타입.

```ts
interface VersionInfo {
  versionName: string;
  versionCode: string;
}
```

- `versionName: string` — semver 형식 버전명. `AutoUpdate` 가 `semver.valid`/`semver.gt` 비교에 사용한다.
- `versionCode: string` — 빌드 버전 코드(문자열).

## ApkInstallerPlugin

Capacitor 저수준 플러그인 계약 인터페이스. 공개 래퍼 `ApkInstaller` 가 내부에서 이 형태로 호출하며, 웹 구현체도 이 계약을 구현한다.

- `install(options: { uri: string }): Promise<void>` — `uri` 의 APK 를 설치한다.
  - `options.uri: string` — 설치할 APK 의 `content://` URI. `ApkInstaller.install(apkUri)` 의 인자가 전달된다.
- `checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>` — 권한 승인 여부(`granted`)와 manifest 선언 여부(`manifest`)를 반환한다.
- `requestPermissions(): Promise<void>` — 권한 요청을 수행한다.
- `getVersionInfo(): Promise<VersionInfo>` — 현재 앱 `VersionInfo` 를 반환한다.
