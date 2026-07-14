# @simplysm/* v14 개발 안내

에이전트가 `@simplysm/*` v14 패키지를 사용·변경할 때 따르는 안내. 세 부분으로 구성함:

- **행동 지침** — `@simplysm/*` 작업에서 항상 지킬 규칙.
- **개발 매뉴얼** — 작업 트리거가 처음 충족되는 시점에 해당 `manuals/*.md` 를 Read.
- **패키지 인덱스** — 패키지의 심볼·API 를 쓰거나 해석할 때 해당 `apis/*` 를 Read.

## 행동 지침

### 매뉴얼·apis 문서의 위상

개발 매뉴얼과 패키지 인덱스가 가리키는 `manuals/*`·`apis/*` 문서의 명시 규정(API 시그니처·동작 등)은 `결정 근거`이되, 실제 코드와 어긋나면 코드를 우선함. 권장·제안(사용 방식)은 자동 채택하지 말고 코드 패턴·사용자 합의로 판단함.

### 코드 작성 위치 원칙

업무 로직 코드의 기본 작성 위치는 **클라이언트 패키지**. 서버 패키지(`@simplysm/service-server` 기반)에는 다음 두 경우에만 코드를 둠:

- **보안 필요**: 클라이언트에 노출 불가한 자격증명·키, 권한 우회 위험이 있는 처리, 외부에 직접 노출하면 안 되는 연산.
- **클라이언트 실행 불가**: 브라우저·모바일 런타임에서 실행 불가능한 기능 (특정 네이티브 API, 서버 측 자원 접근 등).

ORM 호출, 파일 변환, 비즈니스 로직 등은 위 두 경우에 해당하지 않는 한 클라이언트 코드에 직접 둠. "서버에 두는 게 관행"이라는 이유로 서버 패키지로 이관 금지.

### 프로젝트 `CLAUDE.md` 명령어 표기 규칙

`@simplysm/*` v14 기반 프로젝트의 `CLAUDE.md` 작성 시, 검증 명령 표기 규칙:

- **기본 검증 (평소 사용)**: `pnpm check --fix` — typecheck 와 lint 를 일괄 수행, 자동 수정 포함.
- **보조 명령**: `pnpm typecheck`, `pnpm lint` — `pnpm check` 에서 문제가 났을 때 각각 따로 확인하는 용도. 단독 사용은 회피함.
- **`-t` 타겟 인자 표기**: `check`/`typecheck`/`lint` 의 `-t` 는 `pnpm-workspace.yaml` 중 `packages/*`, `tests/*` 의 디렉터리명(예: `core-common`, `orm`)을 사용. `build`/`watch`/`dev`/`publish`/`device` 의 `-t` 는 `sd.config.ts#packages` 키(`@simplysm/` 접두사 제외, 예: `excel`, `core-node`, `sd-cli`)를 사용. 풀네임 사용을 막기 위해 예시는 짧은 이름으로 통일함.

## 개발 매뉴얼

아래 표의 트리거 조건이 현재 작업에서 처음 충족되는 시점에 해당 매뉴얼 파일을 Read 도구로 읽음.

| 트리거                                                                                                               | 매뉴얼                                                       |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 클라이언트 공통 lint/template 규칙 (예: `$any` 금지)                                                                 | [client-rules.md](./manuals/client-rules.md)                 |
| 화면 컴포넌트(`<domain>.<역할>.ts`) 작성/수정                                                                        | [client-component.md](./manuals/client-component.md)         |
| `sd-crud-list` / `sd-crud-detail` 채택한 목록·단건 화면 (편집 진입·삭제/복구·엑셀 다운로드·행 선택 제한)             | [client-crud.md](./manuals/client-crud.md)                   |
| 클라이언트 데모 컴포넌트 작성                                                                                        | [client-demo.md](./manuals/client-demo.md)                   |
| `<sd-tab>` 사용                                                                                                      | [client-tab.md](./manuals/client-tab.md)                     |
| 화면 데이터를 종이 인쇄·PDF 출력 (`.print-template.ts` 작성, `printAsync`/`getPdfBufferAsync`, PDF 다운로드·이메일)  | [client-print.md](./manuals/client-print.md)                 |
| 앱에서 서버 서비스·이벤트 호출 (provider 정의·항목 추가)                                                             | [client-service.md](./manuals/client-service.md)             |
| 앱에서 ORM(DB) 사용 (AppOrmProvider 정의)                                                                            | [client-orm.md](./manuals/client-orm.md)                     |
| 앱에서 공유 마스터 데이터 사용 (provider 정의·항목 추가, 선택 컨트롤의 관리·선택 모달, 좌측 선택+우측 상세 레이아웃) | [client-shared-data.md](./manuals/client-shared-data.md)     |
| 클라이언트·서버 간 실시간 이벤트 정의·발생·구독                                                                      | [event.md](./manuals/event.md)                               |
| 앱 메뉴 구조·권한 정의 추가/수정                                                                                     | [client-app-structure.md](./manuals/client-app-structure.md) |
| 클라이언트 SSG(프리렌더·SEO) 셋업, `prerender` 설정, SSR-safe 화면 작성                                              | [client-ssg.md](./manuals/client-ssg.md)                     |
| ORM 쿼리 작성(조회 흐름·안티패턴), 컬럼 nullable/default·유니크 정책, 삭제 전략                                      | [orm.md](./manuals/orm.md)                                   |
| 이종 엔티티를 한 목록으로 합쳐 표시 (UNION)                                                                          | [orm-union.md](./manuals/orm-union.md)                       |
| CRUD 처리에 데이터 변경 이력 적재·조회·표시 (누가·언제·무엇을 변경, 목록의 수정일시·수정자 컬럼)                     | [data-log.md](./manuals/data-log.md)                         |
| 콘솔 로깅 코드 작성/수정 (모든 패키지)                                                                               | [logging.md](./manuals/logging.md)                           |
| 클라이언트 시스템 에러·로그를 DB 등 외부에 적재·조회                                                                 | [client-system-log.md](./manuals/client-system-log.md)       |
| 클라이언트 사용자별 UI·시스템 설정을 DB 등에 영속화 (`SdSystemConfigProvider.fn` 배선, 시트 컬럼 설정 서버 저장)     | [client-system-config.md](./manuals/client-system-config.md) |
| 패키지 테스트·통합 테스트 작성/추가                                                                                  | [test.md](./manuals/test.md)                                 |

## 패키지 인덱스

패키지의 심볼·API 를 쓰거나 해석할 때 해당 패키지 문서를 Read.

- **angular** — Angular 22 기반 클라이언트 UI 라이브러리. 앱 초기화·설정·권한, UI 컨트롤, 레이아웃, 데이터 표시(시트/칸반), 모달/토스트, CRUD 기본 등 클라이언트 애플리케이션 구축에 필요한 종합 기능을 다룰 때. 자세히: [apis/angular/README.md](./apis/angular/README.md)
- **capacitor-plugin-auto-update** — Android 앱의 자동 업데이트 흐름(서버 또는 외부저장소 기반)을 구현하거나 APK 설치·권한 제어를 저수준으로 다룰 때. 자세히: [apis/capacitor-plugin-auto-update/README.md](./apis/capacitor-plugin-auto-update/README.md)
- **capacitor-plugin-file-system** — Capacitor 플랫폼의 네이티브 파일 시스템 접근(읽기·쓰기·삭제·디렉토리 관리, 권한 요청)을 다룰 때. 자세히: [apis/capacitor-plugin-file-system/README.md](./apis/capacitor-plugin-file-system/README.md)
- **capacitor-plugin-intent** — 산업용 디바이스(바코드 스캐너, PDA 등) 연동 시 Android Intent 기능을 JavaScript에서 제어할 때. 자세히: [apis/capacitor-plugin-intent/README.md](./apis/capacitor-plugin-intent/README.md)
- **capacitor-plugin-usb-storage** — USB Mass Storage 장치 열거·권한 확인/요청·디렉토리/파일 읽기를 다룰 때. 자세히: [apis/capacitor-plugin-usb-storage/README.md](./apis/capacitor-plugin-usb-storage/README.md)
- **core-browser** — DOM 요소 조회·조작·상대 위치·가시성 판정, IndexedDB 저장소·가상 파일시스템, 파일 다운로드·수신·선택을 다룰 때. 자세히: [apis/core-browser/README.md](./apis/core-browser/README.md)
- **core-common** — 브라우저·Node 공용 기반: 에러 클래스, 값 타입(DateTime/DateOnly/Time/Uuid), 이벤트/큐, Array/Set/Map 확장, 객체·문자열·숫자·바이트·경로·JSON/XML/ZIP 변환 유틸을 쓸 때. 자세히: [apis/core-common/README.md](./apis/core-common/README.md)
- **core-node** — Node 런타임에서 파일시스템·경로·자식 프로세스·파일 감시·consola reporter·worker_threads 프록시를 다룰 때. 자세히: [apis/core-node/README.md](./apis/core-node/README.md)
- **excel** — XLSX/XLSB 워크북·시트·행·열·셀 읽기/쓰기, 스타일·조건부 서식, Zod 기반 ExcelWrapper 레코드 변환, 주소·날짜·숫자형식 변환을 다룰 때. 자세히: [apis/excel/README.md](./apis/excel/README.md)
- **lint** — `@simplysm/lint` 의 eslint-plugin(커스텀 규칙)·eslint-recommended flat config 프리셋을 적용·파악할 때. 자세히: [apis/lint/README.md](./apis/lint/README.md)
- **orm-common** — Dialect 독립 ORM: 스키마 정의·$infer 추론, DbContext·트랜잭션·DDL, Queryable 체이닝·join/union, expr 표현식, Expr AST·dialect SQL 렌더링·결과 파싱을 다룰 때. 자세히: [apis/orm-common/README.md](./apis/orm-common/README.md)
- **orm-node** — Node 환경에서 ORM 실행과 저수준 DB 연결(createOrm·createDbConn·dialect별 연결·트랜잭션·raw SQL·bulk insert)을 다룰 때. 자세히: [apis/orm-node/README.md](./apis/orm-node/README.md)
- **sd-cli** — sd.config.ts 설정 타입, SdTsCompiler 패키지 단위 TS·Angular AOT 컴파일, Vitest용 sdAngularPlugin을 다룰 때. 자세히: [apis/sd-cli/README.md](./apis/sd-cli/README.md)
- **service-client** — WebSocket 서비스 클라이언트: RPC 호출·인증·진행률, 이벤트 구독/발행, 파일 업다운로드, 원격 ORM 실행, 저수준 소켓/전송을 다룰 때. 자세히: [apis/service-client/README.md](./apis/service-client/README.md)
- **service-common** — 서버·클라 공유 서비스 이벤트 정의, 내장 ORM/자동업데이트 RPC 계약, 앱 메뉴/권한 구조 타입·유틸, WebSocket 바이너리 프로토콜을 확인할 때. 자세히: [apis/service-common/README.md](./apis/service-common/README.md)
- **service-server** — Fastify 서비스 서버: 부트스트랩·서비스 작성·JWT 인증·서버 이벤트 발생·내장 ORM/자동업데이트·전송 계층 구성을 다룰 때. 자세히: [apis/service-server/README.md](./apis/service-server/README.md)
- **storage** — FTP/FTPS/SFTP 원격 스토리지 연결 생성(StorageFactory)·공통 파일/디렉토리 작업(StorageClient)·프로토콜별 구현체를 다룰 때. 자세히: [apis/storage/README.md](./apis/storage/README.md)
