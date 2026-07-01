# @simplysm/capacitor-plugin-auto-update — APK 설치 브리지

APK 설치 권한 확인·요청, 설치 URI 전달, 앱 버전 정보 조회를 `ApkInstaller` 정적 메서드와 Capacitor 브리지 타입으로 다룰 때 같이 읽는 묶음.

## ApkInstaller

```ts
abstract class ApkInstaller {
  static checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  static requestPermissions(): Promise<void>;
  static install(apkUri: string): Promise<void>;
  static getVersionInfo(): Promise<VersionInfo>;
}
```

- `checkPermissions()` — 설치 권한과 manifest 선언 여부를 조회해 `{ granted, manifest }` 를 반환한다.
- `granted: boolean` — 설치 권한 승인 여부. `AutoUpdate` 는 false 일 때 권한 요청 후 `granted` 가 true 가 될 때까지 폴링한다.
- `manifest: boolean` — 설치 권한이 manifest 에 선언되었는지 나타내는 값. `AutoUpdate` 는 false 를 재설치 오류 경로로 처리한다.
- `requestPermissions()` — `REQUEST_INSTALL_PACKAGES` 권한 요청을 플러그인에 위임한다. `AutoUpdate` 는 `granted` 가 false 일 때 호출한다.
- `install(apkUri: string)` — `apkUri` 를 `{ uri: apkUri }` 로 감싸 플러그인 `install` 에 전달한다.
- `apkUri: string` — 설치할 APK 의 `content://` URI. JSDoc 은 FileProvider URI 로 설명한다.
- `getVersionInfo()` — 현재 앱 버전 정보를 플러그인에서 조회해 `VersionInfo` 로 반환한다.
- 브라우저 구현은 JSDoc 기준 APK 설치 미지원 알림을 표시하고 정상 반환한다.

## VersionInfo

```ts
interface VersionInfo {
  versionName: string;
  versionCode: string;
}
```

- `versionName: string` — 앱 버전명. `AutoUpdate` 는 현재 버전 비교에서 이 값을 `semver.valid` 와 `semver.gt` 에 넣는다.
- `versionCode: string` — 앱 버전 정보에 포함되는 코드 문자열. `AutoUpdate` 본문에서는 비교에 사용하지 않는다.

## ApkInstallerPlugin

```ts
interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}
```

- `install(options)` — APK 설치 요청을 받는 Capacitor 브리지 메서드. `ApkInstaller.install` 이 이 메서드에 `{ uri: apkUri }` 를 전달한다.
- `options.uri: string` — 설치 대상 APK URI. `ApkInstaller.install` 의 `apkUri` 값이 이 필드가 된다.
- `checkPermissions()` — `{ granted, manifest }` 권한 상태를 반환하는 브리지 메서드.
- `granted: boolean` — 설치 권한 승인 여부. `ApkInstaller.checkPermissions` 의 반환 필드와 같다.
- `manifest: boolean` — manifest 선언 여부. `ApkInstaller.checkPermissions` 의 반환 필드와 같다.
- `requestPermissions()` — 설치 권한 요청 브리지 메서드.
- `getVersionInfo()` — `VersionInfo` 를 반환하는 현재 앱 버전 조회 브리지 메서드.
