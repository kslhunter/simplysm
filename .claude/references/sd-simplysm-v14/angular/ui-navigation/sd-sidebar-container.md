# `SdSidebarContainer`

사이드바 컨테이너.

```typescript
@Component({ selector: "sd-sidebar-container" })
class SdSidebarContainer { }
```

## Related Types

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
