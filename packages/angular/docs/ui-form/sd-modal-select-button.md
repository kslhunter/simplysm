# `SdModalSelectButton`

모달을 열어 항목을 선택하는 버튼 컴포넌트. 선택된 값은 `value`와 `selectedItems` model로 관리된다.

```typescript
@Component({ selector: "sd-modal-select-button", ... })
export class SdModalSelectButton<T extends object, K, M extends keyof SelectModeValue<K> = keyof SelectModeValue<K>>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `modal` | input (required) | `SdSelectModalInfo<SdSelectModal<T>>` | 모달 정보 |
| `value` | model | `SelectModeValue<K>[M] \| undefined` | 선택된 키 값 |
| `selectedItems` | model | `T[]` | 선택된 항목 배열 (기본값: `[]`) |
| `disabled` | input | `boolean` | 비활성화 여부 (기본값: `false`) |
| `required` | input | `boolean` | 필수 여부 (기본값: `false`) |
| `inset` | input | `boolean` | 인셋 스타일 (기본값: `false`) |
| `size` | input | `"sm" \| "lg" \| undefined` | 크기 |
| `selectMode` | input | `M` | 선택 모드 (기본값: `"single"`) |
| `modalOptions` | input | `SdModalOptions \| undefined` | 모달 옵션 |
| `searchIcon` | input | `string` | 검색 버튼 아이콘 SVG (기본값: `tablerSearch`) |

## Related Types

### `SdSelectModal<T>`

```typescript
interface SdSelectModal<T> extends SdModalContentDef<SelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

### `SdSelectModalInfo<T>`

```typescript
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<T, "selectMode" | "selectedItemKeys">
```

`selectMode`, `selectedItemKeys`를 제외한 나머지 inputs만 전달하면 된다.

## Usage

```html
<sd-modal-select-button
  [modal]="{ title: '고객 선택', type: CustomerSelectModal, inputs: {} }"
  [(value)]="selectedCustomerId"
  [(selectedItems)]="selectedCustomers"
>
  {{ selectedCustomers()[0]?.name }}
</sd-modal-select-button>
```
