# `SdAddressSearchModal`

> **읽어야 하는 상황**: Daum Postcode API로 주소를 검색하는 모달이 필요할 때.

Daum Postcode API를 사용한 주소 검색 모달. `SdModalContentDef<Address>`를 구현한다.

```typescript
@Component({ selector: "sd-address-search-modal" })
class SdAddressSearchModal implements SdModalContentDef<Address>, OnInit {
  close = output<Address>();
  initialized = signal(false);
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `close` | output | `Address` | 주소 선택 완료 시 발생 |
| `initialized` | signal | `boolean` | 초기화 완료 여부 |

## Related Types

### `Address`

```typescript
interface Address {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postNumber` | `string \| undefined` | 우편번호 |
| `address` | `string \| undefined` | 주소 |
| `buildingName` | `string \| undefined` | 건물명 |

## Usage

```typescript
const result = await this._sdModal.showAsync({
  title: "주소 검색",
  type: SdAddressSearchModal,
  inputs: {},
});
if (result != null) {
  this.data().address = result.address;
  mark(this.data);
}
```
