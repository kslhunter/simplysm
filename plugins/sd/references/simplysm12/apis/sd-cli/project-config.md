# @simplysm/sd-cli — simplysm.js 설정 스키마

작업공간 루트의 설정 파일(기본 `simplysm.js`)은 **default export 함수** `(dev: boolean, opts: string[]) => ISdProjectConfig` 형태여야 한다. 모든 CLI 명령이 `loadProjConfAsync` 로 이 파일을 dynamic import 하여 `default(dev, opts)` 를 호출한다. `dev` 는 `watch`/`check`/`local-update` 에서 `true`, `build`/`publish` 에서 `false`. `opts` 는 `--options` 로 넘긴 문자열 배열(없으면 `[]`).

## `ISdProjectConfig`

루트 반환 타입.
- `packages: Record<string, TSdPackageConfig | undefined>` — 패키지명→패키지설정 맵. 키는 패키지 디렉토리의 basename. 여기에 없는 패키지명은 빌드/배포 대상에서 제외되고, 여기 있으나 작업공간에 없는 패키지명은 에러.
- `localUpdates?: Record<string, string>` — `local-update`/`watch` 용. 키는 `node_modules` 안 패키지 glob(`*` 캡처 가능), 값은 복사해올 소스 디렉토리 경로(`*` 는 캡처된 이름으로 치환). 대상은 루트 `node_modules` 와 `packages/*/node_modules` 양쪽에서 glob.
- `postPublish?: TSdPostPublishConfig[]` — `publish` 완료 후 실행할 작업 목록.

## `TSdPackageConfig`

`type` 리터럴로 분기되는 유니온: `ISdLibPackageConfig | ISdServerPackageConfig | ISdClientPackageConfig`. 제네릭 인자(`"library"|"server"|"client"`)로 특정 타입만 좁힐 수 있음.

### `ISdLibPackageConfig` (`type: "library"`)
- `type: "library"` — 라이브러리 패키지 식별자.
- `publish?: "npm"` — 배포 방식. `"npm"` 이면 `yarn npm publish --access public` 실행. 미지정 시 배포 안 함.
- `polyfills?: string[]` — 번들에 포함할 polyfill 모듈 목록.
- `index?: { excludes?: string[] } | false` — index 파일 자동 생성 설정. `false` 면 생성 안 함, 객체면 `excludes` 의 파일들을 index 생성에서 제외.
- `dbContext?: string` — DbContext 파일 생성 대상 클래스/경로 지정.
- `forceProductionMode?: boolean` — `true` 면 dev 빌드에서도 프로덕션 모드로 강제.

### `ISdServerPackageConfig` (`type: "server"`)
- `type: "server"` — 서버 패키지 식별자.
- `externals?: string[]` — 번들에서 제외(external 처리)할 모듈 목록.
- `publish?: ISdLocalDirectoryPublishConfig | ISdFtpPublishConfig` — 배포 대상(로컬 디렉토리 또는 FTP 계열).
- `configs?: Record<string, any>` — 서버 런타임에 주입할 임의 설정 값.
- `env?: Record<string, string>` — 빌드/실행 환경변수.
- `forceProductionMode?: boolean` — `true` 면 dev 빌드에서도 프로덕션 모드 강제.
- `pm2?` — PM2 배포 설정.
  - `name?: string` — PM2 프로세스명.
  - `ignoreWatchPaths?: string[]` — PM2 watch 제외 경로.
  - `noInterpreter?: boolean` — `true` 면 interpreter 지정 생략.
  - `noStartScript?: boolean` — `true` 면 start 스크립트 생성 생략.
- `iis?` — IIS 배포 설정.
  - `nodeExeFilePath?: string` — IIS 에서 사용할 node 실행 파일 경로.

### `ISdClientPackageConfig` (`type: "client"`)
- `type: "client"` — 클라이언트 패키지 식별자.
- `server?: string | { port: number }` — 연결할 서버 패키지명(string) 또는 dev 서버 포트(`{ port }`).
- `publish?: ISdLocalDirectoryPublishConfig | ISdFtpPublishConfig` — 배포 대상.
- `env?: Record<string, string>` — 환경변수.
- `configs?: Record<string, any>` — 클라이언트에 주입할 임의 설정 값.
- `noLazyRoute?: boolean` — `true` 면 라우트 lazy 로딩 비활성화.
- `forceProductionMode?: boolean` — `true` 면 dev 빌드에서도 프로덕션 모드 강제.
- `builder?` — 빌드 타겟별 설정.
  - `web?: ISdClientBuilderWebConfig` — 웹 빌드.
  - `electron?: ISdClientBuilderElectronConfig` — Electron 빌드.
  - `capacitor?: ISdClientBuilderCapacitorConfig` — Capacitor 빌드.
  - `cordova?: ISdClientBuilderCordovaConfig` — **@deprecated** Cordova 빌드.

## 배포 대상 타입

### `ISdLocalDirectoryPublishConfig`
- `type: "local-directory"` — 로컬 디렉토리 복사 배포.
- `path: string` — 복사 대상 루트 경로. `%SD_VERSION%`/`%SD_PROJECT_PATH%`/`%ENV%` 치환됨. `dist/**/*` 를 이 경로로 복사.

### `ISdFtpPublishConfig`
- `type: "ftp" | "ftps" | "sftp"` — 원격 업로드 방식. `ftp`(평문)/`ftps`(TLS)/`sftp`(SSH).
- `host: string` — 접속 호스트.
- `port?: number` — 포트.
- `path?: string` — 업로드 대상 경로(기본 `/`). `dist` 를 이 경로로 업로드.
- `user?: string` / `pass?: string` — 인증 정보.

## 빌드 타겟 설정 타입

### `ISdClientBuilderWebConfig`
- `env?: Record<string, string>` — 웹 빌드 환경변수.

### `ISdClientBuilderElectronConfig`
- `appId: string` — Electron 앱 ID(필수).
- `installerIcon?: string` — 설치 프로그램 아이콘 경로.
- `portable?: boolean` — `true` 면 portable 빌드.
- `postInstallScript?: string` — 설치 후 실행 스크립트.
- `nsisOptions?: electronBuilder.NsisOptions` — electron-builder NSIS 옵션 그대로 전달.
- `reinstallDependencies?: string[]` — 재설치(rebuild)할 네이티브 의존성 목록.
- `env?: Record<string, string>` — 환경변수.

### `ISdClientBuilderCapacitorConfig`
- `appId: string` — 앱 ID(필수).
- `appName: string` — 앱 이름(필수).
- `plugins?: Record<string, Record<string, unknown> | true>` — 사용 Capacitor 플러그인 맵. 값이 `true` 면 옵션 없이, 객체면 해당 옵션으로.
- `icon?: string` — 앱 아이콘 경로.
- `debug?: boolean` — `true` 면 디버그 빌드.
- `platform?.android?` — Android 플랫폼 설정.
  - `config?: Record<string, string>` — Android 설정 키-값.
  - `bundle?: boolean` — `true` 면 AAB 번들 빌드.
  - `intentFilters?: { action?: string; category?: string }[]` — 인텐트 필터 목록.
  - `sign?: { keystore; storePassword; alias; password; keystoreType? }` — 서명 정보.
  - `sdkVersion?: number` — 타겟 SDK 버전.
  - `permissions?: { name; maxSdkVersion?; ignore? }[]` — 권한 목록(`ignore` 로 매니페스트 병합 동작 제어).
- `env?: Record<string, string>` — 환경변수.
- `browserslist?: string[]` — browserslist 타겟.

### `ISdClientBuilderCordovaConfig` (**@deprecated**)
- `appId`/`appName` — 앱 ID/이름(필수).
- `plugins?: string[]` — Cordova 플러그인 ID 목록.
- `icon?: string` — 아이콘 경로.
- `debug?: boolean` — `true` 면 디버그 빌드.
- `platform?.browser?: {}` / `platform?.android?` — 플랫폼별 설정(android: `config`/`bundle`/`sign`/`sdkVersion`/`permissions`, Capacitor 와 유사하나 `sign.keystoreType` 필수).
- `env?: Record<string, string>` / `browserslist?: string[]` — 환경변수 / browserslist 타겟.

## `TSdPostPublishConfig`

`publish` 후 실행 작업. 현재 `ISdPostPublishScriptConfig` 단일 타입.

### `ISdPostPublishScriptConfig`
- `type: "script"` — 스크립트 실행 작업.
- `cmd: string` — 실행 명령. `%SD_VERSION%`(작업공간 버전)/`%SD_PROJECT_PATH%`/`%ENV%` 치환됨.
- `args: string[]` — 명령 인자. 각 인자도 동일하게 치환됨.
