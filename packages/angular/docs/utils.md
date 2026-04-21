# Utils & Setups

## Utility Functions

### `mark`

WritableSignal의 변경 알림을 수동으로 트리거한다. 배열/객체의 내부 변경(mutation) 후 consumer에게 변경을 알릴 때 사용. shallow copy로 새 참조를 생성하여 signal을 업데이트한다.

```typescript
function mark(sig: WritableSignal<any>): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sig` | `WritableSignal<any>` | 대상 signal. 배열이면 `[...v]`, 객체이면 `{...v}`로 shallow copy하여 update |

#### 역할

- **OnPush 템플릿 재렌더링**: shallow copy로 새 참조를 생성하여 Angular의 변경 감지를 트리거한다
- **computed/effect 의존성 갱신**: signal 참조가 갱신되어 의존하는 computed·effect가 재실행된다

```typescript
// 배열 내부 mutation 후 mark → UI 갱신
items()[0].name = "new";
mark(items);  // items signal이 [...items()] 로 갱신됨

// 객체 내부 mutation 후 mark → effect 재실행
filter().searchText = "abc";
mark(filter);  // filter signal이 {...filter()} 로 갱신됨
```

#### 주의사항

> **"저장 감지"가 아니다.** `obj.equal`(`@simplysm/core-common`)이 deep equal로 snapshot과 현재 값을 비교하므로, `item.name = "new"` 같은 mutation은 `mark` 없이도 `diffs()` / `onSubmit()`의 snapshot 비교에서 감지된다.

- Chrome 61 호환성(`Proxy` 폴리필 불가)으로 signal 자동 notify가 불가하여 명시적 `mark` 호출이 필요
- `mark`는 **UI에 변경을 반영**하기 위한 것이지, 데이터 변경 자체를 감지하는 메커니즘이 아니다

**실사용 예:**
- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — items 배열 mutation 후 mark
- [crud-list.md §6 확장 B: 선택 기능](./recipes/crud-list.md#6-확장-b-선택-기능--선택-삭제복구) — selectedItems 변경 후 mark
- [crud-detail.md §5 확장 A: 편집/저장](./recipes/crud-detail.md#5-확장-a-편집저장) — data 객체 mutation 후 mark
- [crud-detail.md §10 확장 F: 복합 상세](./recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 하위 컬렉션 mutation 후 mark

### `setSafeStyle`

Renderer2를 사용하여 여러 CSS 스타일을 일괄 적용한다.

```typescript
function setSafeStyle(
  renderer: Renderer2,
  el: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
): void
```

## Resource Functions

### `injectSdSystemConfigResource`

컴포넌트 태그명 기반 키로 시스템 설정을 읽고 쓰는 resource 래퍼. 생성자에서 호출.

```typescript
function injectSdSystemConfigResource<T>(options: {
  key: Signal<string | undefined>;
}): {
  value: Signal<T | undefined>;
  isLoading: Signal<boolean>;
  status: Signal<ResourceStatus>;
  hasValue: () => boolean;
  reload: () => void;
  set(value: T | undefined): void;
  update(fn: (prev: T | undefined) => T | undefined): void;
}
```

`set()`/`update()` 호출 시 signal을 즉시 업데이트하고, 비동기로 `SdSystemConfigProvider.setAsync()`를 호출하여 영속화한다.

## Page Code / View Signals

### `injectCurrentPageCodeSignal`

현재 활성 라우트의 경로 세그먼트를 `.`으로 연결한 코드 signal. `ActivatedRoute`가 없으면 undefined 반환.

```typescript
function injectCurrentPageCodeSignal(): Signal<string> | undefined
```

#### 사용 패턴

`injectViewTypeSignal()`과 `injectViewTitleSignal()` 내부에서 사용된다. 직접 사용하는 경우는 modal 뷰에서 `modalOrPageTitle` 계산 시:

```typescript
private readonly _currPageCode = injectCurrentPageCodeSignal();
private readonly _fullPageCode = injectFullPageCodeSignal();
private readonly _sdAppStructure = inject(SdAppStructureProvider);

protected readonly modalOrPageTitle = computed(() =>
  this._sdActivatedModal != null
    ? (this._sdActivatedModal.modalComponent()?.title() ?? "")
    : this._sdAppStructure.getTitleByFullCode(this._currPageCode?.() ?? this._fullPageCode()),
);
```

**실사용 예:**
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — modalOrPageTitle 계산

### `injectFullPageCodeSignal`

전체 URL 기반 페이지 코드 signal. `NavigationEnd` 이벤트를 구독하여 URL에서 코드를 추출한다.

```typescript
function injectFullPageCodeSignal(): Signal<string>
```

#### 사용 패턴

`injectViewTypeSignal()`과 `injectViewTitleSignal()` 내부에서 사용된다. `injectCurrentPageCodeSignal()`과 함께 modal 뷰에서 `modalOrPageTitle` 계산에 활용 (위 `injectCurrentPageCodeSignal` 사용 패턴 참조).

**실사용 예:**
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — modalOrPageTitle 계산

### `injectViewTitleSignal`

현재 뷰의 타이틀 signal. 모달이면 모달 타이틀, 페이지이면 `SdAppStructureProvider`에서 조회.

```typescript
function injectViewTitleSignal(): Signal<string>
```

#### 사용 패턴

topbar 제목 바인딩에 사용. 필드 이니셜라이저에서 호출한다 (injection context 필수).

```typescript
protected readonly viewTitle = injectViewTitleSignal();
```

```html
<sd-topbar>
  <h4>{{ viewTitle() }}</h4>
  ...
</sd-topbar>
```

**실사용 예:**
- [crud-list.md §3 최소 뼈대](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — topbar 제목
- [crud-detail.md §3 최소 뼈대](./recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — topbar 제목

### `injectViewTypeSignal`

현재 뷰의 타입 signal. 모달/페이지/컨트롤 중 하나를 반환한다.

```typescript
function injectViewTypeSignal(): Signal<SdViewType>
```

내부 판정 로직:
- `SdActivatedModalProvider`가 inject되면 `"modal"`
- `ActivatedRoute.component`의 `reflectComponentType().selector`가 호스트 `ElementRef.nativeElement.tagName.toLowerCase()`와 일치하고 `fullPageCode() === currPageCode?.()`이면 `"page"`
- 그 외 `"control"`

#### 호출 시점 제약

내부에서 `inject(SdActivatedModalProvider)`, `inject(ActivatedRoute)`, `inject(ElementRef)`를 호출한다. Angular `inject()`는 injection context(생성자 실행 중 또는 필드 초기화 시점) 안에서만 유효하므로, `computed` 콜백이나 `effect` 안에서 호출하면 **`NG0203` 런타임 에러**가 발생한다.

```typescript
// OK — 필드 이니셜라이저
protected readonly viewType = injectViewTypeSignal();

// NG0203 — computed 내부
protected readonly viewType = computed(() => injectViewTypeSignal()());
```

#### 수동 오버라이드 패턴

일반적으로 자동 판정으로 충분하다. 수동 오버라이드가 필요한 특수 상황(예: 특정 페이지 안에 자기 자신을 모달처럼 보이게 하고 싶은 경우)에는 `injectViewTypeSignal()`은 필드 초기화 시점에 한 번만 호출하고, `computed`에서는 signal만 재사용한다:

```typescript
override = input<SdViewType>();
private readonly _autoViewType = injectViewTypeSignal();
protected readonly viewType = computed(() => this.override() ?? this._autoViewType());
```

> 이 오버라이드는 추상화 복원을 부추기므로 **기본은 자동 판정으로 쓰기**를 권장한다.

**실사용 예:**
- [crud-list.md §3 최소 뼈대](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 뷰 타입 기반 topbar 조건부 렌더
- [crud-list.md §8 확장 D: 선택 모달 전환](./recipes/crud-list.md#8-확장-d-선택-모달-전환) — modal 뷰 분기
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 뷰 분기
- [crud-detail.md §8 확장 D: control 뷰](./recipes/crud-detail.md#8-확장-d-control-뷰) — control 뷰 분기
- [page-modal-container.md §5 뷰 타입 결정](./recipes/page-modal-container.md#5-뷰-타입-결정) — 판정 규칙 + 수동 오버라이드

### `injectPermsSignal`

앱 구조(`SdAppStructureProvider`)에서 지정된 뷰 코드와 키 배열에 대한 권한을 조회하는 signal. 생성자/필드 이니셜라이저에서 호출한다.

```typescript
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewCodes` | `string[]` | 조회할 뷰 코드 배열 (예: `["sales.customer"]`) |
| `keys` | `K[]` | 권한 키 배열 (예: `["use", "edit"]`) |
| **반환** | `Signal<K[]>` | 현재 사용자가 보유한 권한 키 배열 |

#### 사용 패턴

```typescript
// 필드 이니셜라이저에서 선언
protected readonly perms = injectPermsSignal(["sales.customer"], ["use", "edit"]);

// 편집 가능 여부 computed
protected readonly canEdit = computed(() => this.perms().includes("edit"));
```

```html
<!-- 권한 미보유 시 경고 -->
@if (!perms().includes("use")) {
  <sd-note theme="warning">
    <ng-icon [svg]="icons.tablerAlertTriangle" />
    이 화면의 사용 권한이 없습니다.
  </sd-note>
}
```

**실사용 예:**
- [crud-list.md §3 최소 뼈대](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 권한 기반 조건부 렌더
- [crud-detail.md §3 최소 뼈대](./recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — 권한 기반 조건부 렌더

## Manager Functions

### `useSelectionManager`

선택 관리 composable. single/multi 모드를 지원한다. `trackByFn`이 반환하는 key를 기준으로 `obj.equal`(deep equal) 비교를 수행하므로, 같은 key의 다른 reference item도 `isSelected` true로 복원된다.

```typescript
function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
  trackByFn: Signal<(item: T, index: number) => unknown>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item: T): true | string | undefined;
  getCanChangeFn(item: T): () => boolean;
  select(item: T): void;
  deselect(item: T): void;
  toggle(item: T): void;
  toggleAll(): void;
  isSelected(item: T): boolean;
}
```

| Return | Type | Description |
|--------|------|-------------|
| `hasSelectable` | `Signal<boolean>` | selectMode가 설정되어 있는지 여부 |
| `isAllSelected` | `Signal<boolean>` | 모든 선택 가능 항목이 선택되었는지 |
| `getSelectable(item)` | `true \| string \| undefined` | 선택 가능 여부. string은 불가 사유 |
| `getCanChangeFn(item)` | `() => boolean` | 선택 변경 가능 여부 함수 |
| `select(item)` | `void` | 항목 선택 (single이면 교체) |
| `deselect(item)` | `void` | 항목 선택 해제 |
| `toggle(item)` | `void` | 항목 토글 |
| `toggleAll()` | `void` | 전체 선택/해제 토글 |
| `isSelected(item)` | `boolean` | 선택 여부 |

### `useSortingManager`

정렬 관리 composable.

```typescript
function useSortingManager(options: {
  sorts: WritableSignal<SortingDef[]>;
}): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
}
```

| Return | Type | Description |
|--------|------|-------------|
| `defMap` | `Signal<Map<string, ...>>` | 키별 정렬 정의 (인덱스 텍스트, 방향) |
| `toggle(key, multiple)` | `void` | 정렬 토글. `multiple=true`면 멀티 소트, `false`면 단일 소트. 3단계: asc -> desc -> 없음 |
| `sort(items)` | `T[]` | 정렬 적용. 원본 배열은 변경하지 않음 |

### `useExpandingManager`

트리 확장/축소 관리 composable.

```typescript
function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): {
  displayItems: Signal<T[]>;
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  toggle(item: T): void;
  toggleAll(): void;
  isVisible(item: T): boolean;
  def(item: T): ExpandItemDef<T>;
}
```

| Return | Type | Description |
|--------|------|-------------|
| `displayItems` | `Signal<T[]>` | 트리를 평탄화한 전체 항목 (숨김 포함) |
| `hasExpandable` | `Signal<boolean>` | 확장 가능한 항목 존재 여부 |
| `isAllExpanded` | `Signal<boolean>` | 모든 확장 가능 항목이 펼쳐졌는지 |
| `toggle(item)` | `void` | 항목 확장/축소 토글 |
| `toggleAll()` | `void` | 전체 확장/축소 토글 |
| `isVisible(item)` | `boolean` | 부모 체인이 모두 펼쳐져 항목이 보이는지 |
| `def(item)` | `ExpandItemDef<T>` | 항목의 트리 정의 (depth, parentDef 등) |

## Setup Functions

생성자에서 호출하는 설정 함수들. `inject()`, `effect()`, `DestroyRef.onDestroy()`를 사용하여 수명주기를 관리한다.

### `setupBgTheme`

body 배경 테마 색상을 설정한다. 파괴 시 자동 복원.

```typescript
function setupBgTheme(options?: {
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray";
  lightness?: "lightest" | "lighter";
}): void
```

### `setupRipple`

호스트 요소에 리플 효과를 설정한다. pointer 이벤트 기반.

```typescript
function setupRipple(enableFn?: () => boolean): void
```

### `setupRevealOnShow`

뷰포트 진입 시 reveal 애니메이션을 설정한다. IntersectionObserver 사용.

```typescript
function setupRevealOnShow(optFn?: () => {
  type?: "l2r" | "t2b";
  enabled?: boolean;
}): void
```

### `setupInvalid`

유효성 검증 표시기를 설정한다. 빨간 점 indicator + hidden input으로 구현.

```typescript
function setupInvalid(getInvalidMessage: () => string): void
```

빈 문자열이면 유효, 비어있지 않으면 무효.

### `setupModelHook`

model signal의 `set`/`update`를 가드 함수로 래핑한다. 가드 함수가 `false`를 반환하면 값 변경을 차단.

```typescript
function setupModelHook<T, S extends WritableSignal<T>>(
  model: S,
  canFn: Signal<(item: T) => boolean | Promise<boolean>>,
): void
```

### `setupCanDeactivate`

모달 또는 라우트에 canDeactivate 가드를 설정한다.

```typescript
function setupCanDeactivate(fn: () => boolean): void
```

모달 내부이면 `SdActivatedModalProvider.canDeactivateFn`에 설정, 라우트 내부이면 `routeConfig.canDeactivate`에 추가. control 뷰에서는 라우트도 모달도 아니므로 아무 동작 하지 않는다.

#### 사용 패턴

##### 기본 패턴 (편집 이탈 방지)

```typescript
setupCanDeactivate(() => this._checkIgnoreChanges());
```

`_checkIgnoreChanges()`가 `false`를 반환하면 이탈이 차단된다 (confirm 대화상자로 사용자 확인).

##### 뷰 타입별 분기 패턴

modal 뷰를 추가 지원할 때, 모달에서는 취소 버튼으로 제어하므로 항상 이탈을 허용한다:

```typescript
setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
```

- **모달 뷰**: `true` → 항상 이탈 허용 (모달 자체 취소 버튼으로 제어)
- **페이지 뷰**: `_checkIgnoreChanges()` → confirm 결과로 제어
- **control 뷰**: 내부에서 아무 동작 하지 않음 (라우트도 모달도 아님)

**실사용 예:**
- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 기본 패턴
- [crud-detail.md §5 확장 A: 편집/저장](./recipes/crud-detail.md#5-확장-a-편집저장) — 기본 패턴
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — 뷰 타입별 분기 패턴
