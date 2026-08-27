# @simplysm/angular — 레이아웃

앱 shell의 sidebar/topbar와 menu/user menu 컴포넌트 군임.
모두 standalone, OnPush, `ViewEncapsulation.None`.
메뉴 데이터 타입(`SdMenu`)과 선택 판정 helper는 [routing-appstructure.md](./routing-appstructure.md) 참조.

## 사이드바

### `SdSidebarContainer` (`sd-sidebar-container`)

```ts
class SdSidebarContainer {
  toggle: WritableSignal<boolean>; // default false (= 펼침/표시)
  onBackdropClick(): void;
}
```

sidebar + 본문을 감싸는 컨테이너.
`toggle` 이 단일 진리원임(input/model 아닌 plain signal, 영속화 없음).

- `toggle` — `false`(기본)=사이드바 표시, `true`=접힘. desktop은 `data-sd-toggle="true"` 시 본문 padding-left를 0으로 회수, mobile은 backdrop overlay 표시.
- 라우터 연동 — `Router` 주입 가능 시 매 `NavigationStart` 마다 `toggle.set(false)`(이동 시 펼침으로 리셋).
- `onBackdropClick` — mobile backdrop 클릭 시 `toggle` 반전.

### `SdSidebar` (`sd-sidebar`)

입력 없음.
부모 `SdSidebarContainer` 를 inject(없으면 throw).
`toggle` 을 거울 바인딩해 자기 `data-sd-toggle` 에 반영.
desktop은 `toggle` 시 `translateX(-100%)`(왼쪽으로 슬라이드 아웃), mobile은 기본 숨김, `toggle` 시 overlay로 슬라이드 인(의미가 desktop과 반대).
`<ng-content>` 1개.

### `SdSidebarMenu` (`sd-sidebar-menu`)

```ts
class SdSidebarMenu {
  menus: InputSignal<SdMenu[]>; // default []
  layout: InputSignal<"accordion" | "accordion-expanded" | "flat" | undefined>;
  expandedMenuCodes: ModelSignal<string[] | undefined>; // default undefined
  getMenuIsSelectedFn: InputSignal<((menu: SdMenu) => boolean) | undefined>;

  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  isAllCollapsed: Signal<boolean>;
  expandAll(): void;
  collapseAll(): void;
}
```

`menus` 데이터로 중첩 `sd-list` 메뉴를 렌더(content 투영 없음).
헤더(`MENU`) 오른쪽에 전체 펼치기, 전체 접기 버튼을 각각 렌더(`hasExpandable()` 일 때만).
트리는 일부만 펼쳐진 중간 상태가 흔해 다음 동작을 예측할 수 없으므로 토글 1개가 아니라 독립 동작 2개임.
무의미한 쪽 버튼은 비활성(`isAllExpanded` 면 펼치기, `isAllCollapsed` 면 접기).

- `menus` — `SdMenu[]` 메뉴 트리. `codeChain` 으로 routerLink, 선택 판정.
- `layout` — 미지정 시 top 메뉴 ≤3개면 `flat`, 아니면 `accordion` 자동 선택.
  - `"flat"` — depth-0 평면 헤더형.
  - `"accordion"` — 접기 가능, 접힌 상태 시작.
  - `"accordion-expanded"` — accordion + `expandedMenuCodes` 기본값을 하위 보유 메뉴 전체로 채움.
- `expandedMenuCodes` — 펼쳐진 메뉴 코드(`codeChain.join(".")`) 목록. 펼침 상태의 단일 진리원.
  - `undefined`(기본) — `layout` 이 정하는 기본 펼침 상태를 따름. `menus` 가 늦게 도착해도 적용됨.
  - 사용자가 토글하거나 호스트가 값을 세팅하면 그 값이 우선하며, 이후 `menus` 가 재계산돼도 유지됨(참조가 아니라 코드 기준).
  - 대상은 accordion 항목뿐임. `flat` 로 렌더되는 depth-0 그룹은 항상 펼쳐진 구조라 `hasExpandable`, `isAllExpanded`, `isAllCollapsed`, `expandAll`, `collapseAll` 판정에서 제외됨.
- `getMenuIsSelectedFn` — 선택 판정 커스텀 함수. 없으면 `fullPageCode === codeChain.join(".")`.

### `SdSidebarUser` (`sd-sidebar-user`)

```ts
class SdSidebarUser {
  userMenu: InputSignal<SdSidebarUserMenu | undefined>;
}
interface SdSidebarUserMenu {
  icon?: string;
  title: string;
  menus: { title: string; onClick: () => Promise<void> | void }[];
}
```

상단 영역(아바타/이름 등)을 `<ng-content>` 로 투영하고, `userMenu` 가 있으면 접이식 사용자 메뉴 버튼 + `sd-collapse` 리스트를 렌더.

- `userMenu` — `icon`(선택 아이콘), `title`(버튼 라벨), `menus`(각 `title` + `onClick` 콜백, async 허용). routerLink 없이 onClick만.

## 탑바

### `SdTopbarContainer` (`sd-topbar-container`)

입력 없음.
flex-column 전체 높이 래퍼 + `<ng-content>` 1개.

### `SdTopbar` (`sd-topbar`)

```ts
class SdTopbar {
  sidebarContainer: InputSignal<SdSidebarContainer | undefined>;
}
```

- `sidebarContainer` — 명시적으로 연결할 sidebar 컨테이너(DI로 못 닿을 때).
  - 주입 가능한 컨테이너도 함께 봄.
  - 둘 중 하나라도 있으면 햄버거 버튼을 렌더하고 클릭 시 그 컨테이너의 `toggle` 반전.
  - 이후 `<ng-content>`(타이틀/탑바 내용).

### `SdTopbarMenu` (`sd-topbar-menu`)

```ts
class SdTopbarMenu {
  menus: InputSignal<SdMenu[]>; // default []
  getMenuIsSelectedFn: InputSignal<((menu: SdMenu) => boolean) | undefined>;
}
```

각 top 메뉴를 `sd-dropdown` 트리거 버튼으로 렌더하고 children을 popup 안 중첩 `sd-list` 로 펼침(`layout` input 없음).
leaf 클릭 시 해당 dropdown 닫음, `url` 있으면 새 탭.
선택 판정 helper는 `SdSidebarMenu` 와 동일.

### `SdTopbarUser` (`sd-topbar-user`)

```ts
class SdTopbarUser {
  menus: InputSignal<SdTopbarUserMenu[]>;
} // required
interface SdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

`<ng-content>`(사용자 라벨/아바타)를 dropdown 트리거 버튼 안에 투영하고, `menus()` 를 popup 리스트로 렌더.
항목 클릭 시 `onClick()` 후 dropdown 닫음.

- `menus` — **required**. `SdTopbarUserMenu[]`. 각 `title` + `onClick`(동기 `() => void`, sidebar의 async 시그니처와 다름).
