# @simplysm/* v14 행동 지침

Claude 에이전트가 반드시 지켜야 할 행동 지침이다. (@simplysm/\* v14 포함시)

## 코드 위치 원칙

기본 위치는 **클라이언트**. 서버(`service-server`)는 다음 두 경우에만 둔다:

- **보안**: 클라이언트에 노출 불가한 자격증명/키, 권한 우회 위험, 외부에 직접 노출하면 안 되는 연산.
- **클라이언트 미지원**: 브라우저/모바일 런타임에서 실행 불가한 기능(특정 네이티브 API, 서버 측 자원 접근 등).

ORM 호출, 파일 변환, 비즈니스 로직 등은 위 두 사유에 해당하지 않는 한 클라이언트 코드에 직접 둔다. "서버에 두는 게 관행"이라는 이유로 service 로 이관하지 않는다.

## CLAUDE.md 명령어 표기

`CLAUDE.md` 작성 시, 검증 명령은 다음 역할로 표기한다.

- **기본 검증 (평소 사용)**: `pnpm check --fix` — typecheck + lint 일괄, 자동 수정 포함.
- **보조**: `pnpm typecheck`, `pnpm lint` — `pnpm check` 에서 문제 났을 때 각각 따로 보기 위함. 단독 사용은 회피.

## 개발 매뉴얼

트리거 조건이 처음 충족될 때 해당 자료를 Read.

| 트리거                                                  | 매뉴얼                                                 |
| ------------------------------------------------------- | ------------------------------------------------------ |
| 클라이언트 코드(앱·`@simplysm/angular`) 작성 — 항상     | [client-rules.md](./manuals/client-rules.md)           |
| 화면 컴포넌트(`<domain>.<역할>.ts`) 작성/수정           | [client-component.md](./manuals/client-component.md)   |
| `sd-crud-list` / `sd-crud-detail` 채택한 목록·단건 화면 | [client-crud.md](./manuals/client-crud.md)             |
| 클라이언트 데모 컴포넌트 작성                           | [client-demo.md](./manuals/client-demo.md)             |
| `<sd-tab>` 사용                                         | [client-tab.md](./manuals/client-tab.md)               |
| 새 앱 부트스트랩 또는 새 서비스·마스터 데이터 추가      | [client-setup.md](./manuals/client-setup.md)           |
| DB 스키마 정의 또는 ORM 쿼리 작성                       | [orm.md](./manuals/orm.md)                             |
| 이종 엔티티를 한 목록으로 합쳐 표시 (UNION)             | [orm-union.md](./manuals/orm-union.md)                 |

## 패키지 인덱스

- **angular** — Angular 21 standalone/signal/zoneless 기반 업무 클라이언트 UI 라이브러리. `provideSdAngular` 부트스트랩, 폼/시트/CRUD/모달/토스트/사이드바·탑바·드롭다운/공유데이터·칸반 등 화면 컴포넌트와 인프라 프로바이더 제공. 자세히: [apis/angular/README.md](./apis/angular/README.md)
- **capacitor-plugin-auto-update** — Android Capacitor 앱에서 APK 자동 업데이트와 APK 설치 권한·버전 조회. 자세히: [apis/capacitor-plugin-auto-update/README.md](./apis/capacitor-plugin-auto-update/README.md)
- **capacitor-plugin-file-system** — Capacitor 모바일/웹 파일 시스템 접근(권한·경로·디렉토리·파일 IO). 자세히: [apis/capacitor-plugin-file-system/README.md](./apis/capacitor-plugin-file-system/README.md)
- **capacitor-plugin-intent** — Android 인텐트 브로드캐스트 송수신 및 `startActivityForResult` 연동(산업용 스캐너·PDA·외부 결제 등). 자세히: [apis/capacitor-plugin-intent/README.md](./apis/capacitor-plugin-intent/README.md)
- **capacitor-plugin-usb-storage** — Android/Browser 에서 USB Mass Storage 장치 목록·권한·디렉토리/파일 읽기. 자세히: [apis/capacitor-plugin-usb-storage/README.md](./apis/capacitor-plugin-usb-storage/README.md)
- **core-browser** — 브라우저 전용. `Element`/`HTMLElement` 프로토타입 확장, DOM 탐색·포커스·레이아웃 보정, 클립보드/측정, 파일 다이얼로그·다운로드, 진행률 fetch, IndexedDB 키/값 저장소와 가상 파일시스템. 자세히: [apis/core-browser/README.md](./apis/core-browser/README.md)
- **core-common** — 공통 유틸리티(타입·에러·큐·이벤트·변환·확장 메서드·환경변수). simplysm 모든 패키지의 공용 기반. 자세히: [apis/core-common/README.md](./apis/core-common/README.md)
- **core-node** — Node 전용 IO/경로/프로세스/감시/consola/worker_threads 래퍼(`fsx`, `pathx`, `cpx`, `FsWatcher`, `setupConsola`, `Worker`/`createWorker`). 자세히: [apis/core-node/README.md](./apis/core-node/README.md)
- **excel** — xlsx 워크북을 열어 셀·시트·스타일·조건부서식·이미지를 읽고 쓰거나, Zod 스키마 기반 레코드 입출력. 자세히: [apis/excel/README.md](./apis/excel/README.md)
- **lint** — ESLint flat config 작성 시 `@simplysm/lint/eslint-recommended` 프리셋 또는 `@simplysm/lint/eslint-plugin` 개별 규칙 import. 자세히: [apis/lint/README.md](./apis/lint/README.md)
- **orm-common** — Dialect 독립 ORM 코어. `DbContext` 서브클래싱 + Table/View/Procedure 빌더 + `expr` AST + `Queryable` 체이닝으로 SQL 을 만들고 dialect QueryBuilder 로 렌더. 자세히: [apis/orm-common/README.md](./apis/orm-common/README.md)
- **orm-node** — Node 환경에서 `DbContext` 를 MSSQL/MySQL/PostgreSQL 실 연결에 붙이는 어댑터(`createOrm`), raw SQL/bulk insert (`createDbConn`). 자세히: [apis/orm-node/README.md](./apis/orm-node/README.md)
- **sd-claude** — `.claude/` 자산 배포 및 `sd-claude` CLI 만 제공. 라이브러리 코드 API 없음(npm 배포 전용). 자세히: [apis/sd-claude/README.md](./apis/sd-claude/README.md)
- **sd-cli** — `sd.config.ts` 작성 타입, Vitest 의 Angular AOT plugin(`sdAngularPlugin`), TS 패키지 증분 컴파일 엔진(`SdTsCompiler`). 자세히: [apis/sd-cli/README.md](./apis/sd-cli/README.md)
- **service-client** — `@simplysm/service-server` 와 WebSocket 으로 통신하는 클라이언트. RPC·이벤트 구독·파일 업/다운로드·원격 ORM 실행을 단일 `ServiceClient` 에서 제공(Node/브라우저 공용). 자세히: [apis/service-client/README.md](./apis/service-client/README.md)
- **service-common** — 서버/클라이언트가 공유하는 서비스 프로토콜·메시지·서비스 인터페이스·앱 구조·이벤트 정의. 자세히: [apis/service-common/README.md](./apis/service-common/README.md)
- **service-server** — Fastify + WebSocket 위에 서비스(`defineService`)·JWT 인증(`auth`)·빌트인 ORM/AutoUpdate/AppStructure·V1 레거시 호환을 부트스트랩(`createServiceServer().listen()`). 자세히: [apis/service-server/README.md](./apis/service-server/README.md)
- **storage** — FTP/FTPS/SFTP 원격 스토리지에 동일 인터페이스(`StorageClient`)로 파일 읽기/쓰기/관리. 자세히: [apis/storage/README.md](./apis/storage/README.md)
