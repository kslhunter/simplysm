# `SdSelect`

> **읽어야 하는 상황**: 드롭다운으로 항목을 선택할 때 (single/multi). 공유 데이터에서 선택은 [`SdSharedDataSelect`](./sd-shared-data-select.md), 모달에서 선택은 [`SdModalSelectButton`](./sd-modal-select-button.md) 참조.

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

## 빈 값(`undefined`) 항목 표시 권장 패턴

`SdSelect`에서 `[value]="undefined"` 항목은 일반 항목과 시각적으로 구분되도록 라벨을 회색으로 처리한다. 사용자가 "값 없음"을 즉시 인지하고 의미 있는 값과 혼동하지 않도록 한다.

```html
<sd-select [(value)]="item.weekOffset" (valueChange)="mark(items)">
  <sd-select-item [value]="undefined">
    <span class="tx-theme-gray-default">미지정</span>
  </sd-select-item>
  <sd-select-item [value]="0">+0주</sd-select-item>
  <sd-select-item [value]="1">+1주</sd-select-item>
  <sd-select-item [value]="2">+2주</sd-select-item>
</sd-select>
```

- `tx-theme-gray-default`은 `@simplysm/angular`의 회색 텍스트 토큰이다.
- 본 패턴은 **single 모드 한정**이다 — 필터의 "전체"(모든 옵션 포함), nullable 컬럼의 "미지정" 등 single 모드의 빈 값 라벨에 적용한다.
- multi 모드는 `hideSelectAll` 옵션으로 "전체 선택"이 자체 제공되므로 별도 `[value]="undefined"` 항목을 두지 않는다.
- `placeholder` 만으로는 사용자가 한 번 값을 선택한 뒤 빈 값으로 복귀할 수 없으므로, `[value]="undefined"` 항목을 명시하고 라벨에 회색을 적용하는 것이 권장 패턴이다.

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
