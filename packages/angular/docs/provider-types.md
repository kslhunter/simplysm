# Provider Types

## `SdMenu`

메뉴 트리 노드.

```typescript
interface SdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: SdMenu[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 제목 |
| `codeChain` | `string[]` | 코드 체인 (루트부터 현재까지) |
| `url` | `string \| undefined` | 외부 URL |
| `icon` | `string \| undefined` | 아이콘 |
| `children` | `SdMenu[] \| undefined` | 하위 메뉴 |

## `SdFlatMenu`

플랫 메뉴 항목 (리프만).

```typescript
interface SdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | 타이틀 체인 |
| `codeChain` | `string[]` | 코드 체인 |
| `modulesChain` | `TModule[][]` | 모듈 체인 |

## `SdPermission`

권한 트리 노드.

```typescript
interface SdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: SdPermission<TModule>[] | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 권한 제목 |
| `codeChain` | `string[]` | 코드 체인 |
| `modules` | `TModule[] \| undefined` | 모듈 제한 |
| `perms` | `("use" \| "edit")[] \| undefined` | 권한 목록 |
| `children` | `SdPermission<TModule>[] \| undefined` | 하위 권한 |

## `SharedDataBase`

공유 데이터 기본 인터페이스. 모든 공유 데이터 항목이 구현해야 한다.

```typescript
interface SharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `__valueKey` | `TKey` | 고유 키 |
| `__searchText` | `string` | 검색 대상 텍스트 |
| `__isHidden` | `boolean` | 숨김 여부 |
| `__parentKey` | `TKey \| undefined` | 부모 키 (트리 구조용) |

## `SharedDataInfo`

공유 데이터 등록 정보.

```typescript
interface SharedDataInfo<T extends SharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (a: T, b: T) => number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `serviceKey` | `string` | ServiceClient 연결 키 |
| `getter` | `(changeKeys?) => Promise<T[]>` | 데이터 조회 함수. changeKeys 전달 시 부분 조회 |
| `filter` | `unknown` | 이벤트 필터 (같은 이름의 다른 필터 구분용) |
| `orderBy` | `((a, b) => number) \| undefined` | 정렬 함수 |

## `SharedDataHandle`

공유 데이터 핸들. `getHandle()`이 반환하는 객체.

```typescript
interface SharedDataHandle<T extends SharedDataBase<string | number>> {
  items: Signal<T[]>;
  get(key: T["__valueKey"] | undefined): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `Signal<T[]>` | 데이터 항목 signal |
| `get(key)` | `(key) => T \| undefined` | 키로 항목 조회 |

## `SdModalContentDef`

모달 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | 초기화 완료 여부 |
| `close` | `OutputEmitterRef<O \| undefined>` | 닫기 output (결과 전달) |
| `actionTplRef` | `TemplateRef<any> \| undefined` | 모달 헤더 액션 영역 템플릿 |
| `_optionalModalInputs` | `string \| undefined` | optional로 취급할 input 키 목록 (리터럴 타입) |

### 구현 패턴

모달로 사용될 컴포넌트는 `implements SdModalContentDef<R>`을 선언하고, `close` output으로 결과를 돌려준다.

```typescript
import { effect, output, signal, type TemplateRef, viewChild } from "@angular/core";
import { type SdModalContentDef } from "@simplysm/angular";

export class CustomerDetail implements SdModalContentDef<boolean | undefined> {
  initialized = signal(false);
  close = output<boolean | undefined>();
  actionTplRef?: TemplateRef<any>;

  private readonly _modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef });

  constructor() {
    effect(() => {
      this.actionTplRef = this._modalActionTpl();
    });
  }

  // 저장 성공 시 결과 전달
  protected async onSubmit(): Promise<void> {
    // ... (ORM upsert)
    this.close.emit(true);
  }
}
```

호출 측은 `SdModalProvider.showAsync`의 반환값으로 `close.emit`에 전달된 값을 받는다:

```typescript
const result = await this._sdModal.showAsync({
  title: "고객 수정",
  type: CustomerDetail,
  inputs: { itemId: 123 },
});
if (result != null) {
  await this._refresh();
}
```

**실사용 예:**

- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰)

## `SdModalInfo`

모달 생성 시 전달하는 정보.

```typescript
interface SdModalInfo<T extends SdModalContentDef<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, SdModalExcludeKeys | X>, ...>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 모달 제목 |
| `type` | `Type<T>` | 모달 컴포넌트 타입 |
| `inputs` | `object` | 컴포넌트 inputs (initialized, close, actionTplRef 제외) |

## `SdModalOptions`

모달 옵션.

```typescript
interface SdModalOptions {
  key?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
  float?: boolean;
  fill?: boolean;
  resizable?: boolean;
  movable?: boolean;
  position?: "bottom-right" | "top-right";
  minHeightPx?: number;
  minWidthPx?: number;
  heightPx?: number;
  widthPx?: number;
  headerStyle?: string;
  noFirstControlFocusing?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string \| undefined` | 동일 키의 모달이 이미 열려 있으면 재사용 |
| `hideHeader` | `boolean \| undefined` | 헤더 숨김 |
| `hideCloseButton` | `boolean \| undefined` | 닫기 버튼 숨김 |
| `useCloseByBackdrop` | `boolean \| undefined` | 배경 클릭으로 닫기 |
| `useCloseByEscapeKey` | `boolean \| undefined` | ESC 키로 닫기 |
| `float` | `boolean \| undefined` | 플로팅 모달 |
| `fill` | `boolean \| undefined` | 전체 화면 채우기 |
| `resizable` | `boolean \| undefined` | 크기 조절 가능 |
| `movable` | `boolean \| undefined` | 이동 가능 |
| `position` | `"bottom-right" \| "top-right" \| undefined` | 위치 프리셋 |
| `minHeightPx` | `number \| undefined` | 최소 높이 (px) |
| `minWidthPx` | `number \| undefined` | 최소 너비 (px) |
| `heightPx` | `number \| undefined` | 높이 (px) |
| `widthPx` | `number \| undefined` | 너비 (px) |
| `headerStyle` | `string \| undefined` | 헤더 인라인 스타일 |
| `noFirstControlFocusing` | `boolean \| undefined` | 첫 번째 컨트롤 자동 포커스 비활성화 |

## `SdToastContentDef`

커스텀 토스트 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdToastContentDef<O> {
  close: OutputEmitterRef<O | undefined>;
}
```

## `SdToastInput`

커스텀 토스트 생성 입력.

```typescript
interface SdToastInput<T extends SdToastContentDef<any>> {
  type: Type<T>;
  inputs: Omit<DirectiveInputSignals<T>, "close">;
}
```

## `SdToastSeverity`

```typescript
type SdToastSeverity = "info" | "success" | "warning" | "danger";
```

## `SdToastTheme`

```typescript
type SdToastTheme = "primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray";
```

## `SdBusyType`

```typescript
type SdBusyType = "spinner" | "bar" | "cube";
```

## `SdPrint`

인쇄 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdPrint {
  initialized: Signal<boolean>;
  readonly _optionalPrintInputs?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | 초기화 완료 여부 (true 될 때까지 대기 후 인쇄) |
| `_optionalPrintInputs` | `string \| undefined` | optional로 취급할 input 키 목록 |

## `SdPrintInput`

인쇄 생성 입력.

```typescript
interface SdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, "_optionalPrintInputs" | X>, ...>;
}
```

## `SdSelectModal`

선택 모달 컴포넌트가 구현해야 하는 인터페이스. `SdModalContentDef<SelectModalOutputResult<T>>`를 확장한다.

```typescript
interface SdSelectModal<T> extends SdModalContentDef<SelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selectMode` | `InputSignal<"single" \| "multi" \| undefined>` | 선택 모드 (single/multi) |
| `selectedItemKeys` | `InputSignal<any[]>` | 이미 선택된 항목 키 배열 (호출 측에서 전달, 복원용) |

`SdModalContentDef`에서 상속:
- `initialized`: `Signal<boolean>` — 초기화 완료 여부
- `close`: `OutputEmitterRef<SelectModalOutputResult<T> | undefined>` — 선택 결과 output

### 선택 모달 구현 패턴

```typescript
import { input, output } from "@angular/core";
import { type SdSelectModal, type SelectModalOutputResult } from "@simplysm/angular";

export class CustomerListPage implements SdSelectModal<ICustomer> {
  // SdSelectModal<ICustomer> 계약 필드
  selectMode = input<"single" | "multi" | undefined>();
  selectedItemKeys = input<(number | undefined)[]>([]);
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  // 선택 상태
  selectedItems = signal<ICustomer[]>([]);

  constructor() {
    // modal 뷰: selectedItemKeys → selectedItems 복원 (items 로드 후)
    effect(() => {
      if (this.viewType() !== "modal") return;

      const keys = this.selectedItemKeys();
      if (keys.length === 0) return;

      const currItems = this.items();
      if (currItems.length === 0) return;

      untracked(() => {
        const sel = currItems.filter((it) => keys.includes(this.trackByFn(it)));
        if (sel.length > 0) this.selectedItems.set(sel);
      });
    });
  }

  // 확인 버튼
  onModalConfirmClick(): void {
    const sel = this.selectedItems();
    this.close.emit({
      selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
      selectedItems: sel,
    });
  }

  // 선택 해제 버튼
  onModalCancelClick(): void {
    this.selectedItems.set([]);
    if (this.selectMode() === "single") {
      this.close.emit({ selectedItemKeys: [], selectedItems: [] });
    }
  }
}
```

시트에 `selectMode`·`cumulativeSelection`을 바인딩하고, modal 전용 하단 확인 바를 배치한다:

```html
<sd-sheet
  [selectMode]="selectMode() ?? 'multi'"
  [(selectedItems)]="selectedItems"
  [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
>
  <!-- 컬럼들 -->
</sd-sheet>

@if (viewType() === "modal") {
  <sd-dock [position]="'bottom'" class="p-sm-default flex-row main-align-end gap-sm bdt bdt-theme-gray-lightest">
    <sd-button [size]="'sm'" [theme]="'danger'"
      (click)="onModalCancelClick()" [disabled]="selectedItems().length < 1">
      선택 해제
    </sd-button>
    @if (selectMode() === "multi") {
      <sd-button [size]="'sm'" [theme]="'primary'" (click)="onModalConfirmClick()">
        확인({{ selectedItems().length }})
      </sd-button>
    }
  </sd-dock>
}
```

**주의사항:**

- **`selectedItemKeys`는 `filterExists()`로 undefined 제거.** `trackByFn(it)`이 undefined를 반환할 수 있으므로(신규 행 등) 반드시 `filterExists()`로 필터링한다. **index fallback(`trackByFn(it, i) ?? i`) 금지** — id=undefined인 신규 행의 index가 가짜 key로 들어간다.
- **`cumulativeSelection` 의도**: multi 모드에서 페이지를 넘어 선택을 누적한다. page 뷰에서는 현재 페이지 행만 다루므로 누적하지 않는다.
- **모달 "선택 해제"는 single 모드에서만 즉시 close.** multi 모드에서는 `selectedItems.set([])`만 하고 "확인" 버튼으로 최종 emit한다.

### 선택 모달 vs 조회 전용 modal

`viewType() === "modal"`이라고 해서 반드시 `SdSelectModal<T>` 계약을 구현하는 것은 아니다. modal 용도는 최소 두 가지다:

**(a) 선택 모달** — 다른 화면에서 항목을 골라 `close.emit`으로 돌려줌:
- `implements SdSelectModal<T>` 선언
- `selectMode`/`selectedItemKeys` input + `close` output
- 하단 확인·선택 해제 바
- `cumulativeSelection` 활성화 (multi)

**(b) 조회 전용 modal** — 부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용으로 보여줌:
- `SdSelectModal<T>` 계약 **부착 금지**
- `selectMode`/`selectedItemKeys`/`close` 없음
- 하단 바 없음, SdModal 기본 "X"로 닫기
- 부모 식별자 input (예: `customerId = input.required<number>()`)

**실사용 예:**

- [crud-list.md §8 확장 D: 선택 모달 전환](./recipes/crud-list.md#8-확장-d-선택-모달-전환)
- [crud-list.md §9 확장 E: 조회 전용 modal](./recipes/crud-list.md#9-확장-e-조회-전용-modal)

## `SelectModalOutputResult`

모달 선택 결과.

```typescript
interface SelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selectedItemKeys` | `any[]` | 선택된 항목 키 배열 |
| `selectedItems` | `T[]` | 선택된 항목 배열 |

### 사용 패턴

`onModalConfirmClick` 등에서 `selectedItems`를 `trackByFn`으로 변환하여 `selectedItemKeys`를 만든다:

```typescript
const sel = this.selectedItems();
this.close.emit({
  selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
  selectedItems: sel,
});
```

**`filterExists()`로 undefined 제거 필수.** `trackByFn(it)`이 undefined를 반환할 수 있으므로(예: 아직 DB에 저장되지 않은 신규 행) 반드시 `filterExists()`로 필터링한다.

**index fallback 금지.** `trackByFn(it, i) ?? i` 같은 패턴은 id=undefined인 신규 행에 0, 1, 2 같은 index 값이 가짜 key로 들어가 호출 측이 잘못된 selection을 돌려받는다.

**실사용 예:**

- [crud-list.md §8 확장 D: 선택 모달 전환](./recipes/crud-list.md#8-확장-d-선택-모달-전환) — `onModalConfirmClick` 내부
