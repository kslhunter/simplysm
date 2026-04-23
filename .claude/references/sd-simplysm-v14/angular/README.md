# @simplysm/angular

Angular 21 기반 UI 컴포넌트 라이브러리. Zoneless, signal-based, standalone 컴포넌트로 구성된다.

> **NOTE:** 이 문서는 `@simplysm/angular` 라이브러리의 사용법만 다룬다. Angular 프레임워크 자체의 사용법(컴포넌트 작성, DI, 라우팅, signal 등)은 `angular-cli` MCP를 활용한다.

## Installation

```bash
npm install @simplysm/angular
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 앱 부트스트랩 | [provide-sd-angular.md](./bootstrap/provide-sd-angular.md) |
| CRUD 목록 화면 만들기 | [crud-list.md](./recipes/crud-list.md) |
| CRUD 상세 화면 만들기 | [crud-detail.md](./recipes/crud-detail.md) |
| 페이지/모달/컨트롤 컨테이너 | [page-modal-container.md](./recipes/page-modal-container.md) |
| 모달 선택 버튼 | [data-select-button.md](./recipes/data-select-button.md) |
| 모달 열기 | [sd-modal-provider.md](./providers/sd-modal-provider.md) |
| 토스트 알림 표시 | [sd-toast-provider.md](./providers/sd-toast-provider.md) |
| 인쇄/PDF 생성 | [sd-print-provider.md](./providers/sd-print-provider.md) |
| 공유 데이터 캐시 | [sd-shared-data-provider.md](./providers/sd-shared-data-provider.md) |
| 다크모드/폰트 크기 | [sd-theme-provider.md](./providers/sd-theme-provider.md) |
| 시트(스프레드시트) 사용 | [sd-sheet.md](./ui-data/sd-sheet.md) |

## 먼저 읽기 (횡단 전제)

- [공통 규칙](./recipes/_common-rules.md) — 여러 Entry에 걸친 금지·컨벤션
- [provideSdAngular](./bootstrap/provide-sd-angular.md) — 반드시 등록해야 하는 환경 프로바이더

## API Overview

### Bootstrap

| API | Type | Description |
|-----|------|-------------|
| [`provideSdAngular`](./bootstrap/provide-sd-angular.md) | function | 모든 기반 설정을 제공하는 환경 프로바이더 팩토리 |
| [`SdAngularConfigProvider`](./bootstrap/sd-angular-config-provider.md) | class | `clientName` 설정을 보유하는 프로바이더 |

### Providers

| API | Type | Description |
|-----|------|-------------|
| [`SdThemeProvider`](./providers/sd-theme-provider.md) | class | 다크모드/폰트 크기 프로바이더 (`dark`, `fontSize` signal) |
| [`SdThemeSelector`](./providers/sd-theme-provider.md) | component | 테마 설정 드롭다운 (다크모드 토글, 폰트 크기 조절) |
| [`SdSystemLogProvider`](./providers/sd-system-log-provider.md) | class | 시스템 로그 기록 프로바이더 |
| [`SdAppStructureProvider`](./providers/sd-app-structure-provider.md) | class | 앱 구조(메뉴/권한) 관리 프로바이더 |
| [`injectPermsSignal`](./providers/sd-app-structure-provider.md) | function | 현재 뷰의 권한 목록을 signal로 반환 |
| [`SdAppStructureUtils`](./providers/sd-app-structure-provider.md) | class | 앱 구조 유틸리티 (메뉴/권한 조회 정적 메서드) |
| [`SdFileDialogProvider`](./providers/sd-file-dialog-provider.md) | class | 네이티브 파일 선택 대화상자 프로바이더 |
| [`SdLocalStorageProvider`](./providers/sd-local-storage-provider.md) | class | `clientName` 스코프 localStorage 래퍼 |
| [`SdSystemConfigProvider`](./providers/sd-system-config-provider.md) | class | 비동기 설정 저장/조회 프로바이더 |
| [`SdServiceClientFactoryProvider`](./providers/sd-service-client-factory-provider.md) | class | ServiceClient 인스턴스 팩토리/관리 |
| [`SdSharedDataProvider`](./providers/sd-shared-data-provider.md) | class | 이벤트 기반 공유 데이터 캐시 추상 프로바이더 |
| [`SdSharedDataChangeEvent`](./providers/sd-shared-data-provider.md) | const | 공유 데이터 변경 이벤트 정의 |
| [`SdNavigateWindowProvider`](./providers/sd-navigate-window-provider.md) | class | 새 윈도우 네비게이션 + 자동 닫기 |
| [`SdActivatedModalProvider`](./providers/sd-activated-modal-provider.md) | class | 모달 내부에서 inject하여 모달/컨텐츠 참조 |
| [`SdToastProvider`](./providers/sd-toast-provider.md) | class | 토스트 알림 (info/success/warning/danger) |
| [`SdBusyProvider`](./providers/sd-busy-provider.md) | class | 글로벌 busy 상태 관리 (spinner/bar/cube) |
| [`SdPrintProvider`](./providers/sd-print-provider.md) | class | 인쇄 및 PDF 생성 프로바이더 |
| [`SdModalProvider`](./providers/sd-modal-provider.md) | class | 프로그래밍 방식 모달 생성 |

### Provider Types

| API | Type | Description |
|-----|------|-------------|
| [`SdMenu`](./provider-types/sd-menu.md) | interface | 메뉴 트리 노드 |
| [`SdFlatMenu`](./provider-types/sd-menu.md) | interface | 플랫 메뉴 항목 |
| [`SdPermission`](./provider-types/sd-menu.md) | interface | 권한 트리 노드 |
| [`SharedDataBase`](./provider-types/shared-data-base.md) | interface | 공유 데이터 기본 인터페이스 |
| [`SharedDataInfo`](./provider-types/shared-data-base.md) | interface | 공유 데이터 등록 정보 |
| [`SharedDataHandle`](./provider-types/shared-data-base.md) | interface | 공유 데이터 핸들 (items signal + get) |
| [`SdModalContentDef`](./provider-types/sd-modal-content-def.md) | interface | 모달 컴포넌트 구현 인터페이스 |
| [`SdModalInfo`](./provider-types/sd-modal-content-def.md) | interface | 모달 생성 시 전달하는 정보 |
| [`SdModalOptions`](./provider-types/sd-modal-content-def.md) | interface | 모달 옵션 (크기, 위치, 동작) |
| [`SdToastContentDef`](./provider-types/sd-toast-content-def.md) | interface | 토스트 컴포넌트 구현 인터페이스 |
| [`SdToastInput`](./provider-types/sd-toast-content-def.md) | interface | 커스텀 토스트 생성 입력 |
| [`SdToastSeverity`](./provider-types/sd-toast-content-def.md) | type | 토스트 심각도 (`"info" \| "success" \| "warning" \| "danger"`) |
| [`SdToastTheme`](./provider-types/sd-toast-content-def.md) | type | 토스트 테마 (severity + `"primary" \| "secondary" \| "gray" \| "blue-gray"`) |
| [`SdBusyType`](./provider-types/sd-toast-content-def.md) | type | busy 표시 유형 (`"spinner" \| "bar" \| "cube"`) |
| [`SdPrint`](./provider-types/sd-toast-content-def.md) | interface | 인쇄 컴포넌트 구현 인터페이스 |
| [`SdPrintInput`](./provider-types/sd-toast-content-def.md) | interface | 인쇄 생성 입력 |
| [`SelectModalOutputResult`](./provider-types/sd-modal-content-def.md) | interface | 모달 선택 결과 (`selectedItemKeys`, `selectedItems`) |

### Directives

| API | Type | Description |
|-----|------|-------------|
| [`SdEvents`](./directives/sd-events.md) | directive | `.capture`, `.passive`, `.once` 수식어 및 커스텀 이벤트 바인딩 |
| [`SdRipple`](./directives/sd-ripple.md) | directive | `[sdRipple]` 리플 효과 |
| [`SdShowEffect`](./directives/sd-show-effect.md) | directive | `[sdShowEffect]` 뷰포트 진입 시 reveal 애니메이션 |
| [`SdInvalid`](./directives/sd-invalid.md) | directive | `[sdInvalid]` 유효성 검증 표시기 |
| [`SdTypedTemplate`](./directives/sd-typed-template.md) | directive | `ng-template[typed]` 템플릿 컨텍스트 타입 가드 |
| [`SdItemOfTemplate`](./directives/sd-typed-template.md) | directive | `ng-template[itemOf]` 항목 반복 템플릿 타입 가드 |
| [`SdItemOfTemplateContext`](./directives/sd-typed-template.md) | interface | itemOf 템플릿 컨텍스트 (`$implicit`, `item`, `index`, `depth`) |
| [`SdRouterLink`](./directives/sd-router-link.md) | directive | `[sdRouterLink]` 라우터 네비게이션 (Ctrl+클릭 새 창) |
| [`SdCommandDirective`](./directives/sd-command-directive.md) | directive | `[sdSaveCommand]`, `[sdInsertCommand]` 키보드 단축키 output 이벤트 디렉티브 |
| [`SdResizeDirective`](./directives/sd-resize-directive.md) | directive | `[sdResize]` ResizeObserver 기반 resize output 이벤트 디렉티브 |
| [`SdResizeEvent`](./directives/sd-resize-directive.md) | interface | resize 이벤트 데이터 (`heightChanged`, `widthChanged`, `target`, `contentRect`) |
| [`SdIntersectionDirective`](./directives/sd-intersection-directive.md) | directive | `[sdIntersection]` IntersectionObserver 기반 intersection output 이벤트 디렉티브 |
| [`SdIntersectionEvent`](./directives/sd-intersection-directive.md) | interface | intersection 이벤트 데이터 (`entry`) |

### Plugins

| API | Type | Description |
|-----|------|-------------|
| [`SdOptionEventPlugin`](./plugins/sd-option-event-plugin.md) | class | `.capture`, `.passive`, `.once` 이벤트 옵션 플러그인 (`provideSdAngular`에서 자동 등록) |
| [`SdGlobalErrorHandlerPlugin`](./plugins/sd-global-error-handler.md) | class | 글로벌 에러 핸들러 (PromiseRejection, ErrorEvent 등) |

### Pipes

| API | Type | Description |
|-----|------|-------------|
| [`FormatPipe`](./pipes/format-pipe.md) | pipe | DateTime/DateOnly/string 포매팅 파이프 |

### Utils & Setups

| API | Type | Description |
|-----|------|-------------|
| [`mark`](./utils/mark.md) | function | WritableSignal 변경 알림 트리거 (shallow copy) |
| [`setSafeStyle`](./utils/set-safe-style.md) | function | Renderer2로 여러 CSS 스타일 일괄 적용 |
| [`injectSdSystemConfigResource`](./utils/inject-sd-system-config-resource.md) | function | 시스템 설정 resource 래퍼 |
| [`injectCurrentPageCodeSignal`](./utils/inject-routing-signals.md) | function | 현재 페이지 코드 signal |
| [`injectFullPageCodeSignal`](./utils/inject-routing-signals.md) | function | 전체 페이지 코드 signal (NavigationEnd 기반) |
| [`injectViewTitleSignal`](./utils/inject-routing-signals.md) | function | 현재 뷰 타이틀 signal |
| [`injectViewTypeSignal`](./utils/inject-routing-signals.md) | function | 현재 뷰 타입 signal (`page \| modal \| control`) |
| [`useSelectionManager`](./utils/selection-managers.md) | function | 선택 관리 composable (single/multi) |
| [`useSortingManager`](./utils/selection-managers.md) | function | 정렬 관리 composable |
| [`useExpandingManager`](./utils/selection-managers.md) | function | 트리 확장/축소 관리 composable |
| [`setupBgTheme`](./utils/setup-functions.md) | function | body 배경 테마 색상 설정 |
| [`setupRipple`](./utils/setup-functions.md) | function | 리플 효과 설정 |
| [`setupRevealOnShow`](./utils/setup-functions.md) | function | 뷰포트 진입 시 reveal 애니메이션 설정 |
| [`setupInvalid`](./utils/setup-functions.md) | function | 유효성 검증 표시기 설정 |
| [`setupModelHook`](./utils/setup-functions.md) | function | model signal의 set을 가드 함수로 래핑 |
| [`setupCanDeactivate`](./utils/setup-functions.md) | function | 모달/라우트 canDeactivate 설정 |

### Type Utilities

| API | Type | Description |
|-----|------|-------------|
| [`DirectiveInputSignals`](./type-utilities/directive-input-signals.md) | type | InputSignal 프로퍼티에서 값 타입 추출 |
| [`UndefToOptional`](./type-utilities/directive-input-signals.md) | type | undefined 포함 프로퍼티를 optional로 변환 |
| [`WithOptional`](./type-utilities/directive-input-signals.md) | type | 특정 키를 optional로 변환 |
| [`SdViewType`](./type-utilities/directive-input-signals.md) | type | 뷰 타입 (`"page" \| "modal" \| "control"`) |
| [`SortingDef`](./type-utilities/directive-input-signals.md) | interface | 정렬 정의 (`key`, `desc`) |
| [`ExpandItemDef`](./type-utilities/directive-input-signals.md) | interface | 트리 확장 항목 정의 |
| [`SdSelectModal`](./type-utilities/directive-input-signals.md) | interface | 모달 선택 컴포넌트 인터페이스 |
| [`SdSelectModalInfo`](./type-utilities/directive-input-signals.md) | type | 모달 선택 정보 타입 |
| [`SdTextfieldTypes`](./type-utilities/directive-input-signals.md) | type | 텍스트필드 타입별 값 타입 매핑 |
| [`sdTextfieldTypes`](./type-utilities/directive-input-signals.md) | const | 텍스트필드 타입 문자열 배열 |
| [`SelectModeValue`](./type-utilities/directive-input-signals.md) | type | select mode별 value 타입 매핑 |

### Features

| API | Type | Description |
|-----|------|-------------|
| [`SdAddressSearchModal`](./features/sd-address-search-modal.md) | component | Daum Postcode 주소 검색 모달 |
| [`Address`](./features/sd-address-search-modal.md) | interface | 주소 검색 결과 |
| [`SdPermissionTable`](./features/sd-permission-table.md) | component | 권한 매트릭스 테이블 (items, value) |
| [`SdSharedDataSelect`](./features/sd-shared-data-components.md) | component | 공유 데이터 드롭다운 선택 |
| [`SdSharedDataSelectButton`](./features/sd-shared-data-components.md) | component | 공유 데이터 모달 선택 버튼 |
| [`SdSharedDataSelectList`](./features/sd-shared-data-components.md) | component | 공유 데이터 목록형 선택 (selectedItem model) |
| [`matchesSearchText`](./features/sd-shared-data-components.md) | function | 공백 구분 AND 조건 텍스트 검색 매칭 |

### UI - Layout

| API | Type | Description |
|-----|------|-------------|
| [`SdDockContainer`](./ui-layout/sd-dock-container.md) | component | 도킹 레이아웃 컨테이너 |
| [`SdDock`](./ui-layout/sd-dock.md) | component | 도킹 영역 (top/bottom/left/right) |
| [`SdGap`](./ui-layout/sd-gap.md) | component | 간격 (gap) 컴포넌트 |
| [`SdKanbanBoard`](./ui-layout/sd-kanban-board.md) | component | 칸반 보드 (드래그앤드롭, selectedValues) |
| [`SdKanbanBoardDropInfo`](./ui-layout/sd-kanban-board.md) | interface | 칸반 보드 드롭 이벤트 정보 |
| [`SdKanbanDragRef`](./ui-layout/sd-kanban-board.md) | interface | 칸반 드래그 참조 인터페이스 |
| [`SdKanbanDropTarget`](./ui-layout/sd-kanban-board.md) | interface | 칸반 드롭 타겟 인터페이스 |
| [`SdKanban`](./ui-layout/sd-kanban.md) | component | 칸반 아이템 |
| [`SdKanbanLane`](./ui-layout/sd-kanban-lane.md) | component | 칸반 레인 |

### UI - Form

| API | Type | Description |
|-----|------|-------------|
| [`SdButton`](./ui-form/sd-button.md) | component | 버튼 |
| [`SdAnchor`](./ui-form/sd-anchor.md) | component | 앵커 (인라인 버튼) |
| [`SdAdditionalButton`](./ui-form/sd-additional-button.md) | component | 추가 동작 버튼 (드롭다운 포함) |
| [`SdModalSelectButton`](./ui-form/sd-modal-select-button.md) | component | 모달 선택 버튼 |
| [`SdTextfield`](./ui-form/sd-textfield.md) | component | 텍스트 입력 (13가지 타입: number, text, password, color, email, format, date, month, year, datetime, datetime-sec, time, time-sec) |
| [`SdTextarea`](./ui-form/sd-textarea.md) | component | 멀티라인 텍스트 입력 |
| [`SdNumpad`](./ui-form/sd-numpad.md) | component | 숫자 패드 |
| [`SdRange`](./ui-form/sd-range.md) | component | 범위 슬라이더 |
| [`SdDateRangePicker`](./ui-form/sd-date-range-picker.md) | component | 날짜 범위 선택기 |
| [`SdStatePreset`](./ui-form/sd-state-preset.md) | component | 상태 프리셋 저장/불러오기 |
| [`SdStatePresetDef`](./ui-form/sd-state-preset.md) | interface | 상태 프리셋 데이터 (name, state) |
| [`SdCheckbox`](./ui-form/sd-checkbox.md) | component | 체크박스 |
| [`SdSwitch`](./ui-form/sd-switch.md) | component | 스위치 토글 |
| [`SdCheckboxGroup`](./ui-form/sd-checkbox-group.md) | component | 체크박스 그룹 |
| [`SdCheckboxGroupItem`](./ui-form/sd-checkbox-group.md) | component | 체크박스 그룹 항목 |
| [`SdTiptapEditor`](./features/sd-tiptap-editor.md) | component | TipTap 리치 텍스트 에디터 |
| [`SdSelect`](./ui-form/sd-select.md) | component | 드롭다운 선택 (single/multi) |
| [`SdSelectItem`](./ui-form/sd-select.md) | component | 드롭다운 선택 항목 |
| [`SdSelectButton`](./ui-form/sd-select.md) | component | 버튼 스타일 선택 |
| [`SdForm`](./ui-form/sd-form.md) | component | 폼 래퍼 (submit 이벤트, busy 관리) |

### UI - Navigation

| API | Type | Description |
|-----|------|-------------|
| [`SdCollapse`](./ui-navigation/sd-collapse.md) | component | 접기/펼치기 패널 |
| [`SdCollapseIcon`](./ui-navigation/sd-collapse.md) | component | 접기/펼치기 아이콘 |
| [`SdTab`](./ui-navigation/sd-tab.md) | component | 탭 컨테이너 |
| [`SdTabItem`](./ui-navigation/sd-tab.md) | component | 탭 항목 |
| [`SdPagination`](./ui-navigation/sd-pagination.md) | component | 페이지네이션 |
| [`SdSidebarContainer`](./ui-navigation/sd-sidebar-container.md) | component | 사이드바 컨테이너 |
| [`SdSidebar`](./ui-navigation/sd-sidebar-container.md) | component | 사이드바 |
| [`SdSidebarMenu`](./ui-navigation/sd-sidebar-menu.md) | component | 사이드바 메뉴 |
| [`SdSidebarUser`](./ui-navigation/sd-sidebar-user.md) | component | 사이드바 사용자 영역 |
| [`SdSidebarUserMenu`](./ui-navigation/sd-sidebar-user.md) | interface | 사이드바 사용자 메뉴 항목 |
| [`SdTopbarContainer`](./ui-navigation/sd-topbar-container.md) | component | 탑바 컨테이너 |
| [`SdTopbar`](./ui-navigation/sd-topbar.md) | component | 탑바 |
| [`SdTopbarMenu`](./ui-navigation/sd-topbar-menu.md) | component | 탑바 메뉴 |
| [`SdTopbarUser`](./ui-navigation/sd-topbar-user.md) | component | 탑바 사용자 영역 |
| [`SdTopbarUserMenu`](./ui-navigation/sd-topbar-user.md) | interface | 탑바 사용자 메뉴 항목 |
| [`getMenuRouterLinkOption`](./ui-navigation/sd-sidebar-menu.md) | function | 메뉴에서 라우터 링크 옵션 추출 |
| [`getIsMenuSelected`](./ui-navigation/sd-sidebar-menu.md) | function | 메뉴 선택 여부 확인 |

### UI - Data

| API | Type | Description |
|-----|------|-------------|
| [`SdList`](./ui-data/sd-list.md) | component | 리스트 |
| [`SdListItem`](./ui-data/sd-list.md) | component | 리스트 항목 |
| [`SdSheet`](./ui-data/sd-sheet.md) | component | 스프레드시트 (정렬, 고정, 리사이즈). `key`로 설정 저장 |
| [`SdSheetColumn`](./ui-data/sd-sheet.md) | directive | 시트 컬럼 정의 (헤더, 너비, 고정, 정렬 등) |
| [`SdSheetColumnCellTemplate`](./ui-data/sd-sheet.md) | directive | 시트 컬럼 셀 내용 정의 (`ng-template[cell]`), `SdSheetCellContext` 타입 가드 제공 |
| [`SdSheetCellContext`](./ui-data/sd-sheet.md) | interface | 시트 셀 템플릿 컨텍스트 (`$implicit`, `item`, `index`, `depth`, `edit`) |
| [`SdSheetConfigModal`](./ui-data/sd-sheet.md) | component | 시트 설정 모달 |
| [`SdSheetColumnDef`](./ui-data/sd-sheet.md) | interface | 시트 컬럼 정의 데이터 |
| [`SdSheetConfig`](./ui-data/sd-sheet.md) | interface | 시트 설정 데이터 |
| [`SdSheetHeaderDef`](./ui-data/sd-sheet.md) | interface | 시트 헤더 정의 |
| [`SdSheetItemKeydownEventParam`](./ui-data/sd-sheet.md) | interface | 시트 항목 keydown 이벤트 파라미터 |
| [`SdSheetCellKeydownEventParam`](./ui-data/sd-sheet.md) | interface | 시트 셀 keydown 이벤트 파라미터 |

### UI - Visual

| API | Type | Description |
|-----|------|-------------|
| [`SdLabel`](./ui-visual/sd-label.md) | component | 라벨 (테마, 크기) |
| [`SdNote`](./ui-visual/sd-note.md) | component | 노트/알림 메시지 |
| [`SdProgress`](./ui-visual/sd-progress.md) | component | 진행률 바 |
| [`SdCalendar`](./ui-visual/sd-calendar.md) | component | 캘린더 |
| [`SdBarcode`](./ui-visual/sd-barcode.md) | component | 바코드 생성 (bwip-js) |
| [`SdEcharts`](./ui-visual/sd-echarts.md) | component | ECharts 차트 래퍼 |
| [`BarcodeType`](./ui-visual/sd-barcode.md) | type | 바코드 타입 |

### UI - Overlay

| API | Type | Description |
|-----|------|-------------|
| [`SdDropdown`](./ui-overlay/sd-dropdown.md) | component | 드롭다운 트리거 |
| [`SdDropdownPopup`](./ui-overlay/sd-dropdown.md) | component | 드롭다운 팝업 |
| [`SdModal`](./ui-overlay/sd-modal.md) | component | 모달 래퍼 컴포넌트 |
| [`SdPromptModal`](./ui-overlay/sd-prompt-modal.md) | component | 프롬프트 입력 모달 |
| [`SdConfirmModal`](./ui-overlay/sd-confirm-modal.md) | component | 확인/취소 모달 |
| [`SdToast`](./ui-overlay/sd-toast.md) | component | 토스트 개별 항목 |
| [`SdToastContainer`](./ui-overlay/sd-toast.md) | component | 토스트 컨테이너 |
| [`SdBusyContainer`](./ui-overlay/sd-busy-container.md) | component | busy 표시 컨테이너 |

### Recipes

화면 조립 레시피. "무엇을 만들고 싶은가" 기준으로 진입한다.

| Recipe | Description |
|--------|-------------|
| [페이지/모달 컨테이너](./recipes/page-modal-container.md) | `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` 직접 조립으로 page/modal/control 뷰 재사용 |
| [CRUD 리스트](./recipes/crud-list.md) | 조회 전용 page → 인라인 편집 → 선택 모달 → 엑셀 내보내기까지 누적 확장 |
| [CRUD 상세폼](./recipes/crud-detail.md) | 읽기 전용 상세 → 편집/저장 → 삭제/복원 → modal/control 뷰까지 누적 확장 |
| [모달 선택 버튼](./recipes/data-select-button.md) | `<sd-modal-select-button>` 직접 사용 / `<sd-shared-data-select-button>` / 사용자 정의 wrapper |

### Styling

| Entry | Description |
|-------|-------------|
| [CSS Classes](./styling/classes.md) | 레이아웃, 유틸리티, 폼, 테이블 클래스 |
| [CSS Custom Properties](./styling/variables.md) | OKLCH 색상 팔레트, 간격, 폰트, 레이아웃 변수 |
| [Themes](./styling/themes.md) | 다크 모드 테마 클래스 |
| [Mixins / Functions](./styling/mixins.md) | 공개 SCSS mixin/function |

## 컴포넌트 비동기 초기화 규칙

컴포넌트에서 비동기 초기화가 필요한 경우 constructor `effect()` + `void untracked(async () => ...)` 패턴을 사용한다. signal 의존성을 `effect` 콜백의 동기 부분에서 읽어 등록하고, 비동기 작업은 `untracked` 안에서 수행한다. 의존 signal이 변경되면 effect가 자동 재실행된다.

```typescript
export class SomePage {
  busyCount = signal(0);
  initialized = signal(false);

  constructor() {
    effect(() => {
      // signal 의존성 등록 (untracked 바깥)
      this.someInput();
      this.lastFilter();

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          // 비동기 초기화 로직
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });
  }
}
```

- constructor 내 `void (async () => { ... })()` IIFE 패턴 **금지**
- constructor 내 `void this._init()` 같은 수동 호출 패턴 **금지** — effect가 이미 같은 역할
- `async ngOnInit()` 패턴 **금지** — 1회만 실행되어 input signal 변경에 반응하지 않는다. effect는 의존 signal 변경 시 자동 재실행된다
- `resource()` / `httpResource()`는 데이터 로딩 → signal 매핑 용도. 사이드이펙트(라우팅, toast 등) 포함 초기화에는 사용하지 않는다

## 소비 프로젝트 네이밍 규칙

`@simplysm/angular`를 소비하는 앱 프로젝트에서의 파일명·클래스명·selector 규칙이다.
파일명은 **kebab-case + dot-suffix**, 클래스명은 **PascalCase**를 따른다.

| 접미어 | 조건 | 파일명 예시 | 클래스명 예시 | selector 예시 |
|--------|------|-------------|---------------|---------------|
| `.list.ts` / `*List` | 여러 레코드를 조회·관리하는 화면 ([recipes/crud-list.md](./recipes/crud-list.md)) | `outbound-instruction.list.ts` | `OutboundInstructionList` | `app-outbound-instruction-list` |
| `.detail.ts` / `*Detail` | 단일 레코드를 조회·편집하는 화면 ([recipes/crud-detail.md](./recipes/crud-detail.md)) | `outbound-instruction.detail.ts` | `OutboundInstructionDetail` | `app-outbound-instruction-detail` |
| `.view.ts` / `*View` | list/detail 아닌 route 연결 화면 (대시보드, 설정 등) | `dashboard.view.ts` | `DashboardView` | `app-dashboard-view` |
| `.modal.ts` / `*Modal` | 모달 전용 컴포넌트 (route 없이 `SdModalProvider.showAsync`로만 열림) | `item-select.modal.ts` | `ItemSelectModal` | `app-item-select-modal` |
| `.print-template.ts` / `*PrintTemplate` | 인쇄 전용 컴포넌트 (`SdPrintProvider`로 호출, `SdPrint` 구현) | `box-label.print-template.ts` | `BoxLabelPrintTemplate` | `app-box-label-print-template` |
| `.provider.ts` / `*Provider` | `@Injectable` 클래스 (**`*Service` 금지**) | `app-service.provider.ts` | `AppServiceProvider` | — |
| 접미어 없음 | route 미연결 일반 컨트롤 컴포넌트 | `instruction-item.ts` | `InstructionItem` | `app-instruction-item` |

- `pipe`, `directive` 등 기타 Angular 구성요소는 `@simplysm/angular` 패키지 자체의 네이밍 패턴(`.pipe.ts`, `.directive.ts`)을 따른다
- route 화면이 모달로도 재사용되는 경우(예: 선택 모달 겸용 리스트) **주 용도(route)의 suffix**를 유지한다 (예: `CustomerList` + `implements SdSelectModal`)

### selector 규칙

selector는 `app-{도메인}-{suffix}` 형식이다. 같은 도메인에 list와 detail이 공존할 수 있으므로 suffix를 반드시 포함한다.

| 클래스명 | selector |
|----------|----------|
| `CustomerList` | `app-customer-list` |
| `CustomerDetail` | `app-customer-detail` |
| `DashboardView` | `app-dashboard-view` |
| `ItemSelectModal` | `app-item-select-modal` |

### interface 네이밍

소비앱 내부의 로컬 interface에는 **`I` prefix**를 사용한다. 라이브러리에서 import하는 타입(`SortingDef`, `SharedDataBase` 등)에는 붙이지 않는다.

```typescript
// 소비앱 로컬 interface — I prefix 사용
interface IFilter { searchText?: string; }
interface ICustomer { id: number; name: string; }

// 라이브러리 타입 — 그대로 사용
import type { SortingDef, SharedDataBase } from "@simplysm/angular";
```

## 소비 프로젝트 디렉토리 구조

```
src/
├── app/                                  # 라우팅 페이지 (사이드바 메뉴 트리 구조와 대응)
│   ├── login/
│   └── home/
│       ├── {메뉴-그룹}/                  # 사이드바 메뉴 그룹
│       │   └── {도메인}/                 # 개별 도메인 (트리 깊이 제한 없음)
│       │       ├── {도메인}.view.ts      # route 연결 병합 컴포넌트
│       │       ├── {도메인}.list.ts      # 여러 레코드 조회·관리 (recipes/crud-list.md)
│       │       ├── {도메인}.detail.ts    # 단일 레코드 조회·편집 (recipes/crud-detail.md)
│       │       ├── {이름}.modal.ts       # 도메인 전용 모달
│       │       └── {이름}.ts            # 일반 컨트롤 (route 미연결)
│       └── main/
├── controls/                             # 앱 공유 컨트롤 컴포넌트
├── directives/                           # 앱 공유 디렉티브
├── modals/                               # 앱 전역 공통 모달
├── providers/                            # 앱 전역 프로바이더
├── types/                                # 타입 정의
└── utils/                                # 유틸리티
```

- `app/` 하위 트리는 사이드바 메뉴 구조와 거의 대응된다
- **배치 기준은 "어느 도메인에 소속되는가"**이다. provider, modal, directive, print-template, util 등 모든 종류의 파일이 소속 도메인 폴더 안에 배치된다 (다른 도메인에서 import하여 사용하는 것은 자유)
- 특정 도메인에 소속되지 않는 공통 파일만 `src/` 직하의 `controls/`, `modals/`, `providers/` 등에 배치한다

## inject 네이밍 컨벤션

`Sd*Provider`를 `inject()`할 때 변수명은 다음 규칙을 따른다:

- **Sd 접두어 유지**: 클래스명에서 `Sd`를 camelCase로 변환하여 유지한다
- **Provider 접미어 제거**: 변수명에서 `Provider`를 제거한다

| inject 대상 | 클래스 필드 | 로컬 변수 |
|-------------|-----------|----------|
| `SdToastProvider` | `private _sdToast = inject(SdToastProvider)` | `const sdToast = inject(SdToastProvider)` |
| `SdModalProvider` | `private _sdModal = inject(SdModalProvider)` | `const sdModal = inject(SdModalProvider)` |
| `SdServiceClientFactoryProvider` | `private _sdServiceClientFactory = inject(SdServiceClientFactoryProvider)` | `const sdServiceClientFactory = inject(...)` |

## Usage Examples

### 앱 부트스트랩

```typescript
import { provideSdAngular } from "@simplysm/angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({ clientName: "my-app" }),
    provideRouter(routes),
  ],
});
```

### 모달 표시

```typescript
import { SdModalProvider, type SdModalInfo } from "@simplysm/angular";

const sdModal = inject(SdModalProvider);

const result = await sdModal.showAsync(
  { title: "사용자 선택", type: UserSelectModal, inputs: { filter: "active" } },
  { useCloseByBackdrop: true },
);
```

### 서비스 + 이벤트 프록시 (AppServiceProvider 패턴)

소비 프로젝트에서 서비스와 이벤트를 한 곳에서 관리하는 패턴:

```typescript
import { inject, Injectable } from "@angular/core";
import { SdServiceClientFactoryProvider } from "@simplysm/angular";
import { createOrmClientConnector, type OrmClientConnector, type ServiceProxy } from "@simplysm/service-client";
import type { SystemLogServiceType } from "@my-server-package";
import type { OrderUpdatedEvent } from "@my-server-package"; // import type만 가능

@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  private readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  get client() {
    return this._sdServiceClientFactory.get("MAIN");
  }

  // 서비스 프록시 — getService() 패턴
  get systemLog() {
    return this.client.getService<SystemLogServiceType>("SystemLog");
  }

  // 이벤트 프록시 — getEvent() 패턴 (getService()와 동일)
  get orderUpdated() {
    return this.client.getEvent<typeof OrderUpdatedEvent>("OrderUpdated");
  }
}
```

사용처에서:

```typescript
const appSvc = inject(AppServiceProvider);

// 서비스 호출
await appSvc.systemLog.writeLog("hello");

// 이벤트 구독 — 이벤트 이름과 제네릭 타입을 반복 지정할 필요 없음
const key = await appSvc.orderUpdated.addListener({ orderId: 123 }, async (data) => {
  // data.status는 string으로 타입 추론
});

// 이벤트 발행
await appSvc.orderUpdated.emit((info) => info.orderId === 123, { status: "shipped" });

// 구독 해제
await appSvc.orderUpdated.removeListener(key);
```

### 토스트 알림

```typescript
import { SdToastProvider } from "@simplysm/angular";

const sdToast = inject(SdToastProvider);

sdToast.success("저장되었습니다.");
const result = await sdToast.try(async () => {
  return await someAsyncWork();
});
```

