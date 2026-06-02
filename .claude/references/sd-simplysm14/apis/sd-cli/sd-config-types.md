# @simplysm/sd-cli — sd.config.ts 설정 타입

프로젝트 루트 `sd.config.ts` 작성에 쓰는 타입 묶음. `sd.config.ts` 는 `SdConfigFn`(=`(params: SdConfigParams) => SdConfig | Promise<SdConfig>`)을 default export 해야 함. 권위 소스는 `packages/sd-cli/src/sd-config.types.ts`.

## SdConfigFn / SdConfigParams

`sd.config.ts` 의 default export 시그니처. `SdConfig` 또는 그 Promise 를 반환.

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

`SdConfigParams` (함수에 주입되는 인자):

- cwd: string — 현재 작업 디렉토리(워크스페이스 루트). 경로 계산 기준.
- dev: boolean — 개발 모드 플래그. true 면 dev 실행, false 면 빌드/배포. env 분기에 사용.
- opt: string[] — CLI 의 `-o` 플래그로 전달된 추가 옵션 문자열 배열. 조건부 설정 분기용.

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";
const config: SdConfigFn = ({ dev }) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
  },
});
export default config;
```

## SdConfig

`sd.config.ts` 최상위 설정 객체.

- packages: Record<string, SdPackageConfig | undefined> — 패키지별 설정. key 는 `packages/` 하위 디렉토리명(예: `"core-common"`). 값을 `undefined` 로 두면 해당 패키지 비활성. 빌드 대상·타겟을 패키지마다 지정.
- replaceDeps?: Record<string, string> — 의존성 교체. key 는 node_modules 에서 찾을 패키지 glob(예: `"@simplysm/*"`), value 는 소스 디렉토리 경로이며 key 의 `*` 캡처가 value 의 `*` 에 치환됨. node_modules 패키지를 로컬 소스로 심링크해 빌드 없이 소스 import 할 때.
- postPublish?: SdPostPublishScriptConfig[] — 배포 완료 후 순차 실행할 스크립트 목록. 배포 후 후처리(태깅·알림 등)에 사용.

## SdPackageConfig (타겟별 패키지 설정)

`SdBuildPackageConfig | SdClientPackageConfig | SdServerPackageConfig | SdScriptsPackageConfig` 의 union. `target` 값으로 분기된다.

### SdBuildPackageConfig (라이브러리: node/browser/neutral)

- target: "node" | "browser" | "neutral" — esbuild 라이브러리 빌드 타겟. "node" = Node.js 전용, "browser" = 브라우저 전용, "neutral" = 공용. 패키지 실행 환경에 맞춰 선택.
- publish?: SdPublishConfig — 배포 설정. 미지정 시 배포 제외.
- copySrc?: string[] — `src/` 에서 `dist/` 로 그대로 복사할 파일의 glob 패턴(src/ 기준 상대 경로). 비-TS 리소스 동봉용.
- watch?: SdWatchHookConfig — watch 훅. 지정 시 watch 모드에서 빌드 엔진과 함께 훅 명령 실행.

### SdClientPackageConfig (Frontend 앱: target "client")

- target: "client" — esbuild 기반 Angular 클라이언트 앱 빌드.
- server: string | number — 연결할 서버. string = 서버 패키지명(예: `"demo-server"`), number = 포트 직접 지정(하위 호환). 개발 프록시/API 대상 결정.
- env?: Record<string, string> — 빌드 시 `process.env` 를 객체로 치환할 환경 변수. 클라이언트 코드의 env 주입.
- publish?: SdPublishConfig — 배포 설정.
- capacitor?: SdCapacitorConfig — Capacitor(모바일) 패키징 설정. 지정 시 앱 패키징.
- electron?: SdElectronConfig — Electron(데스크톱) 패키징 설정. 지정 시 데스크톱 패키징.
- configs?: Record<string, unknown> — 런타임 설정. 빌드 시 `dist/.config.json` 으로 기록되어 런타임에 로드됨.
- exclude?: string[] — Capacitor/Electron package.json 에 추가할 패키지(또는 제외 목록). 패키징 의존성 조정.
- browserSupport?: SdBrowserSupportConfig — 브라우저 지원(browserslist·PostCSS·legacyModule) 설정.
- pwa?: false | SdPwaConfig — PWA 설정. `false` 면 비활성, 미지정 시 기본값으로 활성화. PWA manifest 제어.

### SdServerPackageConfig (Fastify 서버: target "server")

- target: "server" — esbuild 기반 Fastify 서버 앱 빌드.
- env?: Record<string, string> — 빌드 시 `process.env.KEY` 를 상수로 치환할 환경 변수.
- publish?: SdPublishConfig — 배포 설정.
- configs?: Record<string, unknown> — 런타임 설정. 빌드 시 `dist/.config.json` 으로 기록.
- externals?: string[] — esbuild 번들에 포함하지 않을 외부 모듈. 네이티브 모듈(binding.gyp 자동 감지분에 추가)을 번들 제외할 때.
- pm2?: { name?: string; ignoreWatchPaths?: string[] } — PM2 설정. 지정 시 `dist/pm2.config.cjs` 생성. `name` = 프로세스 이름(미지정 시 package.json name 기반), `ignoreWatchPaths` = PM2 watch 제외 경로.
- packageManager?: "volta" | "mise" — 사용할 패키지 매니저. 생성되는 mise.toml/volta 설정에 영향. 배포 환경의 런타임 관리자 선택.

### SdScriptsPackageConfig (유틸 스크립트: target "scripts")

- target: "scripts" — 빌드 산출 없는 스크립트 전용 패키지. watch 훅 미설정 시 watch/typecheck 에서 제외됨.
- publish?: SdPublishConfig — 배포 설정.
- watch?: SdWatchHookConfig — watch 훅. 지정 시 watch 모드에 패키지 포함.

## SdWatchHookConfig

watch 모드에서 파일 변경 시 임의 명령을 실행하는 훅. `SdBuildPackageConfig.watch` / `SdScriptsPackageConfig.watch` 에 사용.

- target: string[] — 감시할 glob 패턴(패키지 디렉토리 기준 상대 경로). 어떤 파일 변경을 트리거로 볼지.
- cmd: string — 변경 시 실행할 명령어.
- args?: string[] — 명령어 인수.

## 배포 설정 (SdPublishConfig 계열)

`SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig` union. `type` 으로 분기.

- SdNpmPublishConfig — `{ type: "npm" }`. npm 레지스트리 배포.
- SdLocalDirectoryPublishConfig — `{ type: "local-directory"; path: string }`. 로컬 디렉토리 복사 배포. `path` 는 환경 변수 치환(`%VER%`, `%PROJECT%`) 지원.
- SdStoragePublishConfig — FTP/FTPS/SFTP 업로드 배포.
  - type: "ftp" | "ftps" | "sftp" — 전송 프로토콜. 보안 필요 시 ftps/sftp.
  - host: string — 서버 호스트.
  - port?: number — 포트.
  - path?: string — 업로드 대상 경로.
  - user?: string — 접속 계정.
  - password?: string — 접속 비밀번호.

`SdPostPublishScriptConfig` (배포 후 스크립트):

- type: "script" — 스크립트 실행 항목.
- cmd: string — 실행 명령어.
- args: string[] — 인수. 환경 변수 치환(`%VER%`, `%PROJECT%`) 지원.

## Capacitor 설정 (SdClientPackageConfig.capacitor)

`SdCapacitorConfig`:

- appId: string — 앱 ID(예: `"com.example.app"`).
- appName: string — 앱 이름.
- plugins?: Record<string, Record<string, unknown> | true> — Capacitor 플러그인 설정. key = 패키지명, value = `true`(옵션 없음) 또는 플러그인 옵션 객체.
- icon?: string — 앱 아이콘 경로(패키지 디렉토리 기준 상대).
- debug?: boolean — 디버그 빌드 플래그.
- platform?: { android?: SdCapacitorAndroidConfig } — 플랫폼별 설정(현재 android).

`SdCapacitorAndroidConfig`:

- config?: Record<string, string> — AndroidManifest.xml `application` 태그 속성(예: `{ requestLegacyExternalStorage: "true" }`).
- bundle?: boolean — true 면 AAB 번들, false 면 APK 빌드.
- intentFilters?: SdCapacitorIntentFilter[] — Intent Filter 목록.
- sign?: SdCapacitorSignConfig — APK/AAB 서명 설정.
- sdkVersion?: number — Android SDK 버전(minSdk·targetSdk 공통).
- permissions?: SdCapacitorPermission[] — 추가 권한 목록.

`SdCapacitorIntentFilter`:

- action?: string — intent 액션(예: `"android.intent.action.VIEW"`).
- category?: string — intent 카테고리(예: `"android.intent.category.DEFAULT"`).

`SdCapacitorSignConfig`:

- keystore: string — keystore 파일 경로(패키지 디렉토리 기준 상대).
- storePassword: string — keystore 비밀번호.
- alias: string — 키 별칭.
- password: string — 키 비밀번호.
- keystoreType?: string — keystore 타입(기본 `"jks"`).

`SdCapacitorPermission`:

- name: string — 권한 이름(예: `"CAMERA"`, `"WRITE_EXTERNAL_STORAGE"`).
- maxSdkVersion?: number — 권한 적용 최대 SDK 버전.
- ignore?: string — `tools:ignore` 속성 값.

## Electron 설정 (SdElectronConfig)

- appId: string — Electron 앱 ID(예: `"com.example.myapp"`).
- portable?: boolean — true 면 포터블 `.exe`, false/미지정 시 NSIS 설치 프로그램.
- installerIcon?: string — 설치 프로그램 아이콘 경로(`.ico`, 패키지 기준 상대).
- reinstallDependencies?: string[] — Electron 에 포함할 npm 패키지(네이티브 모듈 등).
- postInstallScript?: string — npm postinstall 스크립트.
- nsisOptions?: Record<string, unknown> — NSIS 옵션(`portable` 이 false 일 때 적용).
- env?: Record<string, string> — 환경 변수. `electron-main.ts` 에서 `process.env` 로 접근.

## PWA 설정 (SdPwaConfig)

`SdPwaConfig`:

- manifest?: SdPwaManifestConfig — PWA manifest 설정.

`SdPwaManifestConfig` (모두 선택):

- name?: string — 앱 전체 이름.
- short_name?: string — 짧은 이름(홈 화면 등).
- display?: "standalone" | "fullscreen" | "minimal-ui" | "browser" — 표시 모드. "standalone" = 단독 앱처럼, "fullscreen" = 전체 화면, "minimal-ui" = 최소 브라우저 UI, "browser" = 일반 탭. 앱 체감 수준 선택.
- theme_color?: string — 테마 색상.
- background_color?: string — 스플래시 배경 색상.
- icons?: Array<{ src: string; sizes: string; type?: string }> — 아이콘 목록. `src` = 경로, `sizes` = 크기 문자열(예: `"512x512"`), `type` = MIME 타입.

## 보조 타입

- BuildTarget — `"node" | "browser" | "neutral"`. `SdBuildPackageConfig.target` 값 집합.
- NpmConfig — npm `package.json` 구조 타입(`name`, `version`, `description?`, `dependencies?`, `devDependencies?`, `peerDependencies?`, `volta?`). 설정 코드에서 package.json 을 타입 있게 다룰 때.
