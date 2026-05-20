# @simplysm/angular

Angular 21 기반 클라이언트 UI 라이브러리. 폼/리스트/시트/모달/토스트 등 업무화면 컴포넌트와 부트스트랩 프로바이더를 모두 포함한다. 모든 컴포넌트는 standalone, signal/zoneless 기반.

## 사용 트리거 인덱스

- **앱 부트스트랩** — 루트 컴포넌트에서 `provideSdAngular`로 zoneless·테마·에러 핸들러·`.capture/.passive/.once` 이벤트 변형·라우터 navigation busy 자동 등록. `SdAngularConfigProvider`(clientName), `setupBgTheme`(body 배경 토글), `SdSystemLogProvider`(severity별 로그 후크). 본문 인라인.
- **테마** — `SdThemeProvider`(dark/fontSize 신호 + localStorage 자동 영속화), `SdThemeSelector`(토글 UI). 본문 인라인.
- **라우팅/페이지 컨텍스트** — 페이지 코드(`a.b.c`)·뷰 타입(`page|modal|control`)·새창 navigation·`SdRouterLink`·canDeactivate 헬퍼. 자세히: [routing.md](./routing.md).
- **앱 구조/메뉴/권한** — 서버 `AppStructureService` 트리를 받아 메뉴/권한 신호로 노출. `SdAppStructureProvider`·`injectPermsSignal`·`SdMenu`/`SdFlatMenu`/`SdPermission`. 자세히: [app-structure.md](./app-structure.md).
- **모달** — 프로그래밍 `SdModalProvider.showAsync` 또는 선언형 `<sd-modal>`. 내장 `SdPromptModal`/`SdConfirmModal`/`SdAddressSearchModal`. 자세히: [modal.md](./modal.md).
- **토스트** — `SdToastProvider`로 info/success/warning/danger 전역 알림 + 커스텀 컴포넌트 `notify` + 에러 자동 처리 `try`. 자세히: [toast.md](./toast.md).
- **버튼류** — 일반 `SdButton`, 링크형 `SdAnchor`, 본문+부가 `SdAdditionalButton`, 모달 검색 선택 `SdModalSelectButton`. 자세히: [buttons.md](./buttons.md).
- **입력/폼 컨트롤** — `<sd-form>` 안에 텍스트/숫자/날짜/체크박스 류 컨트롤. `SdTextfield`, `SdTextarea`, `SdNumpad`, `SdRange`, `SdDateRangePicker`, `SdCheckbox`/`SdSwitch`/`SdCheckboxGroup(Item)`. 자세히: [forms.md](./forms.md).
- **드롭다운/셀렉트** — 트리거+팝업 `SdDropdown(Popup)`, 옵션 선택 `SdSelect(Item|Button)`. 자세히: [select-dropdown.md](./select-dropdown.md).
- **레이아웃 (사이드바/탑바)** — 풀 화면 `<sd-sidebar-container>` 와 상단바 컨테이너. `SdSidebar*`, `SdTopbar*`. 자세히: [layout.md](./layout.md).
- **시트(테이블)** — 가상 스크롤 데이터 그리드. 컬럼 정의·정렬·페이징·선택·확장 트리·설정 모달 내장. `SdSheet`, `SdSheetColumn`, `SdSheetColumnCellTemplate`, `SdSheetConfigModal`. 자세히: [sheet.md](./sheet.md).
- **CRUD 화면 골격** — 페이지/모달 공통 컨테이너 + 리스트/디테일 골격. `SdBaseContainer`, `SdCrudList`, `SdCrudDetail`. 자세히: [crud.md](./crud.md).
- **서버 공유 데이터 (코드성 마스터)** — 부서·거래처 등 키 기반 등록·구독·자동 부분 갱신. `SdSharedDataProvider`, `SdSharedDataSelect(Button|List)`, `matchesSearchText`. 자세히: [shared-data.md](./shared-data.md).
- **선택/확장/정렬 매니저 훅** — `<sd-sheet>`/`<sd-select>` 내부 로직을 외부 컴포넌트에서 재사용. `useSelectionManager`, `useExpandingManager`, `useSortingManager`. 자세히: [selection-managers.md](./selection-managers.md).
- **칸반 보드** — 드래그·드롭 카드 보드. `SdKanbanBoard`, `SdKanban`, `SdKanbanLane`. 자세히: [kanban.md](./kanban.md).
- **시각 컴포넌트** — 라벨 `SdLabel`, 알림 박스 `SdNote`, 진행률 `SdProgress`, 월별 달력 `SdCalendar`, 바코드 `SdBarcode`, ECharts 래퍼 `SdEcharts`. 자세히: [visual.md](./visual.md).
- **인프라 프로바이더** — 서비스 클라이언트 팩토리 `SdServiceClientFactoryProvider`, 파일 다이얼로그 `SdFileDialogProvider`, localStorage 래퍼 `SdLocalStorageProvider`, 시스템 설정 `SdSystemConfigProvider` + `injectSdSystemConfigResource`, 인쇄/PDF `SdPrintProvider`, 글로벌 에러 핸들러/이벤트 플러그인. 자세히: [infrastructure.md](./infrastructure.md).
- **`SdBusyContainer` / `SdBusyProvider`** — busy 오버레이 컴포넌트와 전역 busy 카운트. 본문 인라인.
- **`SdPermissionTable`** — 권한 트리 편집 표. `SdPermission<TModule>[]` 입력 → `Record<string, boolean>` 모델. 본문 인라인.
- **`SdStatePreset` / `SdStatePresetDef`** — 화면 상태 프리셋 저장/복원. 본문 인라인.
- **`SdTiptapEditor`** — 리치 텍스트 에디터. 본문 인라인.
- **유틸 디렉티브/파이프** — 이벤트(`SdResize`/`SdIntersection`/`SdEvents`)·단축키(`SdCommandDirective`)·표시 효과(`SdRipple`/`SdShowEffect`)·검증(`SdInvalid`)·템플릿(`SdTypedTemplate`/`SdItemOfTemplate`)·포맷(`FormatPipe`)·spacer(`SdGap`)·접힘(`SdCollapse`/`SdCollapseIcon`)·탭(`SdTab`/`SdTabItem`)·리스트(`SdList`/`SdListItem`)·페이저(`SdPagination`)·signal 헬퍼(`mark`/`setSafeStyle`/`setupModelHook`). 본문 인라인.
- **유틸 타입** — `DirectiveInputSignals`/`UndefToOptional`/`WithOptional`/`SelectModalOutputResult`. 본문 인라인.

## 앱 부트스트랩

```typescript
bootstrapApplication(AppComponent, {
  providers: [provideSdAngular({ clientName: "myapp" }), provideRouter(routes)],
});
```

- `provideSdAngular({ clientName })`: zoneless CD, NgIcons config, 글로벌 에러 핸들러(`SdGlobalErrorHandlerPlugin`), `SdOptionEventPlugin`(이벤트 `.capture`/`.passive`/`.once`), 테마 dark/fontSize ↔ localStorage 동기화, SwUpdate 폴링(실패 시 백오프 5분→1시간), Router navigation 중 `SdBusyProvider.globalBusyCount` 자동 ±1.
- `SdAngularConfigProvider.clientName`: localStorage 키 prefix·service client name 으로 사용. `provideSdAngular` 옵션에서 설정됨.
- `SdSystemLogProvider.writeFn?: (severity: "error"|"warn"|"log", ...data) => Promise<void> | void`: severity별 로그 후크 등록(서버 전송 등). 호출 시 console에도 항상 출력.
- `setupBgTheme({ theme?, lightness? })`: 컴포넌트 constructor 내에서 호출. body `--background-color` CSS 변수 토글, destroy 시 자동 복원. `theme: "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"`, `lightness: "lightest"|"lighter"` (default `"lightest"`).

## 테마

- `SdThemeProvider`: `dark = signal<boolean>`, `fontSize = signal<number>` (presets `[12,14,16,20,24,28]`), `increaseFontSize()`/`decreaseFontSize()`. dark=true 시 body에 `sd-theme-dark` 클래스, fontSize는 html `font-size` 적용. `provideSdAngular`가 localStorage 영속화.
- `SdThemeSelector`: dropdown 형 토글 UI (글자 크기 ± 버튼 + dark 스위치). 별도 입력 없음.

## SdBusyContainer / SdBusyProvider

`<sd-busy-container [busy] [message] [type] [progressPercent]>`. type: `"spinner" | "bar" | "cube"` (default = `SdBusyProvider.type()` = `"bar"`). `busy=true` 동안 keydown 차단.

`SdBusyProvider`:
- `globalBusyCount = signal(0)`. > 0이면 body 전면 오버레이.
- `type = signal<SdBusyType>("bar")`: 전역 busy 컨테이너의 기본 type. 변경 시 즉시 반영.

## SdPermissionTable

`<sd-permission-table [items] [(value)] [disabled]>`. `items: SdPermission<TModule>[]` (`SdAppStructureUtils.getPermissions` 결과), `value: Record<string, boolean>` (`<fullCode>.use|edit` 형식). 트리 접기/펼치기 + 그룹 일괄 토글.

## SdStatePreset

`<sd-state-preset [key] [(state)] [size]>`. `key` 신호 아래 `SdStatePresetDef[]` = `{ name, state }[]` 를 `SdSystemConfigProvider` 에 저장. 별 아이콘 클릭 → 이름 프롬프트 → 추가. 각 프리셋 클릭 시 `state.set(obj.clone(preset.state))`.

## SdTiptapEditor

`<sd-tiptap-editor [(value)] [disabled] [readonly] [required] [placeholder] [validatorFn] [extensions]>`. value=HTML string. 기본 extensions: StarterKit + TextStyle + Color + Highlight + TextAlign + Image + Underline. `extensions?: AnyExtension[]` 으로 Tiptap 확장 주입(기본 위에 추가).

## 유틸 디렉티브/파이프

이벤트·표시 보조용. constructor injection 또는 셀렉터 attach.

- `SdOptionEventPlugin`: `(click.capture)`, `(scroll.passive)`, `(touchmove.capture.passive)`, `(transitionend.once)` 등 `.capture/.passive/.once` 변형 이벤트 바인딩 활성화. `provideSdAngular`로 자동 등록.
- `SdResizeDirective` (`[sdResize]`): ResizeObserver 기반 size 변화 emit (`SdResizeEvent { heightChanged, widthChanged, target, contentRect }`). requestAnimationFrame 디바운스.
- `SdIntersectionDirective` (`[sdIntersection]`): IntersectionObserver entry emit (`SdIntersectionEvent { entry }`).
- `SdEvents`: 다양한 native event의 `.capture`/`.passive`/`.once` output 디렉티브 (예: `(scroll.passive)`, `(touchstart.passive)`, `(focus.capture)`, `(transitionend.once)`).
- `SdCommandDirective` (`[sdRefreshCommand]`/`[sdSaveCommand]`/`[sdInsertCommand]`): Ctrl+Alt+L/Ctrl+S/Insert 단축키 emit. 최상위 열린 모달 내부 또는 모달 없는 페이지일 때만 처리.
- `SdRipple` (`[sdRipple]="bool"`) / `setupRipple(enableFn?)`: pointerdown 시 원형 ripple.
- `SdShowEffect` (`[sdShowEffect]="bool"` + `[sdShowEffectType]="'l2r'|'t2b'"`) / `setupRevealOnShow`: viewport intersection 시 fade-in.
- `SdInvalid` (`[sdInvalid]="msg"`) / `setupInvalid(getMsg)`: hidden input의 customValidity 로 form 검증 + 좌상단 빨간 점 인디케이터.
- `SdTypedTemplate` (`<ng-template [typed]="typeToken">`): template context 타입 추론용.
- `SdItemOfTemplate` (`<ng-template [itemOf]="items">`, ctx `SdItemOfTemplateContext { $implicit, item, index, depth }`) — 컬렉션 컴포넌트(`SdSelect`/`SdCalendar` 등) 항목 템플릿.
- `FormatPipe` (`{{ v | format:fmt }}`): `DateTime`/`DateOnly`는 `toFormatString(fmt)`, string은 `X` 자리표시(예: `'XXX-XXXX-XXXX'`, `|` 로 다중 길이).
- `SdGap`: spacer. `height|width` 단위 키(`xxs|xs|sm|default|lg|xl|xxl`), `heightPx|widthPx|widthEm` 픽셀/em. 값 0이면 `display:none`.
- `SdCollapse [open]` / `SdCollapseIcon [open] [openRotate=90] [icon]`: 접힘 패널/아이콘.
- `SdTab [(value)]`/`SdTabItem [value]`: 탭.
- `SdList [inset]`/`SdListItem [layout="accordion"|"flat"] [open] [selected] [selectedIcon] [readonly] [contentStyle/Class]` + `<ng-template #toolTpl>` (옵션 도구 영역).
- `SdPagination [(currentPage)] [totalPageCount] [visiblePageCount=10]`. 그룹 단위 페이지 이동.
- `mark(signal)`: array/object signal의 in-place mutation 후 shallow copy로 trigger.
- `setSafeStyle(renderer, el, partial)`: renderer.setStyle 일괄.
- `setupModelHook(model, canFnSignal)`: WritableSignal의 set/update를 `canFn(value) -> boolean | Promise<boolean>`로 가로채기. `canFn` 자체가 `Signal<...>` 형식 (`input<(v)=>...>()` 그대로 전달). constructor 내에서 호출.

## 유틸 타입/기타

- `DirectiveInputSignals<T>`: 컴포넌트의 InputSignal 프로퍼티만 추출(`{ name: T }`). undefined 포함 필드는 optional.
- `UndefToOptional<T>`: undefined 포함 필드를 optional 로 변환.
- `WithOptional<T, K>`: 특정 키만 optional 로.
- `SelectModalOutputResult<TKey> = { selectedKeys: TKey[] }`: 모달 선택 결과.
