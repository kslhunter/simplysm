# @simplysm/cordova-plugin-auto-update

Cordova(Android 전용) 앱의 APK 자동 업데이트 오케스트레이션과, APK 설치/권한을 다루는 저수준 네이티브 브릿지. (deprecated: Capacitor로 전환됨, 유지보수 중단)

## 사용 트리거 인덱스

- **CordovaAutoUpdate** — 앱 부팅 시 서버 또는 외장저장소의 최신 APK 버전을 확인해 다운로드, 설치까지 한 번에 수행할 때.
- **CordovaApkInstaller** — APK 설치 권한 확인/요청, 직접 APK 설치, 현재 앱 버전 조회 같은 저수준 네이티브 호출이 필요할 때.

## CordovaAutoUpdate

- `abstract class`, 모든 메서드 `static`.
- 내부에서 `CordovaApkInstaller`, `CordovaFileSystem`(`@simplysm/cordova-plugin-file-system`), `NetUtils`(`@simplysm/sd-core-common`), `semver`를 사용함.
- 안드로이드(`navigator.userAgent`에 `"android"` 포함) 외 환경에서는 권한 확인 단계에서 `"안드로이드만 지원합니다."` 에러.

공통 동작:

- 현재 버전 비교는 `process.env["SD_VERSION"]`으로 함(`CordovaApkInstaller.getVersionInfo()` 사용부는 소스에서 주석 처리). 같으면 아무 동작 없이 반환.
- 설치 진입 또는 오류 시 사용자에게 HTML(재시도 버튼 등)을 `log`로 전달한 뒤 `_freezeApp()`(무한 대기)로 앱을 정지시킴.
  - 설치가 시작되면 이 호출은 반환되지 않음.
- 모든 예외는 `catch`에서 `"업데이트 중 오류 발생: <br/>{메시지}"` 형태로 `log` 표시 후 무한 대기.
- 권한 확인 시 매니페스트 권한이 없으면(코드 1) 또는 권한 확인 자체가 실패하면(코드 2) `"APK파일을 다시 다운로드 받아, 설치해야 합니다(코드)."` 에러를 던짐.
- 런타임 권한이 없으면 `"설치권한이 설정되어야합니다."` + 재시도 버튼을 표시하고 `requestPermission()` 호출 후 `Wait.until`로 권한 획득을 폴링(1초 간격)함.

### runAsync(opt: { log: (messageHtml: string) => void; serviceClient: SdServiceClient }): Promise<void>

서버에서 최신 버전 정보를 받아 APK를 다운로드, 설치함.

- `opt.log: (messageHtml: string) => void` — 진행 상태/오류/사용자 액션 버튼을 HTML 문자열로 전달받는 콜백.
  - 단계마다 호출되며 UI 렌더링 책임은 호출자.
  - 전달 예: "최신버전 확인 중...", "권한 확인 중...", "최신버전 파일 다운로드중...(XX.XX%)", "최신버전을 설치한 후 재시작하세요." 등.
- `opt.serviceClient: SdServiceClient` — 서버 통신 클라이언트.
  - `getService<ISdAutoUpdateService>("SdAutoUpdateService").getLastVersion("android")`로 `{ version, downloadPath }`를 조회함.
  - 결과가 없으면 `"서버에서 최신버전 정보를 가져오지 못했습니다."` 에러.
  - APK는 `serviceClient.hostUrl + downloadPath`에서 `NetUtils.downloadBufferAsync`로 받으며 진행률을 `log`로 보고하고, `appCache` 저장경로의 `latest.apk`에 기록 후 설치함.
  - 권한 부재 시 재설치 안내에 이 URL이 다운로드 버튼으로 포함됨.

### runByExternalStorageAsync(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>

외장저장소의 지정 디렉토리에서 가장 높은 버전의 APK를 찾아 설치함. 서버 통신 없음.

- `opt.log: (messageHtml: string) => void` — `runAsync`와 동일한 진행/오류 표시 콜백.
- `opt.dirPath: string` — `CordovaFileSystem.getStoragePathAsync("external")` 하위의 APK 검색 대상 디렉토리(상대경로). 이 경로를 `readdir`하여 후보를 수집함.
- 버전 판별: 비폴더 항목 중 확장자가 `.apk`이고 파일명(확장자 제외)이 정규식 `/^[0-9.]*$/`에 맞는 것만 후보.
  - 후보가 없으면 반환(에러 없음).
  - `semver.maxSatisfying(versions, "*")`로 최신 버전을 골라 `<version>.apk`를 설치함.
- 권한 확인을 다운로드 링크 인자 없이 호출하므로, 권한 부재 시 재설치 안내에 다운로드 버튼이 표시되지 않음.

## CordovaApkInstaller

`abstract class`, 모든 메서드 `static`. `cordova.exec`로 네이티브 `"CordovaApkInstaller"` 플러그인을 호출하는 얇은 래퍼.

### hasPermissionManifest(): Promise<boolean>

매니페스트에 설치 권한이 선언돼 있는지 확인.

- 네이티브 결과 문자열이 `"true"`면 `true`, 실패 콜백이면 reject 없이 `false`로 흡수.
- `false`면 APK 재설치 필요 신호로 쓰임.

### hasPermission(): Promise<boolean>

런타임 설치 권한 보유 여부.

- 결과가 `"true"`면 `true`, 실패 시 `false`.
- 권한 요청 전후로 보유 상태를 폴링할 때 사용.

### requestPermission(): Promise<void>

설치 권한 요청을 네이티브에 전달.

- 성공 시 resolve, 실패 시 reject.
- 권한 설정 화면으로 유도하는 용도.

### install(apkUri: string): Promise<void>

- `apkUri: string` — 설치할 APK의 파일 URI(예: `CordovaFileSystem.getFileUriAsync(path)` 결과).
  - 네이티브 설치를 트리거.
  - 성공 시 resolve, 실패 시 reject.

### getVersionInfo(): Promise<{ versionName: string; versionCode: string }>

현재 설치된 앱의 버전 정보를 조회함.

- `versionName: string` — 사용자에게 보이는 버전 문자열(예: `"1.2.3"`).
- `versionCode: string` — 빌드 버전 코드(문자열).
- 주의: `CordovaAutoUpdate` 내부에서는 현재 이 메서드 대신 `process.env["SD_VERSION"]`으로 버전을 비교함(호출부 주석 처리됨).
