# @simplysm/angular

Angular 기반 simplysm 공통 UI/상태/인프라 컴포넌트·디렉티브·서비스 모음. zoneless·signal 기반. 모든 컴포넌트 standalone.

## 사용 트리거 인덱스

- **provideSdAngular / SdAngularConfigProvider** — 앱 부트스트랩 시 1회. 아래 "부트스트랩" 참조.
- **버튼류** (`SdButton`/`SdAnchor`/`SdAdditionalButton`/`SdModalSelectButton`/`SdSelectModal`/`SdSelectModalInfo`) — 클릭 트리거 UI. 자세히: [buttons.md](./buttons.md)
- **폼 입력류** (`SdTextfield`/`SdTextfieldTypes`/`sdTextfieldTypes`/`SdTextarea`/`SdNumpad`/`SdRange`/`SdDateRangePicker`/`SdSelect`/`SelectModeValue`/`SdSelectItem`/`SdSelectButton`/`SdCheckbox`/`SdSwitch`/`SdCheckboxGroup`/`SdCheckboxGroupItem`/`SdForm`/`SdDropdown`/`SdDropdownPopup`) — 값 입력·서밋. 자세히: [forms.md](./forms.md)
- **모달** (`SdModalProvider`/`SdModal`/`SdActivatedModalProvider`/`SdModalContentDef`/`SdModalInfo`/`SdModalOptions`/`SdPromptModal`/`SdConfirmModal`/`SelectModalOutputResult`) — 프로그래밍 다이얼로그. 자세히: [modal.md](./modal.md)
- **토스트·바쁨·프린트** (`SdToastProvider`/`SdToast`/`SdToastContainer`/`SdToastSeverity`/`SdToastTheme`/`SdToastContentDef`/`SdToastInput`/`SdBusyProvider`/`SdBusyContainer`/`SdBusyType`/`SdPrintProvider`/`SdPrint`/`SdPrintInput`) — 알림·로딩·인쇄. 자세히: [toast.md](./toast.md)
- **앱 구조·권한** (`SdAppStructureProvider`/`SdAppStructureUtils`/`SdMenu`/`SdFlatMenu`/`SdPermission`/`injectPermsSignal`/`SdPermissionTable`) — 메뉴 트리·권한 매트릭스. 자세히: [app-structure.md](./app-structure.md)
- **공유 데이터** (`SdSharedDataProvider`/`SharedDataBase`/`SharedDataInfo`/`SharedDataHandle`/`SdSharedDataChangeEvent`/`SdSharedDataSelect`/`SdSharedDataSelectButton`/`SdSharedDataSelectList`/`matchesSearchText`) — 서버 마스터데이터 캐시+선택 UI. 자세히: [shared-data.md](./shared-data.md)
- **시트** (`SdSheet`/`SdSheetColumn`/`SdSheetColumnCellTemplate`/`SdSheetConfigModal`/`SdSheetCellContext`/`SdSheetColumnDef`/`SdSheetConfig`/`SdSheetHeaderDef`/`SdSheetItemKeydownEventParam`/`SdSheetCellKeydownEventParam`) — 표 그리드. 자세히: [sheet.md](./sheet.md)
- **칸반** (`SdKanbanBoard`/`SdKanban`/`SdKanbanLane`/`SdKanbanBoardDropInfo`/`SdKanbanDragRef`/`SdKanbanDropTarget`) — 드래그 보드. 자세히: [kanban.md](./kanban.md)
- **CRUD 화면 골격** (`SdBaseContainer`/`SdCrudList`/`SdCrudDetail`/`SdStatePreset`/`SdStatePresetDef`) — 목록/상세 페이지 컨테이너. 자세히: [crud.md](./crud.md)
- **레이아웃** (`SdSidebarContainer`/`SdSidebar`/`SdSidebarMenu`/`SdSidebarUser`/`SdSidebarUserMenu`/`SdTopbarContainer`/`SdTopbar`/`SdTopbarMenu`/`SdTopbarUser`/`SdTopbarUserMenu`) — 사이드바·탑바 골격. 자세히: [layout.md](./layout.md)
- **셀렉트/확장/정렬 매니저** (`useSelectionManager`/`useExpandingManager`/`useSortingManager`/`ExpandItemDef`/`SortingDef`) — 리스트 내부 상태 헬퍼. 자세히: [selection-managers.md](./selection-managers.md)
- **라우팅** (`SdRouterLink`/`SdNavigateWindowProvider`/`injectCurrentPageCodeSignal`/`injectFullPageCodeSignal`/`injectViewTitleSignal`/`injectViewTypeSignal`/`SdViewType`/`setupCanDeactivate`/`getMenuRouterLinkOption`/`getIsMenuSelected`) — 라우터 보조. 자세히: [routing.md](./routing.md)
- **인프라/유틸** (`SdSystemLogProvider`/`SdLocalStorageProvider`/`SdSystemConfigProvider`/`injectSdSystemConfigResource`/`SdServiceClientFactoryProvider`/`SdFileDialogProvider`/`SdGlobalErrorHandlerPlugin`/`SdThemeProvider`/`SdThemeSelector`/`FormatPipe`/`mark`/`setSafeStyle`/`setupBgTheme`/`setupModelHook`/`DirectiveInputSignals`/`UndefToOptional`/`WithOptional`/`SdEvents`/`SdOptionEventPlugin`/`SdResizeDirective`/`SdResizeEvent`/`SdIntersectionDirective`/`SdIntersectionEvent`/`SdCommandDirective`/`SdRipple`/`setupRipple`/`SdShowEffect`/`setupRevealOnShow`/`SdInvalid`/`setupInvalid`/`SdTypedTemplate`/`SdItemOfTemplate`/`SdItemOfTemplateContext`) — 자세히: [infrastructure.md](./infrastructure.md)
- **시각 위젯** (`SdLabel`/`SdNote`/`SdProgress`/`SdCalendar`/`SdBarcode`/`BarcodeType`/`SdEcharts`/`SdTiptapEditor`/`SdAddressSearchModal`/`Address`/`SdCollapse`/`SdCollapseIcon`/`SdTab`/`SdTabItem`/`SdList`/`SdListItem`/`SdGap`/`SdPagination`) — 자세히: [visual.md](./visual.md)

## 부트스트랩

```ts
provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

- `clientName` — `SdAngularConfigProvider.clientName` 으로 저장. `SdLocalStorageProvider` 키 prefix, `SdServiceClientFactoryProvider` 의 `createServiceClient(clientName, …)`, `SdAppStructureProvider.initialize` 의 `itemsMap[clientName]` 조회에 사용.
- 호출 부수효과: zoneless change detection 활성, `IMAGE_CONFIG` 경고 끔, ng-icons 기본(stroke 1.5/size 1.33em), `EVENT_MANAGER_PLUGINS` 에 `SdOptionEventPlugin` 추가, `ErrorHandler` 를 `SdGlobalErrorHandlerPlugin` 으로 교체, `unhandledrejection`·`error` 글로벌 리스너 등록, `SdThemeProvider.dark`/`fontSize` 를 `SdLocalStorageProvider` 와 양방향 sync(`sd-theme-dark`·`sd-theme-font-size` 키), `Router` 네비게이션 동안 `SdBusyProvider.globalBusyCount` 증감, `SwUpdate` 활성 시 5분~1시간 백오프로 업데이트 확인 후 사용자 컨펌 → reload.

```ts
@Injectable({ providedIn: "root" }) class SdAngularConfigProvider { clientName!: string }
```

- 직접 쓸 일은 거의 없음. 다른 simplysm 프로바이더가 inject 해 prefix·키로 사용.
- 사용 예: `bootstrapApplication(App, { providers: [provideSdAngular({ clientName: "my-app" })] })`
