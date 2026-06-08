# @simplysm/angular — 레이아웃(사이드바·탑바)

앱 셸의 좌측 사이드바·상단바와 그 안의 메뉴/사용자 메뉴 컴포넌트 군. 앱 루트 레이아웃(`app.root` 등)에서 한 번 구성. 메뉴 항목 타입(`SdMenu`)·라우터 링크는 [routing-appstructure.md](./routing-appstructure.md) 의 것을 사용.

## 사이드바

### SdSidebarContainer — `<sd-sidebar-container>`

```ts
toggle: WritableSignal<boolean>;
```

- 사이드바 + 본문을 감싸는 컨테이너. `toggle` 로 사이드바 접힘 제어(데스크탑은 본문 패딩 토글, 모바일은 backdrop). 네비게이션 시작 시 자동 닫힘. 자식 컴포넌트가 `inject` 해 접근.

### SdSidebar — `<sd-sidebar>`

```ts
toggle = computed(...); // 부모 컨테이너의 toggle 미러
```

- 좌측 고정 사이드바 영역. `SdSidebarContainer` 안에 두면 toggle 상태에 따라 슬라이드. 콘텐츠로 로고·메뉴·사용자를 투영.

### SdSidebarMenu — `<sd-sidebar-menu>`

```ts
menus = input<SdMenu[]>([]);
layout = input<"accordion" | "accordion-expanded" | "flat">();
getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
```

- 메뉴 트리를 사이드바 리스트로 렌더(`SdRouterLink` 연결). `layout` 미지정 시 루트 메뉴 3개 이하면 `flat`, 초과면 `accordion` 자동. `accordion-expanded`=accordion 과 동일한 클릭 토글 구조이되 모든 깊이 항목이 펼친 채로 시작(이후 클릭하면 접힘), 명시 지정 시에만 적용(자동 선택 대상 아님). `getMenuIsSelectedFn`=선택 강조 커스텀(기본은 현재 페이지 코드 매칭). `menus` 는 보통 `SdAppStructureProvider.usableMenus()`.

### SdSidebarUser — `<sd-sidebar-user>`

```ts
userMenu = input<SdSidebarUserMenu>();
// SdSidebarUserMenu = { icon?: string; title: string; menus: { title: string; onClick: () => Promise<void>|void }[] }
```

- 사이드바 하단 사용자 영역. 콘텐츠로 사용자 정보를 투영하고, `userMenu` 지정 시 접이식 메뉴(로그아웃 등) 표시. 각 menu 의 `onClick` 으로 동작.

## 탑바

### SdTopbarContainer — `<sd-topbar-container>`

```ts
// 입력 없음. flex-column 셸.
```

- 탑바 + 본문 세로 셸. 상단 `<sd-topbar>` + `flex-fill` 본문 구조로 사용(`sd-base-container` 가 page 모드에서 내부 사용).

### SdTopbar — `<sd-topbar>`

```ts
sidebarContainer = input<SdSidebarContainer>();
hasSidebar = computed(...);
```

- 상단바. 사이드바가 있으면(주입 또는 `sidebarContainer` 입력) 좌측 토글 버튼 자동 노출. 콘텐츠로 제목·액션을 투영.

### SdTopbarMenu — `<sd-topbar-menu>`

```ts
menus = input<SdMenu[]>([]);
getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
```

- 탑바에 드롭다운 형태로 메뉴 트리를 렌더. 루트 메뉴마다 드롭다운, 하위는 평면 리스트. 선택 강조는 사이드바 메뉴와 동일 규약.

### SdTopbarUser — `<sd-topbar-user>`

```ts
menus = input.required<SdTopbarUserMenu[]>();
// SdTopbarUserMenu = { title: string; onClick: () => void }
```

- 탑바 우측 사용자 드롭다운. 콘텐츠로 사용자 표시명을 투영, `menus` 항목 클릭 시 `onClick` 실행 후 드롭다운 닫힘.
