# `SdTopbarMenu`

> **읽어야 하는 상황**: 탑바에 드롭다운 메뉴를 배치할 때.

탑바 메뉴 컴포넌트. `SdMenu[]` 트리를 드롭다운 방식으로 렌더링한다.

```typescript
@Component({ selector: "sd-topbar-menu", ... })
export class SdTopbarMenu
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `menus` | input | `SdMenu[]` | 메뉴 트리 (기본값: `[]`) |
| `getMenuIsSelectedFn` | input | `(menu: SdMenu) => boolean \| undefined` | 메뉴 선택 여부 커스텀 함수 |

## Usage

```html
<sd-topbar>
  <sd-topbar-menu [menus]="sdAppStructure.usableMenus()" />
</sd-topbar>
```
