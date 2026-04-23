# `SdButton`

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

### 실사용 예

- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — 저장·등록 버튼 (type="submit", primary theme)
- [crud-list.md §11 확장 G: 엑셀 업로드/다운로드](../recipes/crud-list.md#11-확장-g-엑셀-업로드다운로드) — 엑셀 업로드·다운로드 버튼
- [crud-detail.md §5 확장 A: 편집/저장](../recipes/crud-detail.md#5-확장-a-편집저장) — 저장 버튼 (type="submit")
- [crud-detail.md §6 확장 B: 삭제/복구 토글](../recipes/crud-detail.md#6-확장-b-삭제복구-토글) — 삭제·복구 버튼 (danger/warning theme)
- [crud-detail.md §7 확장 C: modal 뷰](../recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 하단 바 확인·취소 버튼
- [crud-detail.md §8 확장 D: control 뷰](../recipes/crud-detail.md#8-확장-d-control-뷰) — control 상단 바 버튼

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
  selectedItems = model<T[]>([]);
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
| `selectedItems` | `T[]` | `[]` | 선택된 항목 객체 배열 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `required` | `boolean` | `false` | 필수 (지우기 버튼 숨김) |
| `inset` | `boolean` | `false` | 삽입 스타일 |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `selectMode` | `M` | `"single"` | 선택 모드 |
