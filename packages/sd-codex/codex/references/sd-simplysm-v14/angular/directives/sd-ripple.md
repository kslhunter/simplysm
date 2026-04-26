# `SdRipple`

> **읽어야 하는 상황**: 호스트 요소에 리플(물결) 효과를 적용할 때.

호스트 요소에 리플 효과를 추가하는 디렉티브.

```typescript
@Directive({ selector: "[sdRipple]" })
class SdRipple {
  enabled = input.required({ alias: "sdRipple", transform: booleanAttribute });
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `enabled` (`sdRipple`) | input (required) | `boolean` | 리플 효과 활성화 여부 |

## Usage

```html
<div [sdRipple]="true">리플 효과 있음</div>
<div sdRipple>리플 효과 있음 (boolean attribute)</div>
```
