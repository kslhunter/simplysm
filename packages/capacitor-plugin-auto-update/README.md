# @simplysm/capacitor-plugin-auto-update

Android 앱의 자동 업데이트를 지원하는 Capacitor 플러그인이다. 서버에서 최신 APK 버전을 확인하고 다운로드하여 설치하는 전체 업데이트 흐름을 제공한다. 외부 저장소의 APK 파일을 통한 업데이트도 지원한다.

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 비고 |
|--------|-----------|------|
| Android | O | API 23+ (minSdk 23), compileSdk 35 |
| Web | △ | 폴백 구현 제공 (alert 안내, 권한 체크 스킵) |
| iOS | X | 미지원 |

## 설치

```bash
pnpm add @simplysm/capacitor-plugin-auto-update
```

### 피어 의존성

```bash
pnpm add @capacitor/core@^7.4.4
```

### 내부 의존성

이 패키지는 다음 `@simplysm` 패키지에 의존한다.

| 패키지 | 용도 |
|--------|------|
| `@simplysm/core-common` | 경로 유틸리티, HTML 템플릿, `waitUntil` 등 |
| `@simplysm/core-browser` | `downloadBytes` (파일 다운로드) |
| `@simplysm/capacitor-plugin-file-system` | 파일 읽기/쓰기, URI 변환, 저장소 경로 |
| `@simplysm/service-client` | `ServiceClient` (서버 통신) |
| `@simplysm/service-common` | `AutoUpdateService` 인터페이스 정의 |

## Android 설정

### AndroidManifest.xml

플러그인은 APK 설치를 위해 `REQUEST_INSTALL_PACKAGES` 권한을 필요로 한다. 플러그인의 매니페스트에 이미 선언되어 있으므로 앱에서 별도로 추가할 필요는 없다.

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

### Capacitor 플러그인 등록

`capacitor.config.ts` 또는 Android 프로젝트에서 플러그인이 자동으로 등록된다. `package.json`의 `capacitor` 필드에 Android 소스 경로가 지정되어 있다.

## 주요 API

이 패키지는 두 개의 주요 클래스를 export한다.

### ApkInstaller

APK 설치와 권한 관리를 담당하는 저수준 API이다. 모든 메서드는 `static`이다.

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `hasPermissionManifest()` | `Promise<boolean>` | AndroidManifest.xml에 `REQUEST_INSTALL_PACKAGES` 권한이 선언되어 있는지 확인 |
| `hasPermission()` | `Promise<boolean>` | `REQUEST_INSTALL_PACKAGES` 권한이 현재 허용되어 있는지 확인 |
| `requestPermission()` | `Promise<void>` | 설치 권한 요청 (Android 설정 화면으로 이동) |
| `install(apkUri)` | `Promise<void>` | APK 설치 실행. `apkUri`는 `content://` URI (FileProvider URI) |
| `getVersionInfo()` | `Promise<IVersionInfo>` | 현재 앱의 버전 정보 조회 |

### AutoUpdate

자동 업데이트 전체 흐름을 관리하는 고수준 API이다. 모든 메서드는 `static`이다.

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `run(opt)` | `Promise<void>` | 서버 기반 자동 업데이트 실행 |
| `runByExternalStorage(opt)` | `Promise<void>` | 외부 저장소 기반 자동 업데이트 실행 |

### IVersionInfo

앱 버전 정보를 나타내는 인터페이스이다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `versionName` | `string` | 앱의 버전 이름 (예: `"1.2.3"`) |
| `versionCode` | `string` | 앱의 버전 코드 (정수를 문자열로 표현) |

### IApkInstallerPlugin

Capacitor 네이티브 플러그인 인터페이스이다. 일반적으로 `ApkInstaller` 클래스를 통해 간접 사용한다.

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `install(options)` | `Promise<void>` | `options.uri`에 지정된 APK 설치 |
| `hasPermission()` | `Promise<{ granted: boolean }>` | 설치 권한 확인 |
| `requestPermission()` | `Promise<void>` | 설치 권한 요청 |
| `hasPermissionManifest()` | `Promise<{ declared: boolean }>` | 매니페스트 권한 선언 확인 |
| `getVersionInfo()` | `Promise<IVersionInfo>` | 버전 정보 조회 |

## 사용 예제

### 서버 기반 자동 업데이트

서버에 배포된 최신 APK를 확인하고 업데이트하는 가장 일반적인 사용 방식이다. `ServiceClient`를 통해 서버의 `AutoUpdateService`에 연결하여 최신 버전 정보를 조회한다.

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";
import { ServiceClient } from "@simplysm/service-client";

const serviceClient = new ServiceClient("wss://your-server.example.com");

await AutoUpdate.run({
  log: (messageHtml: string) => {
    // 업데이트 진행 상황을 UI에 표시
    document.getElementById("update-status")!.innerHTML = messageHtml;
  },
  serviceClient,
});
```

`run` 메서드의 내부 동작 흐름:

1. 서버의 `AutoUpdateService.getLastVersion("android")`를 호출하여 최신 버전 확인
2. `REQUEST_INSTALL_PACKAGES` 권한 확인 및 요청 (최대 5분 대기)
3. 현재 앱 버전과 서버 버전을 semver로 비교
4. 서버 버전이 더 높으면 APK 다운로드 (진행률 콜백 제공)
5. APK 파일을 앱 캐시에 저장 후 설치 인텐트 실행
6. 설치 완료 후 앱 프리즈 (사용자가 재시작하도록 유도)

### 외부 저장소 기반 업데이트

네트워크 없이 외부 저장소(예: USB, SD 카드)에 미리 배치된 APK 파일로 업데이트하는 방식이다. APK 파일명은 반드시 semver 형식이어야 한다 (예: `1.2.3.apk`).

```typescript
import { AutoUpdate } from "@simplysm/capacitor-plugin-auto-update";

await AutoUpdate.runByExternalStorage({
  log: (messageHtml: string) => {
    document.getElementById("update-status")!.innerHTML = messageHtml;
  },
  dirPath: "MyApp/updates",
});
```

`runByExternalStorage` 메서드의 내부 동작 흐름:

1. `REQUEST_INSTALL_PACKAGES` 권한 확인 및 요청
2. 외부 저장소의 지정 디렉토리에서 `.apk` 파일 목록 조회
3. 파일명에서 버전을 추출하여 semver로 최신 버전 결정
4. 현재 앱 버전과 비교하여 최신 버전이면 설치 실행

### ApkInstaller 직접 사용

업데이트 흐름을 직접 제어해야 하는 경우 `ApkInstaller`를 사용한다.

```typescript
import { ApkInstaller } from "@simplysm/capacitor-plugin-auto-update";

// 현재 앱 버전 확인
const versionInfo = await ApkInstaller.getVersionInfo();
console.log(`현재 버전: ${versionInfo.versionName} (${versionInfo.versionCode})`);

// 권한 확인 및 요청
const hasManifest = await ApkInstaller.hasPermissionManifest();
if (!hasManifest) {
  throw new Error("AndroidManifest.xml에 REQUEST_INSTALL_PACKAGES 권한이 선언되어 있지 않습니다.");
}

const hasPermission = await ApkInstaller.hasPermission();
if (!hasPermission) {
  await ApkInstaller.requestPermission();
  // 사용자가 설정 화면에서 권한을 허용할 때까지 대기 필요
}

// APK 설치 (content:// URI 필요)
await ApkInstaller.install("content://com.example.fileprovider/apk/update.apk");
```

## Web 환경 동작

웹 브라우저에서 실행할 경우 `ApkInstallerWeb` 폴백이 자동으로 사용된다.

| 메서드 | 웹 동작 |
|--------|---------|
| `install()` | alert으로 미지원 안내 후 정상 반환 |
| `hasPermission()` | 항상 `{ granted: true }` 반환 |
| `requestPermission()` | 아무 동작 없음 (no-op) |
| `hasPermissionManifest()` | 항상 `{ declared: true }` 반환 |
| `getVersionInfo()` | `import.meta.env.__VER__` 값을 `versionName`으로 반환 (없으면 `"0.0.0"`) |

## 서버 측 요구사항

`AutoUpdate.run()` 메서드를 사용하려면 서버에서 `AutoUpdateService` 인터페이스를 구현해야 한다.

```typescript
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

- `platform`: `"android"` 문자열이 전달된다
- `version`: semver 형식의 버전 문자열 (예: `"1.2.3"`)
- `downloadPath`: APK 파일의 다운로드 경로 (서버 호스트 URL에 결합됨)

## 라이선스

MIT
