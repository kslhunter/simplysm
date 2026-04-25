# `SdPromptModal`

> **읽어야 하는 상황**: 사용자로부터 텍스트를 입력받는 대화상자가 필요할 때. 확인/취소만 필요하면 [`SdConfirmModal`](.$sd-confirm-modal.md) 참조.

범용 프롬프트 입력 모달. `SdModalContentDef<string>`을 구현한다.
메시지를 표시하고 텍스트 입력 후 확인/취소한다. 확인 시 입력값 반환, 취소 시 `undefined` 반환.

```typescript
@Component({ selector: "sd-prompt-modal", ... })
export class SdPromptModal implements SdModalContentDef<string>
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `message` | input (required) | `string` | 표시할 메시지 (HTML 허용) |
| `initialized` | property | `Signal<boolean>` | 항상 `true` (SdModalContentDef 요구사항) |
| `close` | output | `string \| undefined` | 확인: 입력값, 취소: `undefined` |

## Usage

```typescript
const name = await this._sdModal.showAsync({
  title: "이름 입력",
  type: SdPromptModal,
  inputs: { message: "새 항목의 이름을 입력하세요." },
});
if (name != null) {
  // 입력한 이름 사용
}
```
