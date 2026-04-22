# 라우팅 Signal 함수들

라우터 상태를 signal로 반환하는 inject 함수 모음. 생성자/필드 이니셜라이저에서 호출한다.

## `injectCurrentPageCodeSignal`

현재 활성 라우트의 경로 세그먼트를 `.`으로 연결한 코드 signal. `ActivatedRoute`가 없으면 undefined 반환.

```typescript
function injectCurrentPageCodeSignal(): Signal<string> | undefined
```

### 사용 패턴

`injectViewTypeSignal()`과 `injectViewTitleSignal()` 내부에서 사용된다. 일반적으로 직접 사용할 필요 없이 `injectViewTitleSignal()`을 사용하면 된다.

## `injectFullPageCodeSignal`

전체 URL 기반 페이지 코드 signal. `NavigationEnd` 이벤트를 구독하여 URL에서 코드를 추출한다.

```typescript
function injectFullPageCodeSignal(): Signal<string>
```

### 사용 패턴

`injectViewTypeSignal()`과 `injectViewTitleSignal()` 내부에서 사용된다. 일반적으로 직접 사용할 필요 없이 `injectViewTitleSignal()`을 사용하면 된다.

## `injectViewTitleSignal`

현재 뷰의 타이틀 signal. 모달이면 모달 타이틀, 페이지이면 `SdAppStructureProvider`에서 조회.

```typescript
function injectViewTitleSignal(): Signal<string>
```

### 사용 패턴

```typescript
protected readonly viewTitle = injectViewTitleSignal();
```

```html
<sd-topbar>
  <h4>{{ viewTitle() }}</h4>
</sd-topbar>
```

**실사용 예:**
- [crud-list.md §3 최소 뼈대](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — topbar 제목
- [crud-detail.md §3 최소 뼈대](../recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — topbar 제목

## `injectViewTypeSignal`

현재 뷰의 타입 signal. 모달/페이지/컨트롤 중 하나를 반환한다.

```typescript
function injectViewTypeSignal(): Signal<SdViewType>
```

### 내부 판정 로직

- `SdActivatedModalProvider`가 inject되면 `"modal"`
- `ActivatedRoute.component`의 `reflectComponentType().selector`가 호스트 tagName과 일치하고 `fullPageCode() === currPageCode?.()`이면 `"page"`
- 그 외 `"control"`

### 호출 시점 제약

Angular `inject()`는 injection context(생성자 실행 중 또는 필드 초기화 시점) 안에서만 유효하므로, `computed` 콜백이나 `effect` 안에서 호출하면 **`NG0203` 런타임 에러**가 발생한다.

```typescript
// OK — 필드 이니셜라이저
protected readonly viewType = injectViewTypeSignal();

// NG0203 — computed 내부
protected readonly viewType = computed(() => injectViewTypeSignal()());
```

### 수동 오버라이드 패턴

일반적으로 자동 판정으로 충분하다. 수동 오버라이드가 필요한 특수 상황(예: 특정 페이지 안에 자기 자신을 모달처럼 보이게 하고 싶은 경우)에는:

```typescript
override = input<SdViewType>();
private readonly _autoViewType = injectViewTypeSignal();
protected readonly viewType = computed(() => this.override() ?? this._autoViewType());
```

> 이 오버라이드는 추상화 복원을 부추기므로 **기본은 자동 판정으로 쓰기**를 권장한다. 상세: [page-modal-container.md §5 뷰 타입 결정](../recipes/page-modal-container.md#5-뷰-타입-결정)

**실사용 예:**
- [crud-list.md §3 최소 뼈대](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 뷰 타입 기반 topbar 조건부 렌더
- [crud-list.md §8 확장 D: 선택 모달 전환](../recipes/crud-list.md#8-확장-d-선택-모달-전환) — modal 뷰 분기
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 뷰 분기
- [crud-detail.md §8 확장 D: control 뷰](../recipes/crud-detail.md#8-확장-d-control-뷰) — control 뷰 분기
- [page-modal-container.md §5 뷰 타입 결정](../recipes/page-modal-container.md#5-뷰-타입-결정) — 판정 규칙 + 수동 오버라이드

## `injectPermsSignal`

앱 구조(`SdAppStructureProvider`)에서 지정된 뷰 코드와 키 배열에 대한 권한을 조회하는 signal. 생성자/필드 이니셜라이저에서 호출한다.

```typescript
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewCodes` | `string[]` | 조회할 뷰 코드 배열 (예: `["sales.customer"]`) |
| `keys` | `K[]` | 권한 키 배열 (예: `["use", "edit"]`) |
| **반환** | `Signal<K[]>` | 현재 사용자가 보유한 권한 키 배열 |

### 사용 패턴

```typescript
protected readonly perms = injectPermsSignal(["{도메인}.{viewCode}"], ["use", "edit"]);
protected readonly canEdit = computed(() => this.perms().includes("edit"));
```

```html
@if (!perms().includes("use")) {
  <div class="fill tx-theme-gray-light p-xxl tx-center">
    <br />
    <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
    <br />
    <br />
    '{{ viewTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
  </div>
}
```

**실사용 예:**
- [crud-list.md §3 최소 뼈대](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 권한 기반 조건부 렌더
- [crud-detail.md §3 최소 뼈대](../recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — 권한 기반 조건부 렌더

## `getMenuRouterLinkOption`

메뉴에서 라우터 링크 옵션을 추출한다.

```typescript
function getMenuRouterLinkOption(
  menu: SdMenu,
): { link: string; queryParams: Record<string, string> | undefined } | undefined
```

## `getIsMenuSelected`

메뉴가 현재 선택된 상태인지 확인한다.

```typescript
function getIsMenuSelected(
  menu: SdMenu,
  fullPageCode: string | undefined,
  customFn?: (menu: SdMenu) => boolean,
): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `menu` | `SdMenu` | 메뉴 항목 |
| `fullPageCode` | `string \| undefined` | 현재 페이지 코드 |
| `customFn` | `((menu) => boolean) \| undefined` | 커스텀 비교 함수 |
