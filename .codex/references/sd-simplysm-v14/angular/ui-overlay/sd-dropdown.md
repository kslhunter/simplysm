# `SdDropdown`

> **읽어야 하는 상황**: 클릭이나 키보드로 드롭다운 팝업을 열어 추가 콘텐츠를 표시할 때.

드롭다운 트리거 컴포넌트. 클릭 또는 키보드로 `SdDropdownPopup`을 열고 닫는다.

```typescript
@Component({ selector: "sd-dropdown", ... })
export class SdDropdown
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `open` | model | `boolean` | 팝업 열림 상태 (기본값: `false`) |
| `disabled` | input | `boolean` | 비활성화 (기본값: `false`) |

## Related Types

### `SdDropdownPopup`

```typescript
@Component({ selector: "sd-dropdown-popup", ... })
export class SdDropdownPopup
```

드롭다운 팝업 영역. `SdDropdown` 내부에서만 사용한다.

## Usage

```html
<sd-dropdown>
  <sd-button>메뉴 열기<$sd-button>
  <sd-dropdown-popup>
    <sd-list>
      <sd-list-item (click)="onAction1()">동작 1<$sd-list-item>
      <sd-list-item (click)="onAction2()">동작 2<$sd-list-item>
    <$sd-list>
  <$sd-dropdown-popup>
<$sd-dropdown>
```
