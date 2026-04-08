# Utils & Setups

## Utility Functions

### `mark`

WritableSignal의 변경 알림을 수동으로 트리거한다. 배열/객체의 내부 변경(mutation) 후 consumer에게 변경을 알릴 때 사용.

```typescript
function mark(sig: WritableSignal<any>, clone?: boolean): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sig` | `WritableSignal<any>` | 대상 signal |
| `clone` | `boolean \| undefined` | `true`: shallow copy 후 `update()`. `false`/생략: Angular 내부 `producerNotifyConsumers` 직접 호출 |

### `withBusy`

busy count를 증감시키면서 비동기 작업을 실행한다. finally에서 감소하므로 에러 시에도 안전.

```typescript
async function withBusy(
  busyCount: WritableSignal<number>,
  fn: () => Promise<void>,
): Promise<void>
```

### `injectParent`

ViewContainerRef injector chain을 순회하여 가장 가까운 부모 컴포넌트 인스턴스를 반환한다. Angular 내부 `_lView[8]` (CONTEXT slot) 사용.

```typescript
function injectParent<T = object>(): T;
function injectParent<T = object>(type: AbstractType<T>): T;
function injectParent<T = object>(type: AbstractType<T>, options: { optional: true }): T | undefined;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `AbstractType<T>` | 필터링할 부모 타입. 생략 시 가장 가까운 부모 반환 |
| `options.optional` | `true` | 부모를 찾지 못해도 에러 대신 undefined 반환 |

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

### `injectFullPageCodeSignal`

전체 URL 기반 페이지 코드 signal. `NavigationEnd` 이벤트를 구독하여 URL에서 코드를 추출한다.

```typescript
function injectFullPageCodeSignal(): Signal<string>
```

### `injectViewTitleSignal`

현재 뷰의 타이틀 signal. 모달이면 모달 타이틀, 페이지이면 `SdAppStructureProvider`에서 조회.

```typescript
function injectViewTitleSignal(): Signal<string>
```

### `injectViewTypeSignal`

현재 뷰의 타입 signal. 모달/페이지/컨트롤 중 하나를 반환한다.

```typescript
function injectViewTypeSignal(getComp: () => object): Signal<SdViewType>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `getComp` | `() => object` | 현재 컴포넌트 인스턴스 반환 함수 (보통 `() => this`) |

반환값: `"modal"` (SdActivatedModalProvider 존재), `"page"` (라우트 컴포넌트이고 fullPageCode === currPageCode), `"control"` (그 외)

## Manager Functions

### `useSelectionManager`

선택 관리 composable. single/multi 모드를 지원한다.

```typescript
function useSelectionManager<T>(options: {
  displayItems: Signal<T[]>;
  selectedItems: WritableSignal<T[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: T) => boolean | string) | undefined>;
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

모달 내부이면 `SdActivatedModalProvider.canDeactiveFn`에 설정, 라우트 내부이면 `routeConfig.canDeactivate`에 추가.

### `setupCumulateSelectedKeys`

items 변경 시 selectedItems 동기화, selectedItems 변경 시 selectedItemKeys 갱신.

```typescript
function setupCumulateSelectedKeys<TItem, TKey>(options: {
  items: Signal<TItem[]>;
  selectedItems: WritableSignal<TItem[]>;
  selectedItemKeys: WritableSignal<TKey[]>;
  selectMode: () => "single" | "multi" | undefined;
  keySelectorFn: (item: TItem) => TKey | undefined;
}): void
```

### `setupCloserWhenSingleSelectionChange`

단일 선택 모드에서 선택이 변경되면 모달을 자동으로 닫는다.

```typescript
function setupCloserWhenSingleSelectionChange<TItem, TKey>(options: {
  selectedItemKeys: Signal<TKey[]>;
  selectedItems: Signal<TItem[]>;
  selectMode: () => "single" | "multi" | undefined;
  close: OutputEmitterRef<SelectModalOutputResult<TItem>>;
}): void
```
