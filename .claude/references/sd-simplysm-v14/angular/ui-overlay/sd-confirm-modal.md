# `SdConfirmModal`

범용 확인 모달. `SdModalContentDef<boolean>`을 구현한다.
메시지를 표시하고 확인/취소한다. 확인 시 `true` 반환, 취소 시 `undefined` 반환.

```typescript
@Component({ selector: "sd-confirm-modal", ... })
export class SdConfirmModal implements SdModalContentDef<boolean>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `message` | input (required) | `string` | 표시할 메시지 (HTML 허용) |
| `initialized` | property | `Signal<boolean>` | 항상 `true` (SdModalContentDef 요구사항) |
| `close` | output | `boolean \| undefined` | 확인: `true`, 취소: `undefined` |

## Usage

```typescript
const confirmed = await this._sdModal.showAsync({
  title: "삭제 확인",
  type: SdConfirmModal,
  inputs: { message: "정말 삭제하시겠습니까?" },
});
if (confirmed) {
  await this._delete();
}
```
