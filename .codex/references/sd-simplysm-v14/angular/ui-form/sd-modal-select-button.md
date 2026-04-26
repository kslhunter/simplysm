# `SdModalSelectButton`

> **읽어야 하는 상황**: 모달을 열어 항목을 선택하는 버튼이 필요할 때. 공유 데이터 기반 선택은 [`SdSharedDataSelectButton`](../features/sd-shared-data-components.md), 드롭다운 선택은 [`SdSelect`](./sd-select.md) 참조.

모달을 열어 항목을 선택하는 버튼 컴포넌트. 선택된 값은 `value` model로 관리된다.

```typescript
@Component({ selector: "sd-modal-select-button", ... })
export class SdModalSelectButton<T extends object, K, M extends keyof SelectModeValue<K> = keyof SelectModeValue<K>>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `modal` | input (required) | `SdSelectModalInfo<SdSelectModal<T>>` | 모달 정보 |
| `value` | model | `SelectModeValue<K>[M] \| undefined` | 선택된 키 값 |
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
  selectedKeys: InputSignal<any[]>;
}
```

### `SdSelectModalInfo<T>`

```typescript
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<T, "selectMode" | "selectedKeys">
```

`selectMode`, `selectedKeys`를 제외한 나머지 inputs만 전달하면 된다.

## Usage

```html
<sd-modal-select-button
  [modal]="{ title: '고객 선택', type: CustomerSelectModal, inputs: {} }"
  [(value)]="selectedCustomerId"
>
  {{ selectedCustomerName() }}
</sd-modal-select-button>
```
