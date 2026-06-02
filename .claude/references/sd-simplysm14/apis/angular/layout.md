# @simplysm/angular — 레이아웃(사이드바·탑바)

화면 골격을 만드는 사이드바·탑바 컴포넌트 묶음. 메뉴 데이터는 `SdMenu`(routing-appstructure.md 참조) 또는 자체 메뉴 객체를 사용.

## 사이드바

- **SdSidebarContainer** `<sd-sidebar-container>` — 사이드바 + 본문 레이아웃 컨테이너. input 없음. `toggle: WritableSignal<boolean>`(접힘 상태, 모바일은 backdrop 표시). 라우터 네비게이션 시작 시 자동 접힘. 자식으로 `sd-sidebar` 와 본문을 둠.
- **SdSidebar** `<sd-sidebar>` — 사이드바 패널. input 없음(컨테이너의 toggle 을 따름). 좌측 고정, 모바일에서 오버레이.
- **SdSidebarMenu** `<sd-sidebar-menu>` — 메뉴 트리 렌더. `menus = input<SdMenu[]>([])`, `layout`("accordion"|"flat" — 미지정 시 최상위 3개 이하면 flat, 아니면 accordion), `getMenuIsSelectedFn`(선택 판정 커스텀). leaf 는 `sdRouterLink` 로 이동, `menu.url` 있으면 새 창.
- **SdSidebarUser** `<sd-sidebar-user>` — 사용자 영역 + 접이식 메뉴. `userMenu = input<SdSidebarUserMenu>()`. 투영 내용(프로필) + 클릭 시 펼쳐지는 메뉴 목록. 타입 `SdSidebarUserMenu = { title: string; menus: { title; onClick }[] }`.

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-user [userMenu]="userMenu">{{ userName }}</sd-sidebar-user>
    <sd-sidebar-menu [menus]="appStructure.usableMenus()" />
  </sd-sidebar>
  <router-outlet />
</sd-sidebar-container>
```

## 탑바

- **SdTopbarContainer** `<sd-topbar-container>` — 탑바 + 본문 세로 레이아웃. input 없음.
- **SdTopbar** `<sd-topbar>` — 상단 바. `sidebarContainer = input<SdSidebarContainer>()`(미지정 시 주입된 컨테이너 자동 사용). 사이드바가 있으면 좌측 토글(햄버거) 버튼 표시. 제목·도구는 투영.
- **SdTopbarMenu** `<sd-topbar-menu>` — 드롭다운형 상단 메뉴 트리. `menus = input<SdMenu[]>([])`, `getMenuIsSelectedFn`. 최상위 메뉴별 드롭다운, leaf 클릭 시 이동·드롭다운 닫힘.
- **SdTopbarUser** `<sd-topbar-user>` — 사용자 드롭다운 메뉴. `menus = input.required<SdTopbarUserMenu[]>()`. 투영 내용(이름) 클릭 시 메뉴 목록. 타입 `SdTopbarUserMenu = { title: string; onClick: () => void }`.
