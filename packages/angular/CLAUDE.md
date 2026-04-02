# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/angular` - Angular 21 UI component library. Zoneless, signal-based, standalone components. 135 TypeScript source files across core infrastructure, feature abstractions, and UI components.

## Architecture

### 3-Layer Organization

```
src/
├── core/         ← 인프라: providers(11), plugins(8), directives(7), utils, pipes
├── features/     ← 도메인별 고수준 컴포넌트
│   ├── address/     주소검색 모달
│   ├── base/        sd-base-container (페이지/모달/뷰 공통 컨테이너)
│   ├── data-view/   데이터 시트/상세/선택 추상 클래스
│   ├── permission-table/  권한 매트릭스 컴포넌트
│   └── shared-data/ 공유 데이터 select/select-button/list 컨트롤
└── ui/           ← 재사용 UI 컴포넌트 라이브러리 (60+개)
    ├── form/        buttons, inputs, checkboxes, selects, editor
    ├── data/        list, sheet(데이터 그리드)
    ├── layout/      dock, pane, gap, view, kanban
    ├── navigation/  tabs, sidebar, topbar, collapse, pagination
    ├── overlay/     dropdown, modal, toast, busy
    └── visual/      label, note, progress, calendar, barcode, echarts
```

### Bootstrap

`provideSdAngular(opt: { clientName: string })` (core/provideSdAngular.ts)이 모든 기반을 설정:
- `provideZonelessChangeDetection()` - Zone 없는 변경 감지
- 커스텀 이벤트 플러그인 등록 (`EVENT_MANAGER_PLUGINS` multi-provider)
- 글로벌 에러 핸들러 (`SdGlobalErrorHandlerPlugin`), `unhandledrejection`/`error` 이벤트 핸들링
- 테마 초기화 (localStorage 동기화)
- Service Worker 업데이트 폴링 (exponential backoff, 최대 1시간 간격)
- 라우터 네비게이션 busy 상태 추적 (`SdBusyProvider.globalBusyCount`)

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

### Composable Utilities (use* / setup* 패턴)

`src/core/utils/`의 함수들. 생성자에서 호출하여 상태와 메서드 객체를 반환:

- **Manager 함수** - `useSelectionManager()`, `useSortingManager()`, `useExpandingManager()`
  - Signal과 메서드를 포함한 객체 반환 (클래스가 아님)
- **Setup 함수** - `setupRipple()`, `setupInvalid()`, `setupModelHook()`, `setupCanDeactivate()`, `setupRevealOnShow()` 등
  - `inject()`, `effect()`, `DestroyRef.onDestroy()` 사용하여 생성자에서 실행
- **Resource 함수** - `useSdSystemConfigResource(options: { key: Signal<string | undefined> })`
  - `SdSystemConfigProvider`를 통해 컴포넌트 태그명 기반 키로 시스템 설정을 읽고 쓰는 `ResourceRef` 래퍼
  - `value`, `isLoading`, `set()`, `update()` 반환
- **단독 유틸** - `withBusy(busyCount, fn)`, `injectParent(type?)`, `setSafeStyle()`
  - `withBusy`: `WritableSignal<number>`를 증감시켜 비동기 작업 중 busy 표시. finally에서 반드시 감소
  - `injectParent`: Angular 내부 NodeInjector `_lView[8]`을 순회하여 가장 가까운 부모 컴포넌트 인스턴스를 반환. `optional: true` 오버로드 지원

### Provider System

모든 provider는 `@Injectable({ providedIn: "root" })`. 주요 provider:
- `SdServiceClientFactoryProvider` - ServiceClient 인스턴스 팩토리/관리
- `SdSharedDataProvider` (abstract) - 이벤트 기반 공유 데이터 캐시
- `SdModalProvider` - `showAsync<T>(modal, options): Promise<OutputType>` 프로그래밍 방식 모달
- `SdToastProvider` - info/success/warning/danger 토스트 + `notify<T>()` 커스텀

### Plugin System

Angular `EventManagerPlugin` 확장. `supports()` 메서드로 이벤트명 매칭:
- 커맨드 플러그인: `sdSaveCommand`(Ctrl+S), `sdRefreshCommand`(Ctrl+Alt+L), `sdInsertCommand`(Ctrl+Insert)
- 옵저버 플러그인: `sdResize`(ResizeObserver), `sdIntersection`(IntersectionObserver)
- 옵션 플러그인: `.capture`, `.passive`, `.once` 이벤트 수식어

### Feature Abstractions

`src/features/data-view/`의 추상 클래스가 CRUD 패턴을 정의:
- `AbsSdDataSheet` - 데이터 시트 (페이지네이션, 정렬, CRUD)
- `AbsSdDataDetail` - 상세 폼 (load, save, delete)
- `AbsSdDataSelectButton` - 모달 기반 선택 버튼

소비 프로젝트에서 이 추상 클래스를 상속하여 `load()`, `submit()` 등을 구현.

`src/features/base/sd-base-container.control.ts` (`SdBaseContainerControl`)는 페이지/모달/뷰 공통 레이아웃 컨테이너다:
- `currViewType()`에 따라 page(topbar 포함) / modal(bottom 슬롯 포함) / 기타(raw content) 중 하나를 렌더링
- `initialized` input이 `false`이면 콘텐츠를 숨김 (undefined이면 표시)
- `restricted` input이 `true`이면 권한 없음 메시지를 표시
- `injectParent()`를 통해 부모 컴포넌트의 뷰 타입을 자동으로 상속

### Type Utilities

`src/core/utils/TDirectiveInputSignals.ts`에 정의된 타입 유틸리티:

```typescript
// InputSignal 프로퍼티에서 값 타입만 추출, undefined 포함 필드는 optional로 변환
type TDirectiveInputSignals<T>

// 특정 키를 optional로 변환
type TWithOptional<T, K extends keyof T>
```

`src/features/shared-data/matchesSearchText.ts`의 `matchesSearchText(itemText, searchQuery)`:
- 공백으로 구분된 모든 검색어(AND 조건)가 itemText에 포함되면 true 반환
- searchQuery가 undefined이거나 빈 문자열이면 항상 true 반환

## Styling

- **SCSS 구조**: `scss/` 디렉토리 - variables, mixins, themes, utility classes
- **테마**: CSS custom properties (`--theme-primary-default`, `--border-color-default` 등)
- **다크모드**: `sd-theme-dark` 클래스 + `themes/_variables-dark.scss` 오버라이드
- **유틸리티 클래스**: `.flex-row`, `.flex-column`, `.flex-fill`, `.grid`, `.grid-{1~12}`, `.card`, `.form-control`
- 빌드 결과: `dist/styles.css`로 컴파일

## Angular Compiler

`tsconfig.json`에서 strict 옵션 전부 활성화:
- `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`
- `strictStandalone`, `typeCheckHostBindings`, `forbidOrphanComponents`
- `extendedDiagnostics.defaultCategory: "error"`

## Testing

**프레임워크**: Vitest + Angular TestBed (`BrowserDynamicTestingModule`)

테스트 디렉토리가 src 구조를 미러링: `tests/core/`, `tests/features/`, `tests/ui/`

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
