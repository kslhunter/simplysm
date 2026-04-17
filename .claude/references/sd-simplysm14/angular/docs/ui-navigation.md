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
