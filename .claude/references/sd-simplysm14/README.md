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
| 클라이언트 코드 (앱 패키지·`@simplysm/angular`) 를 작성·수정하는 모든 작업 | [client-rules.md](./manuals/client-rules.md)           |
| 화면 컴포넌트(`<domain>.<역할>.ts`) 작성/수정           | [client-component.md](./manuals/client-component.md)   |
| `sd-crud-list` / `sd-crud-detail` 채택한 목록·단건 화면 | [client-crud.md](./manuals/client-crud.md)             |
| 클라이언트 데모 컴포넌트 작성                           | [client-demo.md](./manuals/client-demo.md)             |
| `<sd-tab>` 사용                                         | [client-tab.md](./manuals/client-tab.md)               |
| 앱에서 서버 서비스·이벤트 호출 (provider 정의·항목 추가) | [client-service.md](./manuals/client-service.md)       |
| 앱에서 ORM(DB) 사용 (AppOrmProvider 정의)               | [client-orm.md](./manuals/client-orm.md)               |
| 앱에서 공유 마스터 데이터 사용 (provider 정의·항목 추가) | [client-shared-data.md](./manuals/client-shared-data.md) |
| 클라이언트·서버 간 실시간 이벤트 정의·발생·구독         | [event.md](./manuals/event.md)                         |
| 앱 메뉴 구조·권한 정의 추가/수정                        | [client-app-structure.md](./manuals/client-app-structure.md) |
| DB 스키마 정의 또는 ORM 쿼리 작성                       | [orm.md](./manuals/orm.md)                             |
| 이종 엔티티를 한 목록으로 합쳐 표시 (UNION)             | [orm-union.md](./manuals/orm-union.md)                 |
| CRUD 처리에 데이터 변경 이력 적재·조회 (누가·언제·무엇을 변경) | [data-log.md](./manuals/data-log.md)                   |
| 콘솔 로깅 코드 작성/수정 (모든 패키지)                  | [logging.md](./manuals/logging.md)                     |
| 클라이언트 시스템 에러·로그를 DB 등 외부에 적재·조회    | [client-system-log.md](./manuals/client-system-log.md) |
| 패키지 테스트·통합 테스트 작성/추가                     | [test.md](./manuals/test.md)                           |

## 패키지 인덱스

- **angular** — Angular(zoneless·signal) 업무 프론트엔드 컴포넌트·디렉티브·프로바이더 — 앱 부트스트랩(provideSdAngular)·모달/토스트/busy/인쇄·라우팅/메뉴/권한·폼 컨트롤·레이아웃·sd-sheet·공유데이터·CRUD 화면 골격·주소검색/에디터/차트/칸반을 다룰 때. 자세히: [apis/angular/README.md](./apis/angular/README.md)
- **capacitor-plugin-auto-update** — Capacitor(Android) 앱에서 APK 설치 인텐트 실행·설치 권한 관리, 서버/외부 저장소 기반 최신 APK 자동 감지·다운로드·설치 흐름을 돌릴 때. 자세히: [apis/capacitor-plugin-auto-update/README.md](./apis/capacitor-plugin-auto-update/README.md)
- **capacitor-plugin-file-system** — Capacitor 파일 시스템 플러그인. 네이티브(Android 외부/앱 저장소)·브라우저(IndexedDB 에뮬레이션)에서 파일 읽기/쓰기, 디렉토리 조회/생성/삭제, 존재 확인, 권한 확인/요청, 저장소 경로·URI 조회를 static FileSystem 클래스로 제공. 자세히: [apis/capacitor-plugin-file-system/README.md](./apis/capacitor-plugin-file-system/README.md)
- **capacitor-plugin-intent** — Android 인텐트 송수신 Capacitor 플러그인 — 브로드캐스트 구독/전송·실행 인텐트 조회·newIntent 리스너·startActivityForResult 외부 Activity 실행을 정적 클래스 Intent 로 수행(바코드 스캐너·PDA 연동, 웹은 미지원 스텁). 자세히: [apis/capacitor-plugin-intent/README.md](./apis/capacitor-plugin-intent/README.md)
- **capacitor-plugin-usb-storage** — USB Mass Storage 장치(Android=libaums 실물, web=IndexedDB 가상)의 장치 목록 조회·권한 요청/확인·디렉토리/파일 읽기가 필요할 때 — 정적 클래스 UsbStorage. 자세히: [apis/capacitor-plugin-usb-storage/README.md](./apis/capacitor-plugin-usb-storage/README.md)
- **core-browser** — 브라우저 전용 유틸 — DOM 요소 확장 메서드(조회·탭이동·가시성·상대좌표·스크롤·클립보드·경계측정), Blob 다운로드/파일선택/진행률 fetch, IndexedDB KV 저장소 및 가상 파일시스템. 자세히: [apis/core-browser/README.md](./apis/core-browser/README.md)
- **core-common** — 런타임 무관 공통 유틸 — 날짜/시간 값 타입(DateTime/DateOnly/Time), 에러 트리(SdError 등), 비동기 큐/이벤트/캐시, Array/Set/Map 프로토타입 확장, obj/json/transfer/str/num/bytes/path/xml 유틸 네임스페이스가 필요할 때. 자세히: [apis/core-common/README.md](./apis/core-common/README.md)
- **core-node** — Node 런타임 전용 유틸 — 파일시스템 IO(fsx), 자식 프로세스 실행·인코딩(cpx), POSIX 경로 가공(pathx), 파일 변경 감시(FsWatcher), consola 로깅 셋업, worker_threads 타입 안전 래퍼(worker). 자세히: [apis/core-node/README.md](./apis/core-node/README.md)
- **excel** — OOXML(.xlsx) 워크북을 ZIP lazy-load 로 읽고 쓰기 — ExcelWorkbook/Worksheet 진입, 셀 값·수식·스타일·병합, 조건부 서식, 이미지, Zod 기반 ExcelWrapper, 주소·날짜·숫자형식 변환 유틸이 필요할 때. 자세히: [apis/excel/README.md](./apis/excel/README.md)
- **lint** — ESLint 9 flat-config 프리셋(eslint-recommended)과 simplysm 커스텀 규칙 9종(eslint-plugin)을 subpath export 로 제공 — 프로젝트 lint 설정을 잡거나 커스텀 규칙 동작을 검토할 때. 자세히: [apis/lint/README.md](./apis/lint/README.md)
- **orm-common** — Dialect 독립 ORM 코어 — Table/View/Procedure fluent 빌더로 스키마를 정의하고 DbContext 에 등록해 connect/transaction/DDL 을 돌리며, Queryable 체이닝과 expr 표현식으로 SELECT/CUD/프로시저 쿼리를 JSON AST(QueryDef/Expr)로 조립할 때(실제 SQL 렌더링·결과 파싱은 mysql/mssql/postgresql 빌더·executor 가 담당). 자세히: [apis/orm-common/README.md](./apis/orm-common/README.md)
- **orm-node** — Node.js 환경에서 @simplysm/orm-common 의 DbContext 를 MSSQL/MySQL/PostgreSQL 실 DB 에 연결해 실행 — createOrm 으로 트랜잭션 단위 ORM 실행을 하거나, 저수준 DbConn 으로 raw SQL·파라미터 쿼리·bulk insert·수동 트랜잭션을 직접 다룰 때. 자세히: [apis/orm-node/README.md](./apis/orm-node/README.md)
- **sd-cli** — sd.config.ts 설정 타입(빌드 타겟·배포·Capacitor/Electron/PWA), 프로그래밍 방식 TS/Angular AOT 증분 컴파일러(SdTsCompiler), Vitest용 Angular AOT Vite 플러그인(sdAngularPlugin)을 다룰 때. 자세히: [apis/sd-cli/README.md](./apis/sd-cli/README.md)
- **service-client** — WebSocket 서비스 서버에 접속해 서비스 메서드 RPC 호출·인증·서버 이벤트 구독·파일 업다운로드·ORM 원격 트랜잭션 실행이 필요할 때 (브라우저/Node 공용 클라이언트). 자세히: [apis/service-client/README.md](./apis/service-client/README.md)
- **service-common** — 서버·클라이언트 공유 통신 계약 — 바이너리 프로토콜(인코딩/청킹/재조립)·메시지 타입, ORM/자동업데이트/업로드 서비스 인터페이스, 타입 안전 이벤트 정의(defineEvent), 앱 메뉴·권한 트리 모델을 다룰 때. 자세히: [apis/service-common/README.md](./apis/service-common/README.md)
- **service-server** — Fastify 기반 WebSocket/HTTP RPC 서비스 서버 — defineService/auth 로 서비스 정의, JWT 인증, 정적 파일·업로드, 서버→클라이언트 이벤트 브로드캐스트, ORM/자동업데이트 내장 서비스, V1 레거시 호환을 다룰 때. 자세히: [apis/service-server/README.md](./apis/service-server/README.md)
- **storage** — FTP/FTPS/SFTP 원격 스토리지에 연결해 파일·디렉토리를 업로드·다운로드·조회·삭제할 때. 진입점은 StorageFactory.connect(프로토콜, 접속정보, 콜백)로 연결·종료 자동 관리. 자세히: [apis/storage/README.md](./apis/storage/README.md)
