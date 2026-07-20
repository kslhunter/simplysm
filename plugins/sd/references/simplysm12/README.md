# @simplysm/* v12 개발 안내

## 패키지 인덱스

- **capacitor-plugin-auto-update** — Android APK 자동 업데이트와 APK 설치/권한 제어. 자세히: [apis/capacitor-plugin-auto-update/README.md](./apis/capacitor-plugin-auto-update/README.md)
- **capacitor-plugin-file-system** — 파일시스템 접근. 권한, 경로 조회, 읽기/쓰기, 디렉토리 조작. 자세히: [apis/capacitor-plugin-file-system/README.md](./apis/capacitor-plugin-file-system/README.md)
- **capacitor-plugin-intent** — Android Intent 송수신. 산업용 장치(바코드 스캐너, PDA) 연동용. 자세히: [apis/capacitor-plugin-intent/README.md](./apis/capacitor-plugin-intent/README.md)
- **capacitor-plugin-usb-storage** — USB Mass Storage 장치 열거, 권한 요청, 파일 읽기. 자세히: [apis/capacitor-plugin-usb-storage/README.md](./apis/capacitor-plugin-usb-storage/README.md)
- **cordova-plugin-auto-update** — Cordova(Android) APK 자동 업데이트, 설치/권한 브릿지 (deprecated). 자세히: [apis/cordova-plugin-auto-update/README.md](./apis/cordova-plugin-auto-update/README.md)
- **cordova-plugin-file-system** — Cordova(Android) 파일시스템 접근 (deprecated, Capacitor로 전환). 자세히: [apis/cordova-plugin-file-system/README.md](./apis/cordova-plugin-file-system/README.md)
- **cordova-plugin-usb-storage** — Cordova USB 저장장치 권한 요청, 조회, 읽기 (deprecated). 자세히: [apis/cordova-plugin-usb-storage/README.md](./apis/cordova-plugin-usb-storage/README.md)
- **eslint-plugin** — 심플리즘 워크스페이스 전용 ESLint 9 플랫 설정과 커스텀 규칙 9종을 제공하는 ESLint 플러그인. 자세히: [apis/eslint-plugin/README.md](./apis/eslint-plugin/README.md)
- **sd-angular** — Angular(zoneless, signal) 업무 앱 UI 프레임워크. 부트스트랩/테마/권한, signal 헬퍼, sd-* 컨트롤 전반. 자세히: [apis/sd-angular/README.md](./apis/sd-angular/README.md)
- **sd-cli** — 심플리즘 모노레포 프로젝트의 빌드, 변경감지, 타입체크/린트, 배포, 로컬업데이트, 플랫폼 실행, AI 커밋을 수행하는 CLI. 자세히: [apis/sd-cli/README.md](./apis/sd-cli/README.md)
- **sd-core-browser** — 브라우저 전용 코어. Blob/Element 프로토타입 DOM 헬퍼, 측정 유틸. 자세히: [apis/sd-core-browser/README.md](./apis/sd-core-browser/README.md)
- **sd-core-common** — 브라우저/Node 공용 코어 유틸. 날짜/시간, 컬렉션 확장, 객체 유틸, 직렬화, 비동기, ZIP. 자세히: [apis/sd-core-common/README.md](./apis/sd-core-common/README.md)
- **sd-core-node** — Node 전용 코어 유틸. 파일시스템, 경로, 해시, 감시, 로깅, 프로세스, 워커. 자세히: [apis/sd-core-node/README.md](./apis/sd-core-node/README.md)
- **sd-excel** — 브라우저/Node 양쪽에서 xlsx(OOXML) 파일을 읽고 쓰고 셀 단위로 조작하는 모듈. 자세히: [apis/sd-excel/README.md](./apis/sd-excel/README.md)
- **sd-orm-common** — dialect 비종속 ORM 코어. 데코레이터로 스키마 정의, Queryable 체이닝으로 타입세이프 쿼리 실행. 자세히: [apis/sd-orm-common/README.md](./apis/sd-orm-common/README.md)
- **sd-orm-common-ext** — 인증/로그/순번코드 테이블 모델과 DbContext, Queryable 확장 (deprecated). 자세히: [apis/sd-orm-common-ext/README.md](./apis/sd-orm-common-ext/README.md)
- **sd-orm-node** — Node 런타임에서 `@simplysm/sd-orm-common`의 `DbContext`를 실제 DB(MSSQL/MySQL/SQLite)에 연결, 실행하는 어댑터. 자세히: [apis/sd-orm-node/README.md](./apis/sd-orm-node/README.md)
- **sd-service-client** — WebSocket RPC 클라이언트. 원격 메소드 호출, 이벤트 구독, 파일 업/다운로드, ORM 접속. 자세히: [apis/sd-service-client/README.md](./apis/sd-service-client/README.md)
- **sd-service-common** — 클라이언트/서버 공유 통신 프로토콜과 서비스 인터페이스 계약. 자세히: [apis/sd-service-common/README.md](./apis/sd-service-common/README.md)
- **sd-service-server** — Fastify 기반 서비스 서버. WebSocket/HTTP/정적파일/업로드, JWT 인증, 내장 서비스. 자세히: [apis/sd-service-server/README.md](./apis/sd-service-server/README.md)
- **sd-storage** — Node 전용 FTP / FTPS / SFTP 원격 파일 저장소 클라이언트. 연결, 디렉토리, 파일 업/다운로드를 공통 인터페이스로 다룸. 자세히: [apis/sd-storage/README.md](./apis/sd-storage/README.md)

## 개발 매뉴얼

아래 표의 트리거 조건이 현재 작업에서 처음 충족되는 시점에 해당 매뉴얼 파일을 Read 도구로 읽으세요.

| 트리거                                                                                                                                                                                                        | 매뉴얼                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 클라이언트, 공통 코드의 lint/template 규칙 확인, `eslint.config.js` 설정 (서브경로 import 금지, `$any` 금지, `#` private 등)                                                                                     | [client-rules.md](./manuals/client-rules.md)                 |
| 화면 컴포넌트(`XxxPage`/`XxxDetail`/`XxxModal`/`XxxControl`/`XxxPrintTemplate`) 작성, 수정 공통 규약 (`$signal`/`$computed`/`$mark`, `usePermsSignal`, `SdToastProvider`, `SdModalProvider`, flex 레이아웃, 아이콘) | [client-component.md](./manuals/client-component.md)         |
| 목록, 단건편집 화면이나 마스터 선택 버튼 작성 (`AbsSdDataSheet`/`AbsSdDataDetail`/`AbsSdDataSelectButton`, `<sd-data-sheet>`)                                                                                  | [client-data-sheet.md](./manuals/client-data-sheet.md)       |
| 화면 안에서 `<sd-tab>`/`<sd-tab-item>` 으로 탭 UI 구성, 탭별 본문 분기                                                                                                                                         | [client-tab.md](./manuals/client-tab.md)                     |
| 화면 데이터를 종이 인쇄, PDF 출력 (인쇄 템플릿 `implements ISdPrint`, `SdPrintProvider.printAsync`/`getPdfBufferAsync`)                                                                                        | [client-print.md](./manuals/client-print.md)                 |
| 앱에서 서버 서비스 RPC 호출, `AppServiceProvider` 정의, 확장, 새 서버 서비스(`SdServiceBase`), 호출 래퍼 추가                                                                                                   | [client-service.md](./manuals/client-service.md)             |
| 앱에서 DB(ORM) 접속, `AppOrmProvider` 정의, 트랜잭션 묶기                                                                                                                                                     | [client-orm.md](./manuals/client-orm.md)                     |
| 공유 마스터 데이터(사용자/거래처/품목 등) 정의, 조회, 선택입력, 변경통지 (`AppSharedDataProvider`, `useSharedSignal`, `<sd-shared-data-select>`, `emitAsync`)                                                    | [client-shared-data.md](./manuals/client-shared-data.md)     |
| 클라이언트, 서버 간 실시간 이벤트 정의, 발생, 구독 (`SdServiceEventListenerBase`, `addEventListenerAsync`)                                                                                                       | [event.md](./manuals/event.md)                               |
| 앱 메뉴 구조, 권한 정의 추가/수정, 화면 권한 체크, 권한 편집 UI(`sd-permission-table`)                                                                                                                         | [client-app-structure.md](./manuals/client-app-structure.md) |
| ORM 쿼리(조회/저장/삭제/페이징) 작성, `@Table`/`@Column` 테이블, 관계 정의, `db.qh` 조건, `upsert`, 소프트삭제                                                                                                   | [orm.md](./manuals/orm.md)                                   |
| 서로 다른 테이블(입고/출고, 매출/매입 등)을 한 목록, 집계로 합쳐 표시 (`Queryable.union`)                                                                                                                       | [orm-union.md](./manuals/orm-union.md)                       |
| 데이터 변경 이력(누가, 언제, 무엇) 적재, 조회, 목록에 최종수정일시, 수정자 표시 (`insertDataLogAsync`, `joinLastDataLog`)                                                                                         | [data-log.md](./manuals/data-log.md)                         |
| Node 진입점(서버, 워커, CLI)에서 콘솔/파일/외부(DB) 로깅, 출력 레벨 설정 (`SdLogger`)                                                                                                                           | [logging.md](./manuals/logging.md)                           |
| 서버 에러를 DB(`SystemLog`)에 적재하거나, 적재된 시스템 로그를 관리자 화면에서 기간/검색어로 조회                                                                                                             | [client-system-log.md](./manuals/client-system-log.md)       |
