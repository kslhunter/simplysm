# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/capacitor-plugin-auto-update/README.md`를 참조한다.

## Package Overview

- 패키지: `@simplysm/capacitor-plugin-auto-update`
- 설명: Capacitor Android 앱에서 APK 설치 권한 확인, APK 설치, 서버 또는 외부 저장소 기반 자동 업데이트를 제공한다.
- 공개 엔트리포인트: `src/index.ts`
- 소스 파일 수: TypeScript 6개
- 주요 런타임 전제: Capacitor 7, Android APK 설치 인텐트, 브라우저 폴백 구현

## Architecture

```text
src/
  index.ts                 # 공개 export 집계
  ApkInstaller.ts          # Capacitor 플러그인 등록 및 정적 파사드
  ApkInstallerPlugin.ts    # 네이티브 플러그인 계약과 버전 정보 타입
  AutoUpdate.ts            # 서버/외부 저장소 기반 업데이트 오케스트레이션
  env.d.ts                 # 브라우저 폴백 버전 환경 타입
  web/
    ApkInstallerWeb.ts     # 웹 환경 폴백 플러그인
```

`ApkInstaller`는 `registerPlugin<ApkInstallerPlugin>("ApkInstaller")`로 네이티브 플러그인을 감싸는 정적 파사드다. `AutoUpdate`는 `ApkInstaller`, `FileSystem`, `ServiceClient`, `semver`를 조합해 업데이트 여부 확인부터 APK 설치까지 한 흐름으로 처리한다.

## Key Patterns

### Capacitor 플러그인 파사드

공개 소비자는 네이티브 플러그인 객체를 직접 다루지 않고 `ApkInstaller`의 정적 메서드를 호출한다.

```typescript
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
```

웹 구현은 실제 APK 설치를 수행하지 않는다. `ApkInstallerWeb.install()`은 알림만 표시하고, 권한 확인은 항상 승인 상태로 반환한다.

### 업데이트 후 무한 대기

`AutoUpdate.run()`과 `AutoUpdate.runByExternalStorage()`는 업데이트가 실행되거나 오류가 발생하면 `_freezeApp()`으로 진입한다. 호출부는 두 메서드가 반환하면 업데이트가 불필요한 상태로 해석해야 한다.

```typescript
private static async _freezeApp() {
  await new Promise(() => {});
}
```

### Android 설치 권한 처리

자동 업데이트 흐름은 Android user agent를 확인한 뒤 `ApkInstaller.checkPermissions()`로 manifest 선언과 사용자 권한을 함께 검사한다. 권한이 없으면 설정 화면으로 이동시키고 1초 간격으로 최대 300회 승인 상태를 폴링한다.

```typescript
await wait.until(
  async () => {
    const result = await ApkInstaller.checkPermissions();
    return result.granted;
  },
  1000,
  300,
);
```

### semver 기반 버전 비교

서버 기반 업데이트는 `AutoUpdateService.getLastVersion("android")`의 `version`과 현재 앱의 `versionName`을 비교한다. 외부 저장소 기반 업데이트는 외부 저장소 디렉토리의 `.apk` 파일명에서 버전을 추출하고 `semver.maxSatisfying()`으로 최신 버전을 고른다.

```typescript
if (!semver.gt(serverVersionInfo.version, currentVersionInfo.versionName)) {
  return;
}
```

유효하지 않은 semver 값이면 업데이트 확인을 건너뛴다.

## Package-Specific Compiler Settings

- `lib`: `ESNext`, `DOM`, `DOM.Iterable`
- `outDir`: `./dist`
- `typeRoots`: `./node_modules/@types`
