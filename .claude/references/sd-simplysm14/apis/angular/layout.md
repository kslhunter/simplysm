# @simplysm/angular — layout

앱 셸 레이아웃. 사이드바·탑바 컨테이너와 메뉴 위젯.

## SdSidebarContainer — `<sd-sidebar-container>`

```ts
toggle: WritableSignal<boolean>;     // 사이드바 표시 여부
```

- 사이드바 + 메인 영역 컨테이너. `Router` 네비게이션 시작 시 `toggle` 자동 false(모바일에서 메뉴 자동 닫힘).
- 자식: `<sd-sidebar>` + 본문 컨텐츠.

## SdSidebar — `<sd-sidebar>`

```ts
toggle = computed(() => parent.toggle());
```

- 사이드바 패널. 부모 `SdSidebarContainer.toggle` 에 연동되어 슬라이드 표시.
- `<ng-content>` 가 사이드바 내부 컨텐츠(보통 `<sd-sidebar-user>` + `<sd-sidebar-menu>`).

## SdSidebarMenu — `<sd-sidebar-menu>`

```ts
menus = input<SdMenu[]>([]);
layout = input<"accordion"|"flat">();
getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
```

- `menus` — 보통 `sdAppStructure.usableMenus()` 결과.
- `layout` — `accordion`: 그룹 메뉴 펼침/접힘, `flat`: 상시 전개. 미지정 시 메뉴 ≤3 → `flat`, 초과 → `accordion`.
- `getMenuIsSelectedFn` — 현재 선택 메뉴 판정 커스텀. 미지정 시 `fullPageCode === menu.codeChain.join(".")`.

## SdSidebarUser — `<sd-sidebar-user>`

```ts
userMenu = input<SdSidebarUserMenu>();

interface SdSidebarUserMenu {
  title: string;
  menus: { title: string; onClick: () => void }[];
}
```

- 사이드바 상단 사용자 정보 + 드롭다운 메뉴(로그아웃 등). `<ng-content>` 가 사용자 표시 영역(아바타·이름).

## SdTopbarContainer — `<sd-topbar-container>`

- 탑바 + 본문 컨테이너. inputs 없음. 자식: `<sd-topbar>` + 본문.

## SdTopbar — `<sd-topbar>`

```ts
sidebarContainer = input<SdSidebarContainer>();
```

- 상단 바. 햄버거 버튼 클릭 시 사이드바 토글. `sidebarContainer` 명시 안 하면 ancestor inject 자동 탐색.

## SdTopbarMenu — `<sd-topbar-menu>`

```ts
menus = input<SdMenu[]>([]);
getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
```

- 탑바 가로 메뉴. 그룹 메뉴는 드롭다운 자동.

## SdTopbarUser — `<sd-topbar-user>`

```ts
menus = input.required<SdTopbarUserMenu[]>();

interface SdTopbarUserMenu { title: string; onClick: () => void }
```

- 탑바 우측 사용자 드롭다운(아바타 → 메뉴). `<ng-content>` 가 트리거 표시 영역.

## 사용 예

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-user [userMenu]="userMenu()">{{ user().name }}</sd-sidebar-user>
    <sd-sidebar-menu [menus]="appStructure.usableMenus()" />
  </sd-sidebar>
  <sd-topbar-container>
    <sd-topbar><h1>{{ viewTitle() }}</h1><sd-topbar-user [menus]="topbarMenus()" /></sd-topbar>
    <router-outlet />
  </sd-topbar-container>
</sd-sidebar-container>
```
