# `SdButton`

> **읽어야 하는 상황**: 클릭 가능한 버튼을 배치할 때. 텍스트 내 인라인 클릭 요소는 [`SdAnchor`](./sd-anchor.md), 콘텐츠 + 추가 동작 버튼은 [`SdAdditionalButton`](./sd-additional-button.md) 참조.

버튼 컴포넌트.

```typescript
@Component({ selector: "sd-button" })
class SdButton {
  type = input<"button" | "submit">("button");
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray" | "link" | "link-primary" | "link-secondary" | "link-info" | "link-success" | "link-warning" | "link-danger" | "link-gray" | "link-blue-gray" | "link-rev">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  disabled = input(false, { transform: booleanAttribute });
  buttonStyle = input<string>();
  buttonClass = input<string>();
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `type` | input | `"button" \| "submit"` | `"button"` | 버튼 HTML 타입 |
| `theme` | input | `string \| undefined` | `undefined` | 테마 색상 |
| `inline` | input | `boolean` | `false` | 인라인 표시 |
| `inset` | input | `boolean` | `false` | 테두리 없는 삽입 스타일 |
| `size` | input | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
| `buttonStyle` | input | `string \| undefined` | `undefined` | 버튼 인라인 스타일 |
| `buttonClass` | input | `string \| undefined` | `undefined` | 버튼 CSS 클래스 |

**스타일 적용**: 시각적 스타일은 내부 `<button>`에 적용되므로 `buttonClass`/`buttonStyle`을 사용한다. 호스트(`<sd-button>`)에 직접 `class`/`style`을 줘도 버튼 외형은 변경되지 않는다.

## Related Types

### `SdAnchor`

앵커(인라인 버튼) 컴포넌트. 텍스트 내 클릭 가능 요소.

```typescript
@Component({ selector: "sd-anchor" })
class SdAnchor {
  disabled = input(false, { transform: booleanAttribute });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">("primary");
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `disabled` | `boolean` | `false` | 비활성화 |
| `theme` | `string` | `"primary"` | 테마 색상 |

### `SdAdditionalButton`

추가 동작 버튼. 드롭다운 포함.

```typescript
@Component({ selector: "sd-additional-button" })
class SdAdditionalButton {
  size = input<"sm" | "lg">();
  inset = input(false, { transform: booleanAttribute });
}
```

### `SdModalSelectButton`

모달을 열어 선택하는 버튼 컴포넌트.

```typescript
@Component({ selector: "sd-modal-select-button" })
class SdModalSelectButton<T extends object, K, M extends keyof SelectModeValue<K>> {
  modal = input.required<SdSelectModalInfo<SdSelectModal<T>>>();
  value = model<SelectModeValue<K>[M]>();
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<M>("single" as M);
  modalOptions = input<SdModalOptions>();
  searchIcon = input(tablerSearch);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `modal` | `SdSelectModalInfo<...>` | required | 모달 정보 |
| `value` | `SelectModeValue<K>[M]` | - | 선택된 값 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `required` | `boolean` | `false` | 필수 (지우기 버튼 숨김) |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `selectMode` | `M` | `"single"` | 선택 모드 |
