# @simplysm/angular — 레이아웃

앱 shell의 sidebar/topbar와 menu/user menu 컴포넌트 군이다. 메뉴 타입·선택 판정은 [routing-appstructure.md](./routing-appstructure.md)의 `SdMenu`/helper를 사용한다.

## sidebar

### `SdSidebarContainer` — `<sd-sidebar-container>`

```ts
class SdSidebarContainer {
  toggle: WritableSignal<boolean>;
  onBackdropClick(): void;
}
```

- `toggle` — sidebar 접힘/열림 상태. desktop에서는 true가 padding-left 0/sidebar hidden, mobile에서는 true가 backdrop 표시/sidebar shown.
- `onBackdropClick` — mobile backdrop click/Enter에서 `toggle` 을 반전한다.
- Router 연동 — optional Router가 있으면 `NavigationStart` 때 `toggle` 을 false로 돌린다.

### `SdSidebar` — `<sd-sidebar>`

```ts
class SdSidebar { toggle: Signal<boolean> }
```

- `toggle` — parent `SdSidebarContainer.toggle()` 을 그대로 읽는 computed. host `data-sd-toggle` 과 transform style에 쓰인다.
- 배치 — desktop은 absolute left sidebar, mobile은 기본 숨김이고 toggle true일 때 표시한다.

### `SdSidebarMenu` — `<sd-sidebar-menu>`

```ts
class SdSidebarMenu {
  menus: InputSignal<SdMenu[]>;
  layout: InputSignal<"accordion" | "accordion-expanded" | "flat" | undefined>;
  getMenuIsSelectedFn: InputSignal<((menu: SdMenu) => boolean) | undefined>;
}
```

- `menus` — 렌더링할 `SdMenu` tree.
- `layout` — `"accordion"` 은 접히는 root, `"accordion-expanded"` 는 children이 있는 항목을 처음부터 open, `"flat"` 은 root depth만 flat layout. 미지정이면 root menu 개수가 3개 이하일 때 `"flat"`, 아니면 `"accordion"`.
- `getMenuIsSelectedFn` — menu 선택 판정을 덮어쓸 함수. 없으면 full page code와 `menu.codeChain.join(".")` 를 비교한다.
- internal link — children/url 없는 leaf는 `getMenuRouterLinkOption(menu)` 를 `[sdRouterLink]` 로 전달한다.
- external link — `menu.url` 이 있으면 click에서 `window.open(menu.url, "_blank")`.

### `SdSidebarUser` / `SdSidebarUserMenu` — `<sd-sidebar-user>`

```ts
interface SdSidebarUserMenu {
  icon?: string;
  title: string;
  menus: { title: string; onClick: () => Promise<void> | void }[];
}
class SdSidebarUser {
  userMenu: InputSignal<SdSidebarUserMenu | undefined>;
  menuOpen: WritableSignal<boolean>;
}
```

- `userMenu.icon` — menu open button 앞에 표시할 icon 문자열.
- `userMenu.title` — user menu open button label.
- `userMenu.menus` — collapse 안에 렌더할 menu item 배열.
- `menus.title` — user menu item label.
- `menus.onClick` — item click 시 호출할 handler.
- `userMenu` — undefined면 projected user content만 표시하고 menu button/collapse는 렌더하지 않는다.
- `menuOpen` — collapse open 상태.

## topbar

### `SdTopbarContainer` — `<sd-topbar-container>`

```ts
class SdTopbarContainer {}
```

- 동작 — content를 column flex, height 100%로 감싸 topbar + body shell 구조를 만든다.

### `SdTopbar` — `<sd-topbar>`

```ts
class SdTopbar {
  sidebarContainer: InputSignal<SdSidebarContainer | undefined>;
  hasSidebar: Signal<boolean>;
  onToggleButtonClick(): void;
}
```

- `sidebarContainer` — toggle button이 조작할 container를 명시 주입할 때 쓴다.
- `hasSidebar` — input container 또는 DI로 찾은 `SdSidebarContainer` 가 있으면 true.
- `onToggleButtonClick` — 대상 container의 `toggle` 을 반전한다.
- button 표시 — `hasSidebar` 가 true면 menu icon link button을 렌더한다.

### `SdTopbarMenu` — `<sd-topbar-menu>`

```ts
class SdTopbarMenu {
  menus: InputSignal<SdMenu[]>;
  getMenuIsSelectedFn: InputSignal<((menu: SdMenu) => boolean) | undefined>;
}
```

- `menus` — root마다 dropdown button을 만드는 `SdMenu` 배열.
- `getMenuIsSelectedFn` — menu 선택 판정 override. 없으면 full page code 비교.
- internal link — leaf는 `getMenuRouterLinkOption(menu)` 를 `[sdRouterLink]` 로 전달한다.
- external link — `menu.url` 이 있으면 새 tab으로 연다.
- close 동작 — children 없는 item click 후 해당 dropdown `open` 을 false로 set한다.

### `SdTopbarUser` / `SdTopbarUserMenu` — `<sd-topbar-user>`

```ts
interface SdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
class SdTopbarUser {
  menus: InputSignal<SdTopbarUserMenu[]>;
}
```

- `menus` — required user dropdown item 배열.
- `menus.title` — dropdown item label.
- `menus.onClick` — item click handler. 호출 후 dropdown을 닫는다.
- projection — dropdown button 내부에 projected content를 표시한다.
