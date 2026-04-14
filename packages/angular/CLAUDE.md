# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/angular` - Angular 21 UI component library. Zoneless, signal-based, standalone components. 154 TypeScript source files across core infrastructure, feature abstractions, and UI components.

## Architecture

### Categorized Feature-Based Organization

의존 방향: `core → controls → layout → data`, `features`는 다양한 계층에 의존.

```
src/
├── provideSdAngular.ts   <- composition root (모든 기반 설정)
├── core/                 <- 인프라: providers, plugins, directives, utils, pipes, types, commons
│   ├── app-structure/    sd-app-structure.provider, .types, .utils
│   ├── busy/             SdBusyContainer, SdBusyProvider
│   ├── commands/         save(Ctrl+S), refresh(Ctrl+Alt+L), insert(Ctrl+Insert), findTopOpenModalEl
│   ├── config/           sd-angular-config, sd-local-storage, sd-system-config, sd-system-log, injectSdSystemConfigResource
│   ├── error-handler/    SdGlobalErrorHandlerPlugin
│   ├── events/           resize(ResizeObserver), intersection(IntersectionObserver), option(.capture/.passive/.once), sd-events
│   ├── file-dialog/      SdFileDialogProvider
│   ├── modal/            SdModal, SdModalProvider, SdActivatedModalProvider, SdPromptModal, SdConfirmModal
│   ├── print/            SdPrintProvider
│   ├── ripple/           sd-ripple, setupRipple
│   ├── routing/          sd-router-link, sd-navigate-window.provider, inject*PageCode, injectViewType/Title, setupCanDeactivate, menu-utils
│   ├── selection/        useSelectionManager, useSortingManager, useExpandingManager, setupCumulateSelectedKeys
│   ├── service-client/   SdServiceClientFactoryProvider
│   ├── shared-data/      SdSharedDataProvider
│   ├── show-effect/      sd-show-effect, setupRevealOnShow
│   ├── template/         sd-typed-template, sd-item-of-template
│   ├── toast/            SdToast, SdToastContainer, SdToastProvider
│   ├── validation/       sd-invalid, setupInvalid
│   └── (root)            mark, setSafeStyle, withBusy, setupModelHook, setupBgTheme, injectParent, directive-input-signals, select-modal-output-result, format.pipe, commons, provideSdAngular
├── controls/             <- UI 기본요소 (core/ 의존)
│   ├── button/           SdButton, SdAnchor, SdAdditionalButton, SdModalSelectButton
│   ├── checkbox/         SdCheckbox, SdSwitch, SdCheckboxGroup, SdCheckboxGroupItem
│   ├── collapse/         SdCollapse, SdCollapseIcon
│   ├── dropdown/         SdDropdown, SdDropdownPopup
│   ├── form/             SdForm
│   ├── gap/              SdGap
│   ├── input/            텍스트필드/텍스트에리어/넘패드/레인지/날짜범위
│   ├── list/             SdList, SdListItem
│   ├── pagination/       SdPagination
│   ├── select/           SdSelect, SdSelectItem, SdSelectButton
│   └── tab/              SdTab, SdTabItem
├── layout/               <- 페이지 구조 (core/ + controls/ 의존)
│   ├── base-container/   SdBaseContainer
│   ├── dock/             SdDockContainer, SdDock
│   ├── sidebar/          SdSidebarContainer, SdSidebar, SdSidebarMenu, SdSidebarUser
│   └── topbar/           SdTopbarContainer, SdTopbar, SdTopbarMenu, SdTopbarUser
├── data/                 <- 비즈니스 CRUD 추상화 (core/ + controls/ + layout/ 의존)
│   ├── data-detail/      SdDataDetail, SdDataDetailBase
│   ├── data-select-button/  SdDataSelectButton, SdDataSelectButtonBase
│   ├── data-sheet/       SdDataSheet, SdDataSheetBase, SdDataSheetColumn, setupCloserWhenSingleSelectionChange
│   ├── kanban/           SdKanbanBoard, SdKanban, SdKanbanLane
│   ├── permission-table/ SdPermissionTable
│   ├── shared-data/      SdSharedDataSelect/SelectButton/SelectList, matchesSearchText
│   ├── sheet/            SdSheet, SdSheetColumn, SdSheetColumnCellTemplate, SdSheetConfigModal
│   └── state-preset/     SdStatePreset
└── features/             <- 독립 기능 컴포넌트 (다양한 계층 의존)
    ├── address/          SdAddressSearchModal (Daum Postcode)
    ├── editor/           SdTiptapEditor, useTiptapToolbar
    ├── theme/            SdThemeProvider (dark/fontSize signal), SdThemeSelector (드롭다운 UI)
    └── visual/           SdLabel, SdNote, SdProgress, SdCalendar, SdBarcode, SdEcharts
```

### Bootstrap

`provideSdAngular(opt: { clientName: string })` (src/provideSdAngular.ts)이 모든 기반을 설정:
- `provideZonelessChangeDetection()` - Zone 없는 변경 감지
- `IMAGE_CONFIG` disableImageSizeWarning/disableImageLazyLoadWarning
- `provideNgIconsConfig({ strokeWidth: 1.5, size: "1.33em" })`
- 커스텀 이벤트 플러그인 등록 (`EVENT_MANAGER_PLUGINS` multi-provider) - 3 command + 3 event plugins
- 글로벌 에러 핸들러 (`SdGlobalErrorHandlerPlugin`), `unhandledrejection`/`error` 이벤트 핸들링
- 테마 초기화 (localStorage 동기화, `SdThemeProvider.dark`/`fontSize` signal과 effect로 연결)
- Service Worker 업데이트 폴링 (5분 간격, 실패 시 exponential backoff, 최대 1시간 간격)
- 라우터 네비게이션 busy 상태 추적 (`SdBusyProvider.globalBusyCount` signal 증감)

## Naming Conventions

### 클래스명

| 종류 | 형식 | 파일명 | 예시 |
|---|---|---|---|
| 컴포넌트 | `Sd{Name}` | `sd-{name}.ts` | `SdButton`, `SdSelect`, `SdModal` |
| 디렉티브 | `Sd{Name}` | `sd-{name}.ts` | `SdRipple`, `SdInvalid`, `SdRouterLink` |
| Provider | `Sd{Name}Provider` | `sd-{name}.provider.ts` | `SdToastProvider`, `SdModalProvider` |
| 추상 클래스 | `Sd{Name}Base` | `sd-{name}.base.ts` | `SdDataSheetBase`, `SdDataDetailBase` |
| 파이프 | `{Name}Pipe` | `{name}.pipe.ts` | `FormatPipe` |
| 플러그인 | `Sd{Name}EventPlugin` | `sd-{name}.plugin.ts` | `SdResizeEventPlugin` |

### Selector

| 종류 | 형식 | 예시 |
|---|---|---|
| 요소(컴포넌트) | `sd-{kebab-case}` | `sd-button`, `sd-modal` |
| 속성(디렉티브) | `[sdCamelCase]` | `[sdRipple]`, `[sdRouterLink]` |

### 인터페이스 / 타입

`I`/`T` prefix 사용하지 않는다.

- 컴포넌트와 이름 충돌 시, 대상을 서술하고 `Def` 접미사를 붙인다: `SdModalContentDef<O>`, `SdToastContentDef<O>`, `SdStatePresetDef`
- 충돌이 없으면 prefix만 제거한다: `SdModalOptions`, `SdSheetConfig`, `SdViewType`

### Composable 함수

| prefix | 조건 | 역할 | 예시 |
|---|---|---|---|
| `inject{Name}` | `inject()` 사용, 상태/API 반환 | DI 의존성으로부터 파생된 상태·메서드 객체 제공 | `injectViewTypeSignal()`, `injectPermsSignal()` |
| `setup{Name}` | `inject()` 사용, 부수효과 설치 | 컴포넌트에 동작 부착 (effect, 리스너, guard 등) | `setupRipple()`, `setupCanDeactivate()` |
| `use{Name}` | `inject()` 미사용 | Signal 입력으로부터 순수 계산된 상태·메서드 객체 반환 | `useSelectionManager()`, `useSortingManager()` |

## Key Patterns

### Component Structure

모든 컴포넌트가 따르는 공통 패턴:

```typescript
@Component({
  selector: "sd-{name}",
  changeDetection: ChangeDetectionStrategy.OnPush,  // 항상 OnPush
  encapsulation: ViewEncapsulation.None,             // CSS 변수 테마 위해
  standalone: true,                                   // 항상 standalone
  imports: [...],
  template: `...`,              // 인라인 템플릿, @if/@for 제어 흐름
  styles: [/* language=SCSS */ `...`],  // 인라인 SCSS
  host: {
    "[attr.data-sd-theme]": "theme()",   // 상태를 data-sd-* 호스트 속성으로
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-disabled]": "disabled()",
  },
})
```

- Signal inputs: `input()`, `input.required<T>()`, `input(false, { transform: booleanAttribute })`
- Two-way binding: `model()` (예: `value = model<string>()`, `open = model(false)`)
- 스타일링: 호스트 `data-sd-*` 속성 + SCSS 선택자 (`&[data-sd-theme="primary"]`)

### Composable Utilities (inject* / setup* / use* 패턴)

`src/core/utils/`의 함수들. 생성자에서 호출하여 상태와 메서드 객체를 반환:

- **inject 함수** (DI 의존성 기반 상태/API 제공)
  - `injectSdSystemConfigResource(options: { key: Signal<string | undefined> })`: `SdSystemConfigProvider`를 통해 컴포넌트 태그명 기반 키로 시스템 설정을 읽고 쓰는 `ResourceRef` 래퍼. `value`, `isLoading`, `set()`, `update()` 반환
  - `injectCurrentPageCodeSignal()`, `injectFullPageCodeSignal()`, `injectViewTitleSignal()`, `injectViewTypeSignal(getComp)`: 라우터 기반 현재 페이지 코드/타이틀/뷰 타입 signal
  - `injectPermsSignal(viewCodes, keys)`: 앱 구조 기반 권한 signal
  - `injectParent(type?, options?)`: ViewContainerRef injector chain을 순회하여 가장 가까운 부모 컴포넌트 인스턴스를 반환. Angular 내부 `_lView[8]` (CONTEXT slot) 사용. 3 overloads: no args, type filter, type + `{ optional: true }`
- **setup 함수** (부수효과 설치) - `setupRipple()`, `setupInvalid()`, `setupModelHook()`, `setupCanDeactivate()`, `setupRevealOnShow()`, `setupBgTheme()`, `setupCumulateSelectedKeys()` 등 (core/utils/setups/). `setupCloserWhenSingleSelectionChange()`은 data-sheet/에 위치
  - `inject()`, `effect()`, `DestroyRef.onDestroy()` 사용하여 생성자에서 실행
- **use 함수** (순수 Signal 유틸리티, DI 미사용) - `useSelectionManager()`, `useSortingManager()`, `useExpandingManager()`
  - Signal과 메서드를 포함한 객체 반환 (클래스가 아님)
  - `useSelectionManager`: `displayItems`, `selectedItems`, `selectMode`, `getItemSelectableFn` signal을 받아 `hasSelectable`, `isAllSelected`, `select()`, `deselect()`, `toggle()`, `toggleAll()`, `isSelected()` 반환
  - `useSortingManager`: `sorts` WritableSignal을 받아 `defMap` (computed), `toggle()`, `sort()` 반환
  - `useExpandingManager`: `items`, `expandedItems`, `getChildrenFn`, `sort` 바인딩으로 `displayItems`, `hasExpandable`, `isAllExpanded`, `toggle()`, `toggleAll()`, `isVisible()`, `def()` 반환
- **단독 유틸**
  - `withBusy(busyCount, fn)`: `WritableSignal<number>`를 증감시켜 비동기 작업 중 busy 표시. finally에서 감소
  - `setSafeStyle(renderer, el, styles)`: Renderer2를 사용하여 여러 CSS 스타일을 안전하게 적용
  - `mark(sig)`: WritableSignal의 값을 shallow copy하여 새 참조를 생성, consumer에게 변경을 알린다. 배열은 `[...v]`, 객체는 `{...v}`로 복사

### Provider System

모든 provider는 `@Injectable({ providedIn: "root" })` (SdSharedDataProvider, SdActivatedModalProvider 제외). 주요 provider:
- `SdAngularConfigProvider` - `clientName: string` 보유
- `SdThemeProvider` - `dark: WritableSignal<boolean>`, `fontSize: WritableSignal<number>`, `fontSizePresets: readonly number[]`. effect로 body에 `sd-theme-dark` class toggle 및 `html` fontSize 설정. `increaseFontSize()`/`decreaseFontSize()` 메서드 제공
- `SdSystemLogProvider` - `writeFn?` 콜백, `writeAsync(severity, ...data)` 메서드
- `SdServiceClientFactoryProvider` - ServiceClient 인스턴스 팩토리/관리
- `SdSharedDataProvider` (abstract, `@Injectable()`) - 이벤트 기반 공유 데이터 캐시. `register()`, `getHandle()`, `emitAsync()`, `wait()` 메서드. 이벤트 API 호출 시 `client.getEvent<typeof SdSharedDataChangeEvent>("SdSharedDataChange")` 프록시 패턴 사용
- `SdModalProvider` - `showAsync<T>(modal, options): Promise<OutputType>` 프로그래밍 방식 모달. 내부적으로 `createComponent` + `projectableNodes` 사용
- `SdActivatedModalProvider` - 모달 내부에서 inject하여 모달 컴포넌트/컨텐츠 컴포넌트 참조
- `SdToastProvider` - `info/success/warning/danger(message, useProgress?)`, `notify<T>()` 커스텀 토스트, `try(fn, messageFn?)` 에러 래퍼
- `SdBusyProvider` - `globalBusyCount: WritableSignal<number>`, `type: WritableSignal<SdBusyType>`
- `SdPrintProvider` - `printAsync(template, options?)`, `getPdfBufferAsync(template, options?)`. jsPDF + html-to-image 사용
- `SdLocalStorageProvider` - `clientName` 스코프 타입 localStorage 래퍼
- `SdFileDialogProvider` - 네이티브 파일 선택 대화상자
- `SdNavigateWindowProvider` - 새 윈도우 네비게이션 + 자동 닫기
- `SdSystemConfigProvider` - 비동기 설정 저장 추상

### Plugin System

Angular `EventManagerPlugin` 확장. `supports()` 메서드로 이벤트명 매칭:
- 커맨드 플러그인: `sdSaveCommand`(Ctrl+S), `sdRefreshCommand`(Ctrl+Alt+L), `sdInsertCommand`(Ctrl+Insert). `findTopOpenModalEl()`로 최상위 모달만 이벤트 수신
- 옵저버 플러그인: `sdResize`(ResizeObserver), `sdIntersection`(IntersectionObserver)
- 옵션 플러그인: `.capture`, `.passive`, `.once` 이벤트 수식어

### Feature Abstractions

`src/data-sheet/`, `src/data-detail/`, `src/data-select-button/`의 추상 클래스가 CRUD 패턴을 정의:
- `SdDataSheetBase` - 데이터 시트 (페이지네이션, 정렬, CRUD)
- `SdDataDetailBase` - 상세 폼 (load, save, delete)
- `SdDataSelectButtonBase` - 모달 기반 선택 버튼

소비 프로젝트에서 이 추상 클래스를 상속하여 `load()`, `submit()` 등을 구현.

`SdBaseContainer`은 페이지/모달/뷰 공통 레이아웃 컨테이너:
- `currViewType()`에 따라 page(topbar 포함) / modal(bottom 슬롯 포함) / 기타(raw content) 중 하나를 렌더링
- `initialized` input이 `false`이면 콘텐츠를 숨김 (undefined이면 표시)
- `restricted` input이 `true`이면 권한 없음 메시지를 표시
- `injectParent()`를 통해 부모 컴포넌트의 뷰 타입을 자동으로 상속

### Type Utilities

`src/core/utils/directive-input-signals.ts`에 정의된 타입 유틸리티:

```typescript
// InputSignal 프로퍼티에서 값 타입만 추출, undefined 포함 필드는 optional로 변환
type DirectiveInputSignals<T>

// undefined를 포함하는 프로퍼티를 optional로 변환
type UndefToOptional<T>

// 특정 키를 optional로 변환
type WithOptional<T, K extends keyof T>
```

`src/shared-data/matchesSearchText.ts`의 `matchesSearchText(itemText, searchQuery)`:
- 공백으로 구분된 모든 검색어(AND 조건)가 itemText에 포함되면 true 반환
- searchQuery가 undefined이거나 빈 문자열이면 항상 true 반환

## Styling

- **SCSS 구조**: `scss/` 디렉토리. `styles.scss`가 엔트리포인트로 `commons/theme-variables`, `commons/styles`, 6개 control partial을 import
- **CSS Layers**: `@layer base, theme-variant, utilities` 순서로 구성. base에 reset/variables, theme-variant에 dark mode, utilities에 utility classes
- **변수 시스템**: `commons/_variables.scss`에 `$vars` 맵 정의 -> `mixins.writeVars()`로 CSS custom properties 생성
- **색상**: OKLCH 기반 17+5 색상 팔레트. 각 색상에 7단계 shade (lightest~darkest)
- **테마 그룹**: gray, blue-gray, primary, secondary, info, success, warning, danger
- **다크모드**: `.sd-theme-dark` 클래스 + `themes/_variables-dark.scss`에서 색상 반전. `img:not(.no-invert)` 자동 반전
- **유틸리티 클래스**: `.flex-row`, `.flex-column`, `.flex-fill`, `.flex-auto`, `.flex-min`, `.flex-row-inline`, `.flex-column-inline` / `.grid`, `.grid-{1..12}`, `.grid-sm-{1..12}`, `.grid-xs-{1..12}`, `.grid-xxs-{1..12}` / `.card` / `.form-box`, `.form-box-inline`, `.form-table`, `.form-control`, `.table` (+ `.table-inset`, `.table-inline`, `.table-bd-v`, `.table-bd-h`)
- **간격**: `.p-*`, `.pv-*`, `.ph-*`, `.pt-*`~`.pl-*`, `.m-*`(동일 방향 패턴), `.gap-*`, `.sw-*`, `.sh-*` (키: xxs, xs, sm, default, lg, xl, xxl, 0, auto)
- **반응형 breakpoint**: `$breakpoint-mobile: 520px`, `$breakpoint-xxs: 800px`, `$breakpoint-xs: 1024px`, `$breakpoint-sm: 1280px` (SCSS 변수, media query에서 사용)
- **공개 mixin**: `elevation($value)`, `form-control-base()`, `help()`, `border-direction-variants($dir, $d)`, `flex-direction($direction, $defaultGap?)`, `writeVars($value, $prevKey)`
- 빌드 결과: `dist/styles.css`로 컴파일

## Angular Compiler

`tsconfig.json`에서 strict 옵션 전부 활성화:
- `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`
- `strictStandalone`, `typeCheckHostBindings`
- `extendedDiagnostics.defaultCategory: "error"`
- `customConditions: ["browser"]` (browser-specific import resolution)

## Testing

**프레임워크**: Vitest + Angular TestBed (`BrowserDynamicTestingModule`)

`tests/vitest.setup.ts`에서 `TestBed.initTestEnvironment()` + `afterEach` TestBed reset.

테스트 디렉토리가 src 구조를 미러링: `tests/core/`, `tests/busy/`, `tests/modal/`, `tests/sheet/` 등 기능 단위 플랫 구조. `tests/scss/`는 SCSS 컴파일 결과 검증.

151개의 spec 파일.

### Test Pattern

```typescript
// 테스트 헬퍼 함수
function setupTestBed(extraProviders: object[] = []) {
  TestBed.configureTestingModule({
    imports: [ComponentToTest],
    providers: [{ provide: Service, useValue: mock }, ...extraProviders],
  });
}

// Signal 업데이트 후 반드시 두 단계
fixture.componentInstance.someSignal.set(newValue);
fixture.detectChanges();
TestBed.flushEffects();

// DOM 검증
const el = fixture.nativeElement.querySelector("sd-button");
expect(el.getAttribute("data-sd-theme")).toBe("primary");
```

### Conventions

- 파일명: `{feature}.spec.ts`, 수락테스트: `{feature}.acc.spec.ts`, 픽스처: `{feature}-test.fixture.ts`
- 테스트 호스트 컴포넌트를 `*-test.fixture.ts`에 정의하여 재사용
- describe 계층: `"Feature X.Y Slice Z"` > `"Rule: ..."` > `it("...")`
- 모킹: `vi.fn()` + 타입 시그니처, 복잡한 경우 수동 mock 클래스, provider는 `useValue`
