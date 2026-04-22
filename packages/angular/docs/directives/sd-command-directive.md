# `SdCommandDirective`

키보드 단축키를 output 이벤트로 제공하는 디렉티브. `document` keydown을 감지하며, `shouldProcessCommandEvent()`로 최상위 모달만 이벤트 처리한다.

```typescript
@Directive({ selector: "[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]" })
class SdCommandDirective {
  sdRefreshCommand = output<KeyboardEvent>(); // Ctrl+Alt+L
  sdSaveCommand = output<KeyboardEvent>();    // Ctrl+S
  sdInsertCommand = output<KeyboardEvent>();  // Ctrl+Insert
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `sdRefreshCommand` | output | `KeyboardEvent` | Ctrl+Alt+L 단축키 이벤트 |
| `sdSaveCommand` | output | `KeyboardEvent` | Ctrl+S 단축키 이벤트 |
| `sdInsertCommand` | output | `KeyboardEvent` | Ctrl+Insert 단축키 이벤트 |

## Usage

```html
<div
  (sdSaveCommand)="onSave($event)"
  (sdRefreshCommand)="onRefresh($event)"
  (sdInsertCommand)="onInsert($event)"
></div>
```
