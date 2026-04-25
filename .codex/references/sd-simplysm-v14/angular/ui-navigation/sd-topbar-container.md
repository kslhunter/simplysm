# `SdTopbarContainer`

> **읽어야 하는 상황**: 탑바 레이아웃을 구성할 때.

탑바 컨테이너.

```typescript
@Component({ selector: "sd-topbar-container" })
class SdTopbarContainer { }
```

## Related Types

### `SdTopbar`

탑바 컴포넌트.

```typescript
@Component({ selector: "sd-topbar" })
class SdTopbar { }
```

### `SdTopbarMenu`

탑바 메뉴 항목.

```typescript
@Component({ selector: "sd-topbar-menu" })
class SdTopbarMenu {
  menus = input<SdMenu[]>([]);
  getMenuIsSelectedFn = input<(menu: SdMenu) => boolean>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `menus` | `SdMenu[]` | `[]` | 메뉴 항목 |
| `getMenuIsSelectedFn` | `((menu) => boolean) \| undefined` | `undefined` | 커스텀 메뉴 선택 여부 함수 |

### `SdTopbarUser`

탑바 사용자 영역 컴포넌트.

```typescript
@Component({ selector: "sd-topbar-user" })
class SdTopbarUser {
  menus = input.required<SdTopbarUserMenu[]>();
}
```

## Usage

### topbar 내부 슬롯 활용

```html
<sd-topbar-container>
  @if (viewType() === "page") {
    <sd-topbar>
      <h4>{{ viewTitle() }}</h4>
      @if (canEdit()) {
        <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()">
          <ng-icon [svg]="tablerDeviceFloppy" /> 저장 <small>(CTRL+S)</small>
        <$sd-button>
      }
    <$sd-topbar>
  }
  <!-- 메인 콘텐츠 -->
<$sd-topbar-container>
```

페이지/모달/control 뷰에서 **재사용**되는 화면은 topbar를 page 뷰에서만 렌더한다. `@if (viewType() === "page")` 조건을 사용한다.

## `SdPagination`

페이지네이션 컴포넌트.

```typescript
@Component({ selector: "sd-pagination" })
class SdPagination {
  currentPage = model(0);
  totalPageCount = input(0, { transform: numberAttribute });
  visiblePageCount = input(10, { transform: numberAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `currentPage` | `number` | `0` | 현재 페이지 (0-based, two-way) |
| `totalPageCount` | `number` | `0` | 총 페이지 수 |
| `visiblePageCount` | `number` | `10` | 한 번에 표시할 페이지 수 |
