# Recipe: 모달 기반 선택 버튼

모달을 띄워 항목을 선택하고, 결과를 `value`(key) ↔ `selectedItems`(표시용 객체) 양방향 바인딩으로 수신하는 버튼 컴포넌트를 조립한다. 표준 `<sd-modal-select-button>`을 직접 사용하거나, 도메인별 데이터 로딩을 감싼 wrapper 컴포넌트로 컴포지션한다.

## When to use / When NOT to use

| 상황 | 적용 패턴 |
|------|-----------|
| 1회성 모달을 직접 띄워 선택 (도메인별 wrapper 불필요) | 패턴 1: `<sd-modal-select-button>` 직접 |
| 메모리 상주 공유 데이터(`SharedDataBase`)에서 선택 | 패턴 2: `<sd-shared-data-select-button>` |
| key만 저장하고 표시용 데이터는 ORM 등에서 비동기 조회 | 패턴 3: 사용자 정의 wrapper |

- ❌ 단순 enum 정적 옵션 — 대신 `<sd-select>` + `<sd-select-item>` 사용
- ❌ 공유 데이터 드롭다운(검색 포함) — 대신 `<sd-shared-data-select>` 사용
- ❌ 공유 데이터 목록형(페이지네이션) — 대신 `<sd-shared-data-select-list>` 사용

## 전제조건

- `provideSdAngular({ clientName })`이 앱 bootstrap에 등록되어 있다
- 모달 컴포넌트가 `SdSelectModal<T>` 인터페이스를 구현한다 (`packages/angular/src/controls/button/sd-modal-select-button.ts:30`)
- 표시용 객체(`selectedItems: T[]`)와 선택 key(`value`)는 분리하여 관리한다
- 선택 결과는 `SelectModalOutputResult<T>` 형식으로 반환된다 (`packages/angular/src/core/select-modal-output-result.ts:4`)

## 기본 레시피 (패턴 1: `<sd-modal-select-button>` 직접 사용)

### 1. 모달 컴포넌트

모달은 `SdSelectModal<T>`를 `implements`한다. `selectMode` / `selectedItemKeys` input과 `close` output을 모두 구현한다.

```typescript
import {
  Component,
  input,
  output,
  signal,
  ViewEncapsulation,
  type InputSignal,
} from "@angular/core";
import {
  SdSelectModal,
  type SelectModalOutputResult,
} from "@simplysm/angular";

interface IItem {
  id: number;
  name: string;
}

@Component({
  selector: "app-item-select-modal",
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-default">
      @for (item of _items(); track item.id) {
        <div (click)="onItemClick(item)">{{ item.name }}</div>
      }
      <button (click)="onConfirm()">확인</button>
      <button (click)="close.emit(undefined)">취소</button>
    </div>
  `,
})
export class ItemSelectModal implements SdSelectModal<IItem> {
  initialized = signal(true);
  close = output<SelectModalOutputResult<IItem> | undefined>();
  selectMode: InputSignal<"single" | "multi" | undefined> = input<
    "single" | "multi" | undefined
  >("single");
  selectedItemKeys: InputSignal<any[]> = input<any[]>([]);

  protected readonly _items = signal<IItem[]>([]);
  private readonly _picked = signal<IItem[]>([]);

  onItemClick(item: IItem): void {
    this._picked.update((prev) =>
      this.selectMode() === "multi" ? [...prev, item] : [item],
    );
  }

  onConfirm(): void {
    const items = this._picked();
    this.close.emit({
      selectedItemKeys: items.map((it) => it.id),
      selectedItems: items,
    });
  }
}
```

**핵심**:
- `close.emit(undefined)`는 취소(value 변경 없음), `close.emit({...})`는 확정 반환
- `initialized = signal(true)`는 `SdModalContentDef` 계약 필드로, 모달 초기화 완료 신호

### 2. 호출 측 컴포넌트

```typescript
import { Component, signal } from "@angular/core";
import {
  SdModalSelectButton,
  type SdSelectModalInfo,
} from "@simplysm/angular";
import { ItemSelectModal } from "./item-select.modal";

interface IItem {
  id: number;
  name: string;
}

@Component({
  selector: "app-foo-view",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [(value)]="value"
      [(selectedItems)]="selectedItems"
      [modal]="modalInfo"
      [selectMode]="'single'"
      [required]="true"
    >
      @if (selectedItems().length > 0) {
        {{ selectedItems()[0].name }}
      } @else {
        선택하세요
      }
    </sd-modal-select-button>
  `,
})
export class FooView {
  value = signal<number | undefined>(undefined);
  selectedItems = signal<IItem[]>([]);

  modalInfo: SdSelectModalInfo<ItemSelectModal> = {
    title: "항목 선택",
    type: ItemSelectModal,
    inputs: {},
  };
}
```

**핵심 동작**:
- `value`는 key(number/string), `selectedItems`는 표시용 객체. 둘 다 `model<>`로 양방향 바인딩
- 검색 버튼 클릭 시 내부적으로 `SdModalProvider.showAsync`를 호출해 모달을 연다. 모달이 반환한 `selectedItemKeys`가 `value`에, `selectedItems`가 `selectedItems`에 자동 반영된다 (`packages/angular/src/controls/button/sd-modal-select-button.ts:193`)
- erase 버튼(초기화)은 `!disabled() && !required() && value 존재` 시 자동 표시된다 (`packages/angular/src/controls/button/sd-modal-select-button.ts:54`). `required=true`면 erase가 노출되지 않아 사용자가 값을 비울 수 없다
- `required=true`인 상태에서 `value`가 비어 있으면 "선택된 항목이 없습니다." invalid 메시지가 붙는다 (`packages/angular/src/controls/button/sd-modal-select-button.ts:179`)

## 변형 (Variation)

### 패턴 2: `<sd-shared-data-select-button>` (메모리 상주 공유 데이터)

메모리에 이미 로드된 `SharedDataBase` 기반 데이터에서 선택한다. `value`(key) 또는 `items` 변경 시 표시용 `_selectedItems`가 내부 effect에서 자동 재계산되므로 외부 로딩이 불필요하다 (`packages/angular/src/data/shared-data/sd-shared-data-select-button.ts:79`).

```typescript
import { Component, signal } from "@angular/core";
import {
  SdSharedDataSelectButton,
  SdItemOfTemplate,
  type SdSelectModalInfo,
  type SharedDataBase,
} from "@simplysm/angular";
import { ShopSelectModal } from "./shop-select.modal";

interface IShop extends SharedDataBase<number> {
  __valueKey: number;      // SharedDataBase 필수 식별자
  __searchText: string;    // 검색 매칭 대상
  __isHidden: boolean;     // 숨김 여부
  name: string;
  code: string;
}

@Component({
  selector: "app-bar-view",
  standalone: true,
  imports: [SdSharedDataSelectButton, SdItemOfTemplate],
  template: `
    <sd-shared-data-select-button
      [(value)]="shopId"
      [items]="shops()"
      [modal]="shopModalInfo"
      [selectMode]="'single'"
    >
      <ng-template [itemOf]="shops()" let-item>
        <span>{{ item.code }} - {{ item.name }}</span>
      </ng-template>
    </sd-shared-data-select-button>
  `,
})
export class BarView {
  shopId = signal<number | undefined>(undefined);
  shops = signal<IShop[]>([]); // SdSharedDataProvider에서 로드

  shopModalInfo: SdSelectModalInfo<ShopSelectModal> = {
    title: "거래처 선택",
    type: ShopSelectModal,
    inputs: {},
  };
}
```

**핵심**:
- `items`가 source of truth. `selectedItems`는 외부로 노출되지 않고 내부 signal로 관리된다
- `<ng-template [itemOf]="items()" let-item>` 컨텍스트 디렉티브로 항목 템플릿을 정의한다. multi 모드에서는 선택된 항목들이 `, ` 구분자로 자동 나열된다
- `selectMode="multi"`이면 `value`는 `number[]`

### 패턴 3: 사용자 정의 wrapper (도메인별 ORM 조회)

도메인별로 자주 쓰는 모달 선택 버튼은 `<sd-modal-select-button>`을 컴포지션한 wrapper로 작성한다. `value`(key)만 외부에 노출하고, 표시용 데이터는 `effect`에서 비동기로 조회한다.

```typescript
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import {
  SdModalSelectButton,
  type SdSelectModalInfo,
} from "@simplysm/angular";
import { expr } from "@simplysm/orm-common";
import { AppOrmProvider } from "../app-orm.provider";
import { LotSelectModal } from "./lot-select.modal";

interface ILot {
  id: number;
  code: string;
}

@Component({
  selector: "app-lot-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [(value)]="value"
      [(selectedItems)]="_selectedItems"
      [modal]="modalInfo()"
      [disabled]="disabled()"
      [required]="required()"
      [inset]="inset()"
      [size]="size()"
      [selectMode]="'single'"
    >
      @for (item of _selectedItems(); track item.id; let index = $index) {
        @if (index !== 0) { <span>,&nbsp;</span> }
        <span>{{ item.code }}</span>
      }
    </sd-modal-select-button>
  `,
})
export class LotSelectButton {
  private readonly _appOrm = inject(AppOrmProvider);

  value = model<number | undefined>();
  modalInputs = input<SdSelectModalInfo<LotSelectModal>["inputs"]>({});
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();

  protected readonly _selectedItems = signal<ILot[]>([]);

  protected readonly modalInfo = computed<SdSelectModalInfo<LotSelectModal>>(() => ({
    type: LotSelectModal,
    title: "LOT 조회",
    inputs: this.modalInputs(),
  }));

  constructor() {
    effect(() => {
      const v = this.value();
      if (v == null) {
        this._selectedItems.set([]);
        return;
      }

      // effect 콜백은 동기여야 하므로 void IIFE로 비동기 격리
      void (async () => {
        const items = await this._appOrm.connectAsync(async (db) =>
          db.lot()
            .where((it) => [expr.in(it.id, [v])])
            .select((it) => ({ id: it.id, code: it.code }))
            .execute(),
        );
        this._selectedItems.set(items);
      })();
    });
  }
}
```

사용:

```html
<app-lot-select-button
  [(value)]="data().lotId"
  [required]="true"
  [disabled]="!canEdit()"
/>
```

**확장 지점**:
- multi 모드 지원: `value = model<number[] | undefined>()`, `selectMode = input<"single" | "multi">("single")`, effect의 `expr.in(it.id, [v])`를 배열 전체(`expr.in(it.id, v)`)로 바꾸고 `v.length === 0` 분기를 추가한다
- 모달 inputs 주입: 외부에서 `[modalInputs]="{ filter: ... }"` 형태로 전달하면 `computed` 합성을 통해 `modalInfo`에 반영된다

**근거**: `effect` 콜백에 `async`를 선언하면 cleanup 시점이 반환 Promise 해소 시점과 어긋난다. 관련 규칙: [_common-rules.md — input 의존 로딩 규칙](./_common-rules.md#input-의존-데이터-로딩에-void-this_initasync를-사용하지-않는다).

### 시트 셀 안에 삽입

`[inset]="true" [size]="'sm'"` 규칙은 공통 규칙을 따른다 — [_common-rules.md — 시트 셀 내부 컨트롤 규칙](./_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다) 참조.

```html
<app-lot-select-button [inset]="true" [size]="'sm'" [(value)]="item.lotId" (valueChange)="mark(items)" />
```

## 🚫 흔한 실수 (Anti-patterns)

### 1. `SdDataSelectButton` / `SdDataSelectButtonBase` 재도입

```typescript
// ✅ <sd-modal-select-button> 컴포지션 wrapper (패턴 3)
@Component({
  selector: "app-my-select-button",
  imports: [SdModalSelectButton],
  template: `<sd-modal-select-button [(value)]="value" [modal]="modalInfo()" ... />`,
})
export class MySelectButton { /* value = model<...>(), effect로 load */ }
```

**근거**: 공통 부모를 재도입하면 도메인별 분기가 상속 트리에 묶여 변경 전파가 불투명해진다. 컴포지션은 각 wrapper가 독립적으로 소멸·교체 가능하다.

### 2. 조회 전용 모달에 `SdSelectModal<T>` 반사적 구현

```typescript
// ✅ 조회 전용은 SdModalContentDef만 구현, close는 undefined로 emit
export class OrderHistoryModal implements SdModalContentDef<undefined> {
  initialized = signal(true);
  close = output<undefined>();
}
```

**근거**: `SdSelectModal<T>`는 선택 결과 반환 계약(`SelectModalOutputResult<T>`)을 강제한다. 조회만 하는 모달에 붙이면 미사용 입력이 누적되어 의도가 흐려진다. 선택 모달 쪽 상세: [`./crud-list/extension-d-select-modal.md`](./crud-list/extension-d-select-modal.md).

### 3. `<sd-shared-data-select-button>`에 `[(selectedItems)]` 외부 바인딩

```html
<!-- ✅ value + items만 바인딩. 외부 set이 필요하면 패턴 3 wrapper로 전환 -->
<sd-shared-data-select-button
  [(value)]="shopId"
  [items]="allShops()"
  [modal]="shopModalInfo"
/>
```

**근거**: `SdSharedDataSelectButton._selectedItems`는 `protected readonly signal`로, `items` + `value`로부터 내부 effect가 자동 파생한다 (`packages/angular/src/data/shared-data/sd-shared-data-select-button.ts:79`). 외부에서 set하면 자동 파생 값과 즉시 덮어쓰기 경합이 발생한다.

## 관련 Entry

- [`crud-list/extension-d-select-modal.md`](./crud-list/extension-d-select-modal.md) — 차이: 본 레시피는 **호출 측** 조립을 다루고, 해당 확장은 **모달 쪽** `SdSelectModal<T>` 계약 구현(선택 누적, CRUD 리스트 공용 모달화)을 다룬다
- [`_common-rules.md`](./_common-rules.md) — 시트 셀 `[inset]`/`[size]`, effect 내 비동기 처리, signal 필드 초기값 제약 등 횡단 규칙
