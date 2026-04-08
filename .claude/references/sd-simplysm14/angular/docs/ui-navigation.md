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

### `SdTab`

탭 컨테이너 컴포넌트.

```typescript
@Component({ selector: "sd-tab" })
class SdTab<T> {
  value = model<T>();
}
```

### `SdTabItem`

탭 항목 컴포넌트.

```typescript
@Component({ selector: "sd-tab-item" })
class SdTabItem<T> {
  value = input.required<T>();
}
```

### `SdTabview`

탭뷰 컨테이너 (탭 + 컨텐츠 영역).

```typescript
@Component({ selector: "sd-tabview" })
class SdTabview<T> {
  value = model<T>();
}
```

### `SdTabviewItem`

탭뷰 항목.

```typescript
@Component({ selector: "sd-tabview-item" })
class SdTabviewItem<T> {
  value = input.required<T>();
}
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
class SdSidebarMenu { }
```

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
class SdTopbarMenu { }
```

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
