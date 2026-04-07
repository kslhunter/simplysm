# UI - Navigation

## Collapse

### `SdCollapseControl`

접기/펼치기 패널 컴포넌트.

```typescript
@Component({ selector: "sd-collapse" })
class SdCollapseControl {
  open = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 펼침 상태 |

### `SdCollapseIconControl`

접기/펼치기 아이콘 컴포넌트. 화살표 회전 애니메이션.

```typescript
@Component({ selector: "sd-collapse-icon" })
class SdCollapseIconControl {
  open = input(false, { transform: booleanAttribute });
  openRotate = input(90, { transform: numberAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 펼침 상태 |
| `openRotate` | `number` | `90` | 열림 시 회전 각도 |

## Tab

### `SdTabControl`

탭 컨테이너 컴포넌트.

```typescript
@Component({ selector: "sd-tab" })
class SdTabControl<T> {
  value = model<T>();
}
```

### `SdTabItemControl`

탭 항목 컴포넌트.

```typescript
@Component({ selector: "sd-tab-item" })
class SdTabItemControl<T> {
  value = input.required<T>();
}
```

### `SdTabviewControl`

탭뷰 컨테이너 (탭 + 컨텐츠 영역).

```typescript
@Component({ selector: "sd-tabview" })
class SdTabviewControl<T> {
  value = model<T>();
}
```

### `SdTabviewItemControl`

탭뷰 항목.

```typescript
@Component({ selector: "sd-tabview-item" })
class SdTabviewItemControl<T> {
  value = input.required<T>();
}
```

## Pagination

### `SdPaginationControl`

페이지네이션 컴포넌트.

```typescript
@Component({ selector: "sd-pagination" })
class SdPaginationControl {
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

### `SdSidebarContainerControl`

사이드바 컨테이너.

```typescript
@Component({ selector: "sd-sidebar-container" })
class SdSidebarContainerControl { }
```

### `SdSidebarControl`

사이드바 컴포넌트.

```typescript
@Component({ selector: "sd-sidebar" })
class SdSidebarControl { }
```

### `SdSidebarMenuControl`

사이드바 메뉴 항목. 재귀적 트리 구조 지원.

```typescript
@Component({ selector: "sd-sidebar-menu" })
class SdSidebarMenuControl { }
```

### `SdSidebarUserControl`

사이드바 사용자 영역 컴포넌트.

```typescript
@Component({ selector: "sd-sidebar-user" })
class SdSidebarUserControl {
  menus = input<ISidebarUserMenu[]>([]);
}
```

### `ISidebarUserMenu`

```typescript
interface ISidebarUserMenu {
  label: string;
  onClick: () => void | Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | 메뉴 라벨 |
| `onClick` | `() => void \| Promise<void>` | 클릭 핸들러 |

## Topbar

### `SdTopbarContainerControl`

탑바 컨테이너.

```typescript
@Component({ selector: "sd-topbar-container" })
class SdTopbarContainerControl { }
```

### `SdTopbarControl`

탑바 컴포넌트.

```typescript
@Component({ selector: "sd-topbar" })
class SdTopbarControl { }
```

### `SdTopbarMenuControl`

탑바 메뉴 항목.

```typescript
@Component({ selector: "sd-topbar-menu" })
class SdTopbarMenuControl { }
```

### `SdTopbarUserControl`

탑바 사용자 영역 컴포넌트.

```typescript
@Component({ selector: "sd-topbar-user" })
class SdTopbarUserControl {
  menus = input.required<ISdTopbarUserMenu[]>();
}
```

### `ISdTopbarUserMenu`

```typescript
interface ISdTopbarUserMenu {
  label: string;
  onClick: () => void | Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | 메뉴 라벨 |
| `onClick` | `() => void \| Promise<void>` | 클릭 핸들러 |

## Menu Utilities

### `getMenuRouterLinkOption`

메뉴에서 라우터 링크 옵션을 추출한다. children이 있거나 url이 있는 메뉴는 undefined 반환.

```typescript
function getMenuRouterLinkOption(
  menu: ISdMenu,
): { link: string; queryParams: Record<string, string> | undefined } | undefined
```

반환값: `{ link: "/home/{codeChain}", queryParams }` 또는 `undefined`

### `getIsMenuSelected`

메뉴가 현재 선택된 상태인지 확인한다.

```typescript
function getIsMenuSelected(
  menu: ISdMenu,
  fullPageCode: string | undefined,
  customFn?: (menu: ISdMenu) => boolean,
): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `menu` | `ISdMenu` | 메뉴 항목 |
| `fullPageCode` | `string \| undefined` | 현재 페이지 코드 |
| `customFn` | `((menu) => boolean) \| undefined` | 커스텀 비교 함수 |
