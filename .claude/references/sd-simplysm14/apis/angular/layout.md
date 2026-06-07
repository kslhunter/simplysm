# @simplysm/angular — 레이아웃(사이드바·탑바)

앱 셸의 좌측 사이드바·상단바와 그 안의 메뉴/사용자 메뉴 컴포넌트 군. 앱 루트 레이아웃(`app.root` 등)에서 한 번 구성. 메뉴 항목 타입(`SdMenu`)·라우터 링크는 routing-appstructure.md 의 것을 사용.

## 사이드바

### SdSidebarContainer — `sd-sidebar-container`
사이드바 + 본문을 감싸는 컨테이너. 토글 시 본문 패딩을 조정하고 모바일에서 backdrop 표시. 라우팅 시작 시 자동 닫힘. 입력 없음(내부 `toggle` 상태 보유).

### SdSidebar — `sd-sidebar`
실제 사이드바 패널. 부모 컨테이너의 `toggle` 을 따라 슬라이드. 입력 없음. 자식으로 메뉴/유저 메뉴 배치.

### SdSidebarMenu — `sd-sidebar-menu`
메뉴 트리를 리스트로 렌더.
- `menus: input<SdMenu[]>` — 표시할 메뉴 트리(보통 `appStructure.usableMenus()`).
- `layout: "accordion"|"flat"` — 펼침 방식. 미지정 시 루트 메뉴 3개 이하면 `"flat"`, 초과면 `"accordion"` 자동.
- `getMenuIsSelectedFn: (menu) => boolean` — 선택 판정 커스텀(미지정 시 현재 페이지 코드 일치).

### SdSidebarUser — `sd-sidebar-user`
사이드바 상단 사용자 영역(이름 + 펼침 메뉴).
- `userMenu: input<SdSidebarUserMenu>` — `{ icon?, title, menus: { title, onClick }[] }`. `title` 이 사용자명, `menus` 가 펼침 항목(로그아웃 등).

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-user [userMenu]="{ title: userName(), menus: [{ title: '로그아웃', onClick: logout }] }" />
    <sd-sidebar-menu [menus]="menus()" />
  </sd-sidebar>
  <router-outlet />
</sd-sidebar-container>
```

## 탑바

### SdTopbarContainer — `sd-topbar-container`
탑바 + 본문 세로 컨테이너. 입력 없음. (`sd-base-container` 가 page 모드에서 내부적으로 사용.)

### SdTopbar — `sd-topbar`
상단바. 사이드바 토글 버튼 + 타이틀/명령 슬롯.
- `sidebarContainer: input<SdSidebarContainer>` — 토글 대상 사이드바 컨테이너(미지정 시 inject 로 상위 컨테이너 사용). 둘 중 하나라도 있으면 토글 버튼 노출.

### SdTopbarMenu — `sd-topbar-menu`
상단 가로 메뉴.
- `menus: input<SdMenu[]>` — 메뉴 항목.
- `getMenuIsSelectedFn: (menu) => boolean` — 선택 판정 커스텀.

### SdTopbarUser — `sd-topbar-user`
상단 우측 사용자 드롭다운.
- `menus: input.required<SdTopbarUserMenu[]>` — `{ title, onClick }[]`. 클릭 시 `onClick` 실행 후 드롭다운 닫힘.

### 타입
- `SdSidebarUserMenu` — `{ icon?: string; title: string; menus: { title: string; onClick: () => Promise<void>|void }[] }`.
- `SdTopbarUserMenu` — `{ title: string; onClick: () => void }`.
