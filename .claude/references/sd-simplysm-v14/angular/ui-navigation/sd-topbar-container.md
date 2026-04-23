# `SdTopbarContainer`

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
        </sd-button>
      }
    </sd-topbar>
  }
  <!-- 메인 콘텐츠 -->
</sd-topbar-container>
```

페이지/모달/control 뷰에서 **재사용**되는 화면은 topbar를 page 뷰에서만 렌더한다. `@if (viewType() === "page")` 조건을 사용한다.

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](../recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — topbar + 타이틀 (조회 전용이라 버튼 없음)
- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — topbar 내 저장·등록 버튼 추가
- [crud-list.md §11 확장 G: 엑셀 업로드/다운로드](../recipes/crud-list.md#11-확장-g-엑셀-업로드다운로드) — topbar 내 엑셀 버튼 추가
- [crud-detail.md §3 최소 뼈대: 읽기 전용 상세 폼](../recipes/crud-detail.md#3-최소-뼈대-읽기-전용-상세-폼) — topbar 조건 없이 렌더 (page 뷰 전용)
- [crud-detail.md §5 확장 A: 편집/저장](../recipes/crud-detail.md#5-확장-a-편집저장) — topbar 내 저장 버튼 추가
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — `@if (viewType() === "page")` 조건부 렌더

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
