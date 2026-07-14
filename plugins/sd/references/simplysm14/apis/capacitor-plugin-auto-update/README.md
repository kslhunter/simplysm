# @simplysm/capacitor-plugin-auto-update

Android 앱의 APK 자동 업데이트(버전 확인 → 다운로드 → 설치)와 그 하부의 APK 설치·권한 제어를 제공하는 Capacitor 플러그인. 웹 환경에서는 설치·권한을 no-op 또는 알림으로 처리.

## 사용 트리거 인덱스

- **AutoUpdate** — Android 앱 시작 시 최신 버전을 확인하고, 신버전이면 APK를 받아 설치하는 흐름을 구동할 때. 서버 기반과 외부저장소 기반 두 경로 제공.
- **ApkInstaller** — APK 설치 인텐트 실행, `REQUEST_INSTALL_PACKAGES` 권한 확인/요청, 현재 앱 버전 조회 같은 저수준 작업을 직접 다룰 때.
- **VersionInfo / ApkInstallerPlugin** — 버전 정보 타입 또는 Capacitor 플러그인 계약을 구현·참조할 때.

## AutoUpdate

`abstract class AutoUpdate` — 인스턴스화 없이 static 메서드만 사용. 두 진입점 모두 성공/실패와 무관하게 신버전 설치 흐름에 진입하면 무한 대기(`_freezeApp`)로 앱을 정지시켜 사용자의 수동 재시작을 유도함. 비 Android 환경에서는 "Android만 지원됩니다." 예외 발생. 모든 단계의 메시지와 오류를 `log` 콜백으로 HTML 형식 문자열로 전달함.

### `static run(opt: { log: (messageHtml: string) => void; serviceClient: ServiceClient }): Promise<void>`

서버에서 최신 버전을 받아 업데이트하는 경로.

**옵션 파라미터:**

- `log: (messageHtml: string) => void` — 진행/오류 상태를 HTML 문자열로 받는 콜백. "최신 버전 확인 중...", "권한 확인 중...", 다운로드 진행률(`(NN.NN%)`), 권한 안내 버튼, 설치 안내 버튼, 오류 메시지를 전달. UI에 즉시 렌더링하는 용도.
- `serviceClient: ServiceClient` — 서버 통신 클라이언트. 내부에서 `getService<AutoUpdateService>("AutoUpdate").getLastVersion("android")` 호출.

**동작 흐름:**

1. 서버에서 최신 버전 조회. 결과가 없으면 콘솔 로그 후 반환(업데이트 안 함)
2. 권한 확인(다운로드 URL을 재설치 안내 링크로 제공)
3. 현재 앱 버전 조회
4. semver 형식 유효성 검증(현재·서버 모두). 유효하지 않으면 콘솔 로그 후 반환
5. 버전 비교: `semver.gt(서버버전, 현재버전)` 가 false 이면 반환(이미 최신)
6. 다운로드: `serviceClient.hostUrl + downloadPath` 에서 APK 다운로드. 진행률을 `log`로 전달(예: "최신 버전 파일 다운로드 중...(50.00%)")
7. 저장: `FileSystem.getStoragePath("appCache")` 아래 `latest.apk` 파일로 저장
8. 설치: `ApkInstaller.install()` 로 설치 인텐트 실행
9. 대기: `_freezeApp()` 로 무한 대기

**오류 처리:**

- 모든 예외(권한 오류, 다운로드 오류 등)는 catch 되어 `log` 콜백으로 오류 메시지 HTML 전달 후 `_freezeApp()` 실행
- 권한 확인 호출 자체가 실패한 경우: 오류 메시지에 다운로드 버튼 포함

### `static runByExternalStorage(opt: { log: (messageHtml: string) => void; dirPath: string }): Promise<void>`

외부저장소 디렉토리의 APK 파일들 중 최신 버전을 골라 설치하는 경로(서버 없이).

**옵션 파라미터:**

- `log: (messageHtml: string) => void` — 진행/오류 상태 콜백 (위와 동일)
- `dirPath: string` — `FileSystem.getStoragePath("external")` 기준 상대 디렉토리 경로. 파일명(확장자 제외)이 숫자와 점만 포함하는 `.apk` 파일을 버전으로 인식.

**동작 흐름:**

1. 권한 확인(다운로드 버튼 없음)
2. 외부저장소 + `dirPath` 폴더를 `FileSystem.readdir()` 로 스캔
3. 필터링: 파일이며(디렉토리 아님), `.apk` 확장자, 파일명이 `/^[0-9.]*$/` 정규식 매칭
4. 버전 선택: `semver.maxSatisfying(후보버전들, "*")` 로 최신 선택
   - 후보가 없거나 유효한 semver가 없으면 콘솔 로그 후 반환(업데이트 안 함)
5. 현재 앱 버전 조회
6. semver 유효성 검증(현재·최신 모두). 유효하지 않으면 콘솔 로그 후 반환
7. 버전 비교: `semver.gt(최신, 현재)` 가 false 이면 반환(이미 최신)
8. 설치: `<dirPath>/<version>.apk` 경로의 APK를 `ApkInstaller.install()` 로 설치 인텐트 실행
9. 대기: `_freezeApp()` 로 무한 대기

**오류 처리:**

- 모든 예외는 catch 되어 `log` 콜백으로 오류 메시지 HTML 전달 후 `_freezeApp()` 실행

### 권한 확인 내부 동작 (두 메서드 공통)

1. `navigator.userAgent` 에 `"android"` 미포함 → "Android만 지원됩니다." 예외
2. `ApkInstaller.checkPermissions()` 호출
   - 호출 실패(플러그인 오류): 콘솔 error 로그 후 재설치 오류(코드 2) 발생
   - 호출 성공, `manifest` false: 재설치 오류(코드 1) 발생. `run()` 메서드의 경우 다운로드 버튼을 오류 메시지에 포함
3. `granted` false 이면: "설치 권한을 활성화해야 합니다" 안내 HTML 을 `log` 로 전달(재시도 버튼 포함). `ApkInstaller.requestPermissions()` 호출(설정 화면 이동). 그 후 1초 간격 최대 300회(≈5분) `checkPermissions().granted` 를 폴링하여 권한 허용 대기

## ApkInstaller

`abstract class ApkInstaller` — static 메서드만 사용. Capacitor 플러그인(`ApkInstallerPlugin`)을 등록하고 래핑함. Android에서는 네이티브 권한·설치 인텐트 실행. 웹에서는 알림 또는 no-op.

### `static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>`

`REQUEST_INSTALL_PACKAGES` 권한의 현재 상태 조회.

**반환값:**

- `granted: boolean` — 사용자가 현재 권한을 허용했는지. `true`이면 APK 설치 가능. 웹 환경은 항상 `true`
- `manifest: boolean` — AndroidManifest.xml에 `REQUEST_INSTALL_PACKAGES` 권한이 선언돼 있는지. `false`이면 설치 불가능하며 앱 재설치 필요. 웹 환경은 항상 `true`

### `static requestPermissions(): Promise<void>`

`REQUEST_INSTALL_PACKAGES` 권한을 사용자에게 요청. Android에서는 시스템 설정 화면으로 이동.

**동작:**

- Android: 시스템 설정 화면(앱 권한 설정)으로 이동. 호출은 즉시 반환하지만, 사용자가 권한을 부여할 때까지 설정 화면에 머물러 있음. 권한 부여 후 자동으로 호출 앱으로 복귀하지 않으므로, 호출 후 `checkPermissions()` 로 폴링 필요
- 웹: no-op

### `static install(apkUri: string): Promise<void>`

APK 설치 인텐트를 실행.

**파라미터:**

- `apkUri: string` — 설치할 APK의 content:// URI (FileProvider URI). 예: `await FileSystem.getUri(apkFilePath)` 결과. 반드시 content:// 스킴이어야 하며 file:// 경로는 불가

**동작:**

- Android: Android 시스템의 패키지 설치 인텐트 실행. 사용자가 설치 확인을 누르면 설치 진행. 설치 후 자동 복귀 없음
- 웹: alert로 미지원 안내 후 정상 반환

### `static getVersionInfo(): Promise<VersionInfo>`

현재 설치된 앱의 버전 정보 조회.

**반환값 (VersionInfo):**

- `versionName: string` — 표시용 버전 문자열. AndroidManifest.xml의 `android:versionName`. 예: "1.0.0". AutoUpdate 에서 `semver.valid()` / `semver.gt()` 비교에 사용
- `versionCode: string` — 빌드 번호(정수값을 문자열로). AndroidManifest.xml의 `android:versionCode`. 예: "1". 내부용이므로 대소문자 민감하지 않음

**동작:**

- Android: PackageManager 를 통해 현재 설치된 앱 정보 조회
- 웹: `{ versionName: process.env.SD_VERSION ?? "0.0.0", versionCode: "0" }` 반환

## VersionInfo

버전 정보를 담는 인터페이스.

```typescript
interface VersionInfo {
  versionName: string; // 표시용 버전 문자열 (예: "1.0.0")
  versionCode: string; // 빌드 번호 (문자열, 예: "1")
}
```

- `versionName: string` — semver 형식의 버전명. `AutoUpdate` 에서 버전 비교에 사용
- `versionCode: string` — 정수 빌드 번호(문자열 형식)

## ApkInstallerPlugin

Capacitor 저수준 플러그인 계약 인터페이스. `ApkInstaller` 가 내부적으로 이 형태로 호출하며, 웹 구현체도 이 계약을 구현함. 보통 `ApkInstaller` 래퍼를 사용하므로 직접 호출할 일은 드묾.

```typescript
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

- `install(options: { uri: string }): Promise<void>` — APK 설치 인텐트 실행
  - `uri: string` — 설치할 APK의 content:// URI
- `checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>` — 권한 상태 반환
  - `granted: boolean` — 권한 허용 여부
  - `manifest: boolean` — Manifest 선언 여부
- `requestPermissions(): Promise<void>` — 권한 요청(설정 화면 이동)
- `getVersionInfo(): Promise<VersionInfo>` — 현재 앱 버전 정보 반환
