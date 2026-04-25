# `SdModalProvider`

> **읽어야 하는 상황**: 코드에서 프로그래밍 방식으로 모달을 열고 결과를 받아야 할 때. 단순 확인/취소는 [`SdConfirmModal`](../ui-overlay$sd-confirm-modal.md), 텍스트 입력은 [`SdPromptModal`](../ui-overlay$sd-prompt-modal.md) 참조.

프로그래밍 방식으로 모달을 생성하는 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdModalProvider {
  modalCount = signal(0);

  async showAsync<T extends SdModalContentDef<any>>(
    modal: SdModalInfo<T>,
    options?: SdModalOptions,
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `modalCount` | property | `WritableSignal<number>` | 현재 열린 모달 수 |
| `showAsync(modal, options?)` | method | `(SdModalInfo<T>, SdModalOptions?) => Promise<...>` | 모달 생성 후 close 결과를 Promise로 반환 |

## Usage

### 선택 모달 호출

```typescript
private readonly _sdModal = inject(SdModalProvider);

const result = await this._sdModal.showAsync({
  title: "고객 선택",
  type: CustomerList,
  inputs: {
    selectMode: "multi",
    selectedItemKeys: this.selectedCustomerIds(),
  },
});
if (result != null) {
  // result.selectedItemKeys: any[]
  // result.selectedItems: ICustomer[]
}
```

### 편집 모달 호출

```typescript
private async _editItem(item?: ICustomer): Promise<void> {
  const r = await this._sdModal.showAsync({
    title: item == null ? "고객 등록" : "고객 수정",
    type: CustomerEditModal,
    inputs: { itemId: item?.id },
  });
  if (r != null) await this._refresh();
}
```

### 조회 전용 modal 호출

```typescript
await this._sdModal.showAsync({
  title: "고객 주문 이력",
  type: CustomerOrderHistoryModal,
  inputs: { customerId: 123 },
});
// 반환값 미사용 — 닫기는 SdModal 기본 "X" 버튼
```
