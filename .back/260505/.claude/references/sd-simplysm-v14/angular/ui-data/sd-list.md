# `SdList`

> **읽어야 하는 상황**: 리스트 형태로 데이터를 표시할 때. 스프레드시트 형태는 [`SdSheet`](./sd-sheet.md) 참조.

리스트 컴포넌트.

```typescript
@Component({ selector: "sd-list" })
class SdList {
  inset = input(false, { transform: booleanAttribute });
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `inset` | input | `boolean` | `false` | 삽입 스타일 (테두리 없음) |

## Related Types

### `SdListItem`

리스트 항목 컴포넌트. 접기/펼치기 자식 리스트를 지원한다.

```typescript
@Component({ selector: "sd-list-item" })
class SdListItem {
  open = model(false);
  selected = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `open` | `boolean` | `false` | 자식 리스트 펼침 (two-way) |
| `selected` | `boolean` | `false` | 선택 상태 |
| `readonly` | `boolean` | `false` | 읽기 전용 |
