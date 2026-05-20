# @simplysm/angular — layout

## 사이드바

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-user [userMenu]="userMenu">유저영역 컨텐츠</sd-sidebar-user>
    <sd-sidebar-menu [menus]="menus" [layout]="'accordion'" [getMenuIsSelectedFn]="isSel" />
  </sd-sidebar>
  <ng-content />
</sd-sidebar-container>
```

- `SdSidebarContainer`: `toggle = signal(false)`. 데스크탑은 토글 시 본문 left padding 제거, 모바일(`max-width:520px`)에서는 사이드바가 슬라이드. Router `NavigationStart` 이벤트에 자동 false (페이지 이동 시 자동 닫힘).
- `SdSidebar`: 부모 container의 toggle 추종. content projection.
- `SdSidebarMenu`: `menus: SdMenu[]`, `layout: "accordion"|"flat"` (미지정 시 `menus.length <= 3` 이면 `"flat"`, 아니면 `"accordion"` 자동), `getMenuIsSelectedFn?: (menu) => boolean`. 자식 메뉴는 항상 `"accordion"`. `menu.url != null` 이면 클릭 시 새창 open.
- `SdSidebarUser`: `userMenu?: SdSidebarUserMenu` + 상단 영역 content projection. userMenu.title 클릭 시 메뉴 항목 펼침/접기.

```typescript
interface SdSidebarUserMenu {
  title: string;
  menus: { title: string; onClick: () => void }[];
}
```

## 탑바

```html
<sd-topbar-container>
  <sd-topbar>
    <h4>{{ title }}</h4>
    <sd-topbar-menu [menus]="menus" />
    <sd-topbar-user [menus]="userMenus">유저표시</sd-topbar-user>
  </sd-topbar>
  <ng-content />
</sd-topbar-container>
```

- `SdTopbarContainer`: flex-column 100% 컨테이너.
- `SdTopbar`: `sidebarContainer?: SdSidebarContainer` 입력(미지정 시 inject 시도). 사이드바 있으면 햄버거 버튼 노출 → 클릭 시 `sc.toggle` 토글.
- `SdTopbarMenu`: `menus: SdMenu[]`, `getMenuIsSelectedFn?`. 각 최상위 menu는 dropdown 으로 노출. leaf 클릭 후 dropdown 자동 닫힘.
- `SdTopbarUser`: `menus: SdTopbarUserMenu[]` (required, `{ title, onClick }[]`) + 트리거 영역 content projection. dropdown 으로 menus 표시, 클릭 후 자동 close.

## 메뉴 데이터

`SdMenu` (`./app-structure.md` 참조)을 그대로 입력. 선택 상태는 `getIsMenuSelected(menu, fullPageCode, customFn?)` 또는 `getMenuIsSelectedFn` 으로. leaf 메뉴는 `getMenuRouterLinkOption(menu)` 으로 `[sdRouterLink]` 옵션 자동 생성.
