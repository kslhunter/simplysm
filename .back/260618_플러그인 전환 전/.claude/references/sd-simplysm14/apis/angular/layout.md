# @simplysm/angular — 레이아웃(사이드바·탑바)

앱 셸의 좌측 사이드바·상단바와 그 안의 메뉴/사용자 메뉴 컴포넌트 군. 앱 루트 레이아웃에서 한 번 구성. 메뉴 항목 타입(`SdMenu`)·라우터 링크는 [routing-appstructure.md](./routing-appstructure.md) 의 것을 사용.

## 사이드바

### `SdSidebarContainer` — `<sd-sidebar-container>`

사이드바 + 본문을 감싸는 컨테이너.

- input 없음.
- `toggle: WritableSignal<boolean>` (초기 false) — true 면 사이드바 접힘(컨테이너 좌패딩 0); 모바일에선 backdrop 표시. 라우터 있으면 `NavigationStart` 마다 `false` 로 리셋(라우트 전환 시 자동 닫힘).
- `onBackdropClick(): void` — `toggle` 반전.

### `SdSidebar` — `<sd-sidebar>`

- input 없음. `toggle: Signal<boolean>` — 부모 컨테이너 `toggle` 미러(슬라이드 transform 구동).

### `SdSidebarMenu` — `<sd-sidebar-menu>`

- `menus: SdMenu[]` (기본 `[]`) — 메뉴 트리.
- `layout: "accordion"|"accordion-expanded"|"flat"|undefined` — `"flat"` = 최상위 평면; `"accordion"` = 접힌 아코디언; `"accordion-expanded"` = 전체 펼친 아코디언; `undefined` = 자동(`menus.length <= 3` 이면 flat, 아니면 accordion).
- `getMenuIsSelectedFn: (menu: SdMenu) => boolean` — 커스텀 선택 판정(미지정 시 fullPageCode 비교).

### `SdSidebarUser` — `<sd-sidebar-user>`

- `userMenu: SdSidebarUserMenu | undefined` — 설정 시 투영 콘텐츠 아래에 접이식 사용자 메뉴 버튼.
- `SdSidebarUserMenu` = `{ icon?: string; title: string; menus: { title: string; onClick: () => Promise<void> | void }[] }`.

## 탑바

### `SdTopbarContainer` — `<sd-topbar-container>`

탑바 + 본문 래퍼. input/메서드 없음.

### `SdTopbar` — `<sd-topbar>`

- `sidebarContainer: SdSidebarContainer | undefined` — 토글할 컨테이너(주입된 것 override). 사이드바 있으면 햄버거 토글 버튼(`tablerMenu2`) 표시.

### `SdTopbarMenu` — `<sd-topbar-menu>`

- `menus: SdMenu[]` (기본 `[]`) — 각 최상위 메뉴를 드롭다운으로, 자식은 팝업 내 중첩 리스트로.
- `getMenuIsSelectedFn: (menu: SdMenu) => boolean` — 커스텀 선택 판정.

### `SdTopbarUser` — `<sd-topbar-user>`

- `menus: input.required<SdTopbarUserMenu[]>` — 드롭다운 안 리스트 항목. 투영 콘텐츠가 트리거 라벨.
- `SdTopbarUserMenu` = `{ title: string; onClick: () => void }`.

```html
<sd-sidebar-container>
  <sd-sidebar>
    <sd-sidebar-menu [menus]="menus()" />
    <sd-sidebar-user [userMenu]="userMenu" />
  </sd-sidebar>
  <sd-topbar-container>
    <sd-topbar>
      <sd-topbar-user [menus]="userMenus">{{ userName() }}</sd-topbar-user>
    </sd-topbar>
    <router-outlet />
  </sd-topbar-container>
</sd-sidebar-container>
```
