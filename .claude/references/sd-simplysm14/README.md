# @simplysm/* v14 행동 지침

Claude 에이전트가 `@simplysm/*` v14 패키지를 사용·변경하는 작업에서 반드시 지켜야 할 행동 지침.

## 코드 작성 위치 원칙

업무 로직 코드의 기본 작성 위치는 **클라이언트 패키지**. 서버 패키지(`@simplysm/service-server` 기반)에는 다음 두 경우에만 코드를 둠:

- **보안 필요**: 클라이언트에 노출 불가한 자격증명·키, 권한 우회 위험이 있는 처리, 외부에 직접 노출하면 안 되는 연산.
- **클라이언트 실행 불가**: 브라우저·모바일 런타임에서 실행 불가능한 기능 (특정 네이티브 API, 서버 측 자원 접근 등).

ORM 호출, 파일 변환, 비즈니스 로직 등은 위 두 경우에 해당하지 않는 한 클라이언트 코드에 직접 둠. "서버에 두는 게 관행"이라는 이유로 서버 패키지로 이관 금지.

## 프로젝트 `CLAUDE.md` 명령어 표기 규칙

`@simplysm/*` v14 기반 프로젝트의 `CLAUDE.md` 작성 시, 검증 명령 표기 규칙:

- **기본 검증 (평소 사용)**: `pnpm check --fix` — typecheck 와 lint 를 일괄 수행, 자동 수정 포함.
- **보조 명령**: `pnpm typecheck`, `pnpm lint` — `pnpm check` 에서 문제가 났을 때 각각 따로 확인하는 용도. 단독 사용 회피.
- **`-t` 타겟 인자 표기**: `-t` 인자 값은 `sd.config.ts` 의 `packages` 키 (`@simplysm/` 접두사를 **제외** 한 짧은 이름. 예: `excel`, `core-node`, `sd-cli`) 임을 본문에 명시. 풀네임 사용을 막기 위해 예시도 짧은 이름으로 통일.

## 개발 매뉴얼

아래 표의 트리거 조건이 현재 작업에서 처음 충족되는 시점에 해당 매뉴얼 파일을 Read 도구로 읽기.

| 트리거                                                  | 매뉴얼                                                 |
| ------------------------------------------------------- | ------------------------------------------------------ |
| 클라이언트 공통 lint/template 규칙 (예: `$any` 금지) | [client-rules.md](./manuals/client-rules.md)           |
| 화면 컴포넌트(`<domain>.<역할>.ts`) 작성/수정           | [client-component.md](./manuals/client-component.md)   |
| `sd-crud-list` / `sd-crud-detail` 채택한 목록·단건 화면 (편집 진입·삭제/복구·엑셀 다운로드·행 선택 제한) | [client-crud.md](./manuals/client-crud.md)             |
| 클라이언트 데모 컴포넌트 작성                           | [client-demo.md](./manuals/client-demo.md)             |
| `<sd-tab>` 사용                                         | [client-tab.md](./manuals/client-tab.md)               |
| 앱에서 서버 서비스·이벤트 호출 (provider 정의·항목 추가) | [client-service.md](./manuals/client-service.md)       |
| 앱에서 ORM(DB) 사용 (AppOrmProvider 정의)               | [client-orm.md](./manuals/client-orm.md)               |
| 앱에서 공유 마스터 데이터 사용 (provider 정의·항목 추가, 선택 컨트롤의 관리·선택 모달, 좌측 선택+우측 상세 레이아웃) | [client-shared-data.md](./manuals/client-shared-data.md) |
| 클라이언트·서버 간 실시간 이벤트 정의·발생·구독         | [event.md](./manuals/event.md)                         |
| 앱 메뉴 구조·권한 정의 추가/수정                        | [client-app-structure.md](./manuals/client-app-structure.md) |
| ORM 쿼리 작성(조회 흐름·안티패턴), 컬럼 nullable/default·유니크 정책, 삭제 전략 | [orm.md](./manuals/orm.md)                             |
| 이종 엔티티를 한 목록으로 합쳐 표시 (UNION)             | [orm-union.md](./manuals/orm-union.md)                 |
| CRUD 처리에 데이터 변경 이력 적재·조회·표시 (누가·언제·무엇을 변경, 목록의 수정일시·수정자 컬럼) | [data-log.md](./manuals/data-log.md)                   |
| 콘솔 로깅 코드 작성/수정 (모든 패키지)                  | [logging.md](./manuals/logging.md)                     |
| 클라이언트 시스템 에러·로그를 DB 등 외부에 적재·조회    | [client-system-log.md](./manuals/client-system-log.md) |
| 패키지 테스트·통합 테스트 작성/추가                     | [test.md](./manuals/test.md)                           |

## 패키지 인덱스

- **angular** — Angular(zoneless) 기반 SI/업무 클라이언트용 UI 컴포넌트·디렉티브·전역 프로바이더·signal 헬퍼 — 부트스트랩(provideSdAngular)·모달/토스트/busy/인쇄·라우팅/메뉴/권한·폼 입력 컨트롤·시트(sd-sheet)·공유 마스터 데이터·CRUD 화면 골격·사이드바/탑바 레이아웃·칸반/권한표/에디터/시각화를 쓸 때. 자세히: [apis/angular/README.md](./apis/angular/README.md)
- **capacitor-plugin-auto-update** — Android APK 자동 업데이트 Capacitor 플러그인 — 부팅 시 서버/외부저장소의 최신 APK 를 받아 설치하는 오케스트레이터(AutoUpdate.run/runByExternalStorage)와 저수준 설치·권한·버전 조회 정적 클래스(ApkInstaller) 및 브리지 타입(ApkInstallerPlugin/VersionInfo)을 쓸 때. 자세히: [apis/capacitor-plugin-auto-update/README.md](./apis/capacitor-plugin-auto-update/README.md)
- **capacitor-plugin-file-system** — Capacitor 네이티브 파일 시스템 접근(Android OS 파일 시스템 / 웹 IndexedDB 에뮬레이션). FileSystem 정적 메서드로 권한 확인·요청, 디렉토리 읽기/생성, 파일 읽기/쓰기/삭제, 저장소 경로·파일 URI 조회 시. 자세히: [apis/capacitor-plugin-file-system/README.md](./apis/capacitor-plugin-file-system/README.md)
- **capacitor-plugin-intent** — Android 인텐트 송수신 Capacitor 플러그인(Intent 정적 클래스) — 브로드캐스트 구독/전송, 실행 인텐트 조회, newIntent 리스닝, startActivityForResult 외부 Activity 실행·결과 수신. 바코드 스캐너·PDA 등 산업용 디바이스 연동 시 사용. 자세히: [apis/capacitor-plugin-intent/README.md](./apis/capacitor-plugin-intent/README.md)
- **capacitor-plugin-usb-storage** — 연결된 USB Mass Storage 장치를 열거·권한확인 후 디렉토리/파일을 읽는 Capacitor 플러그인. 정적 클래스 UsbStorage 와 입출력 타입(UsbDeviceInfo/UsbDeviceFilter/UsbFileInfo/UsbStoragePlugin) 제공. 자세히: [apis/capacitor-plugin-usb-storage/README.md](./apis/capacitor-plugin-usb-storage/README.md)
- **core-browser** — 브라우저 전용 유틸리티 — DOM 요소 탐색·위치 계산·가시성 확장, IndexedDB 영속화 및 가상 파일시스템, Blob 다운로드·URL 바이너리 수신·파일 선택 대화상자가 필요할 때. 자세히: [apis/core-browser/README.md](./apis/core-browser/README.md)
- **core-common** — 브라우저·Node 공용 기반 유틸 — 날짜/시간 값 타입(DateTime/DateOnly/Time/Uuid), 에러 클래스(SdError 등), 배열/Set/Map 프로토타입 확장, 객체 깊은 복사·비교·병합(obj), 직렬화(json/xml/bytes/transfer), 비동기 큐·이벤트·대기·자동만료 Map, 문자열/숫자/경로/날짜포맷 유틸, 로거·환경변수·원시타입 매핑이 필요할 때. 자세히: [apis/core-common/README.md](./apis/core-common/README.md)
- **core-node** — Node 전용 유틸: 파일시스템 IO(fsx)·경로 가공(pathx)·자식 프로세스 실행(cpx)·glob 감시(FsWatcher)·consola 로깅 셋업(setupConsola)·worker_threads 타입 안전 래퍼(Worker/createWorker)가 필요할 때. 자세히: [apis/core-node/README.md](./apis/core-node/README.md)
- **excel** — OOXML(.xlsx) 워크북을 ZIP 단위 lazy-load 로 읽고 쓰는 라이브러리. ExcelWorkbook/ExcelWorksheet 로 시트·셀 값/수식·스타일·조건부 서식·이미지·행 복사·뷰를, ExcelWrapper 로 Zod 스키마 기반 레코드 ↔ 엑셀 변환을, ExcelUtils 로 주소·날짜 시리얼·숫자형식 변환을 다룰 때. 자세히: [apis/excel/README.md](./apis/excel/README.md)
- **lint** — 심플리즘 ESLint 자산. 커스텀 규칙 9종 플러그인(`@simplysm/lint/eslint-plugin`)과 그 규칙 + typescript-eslint/angular-eslint/import/unused-imports 를 묶은 flat config 프리셋(`@simplysm/lint/eslint-recommended`)을 프로젝트 eslint.config 에 적용하거나 개별 규칙의 검사 대상·메시지·autofix·옵션을 파악할 때. 자세히: [apis/lint/README.md](./apis/lint/README.md)
- **orm-common** — Dialect(MySQL/MSSQL/PostgreSQL) 독립 ORM 코어 — Table/View/Procedure 스키마 빌더, DbContext 상속(연결·트랜잭션·DDL·마이그레이션), Queryable 체이닝(SELECT/CUD·join/include/union/recursive·검색), expr 표현식 빌더(비교·집계·조건·윈도우·서브쿼리), QueryDef/Expr AST·dialect QueryBuilder·결과 파싱을 다룰 때. 자세히: [apis/orm-common/README.md](./apis/orm-common/README.md)
- **orm-node** — Node.js 환경에서 DbContext 를 MySQL/MSSQL/PostgreSQL 에 연결·실행하는 ORM 런타임 — 고수준 createOrm(트랜잭션 경계) 과 저수준 createDbConn/DbConn(raw SQL·파라미터 쿼리·bulk insert·수동 트랜잭션) 제공. 자세히: [apis/orm-node/README.md](./apis/orm-node/README.md)
- **sd-cli** — sd.config.ts 설정 타입(SdConfigFn·타겟별 패키지 설정·배포/Capacitor/Electron/PWA), 패키지 단위 TS/Angular AOT 증분 컴파일러 SdTsCompiler, Vitest용 Angular Vite 플러그인 sdAngularPlugin 을 다룰 때. 자세히: [apis/sd-cli/README.md](./apis/sd-cli/README.md)
- **service-client** — WebSocket 으로 서비스 서버에 접속해 서비스 RPC 호출·서버 푸시 이벤트 구독/발행·파일 업다운로드·서버측 ORM 원격 실행을 수행하는 클라이언트(브라우저/Node 양용)가 필요할 때. 자세히: [apis/service-client/README.md](./apis/service-client/README.md)
- **service-common** — 서버·클라이언트 공유 서비스 통신 계약 — defineEvent 이벤트 정의, 내장 RPC 서비스(OrmService·AutoUpdateService) 시그니처, 앱 메뉴·권한·모듈 구조(AppStructure), WebSocket 바이너리 프로토콜·메시지 타입. 자세히: [apis/service-common/README.md](./apis/service-common/README.md)
- **service-server** — Fastify 기반 RPC 서비스 서버(WebSocket/HTTP 전송, JWT 인증, 정적 파일·업로드, 서버측 이벤트 브로드캐스트, 내장 ORM/자동업데이트 서비스)를 띄우거나 defineService/auth 로 서비스 메서드를 작성할 때. 자세히: [apis/service-server/README.md](./apis/service-server/README.md)
- **storage** — FTP/FTPS/SFTP 원격 스토리지에 접속해 파일·디렉토리를 업로드·다운로드·조회·삭제할 때(StorageFactory.connect 로 연결/종료 자동 관리). 자세히: [apis/storage/README.md](./apis/storage/README.md)
