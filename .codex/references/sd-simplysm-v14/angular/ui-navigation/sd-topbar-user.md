# `SdTopbarUser`

> **읽어야 하는 상황**: 탑바에 사용자 정보와 드롭다운 메뉴를 표시할 때.

탑바 사용자 영역 컴포넌트. 사용자 이름을 버튼으로 표시하고, 클릭 시 드롭다운 메뉴를 제공한다.

```typescript
@Component({ selector: "sd-topbar-user", ... })
export class SdTopbarUser
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `menus` | input (required) | `SdTopbarUserMenu[]` | 드롭다운 메뉴 항목 목록 |

## Related Types

### `SdTopbarUserMenu`

```typescript
interface SdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 항목 텍스트 |
| `onClick` | `() => void` | 클릭 핸들러 |

## Usage

```html
<sd-topbar-user [menus]="[{ title: '내 정보', onClick: goToProfile }, { title: '로그아웃', onClick: logout }]">
  홍길동
<$sd-topbar-user>
```
