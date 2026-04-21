# UI - Navigation

## Collapse

### `SdCollapse`

접기/펼치기 패널 컴포넌트.

```typescript
@Component({ selector: "sd-collapse" })
class SdCollapse {
  open = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 펼침 상태 |

### `SdCollapseIcon`

접기/펼치기 아이콘 컴포넌트. 화살표 회전 애니메이션.

```typescript
@Component({ selector: "sd-collapse-icon" })
class SdCollapseIcon {
  open = input(false, { transform: booleanAttribute });
  openRotate = input(90, { transform: numberAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 펼침 상태 |
| `openRotate` | `number` | `90` | 열림 시 회전 각도 |

## Tab

> **CRITICAL — 역할 범위**
> `sd-tab`/`sd-tab-item`은 **상단의 탭 선택 UI만** 담당한다. 내부 뷰(패널) 전환 기능은 **없다**.
> `sd-tab-item`의 `<ng-content>`는 **탭 라벨 전용**이다. 이 안에 시트/폼/상세 등 뷰 콘텐츠를 넣지 않는다.
> 뷰 콘텐츠는 `sd-tab` **바깥**에서 선택된 `value`를 기준으로 `@if` / `@switch`로 제어한다.

### `SdTab`

탭 컨테이너 컴포넌트. 선택된 값을 `value` model로 보관한다.

```typescript
@Component({ selector: "sd-tab" })
class SdTab<T> {
  value = model<T>();
}
```

### `SdTabItem`

탭 항목 컴포넌트. 자신의 `value`가 부모 `SdTab.value`와 같으면 선택 상태가 된다. 클릭 시 부모 `value`를 자신의 `value`로 세팅한다.

```typescript
@Component({ selector: "sd-tab-item" })
class SdTabItem<T> {
  value = input.required<T>();
}
```

### 사용 예시

```html
<!-- ✅ 올바른 사용: 탭은 선택 UI, 뷰는 @if로 제어 -->
<sd-tab [(value)]="tab">
  <sd-tab-item [value]="'list'">목록</sd-tab-item>
  <sd-tab-item [value]="'detail'">상세</sd-tab-item>
</sd-tab>

@if (tab() === "list") {
  <sd-sheet ...></sd-sheet>
}
@if (tab() === "detail") {
  <app-detail ...></app-detail>
}
```

```html
<!-- ❌ 잘못된 사용: sd-tab-item 안에 뷰 콘텐츠를 넣음 -->
<sd-tab [(value)]="tab">
  <sd-tab-item [value]="'list'">
    목록
    <sd-sheet ...></sd-sheet>   <!-- 금지: 라벨 영역에 뷰를 넣지 않는다 -->
  </sd-tab-item>
</sd-tab>
```

## Pagination

### `SdPagination`

페이지네이션 컴포넌트.

```typescript
@Component({ selector: "sd-pagination" })
class SdPagination {
  currentPage = model(0);
  totalPageCount = input(0, { transform: numberAttribute });
  visiblePageCount = input(10, { transform: numberAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `currentPage` | `number` | `0` | 현재 페이지 (0-based, two-way) |
| `totalPageCount` | `number` | `0` | 총 페이지 수 |
| `visiblePageCount` | `number` | `10` | 한 번에 표시할 페이지 수 |

## Sidebar

### `SdSidebarContainer`

사이드바 컨테이너.

```typescript
@Component({ selector: "sd-sidebar-container" })
class SdSidebarContainer { }
```

### `SdSidebar`

사이드바 컴포넌트.

```typescript
@Component({ selector: "sd-sidebar" })
class SdSidebar { }
```

### `SdSidebarMenu`

사이드바 메뉴 항목. 재귀적 트리 구조 지원.

```typescript
@Component({ selector: "sd-sidebar-menu" })
class SdSidebarMenu {
  menus = input<SdMenu[]>([]);
  layout = input<"accordion" | "flat">();
  getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `menus` | `SdMenu[]` | `[]` | 메뉴 항목 |
| `layout` | `"accordion" \| "flat" \| undefined` | `undefined` | 레이아웃 모드 |
| `getMenuIsSelectedFn` | `((menu) => boolean) \| undefined` | `undefined` | 커스텀 메뉴 선택 여부 함수 |

### `SdSidebarUser`

사이드바 사용자 영역 컴포넌트.

```typescript
@Component({ selector: "sd-sidebar-user" })
class SdSidebarUser {
  userMenu = input<SdSidebarUserMenu>();
}
```

### `SdSidebarUserMenu`

```typescript
interface SdSidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 사용자 메뉴 제목 |
| `menus` | `{ title: string; onClick: () => void }[]` | 하위 메뉴 항목 배열 |

## Topbar

### 기본 사용 예제

topbar만 있는 단순 페이지(홈·메인 등) 스캐폴드. 본문 영역이 비어 있으면 topbar 아래에 별도 컨테이너 div를 두지 않는다.

```typescript
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { injectViewTitleSignal, SdTopbar, SdTopbarContainer } from "@simplysm/angular";

@Component({
  selector: "app-main",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTopbarContainer, SdTopbar],
  template: `
    <sd-topbar-container>
      <sd-topbar>
        <h4>{{ viewTitle() }}</h4>
      </sd-topbar>
    </sd-topbar-container>
  `,
})
export class MainPage {
  viewTitle = injectViewTitleSignal();
}
```

- 제목은 [`injectViewTitleSignal`](./utils.md#injectviewtitlesignal)이 `SdAppStructureProvider`에서 자동 조회한다.
- 페이지/모달/control 뷰에서 **재사용**되는 화면은 뷰 분기가 필요하므로 [`recipes/page-modal-container.md`](./recipes/page-modal-container.md)를 사용한다.

### topbar 내부 슬롯 활용

topbar 내부에 `<h4>` 제목, 기능 버튼, 단축키 힌트를 배치한다.

```html
<sd-topbar>
  <h4>{{ viewTitle() }}</h4>

  <sd-button [size]="'sm'" [theme]="'link-info'" (click)="onRefreshButtonClick()">
    <ng-icon [svg]="icons.tablerRefresh" />
    새로고침
    <small>(Ctrl+Alt+L)</small>
  </sd-button>

  <sd-button [size]="'sm'" [theme]="'link-info'" (click)="onAddItemButtonClick()">
    <ng-icon [svg]="icons.tablerCirclePlus" />
    등록
    <small>(Ctrl+Insert)</small>
  </sd-button>
</sd-topbar>
```

- `<h4>` — 페이지 제목. [`injectViewTitleSignal()`](./utils.md#injectviewtitlesignal)이 라우트에서 자동 조회
- `<sd-button [size]="'sm'" [theme]="'link-info'">` — 기능 버튼. topbar 안에서는 `sm` + `link-*` 테마 사용
- `<small>` — 단축키 힌트. `SdCommandDirective`와 연동

### viewType 조건부 렌더

페이지/모달/control 뷰에서 **재사용**되는 화면은 topbar를 page 뷰에서만 렌더한다. modal/control 뷰에서는 모달 헤더·control 도구 바가 대신하므로 topbar를 생략한다.

```html
<sd-topbar-container>
  @if (viewType() === "page") {
    <sd-topbar>
      <h4>{{ viewTitle() }}</h4>
      <!-- 버튼... -->
    </sd-topbar>
  }
  <!-- 메인 콘텐츠 -->
</sd-topbar-container>
```

이 분기는 최소 뼈대에서는 불필요하다 (page 뷰 전용이므로 조건 없이 렌더). modal/control 뷰를 지원하는 확장(crud-list 확장 D·E, crud-detail 확장 C·D)에서 도입한다.

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 조건 없이 렌더 (page 뷰 전용)
- [crud-list.md §5 확장 A: inline 편집/저장](./recipes/crud-list.md#5-확장-a-inline-편집저장) — 저장/등록 버튼 추가
- [crud-list.md §8 확장 D: 선택 모달 전환](./recipes/crud-list.md#8-확장-d-선택-모달-전환) — `@if (viewType() === "page")` 조건부 렌더
- [crud-detail.md §3 최소 뼈대: 읽기 전용 상세 폼](./recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — 조건 없이 렌더 (page 뷰 전용)
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — 조건부 렌더 도입

### `SdTopbarContainer`

탑바 컨테이너.

```typescript
@Component({ selector: "sd-topbar-container" })
class SdTopbarContainer { }
```

### `SdTopbar`

탑바 컴포넌트.

```typescript
@Component({ selector: "sd-topbar" })
class SdTopbar { }
```

### `SdTopbarMenu`

탑바 메뉴 항목.

```typescript
@Component({ selector: "sd-topbar-menu" })
class SdTopbarMenu {
  menus = input<SdMenu[]>([]);
  getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `menus` | `SdMenu[]` | `[]` | 메뉴 항목 |
| `getMenuIsSelectedFn` | `((menu) => boolean) \| undefined` | `undefined` | 커스텀 메뉴 선택 여부 함수 |

### `SdTopbarUser`

탑바 사용자 영역 컴포넌트.

```typescript
@Component({ selector: "sd-topbar-user" })
class SdTopbarUser {
  menus = input.required<SdTopbarUserMenu[]>();
}
```

### `SdTopbarUserMenu`

```typescript
interface SdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 제목 |
| `onClick` | `() => void` | 클릭 핸들러 |

## Menu Utilities

### `getMenuRouterLinkOption`

메뉴에서 라우터 링크 옵션을 추출한다. children이 있거나 url이 있는 메뉴는 undefined 반환.

```typescript
function getMenuRouterLinkOption(
  menu: SdMenu,
): { link: string; queryParams: Record<string, string> | undefined } | undefined
```

반환값: `{ link: "/home/{codeChain}", queryParams }` 또는 `undefined`

### `getIsMenuSelected`

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
