# @simplysm/* v14 개발 안내

에이전트가 `@simplysm/*` v14 패키지를 사용·변경할 때 따르는 안내. 세 부분으로 구성:

- **행동 지침** — `@simplysm/*` 작업에서 항상 지킬 규칙.
- **개발 매뉴얼** — 작업 트리거가 처음 충족되는 시점에 해당 `manuals/*.md` 를 Read.
- **패키지 인덱스** — 패키지의 심볼·API 를 쓰거나 해석할 때 해당 `apis/*` 를 Read.

## 행동 지침

### 매뉴얼·apis 문서의 위상

개발 매뉴얼과 패키지 인덱스가 가리키는 `manuals/*`·`apis/*` 문서는 `@simplysm/*` 사용법을 안내하는 참고 가이드임. 권장 방법·제안에 해당하며 그 자체가 결정 근거는 아님. 문서가 권하는 방식이라도 자동 채택하지 말고, 채택 여부는 결정 근거 규칙(기존 코드 패턴·사용자 합의 등)을 따름.

### 코드 작성 위치 원칙

업무 로직 코드의 기본 작성 위치는 **클라이언트 패키지**. 서버 패키지(`@simplysm/service-server` 기반)에는 다음 두 경우에만 코드를 둠:

- **보안 필요**: 클라이언트에 노출 불가한 자격증명·키, 권한 우회 위험이 있는 처리, 외부에 직접 노출하면 안 되는 연산.
- **클라이언트 실행 불가**: 브라우저·모바일 런타임에서 실행 불가능한 기능 (특정 네이티브 API, 서버 측 자원 접근 등).

ORM 호출, 파일 변환, 비즈니스 로직 등은 위 두 경우에 해당하지 않는 한 클라이언트 코드에 직접 둠. "서버에 두는 게 관행"이라는 이유로 서버 패키지로 이관 금지.

### 프로젝트 `CLAUDE.md` 명령어 표기 규칙

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
| 화면 데이터를 종이 인쇄·PDF 출력 (`.print-template.ts` 작성, `printAsync`/`getPdfBufferAsync`, PDF 다운로드·이메일) | [client-print.md](./manuals/client-print.md)           |
| 앱에서 서버 서비스·이벤트 호출 (provider 정의·항목 추가) | [client-service.md](./manuals/client-service.md)       |
| 앱에서 ORM(DB) 사용 (AppOrmProvider 정의)               | [client-orm.md](./manuals/client-orm.md)               |
| 앱에서 공유 마스터 데이터 사용 (provider 정의·항목 추가, 선택 컨트롤의 관리·선택 모달, 좌측 선택+우측 상세 레이아웃) | [client-shared-data.md](./manuals/client-shared-data.md) |
| 클라이언트·서버 간 실시간 이벤트 정의·발생·구독         | [event.md](./manuals/event.md)                         |
| 앱 메뉴 구조·권한 정의 추가/수정                        | [client-app-structure.md](./manuals/client-app-structure.md) |
| 클라이언트 SSG(프리렌더·SEO) 셋업, `prerender` 설정, SSR-safe 화면 작성 | [client-ssg.md](./manuals/client-ssg.md)               |
| ORM 쿼리 작성(조회 흐름·안티패턴), 컬럼 nullable/default·유니크 정책, 삭제 전략 | [orm.md](./manuals/orm.md)                             |
| 이종 엔티티를 한 목록으로 합쳐 표시 (UNION)             | [orm-union.md](./manuals/orm-union.md)                 |
| CRUD 처리에 데이터 변경 이력 적재·조회·표시 (누가·언제·무엇을 변경, 목록의 수정일시·수정자 컬럼) | [data-log.md](./manuals/data-log.md)                   |
| 콘솔 로깅 코드 작성/수정 (모든 패키지)                  | [logging.md](./manuals/logging.md)                     |
| 클라이언트 시스템 에러·로그를 DB 등 외부에 적재·조회    | [client-system-log.md](./manuals/client-system-log.md) |
| 클라이언트 사용자별 UI·시스템 설정을 DB 등에 영속화 (`SdSystemConfigProvider.fn` 배선, 시트 컬럼 설정 서버 저장) | [client-system-config.md](./manuals/client-system-config.md) |
| 패키지 테스트·통합 테스트 작성/추가                     | [test.md](./manuals/test.md)                           |

## 패키지 인덱스

패키지의 심볼·API 를 쓰거나 해석할 때 해당 패키지 문서를 Read.

- **angular** — Angular 업무앱 UI 프레임워크(부트스트랩·UI 컨트롤·레이아웃·CRUD/시트/공유데이터/칸반·오버레이·라우팅/권한/설정). 자세히: [apis/angular/README.md](./apis/angular/README.md)
- **capacitor-plugin-auto-update** — Android APK 자동 업데이트(서버·외부저장소에서 APK 받아 설치, 저수준 ApkInstaller). 자세히: [apis/capacitor-plugin-auto-update/README.md](./apis/capacitor-plugin-auto-update/README.md)
- **capacitor-plugin-file-system** — 앱/웹 파일·디렉토리 IO, 저장소 경로·파일 권한(Android 네이티브 ↔ 웹 IndexedDB 동일 API). 자세히: [apis/capacitor-plugin-file-system/README.md](./apis/capacitor-plugin-file-system/README.md)
- **capacitor-plugin-intent** — Android 인텐트 연동(바코드 스캐너·PDA 등 산업용 디바이스), 웹은 무동작 스텁. 자세히: [apis/capacitor-plugin-intent/README.md](./apis/capacitor-plugin-intent/README.md)
- **capacitor-plugin-usb-storage** — USB Mass Storage 장치 열거·권한·디렉토리/파일 읽기. 자세히: [apis/capacitor-plugin-usb-storage/README.md](./apis/capacitor-plugin-usb-storage/README.md)
- **core-browser** — 브라우저 전용 유틸(DOM 확장·IndexedDB 영속화/가상 파일트리·Blob 다운로드·파일 선택). 자세히: [apis/core-browser/README.md](./apis/core-browser/README.md)
- **core-common** — 브라우저·Node 공용 기반 유틸(날짜/시간 값 타입·에러·컬렉션 확장·obj·직렬화·비동기 큐/이벤트·문자열/숫자/경로). 자세히: [apis/core-common/README.md](./apis/core-common/README.md)
- **core-node** — Node 전용 기반(fsx·pathx·cpx·FsWatcher·consola·Worker). 자세히: [apis/core-node/README.md](./apis/core-node/README.md)
- **excel** — 엑셀(.xlsx) 워크북 읽기/쓰기·셀/스타일/조건부서식, Zod 스키마 ↔ 엑셀 변환(ExcelWrapper). 자세히: [apis/excel/README.md](./apis/excel/README.md)
- **lint** — 심플리즘 ESLint 자산(커스텀 규칙 9종 플러그인 + flat config 프리셋). 자세히: [apis/lint/README.md](./apis/lint/README.md)
- **orm-common** — Dialect 독립 ORM 코어(스키마 빌더·DbContext·Queryable·expr·QueryBuilder). 자세히: [apis/orm-common/README.md](./apis/orm-common/README.md)
- **orm-node** — Node 환경 DbContext 연결·실행(고수준 createOrm·저수준 createDbConn/DbConn). 자세히: [apis/orm-node/README.md](./apis/orm-node/README.md)
- **sd-cli** — sd.config.ts 설정 타입·증분 컴파일러 SdTsCompiler·Vitest 전용 Angular 플러그인 sdAngularPlugin. 자세히: [apis/sd-cli/README.md](./apis/sd-cli/README.md)
- **service-client** — WebSocket 서비스 클라이언트(RPC 호출·서버 푸시 이벤트 구독/발행·파일 업다운·원격 ORM 트랜잭션). 자세히: [apis/service-client/README.md](./apis/service-client/README.md)
- **service-common** — 서버·클라이언트 공유 통신 계약(defineEvent·내장 RPC 시그니처·AppStructure·바이너리 프로토콜). 자세히: [apis/service-common/README.md](./apis/service-common/README.md)
- **service-server** — Fastify 기반 RPC 서비스 서버(부팅·JWT 인증·이벤트 브로드캐스트·내장 서비스·defineService/auth). 자세히: [apis/service-server/README.md](./apis/service-server/README.md)
- **storage** — Node 전용 FTP/FTPS/SFTP 스토리지 클라이언트(StorageFactory.connect 콜백 패턴). 자세히: [apis/storage/README.md](./apis/storage/README.md)
