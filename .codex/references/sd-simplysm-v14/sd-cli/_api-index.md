# API Index — @simplysm/sd-cli

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Config

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdConfig` | interface | [sd-config.md](./config/sd-config.md) | `sd.config.ts` 최상위 설정 타입이 필요할 때 |
| `SdConfigFn` | type | [sd-config.md](./config/sd-config.md) | `sd.config.ts` default export 함수 타입이 필요할 때 |
| `SdConfigParams` | interface | [sd-config.md](./config/sd-config.md) | `sd.config.ts` 함수 매개변수 타입이 필요할 때 |
| `SdPackageConfig` | type | [sd-package-config.md](./config/sd-package-config.md) | 패키지 `target`별 설정 union이 필요할 때 |
| `SdBuildPackageConfig` | interface | [sd-build-package-config.md](./config/sd-build-package-config.md) | `node`/`browser`/`neutral` 패키지 설정이 필요할 때 |
| `BuildTarget` | type | [build-target.md](./config/build-target.md) | 빌드 플랫폼 값 union이 필요할 때 |
| `SdClientPackageConfig` | interface | [sd-client-package-config.md](./config/sd-client-package-config.md) | `client` 타겟 설정이 필요할 때 |
| `SdServerPackageConfig` | interface | [sd-server-package-config.md](./config/sd-server-package-config.md) | `server` 타겟 설정이 필요할 때 |
| `SdScriptsPackageConfig` | interface | [sd-scripts-package-config.md](./config/sd-scripts-package-config.md) | `scripts` 타겟 설정이 필요할 때 |
| `SdWatchHookConfig` | interface | [sd-watch-hook-config.md](./config/sd-watch-hook-config.md) | watch 훅 설정이 필요할 때 |
| `SdPublishConfig` | type | [sd-publish-config.md](./config/sd-publish-config.md) | 배포 방식 union이 필요할 때 |
| `SdNpmPublishConfig` | interface | [sd-publish-config.md](./config/sd-publish-config.md) | npm 배포 설정이 필요할 때 |
| `SdLocalDirectoryPublishConfig` | interface | [sd-publish-config.md](./config/sd-publish-config.md) | 로컬 디렉토리 배포 설정이 필요할 때 |
| `SdStoragePublishConfig` | interface | [sd-publish-config.md](./config/sd-publish-config.md) | FTP/FTPS/SFTP 배포 설정이 필요할 때 |
| `SdPostPublishScriptConfig` | interface | [sd-post-publish-script-config.md](./config/sd-post-publish-script-config.md) | 배포 후 스크립트 설정이 필요할 때 |
| `SdCapacitorConfig` | interface | [sd-capacitor-config.md](./config/sd-capacitor-config.md) | Capacitor 앱 설정이 필요할 때 |
| `SdCapacitorAndroidConfig` | interface | [sd-capacitor-config.md](./config/sd-capacitor-config.md) | Capacitor Android 설정이 필요할 때 |
| `SdCapacitorSignConfig` | interface | [sd-capacitor-config.md](./config/sd-capacitor-config.md) | APK/AAB 서명 설정이 필요할 때 |
| `SdCapacitorPermission` | interface | [sd-capacitor-config.md](./config/sd-capacitor-config.md) | Android 권한 설정이 필요할 때 |
| `SdCapacitorIntentFilter` | interface | [sd-capacitor-config.md](./config/sd-capacitor-config.md) | Android Intent Filter 설정이 필요할 때 |
| `SdElectronConfig` | interface | [sd-electron-config.md](./config/sd-electron-config.md) | Electron 앱 설정이 필요할 때 |
| `SdPwaConfig` | interface | [sd-pwa-config.md](./config/sd-pwa-config.md) | PWA 설정이 필요할 때 |
| `SdPwaManifestConfig` | interface | [sd-pwa-config.md](./config/sd-pwa-config.md) | PWA manifest 설정이 필요할 때 |
| `SdBrowserSupportConfig` | interface | [sd-browser-support-config.md](./config/sd-browser-support-config.md) | 브라우저 호환성 설정이 필요할 때 |
| `NpmConfig` | interface | [npm-config.md](./config/npm-config.md) | `package.json` 구조 타입이 필요할 때 |

## TypeScript Compiler

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdTsCompiler` | class | [sd-ts-compiler.md](./ts-compiler/sd-ts-compiler.md) | Angular/TypeScript 패키지를 프로그래매틱하게 컴파일할 때 |
| `ISdTsCompilerOptions` | interface | [sd-ts-compiler.md](./ts-compiler/sd-ts-compiler.md) | `SdTsCompiler` 생성 옵션이 필요할 때 |
| `ISdTsCompilerResult` | interface | [sd-ts-compiler.md](./ts-compiler/sd-ts-compiler.md) | `compileAsync()` 반환 타입이 필요할 때 |

## Angular Vite Plugin

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `sdAngularPlugin` | function | [sd-angular-plugin.md](./angular-vite-plugin/sd-angular-plugin.md) | Vitest에서 Angular AOT 컴파일이 필요할 때 |
| `SdAngularPluginOptions` | interface | [sd-angular-plugin.md](./angular-vite-plugin/sd-angular-plugin.md) | `sdAngularPlugin` 옵션 타입이 필요할 때 |
