# CLAUDE.md

> 이 패키지의 사용법 및 지침은 `.claude/references/sd-simplysm-v14/capacitor-plugin-auto-update/README.md`를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/capacitor-plugin-auto-update` — Android APK 자동 업데이트 플러그인. 서버 버전 비교 후 APK 다운로드·설치를 처리하며, 외부 저장소(USB 등)에서도 업데이트할 수 있다. TypeScript 소스 5개 파일(+ 타입 선언 1개).

의존성:
- `@simplysm/capacitor-plugin-file-system` — APK 파일 저장 및 `content://` URI 조회
- `@simplysm/core-browser` — `fetchUrlBytes` (다운로드 진행률 포함)
- `@simplysm/core-common` — `html`, `wait`, `path`, `env`
- `@simplysm/service-client` / `@simplysm/service-common` — 서버 버전 조회 (`AutoUpdateService`)
- `semver` — semver 버전 비교 및 최신 버전 선택

## Architecture

```
src/
├── ApkInstallerPlugin.ts  ← Capacitor 플러그인 인터페이스 정의 (VersionInfo, ApkInstallerPlugin)
├── ApkInstaller.ts        ← registerPlugin() 등록 및 정적 파사드 클래스
├── AutoUpdate.ts          ← 자동 업데이트 오케스트레이터 (static-only abstract class)
├── env.d.ts               ← import.meta.env.__VER__ 타입 선언 (빌드 도구 주입용)
├── web/
│   └── ApkInstallerWeb.ts ← 브라우저 폴백 구현 (WebPlugin 상속, export 아님)
└── index.ts               ← public API re-exports (ApkInstaller, ApkInstallerPlugin, AutoUpdate)
android/
└── src/main/kotlin/kr/co/simplysm/capacitor/apkinstaller/
    └── ApkInstallerPlugin.kt ← Android 네이티브 구현 (Kotlin)
```

### 진입점

앱 부트스트랩 시 `AutoUpdate.run()` 또는 `AutoUpdate.runByExternalStorage()`를 호출한다. 업데이트가 필요하면 APK를 내려받아 설치한 뒤 `_freezeApp()`으로 앱을 무한 대기 상태로 전환한다(사용자가 앱을 재시작하도록 유도).

`ApkInstallerWeb`은 `index.ts`에서 export하지 않는다. `registerPlugin()`의 `web` 옵션에서 `dynamic import()`로만 사용된다. 이 패키지에서 `dynamic import()`를 사용하는 유일한 지점이다(Capacitor 플러그인 등록 패턴 요건).

## Key Patterns

### 3계층 레이어 구조

모든 Capacitor 플러그인이 따르는 패턴:

1. **`*Plugin.ts`** — 인터페이스와 타입만 정의. 로직 없음.
2. **`*.ts` (파사드)** — `registerPlugin()`으로 플러그인을 등록하고, `abstract class`로 정적 메서드를 노출.
3. **`web/*.ts`** — `WebPlugin`을 상속하는 브라우저 폴백. `index.ts`에서 export하지 않음.

```typescript
// 1. 인터페이스 (ApkInstallerPlugin.ts)
export interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<void>;
  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }>;
  requestPermissions(): Promise<void>;
  getVersionInfo(): Promise<VersionInfo>;
}

// 2. 파사드 (ApkInstaller.ts)
const apkInstallerPlugin = registerPlugin<ApkInstallerPlugin>("ApkInstaller", {
  web: async () => {
    const { ApkInstallerWeb } = await import("./web/ApkInstallerWeb");
    return new ApkInstallerWeb();
  },
});

export abstract class ApkInstaller {
  static async install(apkUri: string): Promise<void> {
    await apkInstallerPlugin.install({ uri: apkUri });
  }
}

// 3. 웹 폴백 (web/ApkInstallerWeb.ts) — export 안 함
export class ApkInstallerWeb extends WebPlugin implements ApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
    return Promise.resolve();
  }
}
```

### AutoUpdate 오케스트레이터

`AutoUpdate`는 `abstract class`로 인스턴스화하지 않으며 모든 메서드가 `static`이다. 내부 단계별 private 메서드를 순서대로 호출한다:

1. `_checkPermission()` — Android 환경 확인, manifest 선언 확인, 권한 승인 대기
2. 서버/외부 저장소에서 최신 버전 정보 조회 및 semver 비교
3. APK 다운로드 또는 외부 저장소에서 파일 경로 결정
4. `_installApk()` — `FileSystem.getUri()`로 URI 변환 후 `ApkInstaller.install()` 호출
5. `_freezeApp()` — `new Promise(() => {})` 무한 대기

두 public 메서드 모두 `try/catch`로 전체를 감싸며, 에러 발생 시 `opt.log()`로 HTML 메시지를 표시하고 `_freezeApp()`으로 전환한다.

### 권한 확인 패턴

`_checkPermission(opt.log, targetHref?)`:

- `navigator.userAgent`에 `"android"`가 없으면 즉시 throw
- `manifest: false` → `_throwAboutReinstall()` 호출 (재설치 안내 HTML + 다운로드 링크 포함)
- `granted: false` → `ApkInstaller.requestPermissions()` 호출 후 `wait.until()`로 최대 300초(1초 간격) 폴링

### `opt.log` HTML 패턴

`log` 콜백에 전달되는 HTML은 `@simplysm/core-common`의 `html` 태그 템플릿 리터럴로 생성한다. 재시도 버튼 등 인터랙티브 요소를 포함한다:

```typescript
log(html`
  설치 권한을 활성화해야 합니다.
  <style>
    button { ${this._BUTTON_CSS} }
    button:active { ${this._BUTTON_ACTIVE_CSS} }
  </style>
  <button onclick="location.reload()">재시도</button>
`);
```

### 웹 폴백 버전 정보 및 권한

`ApkInstallerWeb.getVersionInfo()`는 `env("__VER__") ?? "0.0.0"`을 `versionName`으로 반환한다. 빌드 도구가 `__VER__`을 주입하지 않으면 `"0.0.0"`이 된다. `env.d.ts`에 `ImportMetaEnv.__VER__?: string` 타입이 선언되어 있다.

`ApkInstallerWeb.checkPermissions()`는 항상 `{ granted: true, manifest: true }`를 반환한다. 브라우저 환경에서는 권한 확인을 생략하고 통과시킨다.

## Android 네이티브

파일: `android/src/main/kotlin/kr/co/simplysm/capacitor/apkinstaller/ApkInstallerPlugin.kt`

- `AndroidManifest.xml`에 `REQUEST_INSTALL_PACKAGES` 권한 선언이 필수다. 미선언 시 `checkPermissions()`에서 `manifest: false`를 반환하고 `AutoUpdate`는 재설치 에러를 throw한다.
- `install()`: `FileProvider` URI(`content://`)를 받아 `ACTION_VIEW` 인텐트로 APK 설치 실행
- `checkPermissions()`: `canRequestPackageInstalls()` (API 26+) 및 manifest 선언 여부 동시 확인
- `getVersionInfo()`: `PackageManager`에서 `versionName`/`versionCode` 조회

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에 `"lib": ["ESNext", "DOM", "DOM.Iterable"]`이 추가 설정되어 있다. `alert()`, `navigator.userAgent`, `import.meta.env` 등 브라우저 DOM API를 직접 사용하므로 DOM lib가 필수다.
