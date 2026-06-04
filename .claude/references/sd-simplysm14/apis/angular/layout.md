# @simplysm/angular — 레이아웃 셸 (사이드바·탑바)

앱 셸의 좌측 사이드바·상단바와 그 안의 메뉴/사용자 메뉴 컴포넌트 군. 앱 루트 레이아웃(`app.root` 등)에서 한 번 구성. 메뉴 항목 타입(`SdMenu`)·라우터 링크는 routing-appstructure.md 의 것을 사용.

## 사이드바

### SdSidebarContainer (`sd-sidebar-container`)

사이드바 + 본문을 감싸는 컨테이너. 데스크톱은 사이드바 폭만큼 좌패딩, 모바일은 오버레이. 라우팅 시작 시 자동으로 토글을 닫음(모바일 메뉴 닫힘).

- `toggle: WritableSignal<boolean>` — 사이드바 접힘(데스크톱) / 닫힘(모바일) 상태. `sd-topbar` 의 햄버거가 이걸 토글. 배경(backdrop) 클릭으로도 토글.
- 자식으로 `<sd-sidebar>` 와 본문을 둠.

### SdSidebar (`sd-sidebar`)

실제 사이드바 패널. 부모 `SdSidebarContainer.toggle` 에 따라 슬라이드 인/아웃.

- (입력 없음) 부모 컨테이너의 toggle 을 computed 로 반영. 내부에 `<sd-sidebar-user>`·`<sd-sidebar-menu>` 등을 배치.

### SdSidebarMenu (`sd-sidebar-menu`)

메뉴 트리를 리스트로 렌더(중첩, 라우터 링크/외부 URL).

- `menus: SdMenu[]` — 표시할 메뉴 트리(보통 `SdAppStructureProvider.usableMenus()`).
- `layout: "accordion"|"flat"` — 루트 레벨 레이아웃. 미지정 시 메뉴 3개 이하면 `"flat"`, 초과면 `"accordion"` 자동 선택.
- `getMenuIsSelectedFn: (menu: SdMenu) => boolean` — 선택 판정 커스텀(미지정 시 현재 페이지 코드 비교).
- 동작: leaf 메뉴는 `getMenuRouterLinkOption` 으로 라우팅, `url` 메뉴는 새 창.

### SdSidebarUser (`sd-sidebar-user`)

사이드바 상단 사용자 영역 + 접이식 사용자 메뉴.

- `userMenu: SdSidebarUserMenu` — `{ title: string; menus: { title: string; onClick: () => void }[] }`. `title` 클릭 시 메뉴 펼침, 각 메뉴 클릭 시 `onClick`. 로그아웃/설정 등.
- `<ng-content>` 로 사용자 이름/아바타 영역 배치.

## 탑바

### SdTopbarContainer (`sd-topbar-container`)

상단바 + 본문 세로 스택 컨테이너(상단 고정 + 본문 fill). `sd-base-container` 가 page 모드에서 내부적으로 사용.

### SdTopbar (`sd-topbar`)

상단바 본문. 사이드바가 있으면 좌측에 햄버거 토글 버튼 자동 표시.

- `sidebarContainer: SdSidebarContainer` — 토글 대상 사이드바 컨테이너(미지정 시 inject 로 자동 탐색). 둘 다 없으면 햄버거 미표시.
- `hasSidebar: Signal<boolean>` — 사이드바 존재 여부(햄버거 표시 기준).
- `<ng-content>` 로 제목·메뉴·사용자 영역 배치.

### SdTopbarMenu (`sd-topbar-menu`)

상단바 가로 메뉴(드롭다운 펼침).

- `menus: SdMenu[]` — 표시할 메뉴 트리. 각 루트 메뉴가 드롭다운 버튼이 되고 children 을 팝업 리스트로.
- `getMenuIsSelectedFn: (menu: SdMenu) => boolean` — 선택 판정 커스텀.
- leaf 클릭 시 라우팅 + 드롭다운 닫힘, `url` 메뉴는 새 창.

### SdTopbarUser (`sd-topbar-user`)

상단바 우측 사용자 드롭다운 메뉴.

- `menus: input.required<SdTopbarUserMenu[]>` — `SdTopbarUserMenu = { title: string; onClick: () => void }`. 각 항목 클릭 시 `onClick` 실행 후 드롭다운 닫힘.
- `<ng-content>` 로 트리거 버튼 라벨(사용자 이름) 배치.
