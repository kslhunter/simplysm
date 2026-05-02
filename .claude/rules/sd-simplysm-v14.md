# @simplysm/* 라이브러리 문서 인덱스

## 필수 규칙

`@simplysm/*`를 import하는 파일 작성·수정 전, 해당 패키지의 README.md를 Read한다.
API 시그니처·사용 예시·anti-pattern·제약사항이 들어 있다.

- 모든 수정에 예외 없이 적용 ("간단한 수정" 포함)

## 표준 API → simplysm 매핑

표준 API·외부 라이브러리·직접 구현으로 처리하던 작업이 `@simplysm/*`에 동등 기능이 있으면 simplysm 쪽을 사용한다.
세부 사용법은 각 패키지 README를 참조한다.

### `@simplysm/core-common`

- 바이트 배열: `Buffer` 금지 → `Uint8Array` (복잡한 연산은 `BytesUtils`)
- 이벤트: `events`/`eventemitter3` 금지 → `EventEmitter`
- 환경변수: `process.env`/`import.meta.env` 직접 접근 금지, `NODE_ENV` 사용 금지 → `env("...")`
- 날짜·시간: `Date` 사용 금지 → `DateTime`/`DateOnly`/`Time`
- UUID: `crypto.randomUUID()`/`uuid` 패키지 금지 → `Uuid.new()`
- JSON 직렬화: 커스텀 타입(`DateTime`/`Uuid` 등) 포함 시 `JSON.parse`/`JSON.stringify` 금지 → `json.parse()`/`json.stringify()`
- ZIP: 외부 zip 라이브러리 금지 → `ZipArchive`
- XML: 외부 xml 라이브러리 금지 → `xml` 유틸
- 디바운스: 직접 구현 금지 → `DebounceQueue`
- 비동기 순차 실행: 직접 구현 금지 → `SerialQueue`
- 시간 대기: `new Promise(r => setTimeout(r, ms))` 금지 → `Wait.time(ms)`
- 조건 대기: 직접 폴링 루프 금지 → `Wait.until(...)`
- 에러: `new Error(...)` 단순 throw 금지 → `SdError`(원인 체이닝)·`ArgumentError`·`NotImplementedError`·`TimeoutError`
- Worker 데이터 전송: 직접 직렬화 금지 → `transfer` 유틸
- 문자열: 한국어 조사·전각/반각·케이스 직접 처리 금지 → `Str` 유틸

### `@simplysm/core-browser`

- IndexedDB: `indexedDB` 직접 사용 금지 → `IndexedDbStore`
- Blob 다운로드: `a[download]` + `Blob` 트릭 금지 → `downloadBlob()`
- 파일 선택: `<input type="file">` 동적 생성 금지 → `openFileDialog()`
- 진행률 fetch: `fetch` + 진행률 직접 구현 금지 → `fetchUrlBytes()`

### `@simplysm/core-node`

- 파일 시스템: `node:fs`/`fs/promises` 직접 사용 금지 → `Fsx`
- 파일 감시: `chokidar`/`fs.watch` 직접 사용 금지 → `FsWatcher`
- 외부 명령 실행: `child_process`(`spawn`/`exec`) 직접 사용 금지 → `Cpx`
- Worker 스레드: `worker_threads` 직접 사용 금지 → `Worker.create()`
- 경로: `node:path` 직접 사용 금지 → `pathx`
- 로깅(서버/CLI): `console.*` 금지 → `setupConsola()` 후 `consola.*` 사용

### `@simplysm/angular`

- 컴포넌트 비동기 초기화: `async ngOnInit` / `void (async () => { })()` IIFE 금지 → `effect() + untracked(async)` 패턴
- localStorage: 직접 사용 금지 → `SdLocalStorageProvider` (clientName 스코프)
- 새 윈도우: `window.open` 직접 호출 금지 → `SdNavigateWindowProvider`

## 패키지 목록

| 패키지 | 문서 경로 | 설명 |
|--------|-----------|------|
| `@simplysm/angular` | `.claude/references/sd-simplysm-v14/angular/README.md` | Angular 21 UI 컴포넌트, 디렉티브, 프로바이더, 레시피 |
| `@simplysm/core-common` | `.claude/references/sd-simplysm-v14/core-common/README.md` | 플랫폼 중립 유틸리티 (DateTime, UUID, EventEmitter 등) |
| `@simplysm/core-browser` | `.claude/references/sd-simplysm-v14/core-browser/README.md` | 브라우저 전용 유틸리티 |
| `@simplysm/core-node` | `.claude/references/sd-simplysm-v14/core-node/README.md` | Node.js 유틸리티 (Fsx, Cpx, FsWatcher 등) |
| `@simplysm/service-server` | `.claude/references/sd-simplysm-v14/service-server/README.md` | Fastify 기반 서비스 서버 |
| `@simplysm/service-client` | `.claude/references/sd-simplysm-v14/service-client/README.md` | 서비스 클라이언트 (WebSocket/HTTP) |
| `@simplysm/service-common` | `.claude/references/sd-simplysm-v14/service-common/README.md` | 서버-클라이언트 공유 프로토콜, 타입 |
| `@simplysm/orm-node` | `.claude/references/sd-simplysm-v14/orm-node/README.md` | Node.js ORM (MSSQL, MySQL, PostgreSQL) |
| `@simplysm/orm-common` | `.claude/references/sd-simplysm-v14/orm-common/README.md` | ORM 공통 쿼리빌더, 스키마, 타입 |
| `@simplysm/excel` | `.claude/references/sd-simplysm-v14/excel/README.md` | 엑셀 파일 읽기/쓰기 |
| `@simplysm/storage` | `.claude/references/sd-simplysm-v14/storage/README.md` | FTP/SFTP 스토리지 클라이언트 |
| `@simplysm/sd-cli` | `.claude/references/sd-simplysm-v14/sd-cli/README.md` | 빌드/체크 CLI 도구 |
| `@simplysm/sd-claude` | `.claude/references/sd-simplysm-v14/sd-claude/README.md` | Claude Code 에셋 동기화 |
| `@simplysm/lint` | `.claude/references/sd-simplysm-v14/lint/README.md` | ESLint 공유 설정 |
| `@simplysm/capacitor-plugin-auto-update` | `.claude/references/sd-simplysm-v14/capacitor-plugin-auto-update/README.md` | Capacitor 자동 업데이트 플러그인 |
| `@simplysm/capacitor-plugin-file-system` | `.claude/references/sd-simplysm-v14/capacitor-plugin-file-system/README.md` | Capacitor 파일 시스템 플러그인 |
| `@simplysm/capacitor-plugin-intent` | `.claude/references/sd-simplysm-v14/capacitor-plugin-intent/README.md` | Capacitor Intent 플러그인 |
| `@simplysm/capacitor-plugin-usb-storage` | `.claude/references/sd-simplysm-v14/capacitor-plugin-usb-storage/README.md` | Capacitor USB 스토리지 플러그인 |

## 미지원 기능 발견 시

필요한 기능이 `@simplysm/*`에 미지원이면 `sd-clarify` 지침에 따라 다음 선택지로 묻는다.

- 우회 구현 진행 (비-simplysm 방식)
- 이슈 등록 후 작업 보류 (`/sd-issue` 호출 → 라이브러리 보완 대기, 다른 작업 진행)
- 수행 안 함
