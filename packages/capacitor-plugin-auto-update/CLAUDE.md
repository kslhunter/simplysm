# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/capacitor-plugin-auto-update` — Android APK 자동 업데이트 플러그인. 서버 버전 비교 후 APK 다운로드·설치를 처리하며, 외부 저장소(USB 등)에서도 업데이트할 수 있다. TypeScript 소스 6개 파일.

의존성:
- `@simplysm/capacitor-plugin-file-system` — APK 파일 저장 및 URI 조회
- `@simplysm/core-browser` — `fetchUrlBytes` (다운로드 진행률 포함)
- `@simplysm/core-common` — `html`, `wait`, `path`, `env`
- `@simplysm/service-client` / `@simplysm/service-common` — 서버 버전 조회
- `semver` — 버전 비교

## Architecture

```
src/
├── ApkInstallerPlugin.ts  ← Capacitor 플러그인 인터페이스 정의 (VersionInfo, ApkInstallerPlugin)
├── ApkInstaller.ts        ← 플러그인 등록 및 정적 파사드 클래스
├── AutoUpdate.ts          ← 자동 업데이트 오케스트레이터 (정적 클래스)
├── env.d.ts               ← import.meta.env.__VER__ 타입 선언
├── web/
│   └── ApkInstallerWeb.ts ← 브라우저 폴백 구현 (WebPlugin 상속)
└── index.ts               ← public API re-exports
android/
└── src/main/kotlin/kr/co/simplysm/capacitor/apkinstaller/
    └── ApkInstallerPlugin.kt ← Android 네이티브 구현 (Kotlin)
```

### 진입점

`AutoUpdate.run()` 또는 `AutoUpdate.runByExternalStorage()`를 앱 부트스트랩 시 호출한다. 업데이트가 필요하면 APK를 내려받아 설치한 뒤 `_freezeApp()`으로 앱을 무한 대기 상태로 전환한다(사용자가 재시작하도록 유도).

## Key Patterns

### 레이어 구조

플러그인은 항상 3계층으로 구성된다:

1. **`*Plugin.ts`** — Capacitor 플러그인 인터페이스와 타입만 정의 (로직 없음)
2. **`*.ts` (파사드)** — `registerPlugin()`으로 플러그인을 등록하고, `abstract class`로 정적 메서드를 노출
3. **`web/*.ts`** — `WebPlugin`을 상속하는 브라우저 폴백

```typescript
// 1. 플러그인 인터페이스 (ApkInstallerPlugin.ts)
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

// 3. 웹 폴백 (web/ApkInstallerWeb.ts)
export class ApkInstallerWeb extends WebPlugin implements ApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
    return Promise.resolve();
  }
}
```

### AutoUpdate 오케스트레이터

`AutoUpdate`는 `abstract class`로 인스턴스화하지 않으며, 모든 메서드가 `static`이다. 내부 단계별 private 메서드(`_checkPermission`, `_installApk`, `_freezeApp`)를 순서대로 호출한다.

- `AutoUpdate.run(opt)` — 서버(`AutoUpdateService`)에서 버전 확인 후 업데이트
- `AutoUpdate.runByExternalStorage(opt)` — 외부 저장소 디렉토리에서 최신 `.apk` 파일로 업데이트

두 메서드 모두 `try/catch`로 전체를 감싸며, 에러 발생 시 `opt.log()`로 HTML 메시지를 표시하고 `_freezeApp()`으로 전환한다.

### 권한 확인 패턴

`_checkPermission()`은 `manifest` 선언 여부와 `granted` 여부를 분리하여 확인한다. `manifest`가 `false`이면 재설치가 필요하다는 에러를 던진다. `granted`가 `false`이면 권한 요청 후 `wait.until()`로 최대 300초 폴링한다.

### 웹 폴백 버전 정보

`ApkInstallerWeb.getVersionInfo()`는 `@simplysm/core-common`의 `env("__VER__")`를 사용한다. 빌드 도구가 해당 환경 변수를 주입하지 않으면 `"0.0.0"`을 반환한다.

## Android 네이티브

- 파일: `android/src/main/kotlin/kr/co/simplysm/capacitor/apkinstaller/ApkInstallerPlugin.kt`
- 권한: `REQUEST_INSTALL_PACKAGES` (AndroidManifest.xml에 선언 필요)
- `install()`: `FileProvider` URI를 받아 `ACTION_VIEW` 인텐트로 APK 설치 실행
- `checkPermissions()`: `canRequestPackageInstalls()` (API 26+) 및 manifest 선언 여부 동시 확인
- `getVersionInfo()`: `PackageManager`에서 `versionName`/`versionCode` 조회

## 컴파일러 설정 (패키지 고유)

`tsconfig.json`에 `"lib": ["ESNext", "DOM", "DOM.Iterable"]`이 설정되어 있다. 브라우저 DOM API(`alert`, `navigator.userAgent`, `import.meta.env`)를 직접 사용하므로 DOM lib가 필수다.
