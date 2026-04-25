# `SdCommandDirective`

> **읽어야 하는 상황**: 키보드 단축키(Ctrl+S 저장, Ctrl+Alt+L 새로고침 등)를 처리할 때.

키보드 단축키를 output 이벤트로 제공하는 디렉티브. `document` keydown을 감지하며, `shouldProcessCommandEvent()`로 최상위 모달만 이벤트 처리한다.

```typescript
@Directive({ selector: "[sdSaveCommand],[sdInsertCommand]" })
class SdCommandDirective {
  sdSaveCommand = output<KeyboardEvent>();    // Ctrl+S
  sdInsertCommand = output<KeyboardEvent>();  // Ctrl+Insert
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `sdSaveCommand` | output | `KeyboardEvent` | Ctrl+S 단축키 이벤트 |
| `sdInsertCommand` | output | `KeyboardEvent` | Ctrl+Insert 단축키 이벤트 |

## Usage

```html
<div
  (sdSaveCommand)="onSave($event)"
  (sdInsertCommand)="onInsert($event)"
></div>
```
