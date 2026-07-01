# @simplysm/capacitor-plugin-auto-update — AutoUpdate

앱 시작 시 서버 또는 외부 저장소에서 최신 APK 를 찾아 설치 흐름을 진행하는 정적 오케스트레이터. 서버 기반 흐름은 `ServiceClient` 를 받으므로 연결·서비스 호출 배선은 [client-service.md](../../manuals/client-service.md) 를 함께 본다.

## AutoUpdate

```ts
abstract class AutoUpdate {
  static run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>;
  static runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>;
}
```

- `run(opt)` — `serviceClient.getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 로 서버 최신 버전 정보를 조회하고, `serviceClient.hostUrl + downloadPath` 를 다운로드해 `appCache/latest.apk` 로 저장한 뒤 설치한다.
- `runByExternalStorage(opt)` — `FileSystem.getStoragePath("external")` 아래 `dirPath` 폴더를 읽고, 파일명에서 최신 `.apk` semver 후보를 골라 그 파일을 설치한다.
- `opt.log: (messageHtml: string) => void` — 진행·오류 HTML 문자열을 받는 콜백. 코드에서 최신 확인, 권한 확인, 다운로드 진행률, 권한/설치 재시도 버튼, 오류 메시지를 전달한다.
- `messageHtml: string` — `log` 로 전달되는 문자열 인자. 일부 경로는 `html` 템플릿으로 만든 `<button>` 또는 `<a>` 포함 문자열을 전달한다.
- `opt.serviceClient: ServiceClient` — `run` 전용 서버 클라이언트. `getService("AutoUpdate")`, `hostUrl`, `downloadPath` 조합에 사용된다.
- `opt.dirPath: string` — `runByExternalStorage` 전용 외부 저장소 하위 경로. `path.join(externalPath, opt.dirPath)` 로 목록을 읽고, 설치 대상 경로도 이 값으로 만든다.

## 서버 기반 `run` 흐름

- 서버 최신 정보가 없으면 `logger.info("서버에서 최신 버전 정보를 가져오지 못했습니다.")` 후 반환한다.
- 권한 확인은 다운로드 URL(`serviceClient.hostUrl + downloadPath`)을 재설치 안내 링크 후보로 넘겨 `_checkPermission` 에서 수행한다.
- 현재 버전(`ApkInstaller.getVersionInfo().versionName`) 또는 서버 버전(`serverVersionInfo.version`)이 `semver.valid` 를 통과하지 못하면 `logger.info("유효하지 않은 semver 버전이므로 업데이트 확인을 건너뜁니다")` 후 반환한다.
- `semver.gt(serverVersionInfo.version, currentVersionInfo.versionName)` 가 `true` 가 아니면 반환한다.
- 다운로드 진행률은 `receivedLength * 100 / contentLength` 를 소수점 2자리 문자열로 만들어 `log` 에 전달한다.
- 다운로드 바이트는 `FileSystem.getStoragePath("appCache")` 아래 `latest.apk` 로 저장하고, `FileSystem.getUri(apkFilePath)` 결과를 `ApkInstaller.install` 에 넘긴다.

## 외부 저장소 기반 `runByExternalStorage` 흐름

- `FileSystem.getStoragePath("external")` 와 `dirPath` 를 합친 폴더를 읽는다.
- 디렉토리가 아닌 항목만 보고, 확장자가 `.apk` 이며 확장자를 뺀 파일명이 `/^[0-9.]*$/` 를 통과하는 파일만 버전 후보로 삼는다.
- 후보가 없으면 반환한다.
- 후보 버전 중 `semver.maxSatisfying(versions, "*")` 결과가 없으면 `logger.info("유효한 semver 버전 파일을 찾을 수 없습니다.")` 후 반환한다.
- 현재 버전 또는 최신 후보가 `semver.valid` 를 통과하지 못하면 `logger.info("유효하지 않은 semver 버전이므로 업데이트 확인을 건너뜁니다")` 후 반환한다.
- `semver.gt(latestVersion, currentVersionInfo.versionName)` 가 `true` 일 때만 `<external>/<dirPath>/<latestVersion>.apk` 를 설치한다.

## 권한·설치·종료 동작

- `_checkPermission` 은 `navigator.userAgent.toLowerCase()` 에 `"android"` 가 없으면 `Error("Android만 지원됩니다.")` 를 던진다.
- `ApkInstaller.checkPermissions()` 결과의 `manifest` 가 false 이거나 권한 확인 중 예외가 나면 현재 구현상 catch 를 거쳐 코드 `2` 재설치 오류를 던진다.
- `granted` 가 false 이면 권한 활성화 안내 HTML 을 `log` 로 전달하고 `ApkInstaller.requestPermissions()` 호출 후, 1초 간격 최대 300회 `ApkInstaller.checkPermissions()` 로 `granted` 를 폴링한다.
- 설치 직전에는 설치 안내 HTML 을 `log` 로 전달한 뒤 `FileSystem.getUri(apkFilePath)` 결과로 `ApkInstaller.install` 을 호출한다.
- 설치 호출 이후 또는 public 메서드 catch 경로에서는 `_freezeApp()` 이 끝나지 않는 Promise 로 대기하므로 Promise 가 resolve 되지 않는다.
- public 메서드 catch 는 오류 메시지를 `업데이트 중 오류가 발생했습니다:` HTML 로 감싸 `log` 에 전달한 뒤 freeze 한다.
