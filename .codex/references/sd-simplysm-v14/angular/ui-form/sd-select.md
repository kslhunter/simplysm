# `SdSelect`

> **읽어야 하는 상황**: 드롭다운으로 항목을 선택할 때 (single/multi). 공유 데이터에서 선택은 [`SdSharedDataSelect`](.$sd-shared-data-select.md), 모달에서 선택은 [`SdModalSelectButton`](.$sd-modal-select-button.md) 참조.

드롭다운 선택 컴포넌트. single/multi 모드를 지원한다.

```typescript
@Component({ selector: "sd-select" })
class SdSelect<T, M extends keyof SelectModeValue<T>> {
  selectMode = input("single" as M);
  value = model<SelectModeValue<any>[M]>();
  placeholder = input<string>();
  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  required = input(false, { transform: booleanAttribute });
  hideSelectAll = input(false, { transform: booleanAttribute });
  multiSelectionDisplayDirection = input<"vertical">();
  items = input<T[]>();
  getChildrenFn = input<(item: T) => T[] | undefined>();
  contentClass = input<string>();
  contentStyle = input<string>();
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `selectMode` | input | `M` | `"single"` | 선택 모드 |
| `value` | model | `SelectModeValue<any>[M]` | - | 선택된 값 (two-way) |
| `placeholder` | input | `string \| undefined` | `undefined` | 플레이스홀더 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
| `inline` | input | `boolean` | `false` | 인라인 표시 |
| `inset` | input | `boolean` | `false` | 삽입 스타일 |
| `size` | input | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `required` | input | `boolean` | `false` | 필수 |
| `hideSelectAll` | input | `boolean` | `false` | multi 모드에서 전체 선택 숨김 |
| `multiSelectionDisplayDirection` | input | `"vertical" \| undefined` | `undefined` | multi 모드 표시 방향 |
| `items` | input | `T[] \| undefined` | `undefined` | 항목 배열 |
| `getChildrenFn` | input | `((item) => T[] \| undefined) \| undefined` | `undefined` | 트리 구조 자식 함수 |
| `contentClass` | input | `string \| undefined` | `undefined` | 트리거 영역 CSS 클래스 |
| `contentStyle` | input | `string \| undefined` | `undefined` | 트리거 영역 인라인 스타일 |

**스타일 적용**: `contentClass`/`contentStyle`은 트리거 영역(선택값 텍스트와 드롭다운 화살표가 함께 놓인 박스)에만 적용된다.

## Related Types

### `SdSelectItem`

드롭다운 선택 항목.

```typescript
@Component({ selector: "sd-select-item" })
class SdSelectItem<T> {
  value = input.required<T>();
  disabled = input(false, { transform: booleanAttribute });
  hidden = input(false, { transform: booleanAttribute });
}
```

### `SdSelectButton`

버튼 스타일 선택 컴포넌트.

```typescript
@Component({ selector: "sd-select-button" })
class SdSelectButton<T> { }
```
