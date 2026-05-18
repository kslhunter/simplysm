# @simplysm/angular — layout

## 사이드바

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-user [userMenu]="userMenu">유저영역</sd-sidebar-user>
    <sd-sidebar-menu [menus]="menus" [layout]="'accordion'" [getMenuIsSelectedFn]="isSel" />
  </sd-sidebar>
  <ng-content />
</sd-sidebar-container>
```

- `SdSidebarContainer`: `toggle = signal(false)`. Router NavigationStart 시 자동 false.
- `SdSidebar`: 부모 container의 toggle 추종.
- `SdSidebarMenu`: `menus: SdMenu[]`, `layout: "accordion"|"flat"`, `getMenuIsSelectedFn?`.
- `SdSidebarUser`: `userMenu?: SdSidebarUserMenu`.

```typescript
interface SdSidebarUserMenu { /* see source */ }
```

## 탑바

```html
<sd-topbar-container>
  <sd-topbar [sidebarContainer]="sc">
    <sd-topbar-menu [menus]="menus" />
    <sd-topbar-user [menus]="userMenus" />
  </sd-topbar>
</sd-topbar-container>
```

- `SdTopbar`: `sidebarContainer?: SdSidebarContainer` 입력(미지정 시 inject 시도). 햄버거 버튼이 `sc.toggle` 토글.
- `SdTopbarMenu`: `menus: SdMenu[]`, `getMenuIsSelectedFn?`.
- `SdTopbarUser`: `menus: SdTopbarUserMenu[]` (required).

## 메뉴 데이터

`SdMenu` (`./app-structure.md` 참조)을 그대로 입력. 선택 상태는 `getIsMenuSelected(menu, fullPageCode, customFn?)` 또는 `getMenuIsSelectedFn` 으로.
