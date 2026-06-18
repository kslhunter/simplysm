# @simplysm/sd-cli

심플리즘 모노레포 프로젝트의 빌드·변경감지·타입체크/린트·배포·로컬업데이트·플랫폼 실행(Electron/Cordova/Capacitor)·AI 커밋을 수행하는 CLI. 라이브러리 export 는 없고 `bin`(`sd-cli`) 으로만 사용한다. 모든 명령은 작업공간 루트의 설정 파일(`simplysm.js`, default export 함수)을 읽어 동작한다.

## 사용 트리거 인덱스

- **`build` / `watch` 명령** — 모노레포 패키지를 1회 빌드하거나 변경감지 빌드할 때.
- **`check` 명령** — 타입체크·ESLint 만 돌려 오류를 확인할 때(emit 없음).
- **`publish` 명령** — 빌드+버전증가+git태그+npm/로컬/FTP 배포를 한 번에 할 때.
- **`local-update` 명령** — `node_modules` 안의 의존 라이브러리를 로컬 소스로 덮어쓸 때(로컬 개발 동기화).
- **`run-electron` / `build-electron-for-dev` 명령** — watch 중인 클라이언트를 Electron 앱으로 띄우거나 dev용 Electron 빌드할 때.
- **`run-cordova` / `run-capacitor` 명령** — watch 중인 클라이언트를 모바일 디바이스에 webview 앱으로 띄울 때.
- **`commit` 명령** — git 변경분을 AI로 커밋 메시지 생성→커밋·푸시할 때.
- **`postinstall` 명령** — 설치 직후 의존 패키지(`@angular/build`, `cordova`) 패치를 적용할 때(보통 npm `postinstall` 훅에서 자동).
- **`simplysm.js` 설정 스키마** — 위 명령들이 읽는 프로젝트 설정 파일을 작성·수정할 때. 자세히: [project-config.md](./project-config.md)

## 공통 옵션

모든 명령에 공통:
- `--debug` (boolean, 기본 `false`) — 디버그 로그 출력. `true` 면 `SD_DEBUG=true` 설정 + 콘솔 로그 레벨 debug, `false` 면 점(dot) 진행 표시만.
- `--help` / `-h` — 도움말.

빌드/체크/배포 계열 명령에 공통:
- `--config <path>` (string, 기본 `"simplysm.js"`) — 설정 파일 경로. 작업공간 루트 기준 상대경로.
- `--options <...>` (string 배열) — 설정 함수에 전달되는 옵션 문자열들. 설정 함수의 2번째 인자(`opts: string[]`)로 들어감.

## CLI 명령

설정 함수 호출 시 `dev` 인자: `watch`/`check`/`local-update` 는 `true`(개발 모드), `build`/`publish` 는 `false`(프로덕션 모드)로 호출됨.

### `build`
`sd-cli build [--packages <...>]` — 작업공간 모든(또는 지정) 패키지를 1회 빌드. 시작 시 모든 패키지 `package.json` 버전을 patch 증가시키고 의존 버전을 동기화함.
- `--packages <...>` (string 배열) — 빌드 대상 패키지명 필터. 미지정 시 설정의 `packages` 키 전체.

### `watch`
`sd-cli watch [--packages <...>] [--emitOnly] [--noEmit]` — 변경감지 빌드. 설정에 `localUpdates` 가 있으면(그리고 `--noEmit` 아니면) 로컬 업데이트 변경감지도 함께 시작.
- `--packages <...>` (string 배열) — 변경감지 대상 패키지명 필터.
- `--emitOnly` (boolean, 기본 `false`) — emit(산출물 생성)만 수행.
- `--noEmit` (boolean, 기본 `false`) — emit 없이 변경감지만(타입체크/린트). `true` 면 로컬 업데이트 watch 도 건너뜀.

### `check [path]`
`sd-cli check [path] [--type lint|typecheck]` — 타입체크/린트만 수행(`noEmit:true` 빌드). 오류가 하나라도 있으면 종료코드 1.
- `path` (positional, string, 선택) — 패키지 디렉토리 경로면 그 패키지만, 파일 경로면 그 파일이 속한 패키지만 검사하고 결과를 해당 파일로 필터링. 미해석 시 에러.
- `--type` (`"lint" | "typecheck"`) — 체크 종류 필터. `lint` 면 lint 메시지만, `typecheck` 면 compile 메시지만, 미지정 시 둘 다.

### `publish`
`sd-cli publish [--packages <...>] [--noBuild]` — 배포. 흐름: (npm 배포 대상 있으면) npm/yarn 로그인 토큰 확인 → (git 이면) 미커밋 변경 확인 → 버전 patch 증가 → 빌드 → git 커밋·`v<버전>` 태그·push → 패키지별 `publish` 설정에 따라 배포 → `postPublish` 스크립트 실행. 완료 후 `process.exit(0)`.
- `--noBuild` (boolean, 기본 `false`) — 빌드·버전증가·git작업 생략하고 기존 `dist` 만 배포. 위험 경고 후 5초 대기.
- `--packages <...>` (string 배열) — 배포 대상 패키지명 필터.
- 배포 경로 문자열의 `%SD_VERSION%`(패키지 버전)·`%SD_PROJECT_PATH%`(작업공간 경로)·`%ENV%`(환경변수) 치환 지원.

### `local-update`
`sd-cli local-update` — 설정의 `localUpdates`(glob→소스경로 매핑)를 따라 `node_modules`(루트 및 각 패키지 하위)의 대상 패키지를 소스 디렉토리에서 복사. `node_modules`·`package.json` 은 복사 제외. `localUpdates` 없으면 즉시 종료.
- `--config`, `--options` 만 받음.
- 배포본(`.js`) 실행 시 `local-update` 외 명령은 시작 전 자동으로 한 번 `local-update` 를 선행 실행함(`sd-cli.ts`).

### `run-electron <package>`
`sd-cli run-electron <package>` — watch 중인 클라이언트 패키지를 Electron 앱으로 실행.
- `package` (positional, string, 필수) — 패키지명.

### `build-electron-for-dev <package>`
`sd-cli build-electron-for-dev <package>` — 개발용 Electron 빌드.
- `package` (positional, string, 필수) — 패키지명.

### `run-cordova <platform> <package> [url]`
`sd-cli run-cordova <platform> <package> <url>` — watch 중인 클라이언트를 Cordova 디바이스에 webview 앱으로 실행.
- `platform` (positional, string, 필수) — 빌드 플랫폼(`android` 등).
- `package` (positional, string, 필수) — 패키지명.
- `url` (positional, string, 필수) — webview 로 열 URL.

### `run-capacitor <platform> <package> [url]`
`sd-cli run-capacitor <platform> <package> <url>` — watch 중인 클라이언트를 Capacitor 디바이스에 webview 앱으로 실행. 인자는 `run-cordova` 와 동일.

### `commit`
`sd-cli commit` — `git add .` 후 staged diff 를 Anthropic API(`claude-haiku-4-5`)로 보내 한국어 커밋 메시지 생성 → 커밋·푸시. `ANTHROPIC_API_KEY` 환경변수 필수(없으면 에러). staged 변경이 없으면 에러. `.*`/`_*`/`yarn.lock`/`**/package.json`/`styles.css`/`*.map` 은 diff 에서 제외.

### `postinstall`
`sd-cli postinstall` — 설치 후 패치 작업. `@angular/build` 의 `package.json` 에서 `exports` 제거, `cordova/bin/cordova` 의 종료코드/에러출력 처리 수정. 옵션 없음.
