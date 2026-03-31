# Feature 1 타입 추론 복원

## 참조 자료

### 원본 (v12)
- `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select.control.ts` — TSelectModeValue, SdSelectControl
- `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\button\sd-modal-select-button.control.ts` — SdModalSelectButtonControl
- `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\modal\sd-modal.provider.ts` — ISdModal, ISdModalInfo
- `D:\workspaces-12\simplysm\packages\sd-angular\src\features\data-view\sd-data-select-button.control.ts` — AbsSdDataSelectButton, ISdSelectModal, TSdSelectModalInfo, ISelectModalOutputResult
- `D:\workspaces-12\simplysm\packages\sd-angular\src\features\data-view\sd-data-sheet.control.ts` — AbsSdDataSheet
- `D:\workspaces-12\simplysm\packages\sd-angular\src\features\shared-data\sd-shared-data-select-button.control.ts`
- `D:\workspaces-12\simplysm\packages\sd-angular\src\features\shared-data\sd-shared-data-select.control.ts`
- `D:\workspaces-12\simplysm\packages\sd-angular\src\features\shared-data\sd-shared-data-select-list.control.ts`

### 마이그레이션 대상 (v14)
- `packages/angular/src/ui/form/select/sd-select.control.ts`
- `packages/angular/src/ui/form/button/sd-modal-select-button.control.ts`
- `packages/angular/src/ui/overlay/modal/sd-modal.provider.ts`
- `packages/angular/src/features/data-view/sd-data-select-button.control.ts`
- `packages/angular/src/features/data-view/sd-data-sheet.control.ts`
- `packages/angular/src/features/shared-data/sd-shared-data-select-button.control.ts`
- `packages/angular/src/features/shared-data/sd-shared-data-select.control.ts`
- `packages/angular/src/features/shared-data/sd-shared-data-select-list.control.ts`
- `packages/angular/src/core/utils/setups/setupCloserWhenSingleSelectionChange.ts`

### 핵심 v12 타입 정의

```typescript
// TSelectModeValue — object 타입, M 인덱싱으로 컴파일타임 타입 추론
type TSelectModeValue<T> = { multi: T[]; single: T };

// ISdModalInfo — X 제네릭으로 추가 제외 키 지정
interface ISdModalInfo<T extends ISdModal<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: Omit<TDirectiveInputSignals<T>, X>;
}

// ISdSelectModal — T = Item 타입, key는 any[]
interface ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}

// ISelectModalOutputResult — T = Item 타입
interface ISelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}

// TSdSelectModalInfo — ISdModalInfo의 X로 추가 제외
type TSdSelectModalInfo<T extends ISdSelectModal<any>> = ISdModalInfo<T, "selectMode" | "selectedItemKeys">;
```

### 핵심 v12 컴포넌트 시그니처

```typescript
// SdSelectControl — M, T 두 제네릭
class SdSelectControl<M extends "single" | "multi", T> {
  value = model<TSelectModeValue<any>[M]>();
  selectMode = input("single" as M);
}

// SdModalSelectButtonControl — T(Item), K(Key), M(Mode) 세 제네릭
class SdModalSelectButtonControl<T extends object, K, M extends keyof TSelectModeValue<K> = keyof TSelectModeValue<K>> {
  modal = input.required<TSdSelectModalInfo<ISdSelectModal<T>>>();
  value = model<TSelectModeValue<K>[M]>();
  selectedItems = model<T[]>([]);
  selectMode = input<M>("single" as M);
}

// AbsSdDataSelectButton — TItem, TKey, TMode 세 제네릭
abstract class AbsSdDataSelectButton<TItem extends object, TKey, TMode extends keyof TSelectModeValue<TKey> = keyof TSelectModeValue<TKey>> {
  abstract modal: Signal<TSdSelectModalInfo<ISdSelectModal<any>>>;
  value = model<TSelectModeValue<TKey>[TMode]>();
  selectMode = input<TMode>("single" as TMode);
  selectedItems = $signal<TItem[]>([]);
}

// AbsSdDataSheet — implements ISdSelectModal<TItem>
abstract class AbsSdDataSheet<TFilter, TItem, TKey> implements ISdSelectModal<TItem> {
  close = output<ISelectModalOutputResult<TItem>>();
  selectedItemKeys = model<TKey[]>([]);
}

// SdSharedDataSelectButtonControl — TItem, TMode, TModal 세 제네릭
class SdSharedDataSelectButtonControl<TItem, TMode extends keyof TSelectModeValue<number>, TModal extends ISdSelectModal<any>>
  extends AbsSdDataSelectButton<TItem, number, TMode> {
  modal = input.required<TSdSelectModalInfo<TModal>>();
}

// SdSharedDataSelectControl — TItem, TMode, TModal 세 제네릭
class SdSharedDataSelectControl<TItem, TMode extends keyof TSelectModeValue<TItem>, TModal extends ISdSelectModal<any>> {
  value = model<TSelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();
  selectMode = input("single" as TMode);
  modal = input<TSdSelectModalInfo<TModal>>();
}

// SdSharedDataSelectListControl — TItem, TModal 두 제네릭
class SdSharedDataSelectListControl<TItem, TModal extends ISdSelectModal<any>> {
  modal = input<TSdSelectModalInfo<TModal>>();
}
```

### v14에서 잘못 변경된 사항 목록

1. `TSelectModeValue` — object → union으로 변경하여 M 인덱싱 패턴 파괴
2. `ISdModalInfo` — X 제네릭 제거하여 확장성 파괴
3. `ISdSelectModal` — T의 의미를 Item→Key로 역전, `selectMode`에서 undefined 제거
4. `ISelectModalOutputResult` — `selectedItems: T[]` → `Record<string, unknown>[]`로 Item 타입 소실
5. `TSdSelectModalInfo` — Omit 중복 조립 괴물
6. `SdSelectControl` — M 제네릭 제거
7. `SdModalSelectButtonControl` — 제네릭 전부 제거, selectedItems를 `Record<string, unknown>[]`로 변경
8. `AbsSdDataSelectButton` — TMode 제거
9. `AbsSdDataSheet` — `implements ISdSelectModal` 누락, close 타입 인라인
10. `SdSharedDataSelectButtonControl` — TMode, TModal 제거
11. `SdSharedDataSelectControl` — TMode, TModal 제거
12. `SdSharedDataSelectListControl` — TModal 제거

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | TSelectModeValue 형태 | v12 object 형태 복원 | M 인덱싱 패턴이 컴파일타임 타입 추론의 핵심 |
| D2 | SdSelectItemControl<T> | v14 유지 | v14에서 추가된 개선사항, v12보다 타입 안전 |
| D3 | SdSelectControl 내부 로직 | v14 effect 기반 유지, 제네릭만 복원 | 기능 동일, v14 패턴(네이티브 signal/effect) 유지 |
| D4 | ISdSelectModal/ISdModalInfo 위치 | v14 위치 유지 | v14에서 sd-modal-select-button.control.ts로 이동한 것은 합리적 |
| D5 | SdSelectControl 내부 로직 | v14 effect 기반 유지 | 기능 동일, 네이티브 signal/effect 패턴 |
| D6 | SdSelectItemControl<T> | v14 유지 | v12보다 타입 안전한 개선사항 |
| D7 | 이미 수정된 항목 | 유지 | ISdModalInfo X, ISdSelectModal T=Item, AbsSdDataSheet implements 등 이 대화에서 이미 수정함 |

## 요구명세

```gherkin
Feature: 1 타입 추론 복원

  v12의 TSelectModeValue, ISdModalInfo, ISdSelectModal 타입 시스템과
  관련 컴포넌트의 제네릭 타입 추론을 v14에서 복원한다.

  Rule: TSelectModeValue는 object 형태여야 한다

    Scenario: TSelectModeValue 정의 복원
      Given v14의 TSelectModeValue가 union 타입이다
      When TSelectModeValue를 v12 object 형태로 변경한다
      Then type TSelectModeValue<T> = { multi: T[]; single: T } 이다
      And M 인덱싱(TSelectModeValue<K>[M])이 작동한다

  Rule: SdSelectControl은 M 제네릭을 가져야 한다

    Scenario: SdSelectControl 제네릭 복원
      Given v14의 SdSelectControl<T>가 M 제네릭이 없다
      When SdSelectControl<M extends "single" | "multi", T>로 변경한다
      Then value 타입이 TSelectModeValue<any>[M]이다
      And selectMode 타입이 M이다

  Rule: ISdModalInfo는 X 제네릭으로 추가 제외 키를 지원해야 한다

    Scenario: ISdModalInfo X 제네릭 복원
      Given v14의 ISdModalInfo<T>가 X 제네릭이 없다
      When ISdModalInfo<T, X extends keyof any = "">로 변경한다
      Then inputs 타입이 Omit<TDirectiveInputSignals<T>, X>이다

  Rule: ISdSelectModal의 T는 Item 타입이어야 한다

    Scenario: ISdSelectModal 타입 파라미터 복원
      Given v14의 ISdSelectModal<T>에서 T가 Key 타입으로 사용된다
      When T를 Item 타입으로 복원한다
      Then selectedItemKeys는 InputSignal<any[]>이다
      And selectMode는 InputSignal<"single" | "multi" | undefined>이다

    Scenario: ISelectModalOutputResult 복원
      Given v14의 selectedItems가 Record<string, unknown>[]이다
      When ISelectModalOutputResult<T>의 selectedItems를 T[]로 복원한다
      Then selectedItems: T[] (T = Item 타입)이다
      And selectedItemKeys: any[]이다

  Rule: TSdSelectModalInfo는 ISdModalInfo의 X 제네릭을 활용해야 한다

    Scenario: TSdSelectModalInfo 단순화
      Given v14의 TSdSelectModalInfo가 Omit 중복 조립이다
      When ISdModalInfo<T, "selectMode" | "selectedItemKeys">로 변경한다
      Then ISdModalInfo의 기본 제외와 중복되지 않는다

  Rule: SdModalSelectButtonControl은 T, K, M 제네릭을 가져야 한다

    Scenario: SdModalSelectButtonControl 제네릭 복원
      Given v14의 SdModalSelectButtonControl에 제네릭이 없다
      When <T extends object, K, M extends keyof TSelectModeValue<K>>로 변경한다
      Then modal은 input.required<TSdSelectModalInfo<ISdSelectModal<T>>>()이다
      And value 타입이 TSelectModeValue<K>[M]이다
      And selectedItems 타입이 T[]이다
      And selectMode 타입이 M이다

  Rule: AbsSdDataSelectButton은 TMode 제네릭을 가져야 한다

    Scenario: AbsSdDataSelectButton 제네릭 복원
      Given v14의 AbsSdDataSelectButton<TItem, TKey>에 TMode가 없다
      When <TItem, TKey, TMode extends keyof TSelectModeValue<TKey>>로 변경한다
      Then value 타입이 TSelectModeValue<TKey>[TMode]이다
      And selectMode 타입이 TMode이다

  Rule: AbsSdDataSheet는 ISdSelectModal을 구현해야 한다

    Scenario: AbsSdDataSheet implements 복원
      Given v14의 AbsSdDataSheet에 implements ISdSelectModal이 없다
      When implements ISdSelectModal<TItem>을 추가한다
      Then close 타입이 ISelectModalOutputResult<TItem>이다

  Rule: Shared-data 컴포넌트는 TMode/TModal 제네릭을 가져야 한다

    Scenario: SdSharedDataSelectButtonControl 제네릭 복원
      Given v14에 TMode, TModal 제네릭이 없다
      When <TItem, TMode, TModal>로 변경한다
      Then AbsSdDataSelectButton<TItem, number, TMode>를 extends한다
      And modal은 input.required<TSdSelectModalInfo<TModal>>()이다

    Scenario: SdSharedDataSelectControl 제네릭 복원
      Given v14에 TMode, TModal 제네릭이 없다
      When <TItem, TMode, TModal>로 변경한다
      Then value 타입이 TSelectModeValue<TItem["__valueKey"] | undefined>[TMode]이다
      And modal은 input<TSdSelectModalInfo<TModal>>()이다

    Scenario: SdSharedDataSelectListControl 제네릭 복원
      Given v14에 TModal 제네릭이 없다
      When <TItem, TModal>로 변경한다
      Then modal은 input<TSdSelectModalInfo<TModal>>()이다
```

## 구현계획

### 배경

v14 마이그레이션 과정에서 `TSelectModeValue`가 object에서 union으로 변경되면서 M 인덱싱 기반 컴파일타임 타입 추론이 전부 파괴됨. 이로 인해 `ISdSelectModal`, `ISdModalInfo`, `SdSelectControl`, `SdModalSelectButtonControl`, `AbsSdDataSelectButton`, `AbsSdDataSheet` 등 연쇄적으로 제네릭이 제거되고 타입 안전성이 소실됨.

이 대화에서 이미 수정 완료된 항목:
- `ISdModalInfo<T, X>` X 제네릭 복원
- `ISdSelectModal<T>` T=Item 복원, `selectedItemKeys: any[]`, `selectMode: undefined` 허용
- `ISelectModalOutputResult<T>` `selectedItems: T[]` 복원
- `TSdSelectModalInfo` 단순화
- `AbsSdDataSheet implements ISdSelectModal<TItem>` 복원
- `setupCloserWhenSingleSelectionChange` close 타입 변경

### 목표

- `TSelectModeValue`를 v12 object 형태로 복원
- `SdSelectControl<M, T>` M 제네릭 복원
- `SdModalSelectButtonControl<T, K, M>` 제네릭 복원
- `AbsSdDataSelectButton<TItem, TKey, TMode>` 복원
- Shared-data 컴포넌트 TMode/TModal 제네릭 복원
- 모든 관련 테스트 수정

### 비목표

- SdSelectControl 내부 로직(effect 기반) 변경 — v14 패턴 유지
- SdSelectItemControl<T> 변경 — v14 개선사항 유지
- ISdSelectModal/ISdModalInfo 위치 변경 — v14 위치 유지

### 설계

#### TSelectModeValue 복원

```typescript
// before (v14)
export type TSelectModeValue<T> = T | T[] | undefined;

// after
export type TSelectModeValue<T> = { multi: T[]; single: T };
```

#### SdSelectControl 제네릭 복원

```typescript
// before (v14)
export class SdSelectControl<T> {
  selectMode = input<"single" | "multi">("single");
  value = model<TSelectModeValue<T>>();

// after
export class SdSelectControl<M extends "single" | "multi", T> {
  selectMode = input("single" as M);
  value = model<TSelectModeValue<any>[M]>();
```

내부 로직에서 `value.set(itemValue)`, `value.set([])`, `value.update(...)` 등은 v12와 동일한 패턴이므로 타입만 맞추면 됨.

#### SdSelectItemControl 호환성

v14의 `SdSelectItemControl<T>`는 `inject<SdSelectControl<T>>`로 부모를 주입받음. `SdSelectControl`이 `<M, T>`로 바뀌면 `inject<SdSelectControl<any, T>>`로 변경 필요.

### 대안 검토

| 접근 방식 | 선택 | 이유 |
|-----------|------|------|
| TSelectModeValue를 v12 object로 복원 | 채택 | M 인덱싱 패턴이 컴파일타임 타입 추론의 핵심 |
| TSelectModeValue를 유지하고 M 없이 진행 | 미채택 | 타입 안전성 소실, 런타임 as 단언 필요 |

### Vertical Slices

- [x] Slice 1: TSelectModeValue + SdSelectControl
- [x] Slice 2: SdModalSelectButtonControl + AbsSdDataSelectButton
- [x] Slice 3: Shared-data 컴포넌트 + AbsSdDataSheet
- [x] Slice 4: 테스트 수정

#### Slice 1: TSelectModeValue + SdSelectControl

- **구현 내용:** TSelectModeValue를 object로 복원, SdSelectControl<M, T> 제네릭 복원, SdSelectItemControl 호환성 수정
- **호출 그래프:**
  ```mermaid
  flowchart TD
    A[SdSelectControl.selectItem] --> B[_setOrToggle]
    A --> C[closeDropdown]
    D[SdSelectControl.toggleItem] --> B
    E[SdSelectControl.onSelectAll] --> F[value.set]
    G[SdSelectControl.onDeselectAll] --> F
    H[SdSelectItemControl] -.->|inject| A
  ```
- **Scenarios:**
  - Scenario: TSelectModeValue 정의 복원
  - Scenario: SdSelectControl 제네릭 복원

#### Slice 2: SdModalSelectButtonControl + AbsSdDataSelectButton

- **구현 내용:** SdModalSelectButtonControl<T, K, M> 제네릭 복원, AbsSdDataSelectButton<TItem, TKey, TMode> 복원
- **의존:** Slice 1
- **호출 그래프:**
  ```mermaid
  flowchart TD
    A[SdModalSelectButtonControl.onSearchClick] --> B[SdModalProvider.showAsync]
    A --> C[value.set]
    D[SdModalSelectButtonControl.onEraseClick] --> C
    E[AbsSdDataSelectButton.doShowModal] --> B
    E --> C
    F[AbsSdDataSelectButton.doInitialValue] --> C
  ```
- **Scenarios:**
  - Scenario: SdModalSelectButtonControl 제네릭 복원
  - Scenario: AbsSdDataSelectButton 제네릭 복원

#### Slice 3: Shared-data 컴포넌트 + AbsSdDataSheet

- **구현 내용:** SdSharedDataSelectButtonControl TMode/TModal 복원, SdSharedDataSelectControl TMode/TModal 복원, SdSharedDataSelectListControl TModal 복원, AbsSdDataSheet implements 확인
- **의존:** Slice 2
- **호출 그래프:**
  ```mermaid
  flowchart TD
    A[SdSharedDataSelectButtonControl] -->|extends| B[AbsSdDataSelectButton]
    C[SdSharedDataSelectControl.onModalButtonClick] --> D[SdModalProvider.showAsync]
    E[SdSharedDataSelectListControl.onModalButtonClick] --> D
  ```
- **Scenarios:**
  - Scenario: SdSharedDataSelectButtonControl 제네릭 복원
  - Scenario: SdSharedDataSelectControl 제네릭 복원
  - Scenario: SdSharedDataSelectListControl 제네릭 복원
  - Scenario: AbsSdDataSheet implements 복원

#### Slice 4: 테스트 수정

- **구현 내용:** sd-select-test.fixture.ts, sd-modal-select-button-test.fixture.ts, sd-shared-data-*-test.fixture.ts, 관련 spec 파일의 TSelectModeValue 타입 수정
- **의존:** Slice 3
- **Scenarios:** (테스트 코드 수정이므로 별도 Scenario 없음)
