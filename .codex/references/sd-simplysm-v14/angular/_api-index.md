# API Index — @simplysm/angular

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Bootstrap

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `provideSdAngular` | function | [provide-sd-angular.md](./bootstrap/provide-sd-angular.md) | 앱 부트스트랩 시 모든 기반 설정 등록 |
| `SdAngularConfigProvider` | class | [sd-angular-config-provider.md](./bootstrap$sd-angular-config-provider.md) | clientName 설정 조회 |

## Providers

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdThemeProvider` | class | [sd-theme-provider.md](./providers$sd-theme-provider.md) | 다크모드/폰트 크기 signal 제어 |
| `SdThemeSelector` | component | [sd-theme-provider.md](./providers$sd-theme-provider.md) | 테마 설정 드롭다운 UI |
| `SdSystemLogProvider` | class | [sd-system-log-provider.md](./providers$sd-system-log-provider.md) | 시스템 로그 기록 |
| `SdAppStructureProvider` | class | [sd-app-structure-provider.md](./providers$sd-app-structure-provider.md) | 앱 구조(메뉴/권한) 관리 |
| `injectPermsSignal` | function | [sd-app-structure-provider.md](./providers$sd-app-structure-provider.md) | 현재 뷰의 권한 목록 signal |
| `SdAppStructureUtils` | class | [sd-app-structure-provider.md](./providers$sd-app-structure-provider.md) | 앱 구조 유틸리티 정적 메서드 |
| `SdFileDialogProvider` | class | [sd-file-dialog-provider.md](./providers$sd-file-dialog-provider.md) | 네이티브 파일 선택 대화상자 |
| `SdLocalStorageProvider` | class | [sd-local-storage-provider.md](./providers$sd-local-storage-provider.md) | clientName 스코프 localStorage |
| `SdSystemConfigProvider` | class | [sd-system-config-provider.md](./providers$sd-system-config-provider.md) | 비동기 설정 저장/조회 |
| `SdServiceClientFactoryProvider` | class | [sd-service-client-factory-provider.md](./providers$sd-service-client-factory-provider.md) | ServiceClient 팩토리/관리 |
| `SdSharedDataProvider` | class | [sd-shared-data-provider.md](./providers$sd-shared-data-provider.md) | 이벤트 기반 공유 데이터 캐시 |
| `SdSharedDataChangeEvent` | const | [sd-shared-data-provider.md](./providers$sd-shared-data-provider.md) | 공유 데이터 변경 이벤트 정의 |
| `SdNavigateWindowProvider` | class | [sd-navigate-window-provider.md](./providers$sd-navigate-window-provider.md) | 새 윈도우 네비게이션 + 자동 닫기 |
| `SdActivatedModalProvider` | class | [sd-activated-modal-provider.md](./providers$sd-activated-modal-provider.md) | 모달 내부에서 모달/컨텐츠 참조 |
| `SdToastProvider` | class | [sd-toast-provider.md](./providers$sd-toast-provider.md) | 토스트 알림 표시 |
| `SdBusyProvider` | class | [sd-busy-provider.md](./providers$sd-busy-provider.md) | 글로벌 busy 상태 관리 |
| `SdPrintProvider` | class | [sd-print-provider.md](./providers$sd-print-provider.md) | 인쇄 및 PDF 생성 |
| `SdModalProvider` | class | [sd-modal-provider.md](./providers$sd-modal-provider.md) | 프로그래밍 방식 모달 생성 |

## Provider Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdMenu` | interface | [sd-menu.md](./provider-types$sd-menu.md) | 메뉴 트리 구조 정의 |
| `SdFlatMenu` | interface | [sd-menu.md](./provider-types$sd-menu.md) | 플랫 메뉴 항목 사용 |
| `SdPermission` | interface | [sd-menu.md](./provider-types$sd-menu.md) | 권한 트리 구조 정의 |
| `SharedDataBase` | interface | [shared-data-base.md](./provider-types/shared-data-base.md) | 공유 데이터 기본 인터페이스 구현 |
| `SharedDataInfo` | interface | [shared-data-base.md](./provider-types/shared-data-base.md) | 공유 데이터 등록 정보 |
| `SharedDataHandle` | interface | [shared-data-base.md](./provider-types/shared-data-base.md) | 공유 데이터 핸들 사용 |
| `SdModalContentDef` | interface | [sd-modal-content-def.md](./provider-types$sd-modal-content-def.md) | 모달 컴포넌트 구현 |
| `SdModalInfo` | type | [sd-modal-content-def.md](./provider-types$sd-modal-content-def.md) | 모달 생성 정보 전달 |
| `SdModalOptions` | interface | [sd-modal-content-def.md](./provider-types$sd-modal-content-def.md) | 모달 옵션 설정 |
| `SelectModalOutputResult` | interface | [sd-modal-content-def.md](./provider-types$sd-modal-content-def.md) | 모달 선택 결과 수신 |
| `SdToastContentDef` | interface | [sd-toast-content-def.md](./provider-types$sd-toast-content-def.md) | 커스텀 토스트 컴포넌트 구현 |
| `SdToastInput` | interface | [sd-toast-content-def.md](./provider-types$sd-toast-content-def.md) | 커스텀 토스트 생성 입력 |
| `SdToastSeverity` | type | [sd-toast-content-def.md](./provider-types$sd-toast-content-def.md) | 토스트 심각도 타입 |
| `SdToastTheme` | type | [sd-toast-content-def.md](./provider-types$sd-toast-content-def.md) | 토스트 테마 타입 |
| `SdBusyType` | type | [sd-busy-provider.md](./providers$sd-busy-provider.md) | busy 표시 유형 |
| `SdPrint` | interface | [sd-print-provider.md](./providers$sd-print-provider.md) | 인쇄 컴포넌트 구현 |
| `SdPrintInput` | interface | [sd-print-provider.md](./providers$sd-print-provider.md) | 인쇄 생성 입력 |

## Directives

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdEvents` | directive | [sd-events.md](./directives$sd-events.md) | 이벤트 수식어 바인딩 |
| `SdRipple` | directive | [sd-ripple.md](./directives$sd-ripple.md) | 리플 효과 적용 |
| `SdShowEffect` | directive | [sd-show-effect.md](./directives$sd-show-effect.md) | 뷰포트 진입 시 reveal 애니메이션 |
| `SdInvalid` | directive | [sd-invalid.md](./directives$sd-invalid.md) | 유효성 검증 표시 |
| `SdTypedTemplate` | directive | [sd-typed-template.md](./directives$sd-typed-template.md) | 템플릿 컨텍스트 타입 가드 |
| `SdItemOfTemplate` | directive | [sd-typed-template.md](./directives$sd-typed-template.md) | 항목 반복 템플릿 타입 가드 |
| `SdItemOfTemplateContext` | interface | [sd-typed-template.md](./directives$sd-typed-template.md) | itemOf 템플릿 컨텍스트 |
| `SdRouterLink` | directive | [sd-router-link.md](./directives$sd-router-link.md) | 라우터 네비게이션 |
| `SdCommandDirective` | directive | [sd-command-directive.md](./directives$sd-command-directive.md) | 키보드 단축키 output 이벤트 |
| `SdResizeDirective` | directive | [sd-resize-directive.md](./directives$sd-resize-directive.md) | ResizeObserver resize 이벤트 |
| `SdResizeEvent` | interface | [sd-resize-directive.md](./directives$sd-resize-directive.md) | resize 이벤트 데이터 |
| `SdIntersectionDirective` | directive | [sd-intersection-directive.md](./directives$sd-intersection-directive.md) | IntersectionObserver 이벤트 |
| `SdIntersectionEvent` | interface | [sd-intersection-directive.md](./directives$sd-intersection-directive.md) | intersection 이벤트 데이터 |

## Plugins

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdOptionEventPlugin` | class | [sd-option-event-plugin.md](./plugins$sd-option-event-plugin.md) | 이벤트 옵션 플러그인 등록 |
| `SdGlobalErrorHandlerPlugin` | class | [sd-global-error-handler.md](./plugins$sd-global-error-handler.md) | 글로벌 에러 핸들러 |

## Pipes

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `FormatPipe` | pipe | [format-pipe.md](./pipes/format-pipe.md) | DateTime/DateOnly/string 포매팅 |

## Utils & Setups

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `mark` | function | [mark.md](./utils/mark.md) | WritableSignal 변경 알림 트리거 |
| `setSafeStyle` | function | [set-safe-style.md](./utils/set-safe-style.md) | Renderer2로 CSS 스타일 일괄 적용 |
| `injectSdSystemConfigResource` | function | [inject-sd-system-config-resource.md](./utils/inject-sd-system-config-resource.md) | 시스템 설정 resource 래퍼 |
| `injectCurrentPageCodeSignal` | function | [inject-routing-signals.md](./utils/inject-routing-signals.md) | 현재 페이지 코드 signal |
| `injectFullPageCodeSignal` | function | [inject-routing-signals.md](./utils/inject-routing-signals.md) | 전체 페이지 코드 signal |
| `injectViewTitleSignal` | function | [inject-routing-signals.md](./utils/inject-routing-signals.md) | 현재 뷰 타이틀 signal |
| `injectViewTypeSignal` | function | [inject-routing-signals.md](./utils/inject-routing-signals.md) | 뷰 타입 signal (page/modal/control) |
| `useSelectionManager` | function | [selection-managers.md](./utils/selection-managers.md) | 선택 관리 composable |
| `useSortingManager` | function | [selection-managers.md](./utils/selection-managers.md) | 정렬 관리 composable |
| `useExpandingManager` | function | [selection-managers.md](./utils/selection-managers.md) | 트리 확장/축소 관리 composable |
| `setupBgTheme` | function | [setup-functions.md](./utils/setup-functions.md) | body 배경 테마 색상 설정 |
| `setupRipple` | function | [setup-functions.md](./utils/setup-functions.md) | 리플 효과 설정 |
| `setupRevealOnShow` | function | [setup-functions.md](./utils/setup-functions.md) | 뷰포트 진입 시 reveal 설정 |
| `setupInvalid` | function | [setup-functions.md](./utils/setup-functions.md) | 유효성 검증 표시기 설정 |
| `setupModelHook` | function | [setup-functions.md](./utils/setup-functions.md) | model signal의 set을 가드로 래핑 |
| `setupCanDeactivate` | function | [setup-functions.md](./utils/setup-functions.md) | canDeactivate 설정 |

## Type Utilities

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `DirectiveInputSignals` | type | [directive-input-signals.md](./type-utilities/directive-input-signals.md) | InputSignal에서 값 타입 추출 |
| `UndefToOptional` | type | [directive-input-signals.md](./type-utilities/directive-input-signals.md) | undefined 포함 프로퍼티를 optional로 |
| `WithOptional` | type | [directive-input-signals.md](./type-utilities/directive-input-signals.md) | 특정 키를 optional로 |
| `SdViewType` | type | [inject-routing-signals.md](./utils/inject-routing-signals.md) | 뷰 타입 union (page/modal/control) |
| `SortingDef` | interface | [selection-managers.md](./utils/selection-managers.md) | 정렬 정의 |
| `ExpandItemDef` | interface | [selection-managers.md](./utils/selection-managers.md) | 트리 확장 항목 정의 |
| `SdSelectModal` | interface | [sd-modal-content-def.md](./provider-types$sd-modal-content-def.md) | 모달 선택 컴포넌트 인터페이스 |
| `SdSelectModalInfo` | type | [sd-modal-content-def.md](./provider-types$sd-modal-content-def.md) | 모달 선택 정보 타입 |
| `SdTextfieldTypes` | type | [sd-textfield.md](./ui-form$sd-textfield.md) | 텍스트필드 타입별 값 타입 매핑 |
| `sdTextfieldTypes` | const | [sd-textfield.md](./ui-form$sd-textfield.md) | 텍스트필드 타입 문자열 배열 |
| `SelectModeValue` | type | [sd-select.md](./ui-form$sd-select.md) | select mode별 value 타입 매핑 |

## UI - Form

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdButton` | component | [sd-button.md](./ui-form$sd-button.md) | 버튼 클릭 |
| `SdAnchor` | component | [sd-anchor.md](./ui-form$sd-anchor.md) | 텍스트 내 인라인 클릭 요소 |
| `SdAdditionalButton` | component | [sd-additional-button.md](./ui-form$sd-additional-button.md) | 콘텐츠 + 추가 동작 버튼 |
| `SdModalSelectButton` | component | [sd-modal-select-button.md](./ui-form$sd-modal-select-button.md) | 모달을 열어 항목 선택 |
| `SdTextfield` | component | [sd-textfield.md](./ui-form$sd-textfield.md) | 한 줄 입력 (13가지 타입) |
| `SdTextarea` | component | [sd-textarea.md](./ui-form$sd-textarea.md) | 여러 줄 텍스트 입력 |
| `SdNumpad` | component | [sd-numpad.md](./ui-form$sd-numpad.md) | 숫자 패드 |
| `SdRange` | component | [sd-range.md](./ui-form$sd-range.md) | 범위 입력 (from ~ to) |
| `SdDateRangePicker` | component | [sd-date-range-picker.md](./ui-form$sd-date-range-picker.md) | 날짜 범위 선택기 |
| `SdStatePreset` | component | [sd-state-preset.md](./ui-form$sd-state-preset.md) | 상태 프리셋 저장/불러오기 |
| `SdStatePresetDef` | interface | [sd-state-preset.md](./ui-form$sd-state-preset.md) | 상태 프리셋 데이터 |
| `SdCheckbox` | component | [sd-checkbox.md](./ui-form$sd-checkbox.md) | 체크박스 |
| `SdSwitch` | component | [sd-switch.md](./ui-form$sd-switch.md) | 스위치 토글 |
| `SdCheckboxGroup` | component | [sd-checkbox-group.md](./ui-form$sd-checkbox-group.md) | 체크박스 그룹 |
| `SdCheckboxGroupItem` | component | [sd-checkbox-group.md](./ui-form$sd-checkbox-group.md) | 체크박스 그룹 항목 |
| `SdTiptapEditor` | component | [sd-tiptap-editor.md](./features$sd-tiptap-editor.md) | 리치 텍스트 에디터 |
| `SdSelect` | component | [sd-select.md](./ui-form$sd-select.md) | 드롭다운 선택 |
| `SdSelectItem` | component | [sd-select.md](./ui-form$sd-select.md) | 드롭다운 선택 항목 |
| `SdSelectButton` | component | [sd-select.md](./ui-form$sd-select.md) | 버튼 스타일 선택 |
| `SdForm` | component | [sd-form.md](./ui-form$sd-form.md) | 폼 래퍼 |
## UI - Data

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdList` | component | [sd-list.md](./ui-data$sd-list.md) | 리스트 표시 |
| `SdListItem` | component | [sd-list.md](./ui-data$sd-list.md) | 리스트 항목 |
| `SdSheet` | component | [sd-sheet.md](./ui-data$sd-sheet.md) | 스프레드시트 표시 |
| `SdSheetColumn` | directive | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 컬럼 정의 |
| `SdSheetColumnCellTemplate` | directive | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 셀 템플릿 |
| `SdSheetCellContext` | interface | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 셀 컨텍스트 |
| `SdSheetConfigModal` | component | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 설정 모달 |
| `SdSheetColumnDef` | interface | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 컬럼 정의 데이터 |
| `SdSheetConfig` | interface | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 설정 데이터 |
| `SdSheetHeaderDef` | interface | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 헤더 정의 |
| `SdSheetItemKeydownEventParam` | interface | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 항목 keydown 이벤트 |
| `SdSheetCellKeydownEventParam` | interface | [sd-sheet.md](./ui-data$sd-sheet.md) | 시트 셀 keydown 이벤트 |
| `SdBaseContainer` | component | [sd-base-container.md](./ui-data$sd-base-container.md) | CRUD 페이지/모달 기본 컨테이너 |
| `SdCrudDetail` | component | [sd-crud-detail.md](./ui-data$sd-crud-detail.md) | CRUD 상세 화면 |
| `SdCrudList` | component | [sd-crud-list.md](./ui-data$sd-crud-list.md) | CRUD 목록 화면 |

## UI - Layout

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdDockContainer` | component | [sd-dock-container.md](./ui-layout$sd-dock-container.md) | 도킹 레이아웃 컨테이너 |
| `SdDock` | component | [sd-dock.md](./ui-layout$sd-dock.md) | 도킹 영역 |
| `SdGap` | component | [sd-gap.md](./ui-layout$sd-gap.md) | 간격 삽입 |
| `SdKanbanBoard` | component | [sd-kanban-board.md](./ui-layout$sd-kanban-board.md) | 칸반 보드 |
| `SdKanbanBoardDropInfo` | interface | [sd-kanban-board.md](./ui-layout$sd-kanban-board.md) | 칸반 드롭 이벤트 |
| `SdKanbanDragRef` | interface | [sd-kanban-board.md](./ui-layout$sd-kanban-board.md) | 칸반 드래그 참조 |
| `SdKanbanDropTarget` | interface | [sd-kanban-board.md](./ui-layout$sd-kanban-board.md) | 칸반 드롭 타겟 |
| `SdKanban` | component | [sd-kanban.md](./ui-layout$sd-kanban.md) | 칸반 아이템 |
| `SdKanbanLane` | component | [sd-kanban-lane.md](./ui-layout$sd-kanban-lane.md) | 칸반 레인 |

## UI - Navigation

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdCollapse` | component | [sd-collapse.md](./ui-navigation$sd-collapse.md) | 접기/펼치기 패널 |
| `SdCollapseIcon` | component | [sd-collapse.md](./ui-navigation$sd-collapse.md) | 접기/펼치기 아이콘 |
| `SdTab` | component | [sd-tab.md](./ui-navigation$sd-tab.md) | 탭 컨테이너 |
| `SdTabItem` | component | [sd-tab.md](./ui-navigation$sd-tab.md) | 탭 항목 |
| `SdPagination` | component | [sd-pagination.md](./ui-navigation$sd-pagination.md) | 페이지네이션 |
| `SdSidebarContainer` | component | [sd-sidebar-container.md](./ui-navigation$sd-sidebar-container.md) | 사이드바 컨테이너 |
| `SdSidebar` | component | [sd-sidebar-container.md](./ui-navigation$sd-sidebar-container.md) | 사이드바 |
| `SdSidebarMenu` | component | [sd-sidebar-menu.md](./ui-navigation$sd-sidebar-menu.md) | 사이드바 메뉴 |
| `SdSidebarUser` | component | [sd-sidebar-user.md](./ui-navigation$sd-sidebar-user.md) | 사이드바 사용자 영역 |
| `SdSidebarUserMenu` | interface | [sd-sidebar-user.md](./ui-navigation$sd-sidebar-user.md) | 사이드바 사용자 메뉴 항목 |
| `SdTopbarContainer` | component | [sd-topbar-container.md](./ui-navigation$sd-topbar-container.md) | 탑바 컨테이너 |
| `SdTopbar` | component | [sd-topbar.md](./ui-navigation$sd-topbar.md) | 탑바 |
| `SdTopbarMenu` | component | [sd-topbar-menu.md](./ui-navigation$sd-topbar-menu.md) | 탑바 메뉴 |
| `SdTopbarUser` | component | [sd-topbar-user.md](./ui-navigation$sd-topbar-user.md) | 탑바 사용자 영역 |
| `SdTopbarUserMenu` | interface | [sd-topbar-user.md](./ui-navigation$sd-topbar-user.md) | 탑바 사용자 메뉴 항목 |
| `getMenuRouterLinkOption` | function | [sd-sidebar-menu.md](./ui-navigation$sd-sidebar-menu.md) | 메뉴에서 라우터 링크 옵션 추출 |
| `getIsMenuSelected` | function | [sd-sidebar-menu.md](./ui-navigation$sd-sidebar-menu.md) | 메뉴 선택 여부 확인 |

## UI - Overlay

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdDropdown` | component | [sd-dropdown.md](./ui-overlay$sd-dropdown.md) | 드롭다운 트리거 |
| `SdDropdownPopup` | component | [sd-dropdown.md](./ui-overlay$sd-dropdown.md) | 드롭다운 팝업 |
| `SdModal` | component | [sd-modal.md](./ui-overlay$sd-modal.md) | 모달 래퍼 컴포넌트 |
| `SdPromptModal` | component | [sd-prompt-modal.md](./ui-overlay$sd-prompt-modal.md) | 프롬프트 입력 모달 |
| `SdConfirmModal` | component | [sd-confirm-modal.md](./ui-overlay$sd-confirm-modal.md) | 확인/취소 모달 |
| `SdToast` | component | [sd-toast.md](./ui-overlay$sd-toast.md) | 토스트 개별 항목 |
| `SdToastContainer` | component | [sd-toast.md](./ui-overlay$sd-toast.md) | 토스트 컨테이너 |
| `SdBusyContainer` | component | [sd-busy-container.md](./ui-overlay$sd-busy-container.md) | busy 표시 컨테이너 |

## UI - Visual

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdLabel` | component | [sd-label.md](./ui-visual$sd-label.md) | 라벨 표시 |
| `SdNote` | component | [sd-note.md](./ui-visual$sd-note.md) | 노트/알림 메시지 |
| `SdProgress` | component | [sd-progress.md](./ui-visual$sd-progress.md) | 진행률 바 |
| `SdCalendar` | component | [sd-calendar.md](./ui-visual$sd-calendar.md) | 캘린더 |
| `SdBarcode` | component | [sd-barcode.md](./ui-visual$sd-barcode.md) | 바코드 생성 |
| `BarcodeType` | type | [sd-barcode.md](./ui-visual$sd-barcode.md) | 바코드 타입 |
| `SdEcharts` | component | [sd-echarts.md](./ui-visual$sd-echarts.md) | ECharts 차트 래퍼 |

## Features

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdAddressSearchModal` | component | [sd-address-search-modal.md](./features$sd-address-search-modal.md) | 주소 검색 (Daum Postcode) |
| `Address` | interface | [sd-address-search-modal.md](./features$sd-address-search-modal.md) | 주소 검색 결과 |
| `SdPermissionTable` | component | [sd-permission-table.md](./features$sd-permission-table.md) | 권한 매트릭스 테이블 |
| `SdSharedDataSelect` | component | [sd-shared-data-components.md](./features$sd-shared-data-components.md) | 공유 데이터 드롭다운 선택 |
| `SdSharedDataSelectButton` | component | [sd-shared-data-components.md](./features$sd-shared-data-components.md) | 공유 데이터 모달 선택 버튼 |
| `SdSharedDataSelectList` | component | [sd-shared-data-components.md](./features$sd-shared-data-components.md) | 공유 데이터 목록 선택 |
| `matchesSearchText` | function | [sd-shared-data-components.md](./features$sd-shared-data-components.md) | 공백 구분 AND 조건 텍스트 매칭 |

## Styling

| Entry | 문서 | 언제 쓰나 |
|-------|------|-----------|
| CSS Classes | [classes.md](./styling/classes.md) | 레이아웃/유틸리티 클래스 |
| CSS Custom Properties | [variables.md](./styling/variables.md) | 디자인 토큰 오버라이드 |
| Themes | [themes.md](./styling/themes.md) | 테마 전환 |
| Mixins / Functions | [mixins.md](./styling/mixins.md) | SCSS mixin/function 사용 |
