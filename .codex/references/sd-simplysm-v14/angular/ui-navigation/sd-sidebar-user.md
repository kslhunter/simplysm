# `SdSidebarUser`

> **읽어야 하는 상황**: 사이드바 하단에 사용자 정보와 드롭다운 메뉴를 표시할 때.

사이드바 하단 사용자 영역 컴포넌트. 사용자 정보를 표시하고, 선택적으로 드롭다운 메뉴를 제공한다.

```typescript
@Component({ selector: "sd-sidebar-user", ... })
export class SdSidebarUser
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `userMenu` | input | `SdSidebarUserMenu \| undefined` | 사용자 메뉴 정보. `title`이 있으면 메뉴 버튼 표시 |

## Related Types

### `SdSidebarUserMenu`

```typescript
interface SdSidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 버튼 라벨 |
| `menus` | `{ title: string; onClick: () => void }[]` | 드롭다운 메뉴 항목 목록 |

## Usage

```html
<sd-sidebar-user
  [userMenu]="{ title: '홍길동', menus: [{ title: '로그아웃', onClick: logout }] }"
>
  <span>홍길동</span>
<$sd-sidebar-user>
```
