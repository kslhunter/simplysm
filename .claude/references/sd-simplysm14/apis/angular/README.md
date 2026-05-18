# @simplysm/angular

Angular 21 기반 클라이언트 UI 라이브러리. 폼/리스트/시트/모달/토스트 등 업무화면 컴포넌트와 부트스트랩 프로바이더를 모두 포함한다. 모든 컴포넌트는 standalone, signal/zoneless 기반.

## 사용 트리거 인덱스

- **앱 부트스트랩** — `provideSdAngular`, `SdAngularConfigProvider`, `setupBgTheme`, `SdSystemLogProvider`. 앱 부트스트랩/루트 컴포넌트에서 1회.
- **테마 (`SdThemeProvider`, `SdThemeSelector`)** — dark/fontSize 토글. `provideSdAngular`가 localStorage 자동 연동.
- **라우팅/페이지 컨텍스트** — 자세히: [routing.md](./routing.md). `SdRouterLink`, `injectViewTypeSignal`, `setupCanDeactivate` 등.
- **앱 구조/메뉴/권한** — 자세히: [app-structure.md](./app-structure.md). `SdAppStructureProvider`, `injectPermsSignal`, `SdMenu`.
- **모달** — 자세히: [modal.md](./modal.md). `SdModalProvider`, `SdModal`, `SdPromptModal`/`SdConfirmModal`, `SdAddressSearchModal`.
- **토스트** — 자세히: [toast.md](./toast.md). `SdToastProvider`(info/success/warning/danger/notify/try).
- **버튼류** — 자세히: [buttons.md](./buttons.md). `SdButton`, `SdAnchor`, `SdAdditionalButton`, `SdModalSelectButton`.
- **입력/폼 컨트롤** — 자세히: [forms.md](./forms.md). `SdForm`, `SdTextfield`/`SdTextarea`/`SdNumpad`/`SdRange`/`SdDateRangePicker`, `SdCheckbox`/`SdSwitch`/`SdCheckboxGroup(Item)`.
- **드롭다운/셀렉트** — 자세히: [select-dropdown.md](./select-dropdown.md). `SdDropdown(Popup)`, `SdSelect(Item|Button)`.
- **레이아웃 (사이드바/탑바)** — 자세히: [layout.md](./layout.md). `SdSidebar*`, `SdTopbar*`.
- **시트(테이블)** — 자세히: [sheet.md](./sheet.md). `SdSheet`, `SdSheetColumn`, `SdSheetColumnCellTemplate`, `SdSheetConfig*`.
- **CRUD 화면 골격** — 자세히: [crud.md](./crud.md). `SdBaseContainer`, `SdCrudList`, `SdCrudDetail`.
- **서버 공유 데이터 (`SharedData*` + 선택 컨트롤)** — 자세히: [shared-data.md](./shared-data.md). `SdSharedDataProvider`, `SdSharedDataSelect(Button|List)`, `matchesSearchText`.
- **선택/확장/정렬 매니저 훅** — 자세히: [selection-managers.md](./selection-managers.md). `useSelectionManager`, `useExpandingManager`, `useSortingManager`.
- **칸반 보드** — 자세히: [kanban.md](./kanban.md). `SdKanbanBoard`, `SdKanban`, `SdKanbanLane`.
- **시각 컴포넌트 (라벨/노트/프로그레스/달력/바코드/차트)** — 자세히: [visual.md](./visual.md).
- **인프라 프로바이더 (서비스 클라이언트/파일 다이얼로그/스토리지/시스템 설정/인쇄)** — 자세히: [infrastructure.md](./infrastructure.md).
- **`SdBusyContainer` / `SdBusyProvider`** — busy 오버레이. `provideSdAngular`가 라우터 navigation 동안 globalBusyCount 자동 증감.
- **`SdPermissionTable`** — `SdPermission<TModule>[]` 트리를 `Record<string, boolean>` 모델로 편집하는 권한표.
- **`SdStatePreset` / `SdStatePresetDef`** — 화면 상태(`state`)를 키별 프리셋으로 저장/복원. `SdSystemConfigProvider` 활용.
- **`SdTiptapEditor`** — Tiptap 기반 리치 에디터. `value`, `extensions`, `validatorFn`.
- **유틸 디렉티브/파이프 등** — 인라인 항목 참조.
- **유틸 타입/함수** — 인라인 항목 참조.

## 앱 부트스트랩

```typescript
bootstrapApplication(AppComponent, {
  providers: [provideSdAngular({ clientName: "myapp" }), provideRouter(routes)],
});
```

- `provideSdAngular({ clientName })`: zoneless CD, NgIcons config, 글로벌 에러 핸들러(`SdGlobalErrorHandlerPlugin`), `SdOptionEventPlugin`(이벤트 `.capture`/`.passive`/`.once`), 테마 dark/fontSize ↔ localStorage 동기화, SwUpdate 폴링, Router navigation 중 `SdBusyProvider.globalBusyCount` 자동 ±1.
- `SdAngularConfigProvider.clientName`: localStorage 키 prefix·service client name 으로 사용. `provideSdAngular` 옵션에서 설정됨.
- `SdSystemLogProvider.writeFn?`: severity별 로그 후크 등록(서버 전송 등). 자동으로 console에도 출력.
- `setupBgTheme({ theme?, lightness? })`: 컴포넌트 constructor 내에서 호출. body `--background-color` CSS 변수 토글, 파괴 시 자동 복원.

## 테마

- `SdThemeProvider`: `dark = signal<boolean>`, `fontSize = signal<number>` (presets `[12,14,16,20,24,28]`), `increaseFontSize()`/`decreaseFontSize()`. dark면 body에 `sd-theme-dark` 클래스, fontSize는 html `font-size` 적용. `provideSdAngular`가 localStorage 영속화.
- `SdThemeSelector`: 토글 UI 컴포넌트.

## SdBusyContainer / SdBusyProvider

`<sd-busy-container [busy] [message] [type] [progressPercent]>`. type: `"spinner" | "bar" | "cube"`. `busy=true` 동안 keydown 차단.
`SdBusyProvider.globalBusyCount = signal(0)`. > 0이면 body 전면 오버레이.

## SdPermissionTable

`<sd-permission-table [items] [(value)] [disabled]>`. `items: SdPermission<TModule>[]` (`SdAppStructureUtils.getPermissions` 결과), `value: Record<string, boolean>` (코드.use|edit 형식).

## SdStatePreset

`<sd-state-preset [key] [(state)] [size]>`. `state` 를 `SdSystemConfigProvider` 키 `key` 아래 프리셋 배열로 저장/로드. 별 아이콘 클릭 → 이름 입력 모달 → 저장.

## SdTiptapEditor

`<sd-tiptap-editor [(value)] [disabled] [readonly] [required] [placeholder] [validatorFn] [extensions]>`. value=HTML string. `extensions?: AnyExtension[]` 으로 Tiptap 확장 주입.

## 유틸 디렉티브/파이프

이벤트·표시 보조용. constructor injection 또는 셀렉터 attach.

- `SdOptionEventPlugin`: `(click.capture)`, `(scroll.passive)`, `(touchmove.capture.passive)`, `(transitionend.once)` 등 `.capture/.passive/.once` 변형 이벤트 바인딩 활성화. `provideSdAngular`로 자동 등록.
- `SdResizeDirective` (`[sdResize]`): RO 기반 size 변화 emit (`{ heightChanged, widthChanged, target, contentRect }`).
- `SdIntersectionDirective` (`[sdIntersection]`): IO entry emit.
- `SdEvents`: 다양한 native event의 `.capture`/`.passive`/`.once` output 디렉티브 (예: `(scroll.passive)`, `(touchstart.passive)`).
- `SdCommandDirective`: `[sdRefreshCommand]`/`[sdSaveCommand]`/`[sdInsertCommand]` — Ctrl+Alt+L/Ctrl+S/Insert 단축키 emit. 최상위 열린 모달 또는 모달이 없을 때만 처리.
- `SdRipple` (`[sdRipple]="bool"`) / `setupRipple(enableFn?)`: pointerdown 시 원형 ripple.
- `SdShowEffect` (`[sdShowEffect]="bool"` + `[sdShowEffectType]="'l2r'|'t2b'"`) / `setupRevealOnShow`: viewport intersection 시 fade-in.
- `SdInvalid` (`[sdInvalid]="msg"`) / `setupInvalid(getMsg)`: hidden input의 customValidity 로 form 검증 + 표시 인디케이터.
- `SdTypedTemplate` (`<ng-template [typed]>`): template context 타입 추론용 (typeToken).
- `SdItemOfTemplate` (`<ng-template [itemOf]>`, ctx `{ $implicit, item, index, depth }`) — 컬렉션 컴포넌트 항목 템플릿.
- `FormatPipe` (`{{ v | format:fmt }}`): `DateTime`/`DateOnly`는 `toFormatString(fmt)`, string은 `X` 자리표시(예: `'XXX-XXXX-XXXX'`).
- `SdGap`: spacer. `height|width|widthEm` 또는 `heightPx|widthPx`. 단위 키: `xxs|xs|sm|default|lg|xl|xxl`.
- `SdCollapse [open]` / `SdCollapseIcon`: 접힘.
- `SdTab [(value)]`/`SdTabItem [value]`: 탭.
- `SdList`/`SdListItem`: 리스트. `SdListItem` `layout: "accordion"|"flat"`, `selectedIcon`, `contentStyle/Class`.
- `SdPagination [(currentPage)] [totalPageCount] [visiblePageCount=10]`.
- `mark(signal)`: array/object signal의 in-place mutation 후 shallow copy로 trigger.
- `setSafeStyle(renderer, el, partial)`: renderer.setStyle 일괄.
- `setupModelHook(model, canFn)`: WritableSignal의 set/update를 `canFn(value) -> boolean | Promise<boolean>`로 가로채기. constructor 내에서 호출.

## 유틸 타입/기타

- `DirectiveInputSignals<T>`: 컴포넌트의 InputSignal 프로퍼티만 추출(`{ name: T }`). undefined 필드는 optional.
- `UndefToOptional<T>`: undefined 포함 필드를 optional 로 변환.
- `WithOptional<T, K>`: 특정 키만 optional 로.
- `SelectModalOutputResult<TKey> = { selectedKeys: TKey[] }`: 모달 선택 결과.
