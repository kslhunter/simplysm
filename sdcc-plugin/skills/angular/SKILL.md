---
name: angular
description: "@simplysm/angular(Angular 22 UI 컨트롤·CRUD 골격·앱 인프라 라이브러리)의 구조·배선 인덱스. Use when @simplysm/angular 를 쓰는 화면·컴포넌트·앱 부트스트랩·provider 를 설계·spec·계획·작성·리뷰하는 모든 작업 — 착수 전에 먼저 읽는다. 컴포넌트를 안다고 생각해도 읽는다(설치된 버전의 공개 API·배선이 학습 지식과 다르다). 대상: provideSdAngular, sd-crud-list·sd-crud-detail·sd-base-container, sd-sheet, SdModalProvider·SdToastProvider, 공유데이터(SdSharedDataProvider 와 앱의 AppSharedDataProvider·useSharedSignal), AppStructure·권한(injectPermsSignal), 인쇄·PDF(SdPrintProvider), 시스템 설정·로그 provider, sd-tab, SSG 프리렌더."
---

@simplysm/angular 사용 안내입니다. 이 패키지는 `src/` 원본을 함께 배포하므로 상세 API 는 설치된 소스에서 직접 확인합니다 — 이 문서는 어디를 볼지(인덱스)와, 소스 한 파일만 읽어서는 놓치는 배선·규약만 담습니다. 화면·데이터의 앱 공통 규칙(파일명·DI 명명·셀·버튼·엑셀·삭제 전략)은 세션에 주입된 rules 가 정본이라 여기서 반복하지 않습니다.

## 소스 위치

- 패키지 루트는 설치된 `node_modules/@simplysm/angular`(모노레포면 이 패키지를 의존하는 워크스페이스 폴더 아래일 수 있음)이고, 소스는 그 아래 `src/` 입니다 — 지금 설치된 바로 그 버전의 원본. 없으면 아직 설치하지 않은 것입니다.
- 공개 API 정본은 `src/index.ts` 가 재수출하는 것뿐입니다. 전역 SCSS 유틸 클래스 정의는 `scss/commons/`, `--sd-*` 스타일 토큰과 테마 값 맵은 `scss/themes/`.

## 영역 인덱스

- 앱 부트스트랩·인프라: `provideSdAngular`, `SdAngularConfigProvider`, `SdLocalStorageProvider`, `SdSystemConfigProvider`(+`injectSdSystemConfigResource`), `SdSystemLogProvider`, `SdServiceClientFactoryProvider`, `SdGlobalErrorHandlerPlugin`
- 화면 골격: `sd-base-container`, `sd-crud-list`, `sd-crud-detail`, `sd-permission-table`, `sd-state-preset`
- 데이터 표: `sd-sheet`(+`sd-sheet-column`, `ng-template[cell]`, 컬럼 설정 모달), `sd-kanban-board`/`lane`/`kanban`
- 컨트롤: `sd-button`/`anchor`, `sd-textfield`(type 별 값 타입)/`textarea`/`numpad`/`range`/`date-range-picker`, `sd-checkbox`/`switch`/`checkbox-group`, `sd-select`/`select-item`/`dropdown`, `sd-modal-select-button`, `sd-form`, `sd-collapse`, `sd-tab`, `sd-list`, `sd-gap`, `sd-pagination`
- 오버레이: `SdModalProvider`(+`SdModalContentDef`, `SdActivatedModalProvider`, `SdPromptModal`/`SdConfirmModal`), `SdToastProvider`, `SdBusyProvider`/`sd-busy-container`, `SdPrintProvider`, `SdFileDialogProvider`
- 레이아웃: `sd-sidebar-container`/`sidebar`/`sidebar-menu`/`sidebar-user`, `sd-topbar-container`/`topbar`/`topbar-menu`/`topbar-user`
- 라우팅·앱구조·권한: `sdRouterLink`, `injectViewTypeSignal`/`injectViewTitleSignal`/`injectFullPageCodeSignal`, `setupCanDeactivate`, `SdAppStructureProvider`, `injectPermsSignal`, `SdNavigateWindowProvider`
- 공유데이터·선택: `SdSharedDataProvider`(abstract, `SharedDataBase`), `sd-shared-data-select`/`select-button`/`select-list`, `useSelectionManager`/`useSortingManager`/`useExpandingManager`
- 디렉티브·유틸: `SdEvents`(`.capture`/`.passive`/`.once` 이벤트 suffix), `sdResize`, `sdIntersection`, `SdCommandDirective`(Ctrl+S 등), `sdRipple`, `sdShowEffect`, `sdInvalid`, `ng-template[typed]`/`[itemOf]`, `mark`, `setupModelHook`, `FormatPipe`
- 테마·시각화: `SdThemeProvider`/`sd-theme-selector`(light·blueprint·ide-dark, density, fontSize), `sd-label`/`note`/`progress`/`calendar`/`barcode`/`echarts`, `sd-tiptap-editor`/`markdown-editor`, `sd-address-search-modal`

## 앱 전역 배선 (새 앱 1회)

- `provideSdAngular({ clientName })` 을 providers 에. 여기서 zoneless 변경감지, 전역 ErrorHandler(`SdGlobalErrorHandlerPlugin`), 테마 localStorage 복원, service-worker 자동 업데이트, 라우팅 중 busy 가 함께 등록됩니다 — 앱이 다시 배선하지 않습니다.
- `AppServiceProvider`(앱이 만드는 root provider) 가 서버 통신의 단일 진입점: `client` getter = `SdServiceClientFactoryProvider.get(KEY)`, `orm` getter = `createOrmClientConnector(client)`, 서비스·이벤트는 `private _x?` 캐시 + getter(`??=`) 로 lazy 노출, `connectAsync()` 가 `SdServiceClientFactoryProvider.connectAsync(KEY, env 로 host/port/ssl)` 호출.
  - 부트스트랩의 `provideAppInitializer(() => inject(AppServiceProvider).connectAsync())` 는 Promise 를 **반환**해야 연결 완료까지 앱이 기다립니다. `addListener` 등 통신은 이 뒤에만 가능.
- `AppOrmProvider.connectAsync(cb)` 가 `appService.orm.connect({ DbClass, connOpt: { configName }, dbContextOpt: { database } }, cb)` 를 고정 — DB 옵션은 여기 한 곳에만. 콜백 안 FK 위반은 사용자 안내 `SdError` 로 자동 변환되므로 화면이 같은 메시지를 만들지 않습니다.
- `AppSharedDataProvider extends SdSharedDataProvider<TAppSharedData>` + `useSharedSignal(name)` 헬퍼 export. `override initialize()` 안에서 `register(name, { serviceKey, getter(changeKeys), orderBy })`.
  - 부트스트랩에 두 가지: `{ provide: SdSharedDataProvider, useExisting: AppSharedDataProvider }`(없으면 `sd-base-container` 가 공유데이터 로드를 안 기다림) + `initialize()` 호출(프레임워크가 자동 호출하지 않음; 로그인 사용자에 따라 달라지면 인증 뒤에).
  - getter 의 select 에 매직 필드 `__valueKey`·`__searchText`·`__isHidden`(트리면 `__parentKey`) 필수. `changeKeys` 가 오면 그 키만 반환.
- `SdAppStructureProvider.initialize(items)` 를 부트스트랩에서, 로그인 후 `permRecord.set(...)`. 메뉴는 `usableMenus()` 를 `sd-sidebar-menu` 에 그대로(권한·모듈 필터 적용됨, 추가 필터 금지). `usableModules` 미설정이어도 모듈 조건 없는 항목은 표시됩니다.
- 사용자별 UI 설정을 DB 에 두려면 `SdSystemConfigProvider.fn = { set, get }`, 시스템 로그를 DB 에 두려면 `SdSystemLogProvider.writeFn` — 둘 다 `provideAppInitializer` 에서 1회. 미배선이면 각각 localStorage / 콘솔만.

## 화면 배선

- 표준 시그널 4종을 필요한 것만 채택하되 이름·의미 고정: `ready = signal(false)`(로드 시작 허용), `initialized = signal(false)`(첫 로드 완료), `busyCount = signal(0)`, `viewType = injectViewTypeSignal()`(`page`/`control`/`modal`). `sd-base-container`/`sd-crud-*` 가 이 이름으로 받습니다.
- 권한은 `perms = injectPermsSignal([fullCode...], ["use","edit",...])`. 순수 권한 체크는 템플릿·코드에 `perms().includes("use")` 를 인라인으로 두고 권한만을 위한 computed 를 만들지 않으며, 권한에 데이터 조건이 결합돼 2회 이상 참조되는 것과 capability 입력(`canCreate`/`canEdit`/`canDelete`, `readonly`)만 `canEdit = computed(...)` 하나로 묶어 입력·핸들러 공용.
- 비동기는 `busyCount +1` → `await _sdToast.try(async () => …)` → `-1`. 진행 중이면 `if (busyCount() > 0) return`. `try` 는 `Error` 만 잡아 토스트+시스템로그로 보내고 비-Error 는 rethrow — 업무 오류도 `throw new Error(...)`.
- list: `filter`(폼) 와 `lastFilter`(마지막 조회) 분리. `effect` 가 `lastFilter`/`page`/`sortingDefs` 를 읽고 본체는 `untracked(async …)` 안에서. 조회 버튼 = `page.set(0); lastFilter.set({...filter()})`, 외부 재조회 = `mark(lastFilter)`. 외부 input 을 filter 에 반영하는 임베드 list 는 별도 effect 로 input→filter→lastFilter.
  - 서버 페이징은 `[totalPageCount]`, 클라이언트 페이징은 `[itemsPerPage]` — 둘 중 하나만.
- detail: 식별자 `input.required<number>()`(신규 포함이면 `input<number>()`), 로드 후 `_orgData = obj.clone(loaded)`, 가드 `obj.equal(data(), _orgData) || confirm(...)`. 저장 후 `_refresh()` → 통지. 통지 output 은 임베드 `submitted = output<boolean>()`, 모달 `close`(`SdModalContentDef`) — 맥락에 따라 한쪽 또는 양쪽.
- view 합성: list 를 `#headerSheet` 템플릿 변수로 잡아 `selectedKeys().first()` 로 자식 detail/list 를 띄우고 `(submitted)="headerSheet.doRefresh()"`. 공유데이터 목록(`sd-shared-data-select-list`)+detail 이면 `[(selectedItem)]` 객체를 받고 재조회 중계는 불필요(`emitAsync` 가 갱신).
  - 편집 detail 을 임베드하면 가드를 view 로 올림: detail 은 public `checkIgnoreChanges()` 만 두고 자체 `setupCanDeactivate` 없음, view 가 `viewChild` 로 잡아 `[canChangeFn]` 과 자신의 `setupCanDeactivate` 양쪽에 위임(`detail == null` 이면 통과).
- 모달: `_sdModal.showAsync({ type, title, inputs })` → 컨텐츠의 `close.emit(payload)` 가 resolve 값, X/backdrop 은 `undefined`. 컨텐츠는 `SdModalContentDef<O>`(`initialized` 시그널 + `close` output) 구현이지 `SdModal` 상속이 아닙니다. 선택 모달 계약 = `selectMode` input + `selectedKeys` model + close `{ selectedKeys }` — `sd-crud-list` 가 이미 구현하므로 목록 화면 하나가 페이지·선택 모달 양쪽에 쓰입니다.
- 서비스 호출은 `_appService.<service>.<method>()`, ORM 은 `_appOrm.connectAsync(db => …)`, 공유데이터는 `useSharedSignal("이름")` 의 `items()`/`get(id)`.

## sd-crud-list / sd-crud-detail

- `sd-crud-list` 필수: `key`(시트 설정 영속화 키), `trackByFn`, `viewType`. 슬롯 `#filterTpl`(이미 `form-box-inline` 안이라 다시 감싸지 않음)·`#toolTpl`·`#commandTpl`·`#bottomCommandTpl`, 직속 자식 `<sd-sheet-column>` 은 내부 시트로 투영.
  - `[currDeletedItems]="deletedItems()"` 를 넘겨야 삭제 행 취소선과 "선택 복구" 버튼이 나옵니다. 삭제 포함 검색을 지원하는 목록엔 필수.
  - 인라인 편집은 `canEdit && inlineEdit`(둘 다 기본 true) 일 때만 켜집니다. `inlineEdit=false` 면 셀 편집·저장 버튼·`submit` 발화가 없고 행별 삭제 컬럼도 사라지며(`canDelete` 의 "선택 삭제/복구" 버튼은 유지), 편집 진입은 `#` 컬럼의 권한 분기 앵커(`canEdit()` 면 `sd-anchor` + `tablerEdit`, 아니면 값만) → 상세 모달.
  - `selectMode` 는 capability 와 독립 — 선택 모달로 띄워도 편집·삭제가 막히지 않으니 읽기 전용이면 `canCreate/canEdit/canDelete` 를 false 로.
  - `[getItemSelectableFn]` 이 문자열을 반환하면 선택 불가 + 사유 tooltip(예: 본인 계정). 선택이 막히므로 핸들러 가드는 불필요.
  - `[(sorts)]` 의 `key` 가 select 별칭과 같으므로 컬럼별 분기 없이 `orderBy((c) => obj.getChainValue(c, sort.key) as any, sort.desc ? "DESC" : "ASC")` 한 줄로, 기본 정렬은 `sortingDefs()` 에 없을 때만 뒤에.
  - 요약 행(`#summaryTpl`)의 집계는 전건 로드면 `computed` 합산, 페이징이면 `items()` 가 현재 페이지뿐이라 **`orderBy`·`limit` 적용 전 쿼리**에 별도 집계 쿼리로.
  - Ctrl+S 저장은 `SdCommandDirective` 로 내장. 화면이 단축키를 따로 걸지 않습니다.
- `sd-crud-detail` 은 `readonly` 면 폼·저장 버튼 없이 plain 렌더. `delete` output 이 없으므로 삭제 버튼은 슬롯에 직접(모달이면 `#bottomCommandTpl`, "확인" 버튼과 같은 줄). `#bottomCommandTpl` 을 주면 page/control 에서도 하단 바+"확인"이 렌더되니 필요할 때만.
- 와이어프레임이 표준 버튼 위치와 충돌하면 `(create)/(delete)/(restore)` 를 포기하고 `#toolTpl` 등에 `sd-button` 을 직접 배치합니다.

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- `effect(async …)` 금지(lint) — 의존 시그널을 동기로 읽고 본체는 `untracked(async …)`. 객체 시그널 내부 필드를 바꿨으면 `mark(sig)`(shallow copy 로 set) 해야 effect·양방향 바인딩이 갱신됩니다: `<sd-textfield [(value)]="data().name" (valueChange)="mark(data)" />`.
- `sd-sheet-column` 의 `<ng-template [cell]="items()" let-item="item">` 에서 `[cell]` 은 타입 추론용 더미(행 데이터는 `sd-sheet` 의 `items`). 셀 컨텍스트는 `item`/`index`/`depth`/`edit`. 셀에 배경색 클래스를 토글할 땐 빈 값 자리에 `&nbsp;` 를 넣어야 div 가 셀 높이를 유지합니다. `[header]` 에 문자열 배열을 주면 인접 동일 텍스트가 병합된 다단 헤더.
- `sd-pagination`/`sd-sheet` 의 `currentPage` 는 0-based.
- `sd-tab` 은 현재 값을 고르는 선택 컨트롤이지 콘텐츠 컨테이너가 아닙니다 — 콘텐츠는 바깥에서 `@if`/`@switch`, `activeTab` 은 literal union 시그널이고 초기값이 어느 `sd-tab-item` 의 `[value]` 와도 안 맞으면 전부 미선택으로 시작합니다.
- `sd-textfield` 는 `type` 이 값 타입을 정합니다(`number`→number, `date`→`DateOnly`, `datetime`→`DateTime`, `time`→`Time`, `format`→마스크 문자열). 빈 입력은 `undefined`.
- `setupCanDeactivate(fn)` 은 모달 안이면 모달 닫기 가드, 라우트면 route `canDeactivate` — 컴포넌트 selector 가 host tag 와 다르면 등록되지 않습니다.
- `injectViewTypeSignal()` 은 라우트 컴포넌트 selector 가 host tag 와 같고 fullCode 가 일치할 때만 `"page"`, 모달 안이면 `"modal"`, 그 외 `"control"`.
- 인쇄와 PDF 는 페이지 분할이 다릅니다 — `printAsync` 는 `window.print()` 라 템플릿 CSS 의 `page-break-*` 를 따르고, `getPdfBufferAsync` 는 **`.page` 클래스** 요소를 각각 한 페이지로 캡처하고 하나도 없으면 전체가 1페이지. 템플릿은 `implements SdPrint` 로 `initialized` 시그널을 노출해야 provider 가 렌더 완료를 기다립니다(누락 시 빈 출력). PDF 다건 메일 발송은 전원 PDF 를 먼저 만든 뒤 발송(중간 실패 시 성공/실패/미발송 경계를 담아 throw).
- `SdSystemLogProvider.writeFn` 의 실패는 provider 가 잡아 logger 로만 남깁니다 — 로그 싱크 실패가 본 동작을 막지 않게 한 의도된 동작이지 silent skip 예외가 아닙니다. `_sdToast.danger()` 직접 호출은 시스템 로그에 남지 않으므로 필요하면 `writeAsync` 를 따로.
- `SdSystemConfigProvider.fn.set/get` 은 로그인 전(`employeeId == null`)에는 저장을 건너뛰고 `undefined` 를 반환하게 배선합니다. 값은 `json.stringify`/`json.parse` 로 왕복.
- `sd-shared-data-select`/`select-list` 의 `[modal]` 은 `selectMode: "single"` 과 현재 키를 주입해 열고 닫힘 결과의 첫 키로 선택을 갱신, `[editModal]` 은 관리 전용(선택 유지). 띄우는 목록은 선택 모달 계약을 구현해야 합니다.
- 공유데이터 `emitAsync(name, changeKeys)` 는 `connectAsync` 콜백 **밖**(커밋 뒤)에서. `changeKeys` 생략은 전체 리로드, 미등록 이름은 throw.
- SSG(`sd.config.ts` client 의 `prerender: ["/", …]`): 프리렌더 라우트 코드는 빌드 시 node 에서 한 번 실행되므로 생성자·`effect` 등 초기화 경로에서 `window`/`document`/`localStorage`, 서비스 RPC, `connectAsync`, 공유데이터 호출 금지(이벤트 핸들러 안은 무방). `isPlatformBrowser(inject(PLATFORM_ID))` 또는 `afterNextRender` 로 가드. `withHashLocation()` 제거, `provideClientHydration()` 추가, `src/main.server.ts` 에 `provideServerRendering()` 부트스트랩 default export — `connectAsync` 배선은 `main.ts` 에만. 동적 URL 은 프리렌더 불가(셸 폴백). dev/watch 에는 적용되지 않으니 확인은 프로덕션 빌드로.
- `SdThemeProvider` 의 테마는 `--sd-*` 역할 토큰 값 맵으로만 완성됩니다. 앱 커스터마이즈는 `body { --sd-bg-canvas: … }` 처럼 토큰 재정의, 컴포넌트 셀렉터 오버라이드나 rgb 리터럴 금지. 유틸 클래스명 = 토큰명에서 `--sd-` 뗀 것.
- `SdToastProvider.alertThemes` 에 든 severity 는 토스트 대신 `window.alert`. `info/success/warning/danger(msg, true)` 는 progress 시그널을 반환합니다.
