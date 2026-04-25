# `SdSidebarMenu`

> **읽어야 하는 상황**: 사이드바에 메뉴 트리를 렌더링할 때.

사이드바 메뉴 컴포넌트. `SdMenu[]` 트리를 받아 아코디언 또는 플랫 레이아웃으로 렌더링한다.

```typescript
@Component({ selector: "sd-sidebar-menu", ... })
export class SdSidebarMenu
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `menus` | input | `SdMenu[]` | 메뉴 트리 (기본값: `[]`) |
| `layout` | input | `"accordion" \| "flat" \| undefined` | 레이아웃. 미지정 시 메뉴 수 ≤ 3이면 `"flat"`, 초과이면 `"accordion"` |
| `getMenuIsSelectedFn` | input | `(menu: SdMenu) => boolean` | 메뉴 선택 여부 커스텀 함수 |

## Usage

```html
<sd-sidebar-menu [menus]="sdAppStructure.usableMenus()" />
```
