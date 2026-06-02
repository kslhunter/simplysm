# @simplysm/angular — 레이아웃(사이드바·탑바)

앱 화면 셸을 구성하는 사이드바/탑바 컨테이너·메뉴·사용자 메뉴. 사이드바는 모바일에서 백드롭+슬라이드, 탑바는 사이드바 토글 버튼을 자동 제공. 메뉴 입력은 `SdMenu[]`(라우팅·앱구조 군 참조)이며 `sdRouterLink`/선택표시가 내장됨.

## SdSidebarContainer

`<sd-sidebar-container>` — 사이드바 + 본문 레이아웃 컨테이너. 본문에 좌측 패딩(`--sidebar-width`)을 주고, 모바일에서는 백드롭 표시. 라우터 내비게이션 시작 시 자동으로 사이드바를 닫음(`toggle` 신호 보유). input 없음.

## SdSidebar

`<sd-sidebar>` — 실제 사이드바 패널. 부모 `SdSidebarContainer.toggle` 을 따라 슬라이드 표시/숨김. 콘텐츠는 투영. input 없음.

## SdSidebarMenu

`<sd-sidebar-menu>` — 사이드바 메뉴 트리.

- `menus = input<SdMenu[]>([])` — 메뉴 트리. `SdAppStructureProvider.usableMenus()` 결과를 주로 넣음.
- `layout: "accordion"|"flat"` — 루트 메뉴 레이아웃. 미지정 시 메뉴 3개 이하면 flat, 초과면 accordion 자동.
- `getMenuIsSelectedFn?: (menu) => boolean` — 선택 판정 커스텀(미지정 시 현재 페이지코드와 codeChain 비교).

각 메뉴 항목은 `sdRouterLink` 로 `/home/{codeChain}` 이동, `url` 있으면 새 탭, 자식 있으면 하위 트리.

## SdSidebarUser

`<sd-sidebar-user>` — 사이드바 상단 사용자 영역 + 접이식 메뉴.

- `userMenu = input<SdSidebarUserMenu>()` — `{ title: string; menus: { title; onClick }[] }`. title 클릭 시 메뉴 펼침, 각 항목 클릭 시 `onClick` 실행.
- 콘텐츠 투영부에 사용자 정보 표시.

## SdTopbarContainer

`<sd-topbar-container>` — 탑바 + 본문 세로 레이아웃 컨테이너. input 없음. `<sd-topbar>` 와 본문을 자식으로 둠.

## SdTopbar

`<sd-topbar>` — 상단 바. 사이드바 컨테이너가 있으면 좌측에 메뉴 토글 버튼 자동 표시.

- `sidebarContainer = input<SdSidebarContainer>()` — 토글 대상 사이드바. 미지정 시 inject 된 부모 `SdSidebarContainer` 사용. 둘 중 하나라도 있으면 토글 버튼 노출.
- 콘텐츠(제목·액션)는 투영.

## SdTopbarMenu

`<sd-topbar-menu>` — 탑바 가로 메뉴(각 루트 메뉴가 드롭다운).

- `menus = input<SdMenu[]>([])` — 메뉴 트리.
- `getMenuIsSelectedFn?: (menu) => boolean` — 선택 판정 커스텀.

리프 메뉴 클릭 시 드롭다운 닫힘, `url` 있으면 새 탭.

## SdTopbarUser

`<sd-topbar-user>` — 탑바 우측 사용자 드롭다운 메뉴.

- `menus = input.required<SdTopbarUserMenu[]>()` — `{ title: string; onClick: () => void }[]`. 항목 클릭 시 `onClick` 실행 후 드롭다운 닫힘.
- 트리거 라벨(사용자명 등)은 콘텐츠 투영.
