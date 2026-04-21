# Recipe: 모달 기반 선택 버튼 직접 조립

소비 화면이 `<sd-modal-select-button>` 표준 컴포넌트를 **직접** 사용하거나, **컴포지션**(wrap)으로 도메인별 선택 버튼을 만든다. 과거 `SdDataSelectButton` / `SdDataSelectButtonBase` 추상화는 제거되었다.

## 1. Overview

- 제거된 추상화: `SdDataSelectButton`(컴포넌트) / `SdDataSelectButtonBase`(추상 클래스)
- 대체 컴포넌트:
  - `<sd-modal-select-button>` — 표준 모달 선택 버튼. 모달을 띄워 선택 결과를 `value` model로 받는다
  - `<sd-shared-data-select-button>` — 메모리 공유 데이터(`SharedDataBase`) 기반 선택 버튼. 내부에서 `<sd-modal-select-button>` 컴포지션
  - 사용자 정의 select-button — `<sd-modal-select-button>` 컴포지션 + 비동기 `load(keys)` effect로 도메인별 표시 데이터 채우기
- 유지되는 조력자:
  - `SdSelectModal<T>` 인터페이스 (`packages/angular/src/controls/button/sd-modal-select-button.ts:30`) — 선택 모달 컴포넌트가 구현
  - `SdSelectModalInfo<T>` 타입 — 모달 정보 객체
  - `SelectModalOutputResult<T>` (`packages/angular/src/core/select-modal-output-result.ts`) — `{ selectedItemKeys, selectedItems }` 모달 반환 형식
  - `SdModalProvider` — 프로그래밍 방식 모달 호출
  - `SdItemOfTemplate` — 항목 템플릿 컨텍스트 디렉티브

## 2. 언제 사용하는가

| 상황 | 적용 패턴 |
|---|---|
| 외부 대형 테이블에서 모달로 선택, 결과를 key로 저장 | 패턴 3: 사용자 정의 select-button (load 비동기) |
| 메모리에 로드된 공유 데이터(`SharedDataBase`)에서 선택 | 패턴 2: `<sd-shared-data-select-button>` |
| 1회성 모달을 직접 띄워 선택 (도메인별 wrapper 불필요) | 패턴 1: `<sd-modal-select-button>` 직접 |
| 단순 enum 정적 옵션 선택 | `<sd-select>` + `<sd-select-item>` (본 레시피 범위 외) |
| 공유 데이터 드롭다운(검색 포함) | `<sd-shared-data-select>` (`features.md` 참조) |
| 공유 데이터 목록형(페이지네이션) | `<sd-shared-data-select-list>` (`features.md` 참조) |

## 3. 패턴 1: `<sd-modal-select-button>` 직접 사용

### 3.1 모달 컴포넌트 구현

선택 모달은 `SdSelectModal<T>` 인터페이스를 구현한다.

```typescript
import { Component, input, output, signal, ViewEncapsulation } from "@angular/core";
import {
  SdSelectModal,
  SelectModalOutputResult,
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
      <!-- 항목 리스트, 검색, 페이지네이션 등 -->
      <button (click)="onConfirm()">확인</button>
      <button (click)="close.emit(undefined)">취소</button>
    </div>
  `,
})
export class ItemSelectModal implements SdSelectModal<IItem> {
  initialized = signal(true);
  close = output<SelectModalOutputResult<IItem> | undefined>();
  selectMode = input<"single" | "multi" | undefined>("single");
  selectedItemKeys = input<any[]>([]);

  // 내부에서 선택된 항목 관리 (예시)
  private readonly _selectedItems = signal<IItem[]>([]);

  onConfirm(): void {
    const items = this._selectedItems();
    this.close.emit({
      selectedItemKeys: items.map((it) => it.id),
      selectedItems: items,
    });
  }
}
```

### 3.2 호출 측

```typescript
import { Component, signal } from "@angular/core";
import { SdModalSelectButton, SdSelectModalInfo } from "@simplysm/angular";

@Component({
  selector: "app-foo",
  standalone: true,
  imports: [SdModalSelectButton],
  template: `
    <sd-modal-select-button
      [(value)]="value"
      [(selectedItems)]="selectedItems"
      [modal]="modalInfo"
      [selectMode]="'single'"
    >
      @if (selectedItems().length > 0) {
        {{ selectedItems()[0].name }}
      } @else {
        선택하세요
      }
    </sd-modal-select-button>
  `,
})
export class FooPage {
  value = signal<number | undefined>(undefined);
  selectedItems = signal<IItem[]>([]);

  modalInfo: SdSelectModalInfo<ItemSelectModal> = {
    title: "항목 선택",
    type: ItemSelectModal,
    inputs: {},
  };
}
```

**핵심:**
- `value`는 key (number/string), `selectedItems`는 표시용 객체. 둘 다 `model<>` 양방향
- 모달이 닫힐 때 반환한 `selectedItemKeys`가 `value`로, `selectedItems`가 `selectedItems`로 자동 반영
- 사용자가 모달을 띄우려면 검색 버튼을 누른다 (`<sd-modal-select-button>` 내장)
- erase 버튼은 `disabled=false && required=false && value 존재` 시 자동 표시

## 4. 패턴 2: `<sd-shared-data-select-button>` (공유 데이터)

메모리에 이미 로드된 `SharedDataBase` 기반 데이터에서 선택할 때 사용한다. `value` 변경 시 `items.filter(by __valueKey)`로 표시 데이터가 자동 채워진다 — 별도 `load()` 호출 불필요.

```typescript
import { Component, signal } from "@angular/core";
import {
  SdSharedDataSelectButton,
  SdItemOfTemplate,
  SdSelectModalInfo,
  SharedDataBase,
} from "@simplysm/angular";

interface IShop extends SharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  name: string;
  code: string;
}

@Component({
  selector: "app-bar",
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
export class BarPage {
  shopId = signal<number | undefined>(undefined);
  shops = signal<IShop[]>([]); // SdSharedDataProvider에서 로드

  shopModalInfo: SdSelectModalInfo<ShopSelectModal> = {
    title: "거래처 선택",
    type: ShopSelectModal,
    inputs: {},
  };
}
```

**핵심:**
- `items`가 source of truth. `value`(key) 또는 `items` 변경 시 표시되는 항목이 자동 재계산됨
- `<ng-template [itemOf]="items()" let-item>`은 항목 템플릿. multi 모드에서는 ", " 구분자로 자동 나열
- `selectMode="multi"`이면 `value`는 `number[]`

## 5. 패턴 3: 사용자 정의 select-button (LotSelectButton 패턴)

도메인별로 자주 쓰는 모달 선택 버튼은 `<sd-modal-select-button>`을 컴포지션하여 wrapper 컴포넌트로 만든다. value(key)만 저장하고 표시용 데이터는 비동기 `load(keys)`로 ORM에서 조회한다.

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  ViewEncapsulation,
  booleanAttribute,
} from "@angular/core";
import {
  SdModalSelectButton,
  SdSelectModalInfo,
} from "@simplysm/angular";
import { AppOrmProvider } from "../app-orm.provider";
import { expr } from "@simplysm/orm-common";
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
    title: "LOT조회",
    inputs: this.modalInputs(),
  }));

  constructor() {
    // value 변경 시 비동기 load → _selectedItems 갱신
    effect(() => {
      const v = this.value();
      if (v == null) {
        this._selectedItems.set([]);
        return;
      }

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

**핵심:**
- `<sd-modal-select-button>`이 모달 호출/erase/invalid 로직 담당 → wrapper는 비동기 load만 추가
- `_selectedItems`는 내부 signal. 외부에서는 `value`만 set
- effect 콜백은 동기여야 하므로 비동기 작업은 `void (async () => { ... })()` IIFE로 감싼다. 로드 함수가 한 곳에서만 호출되므로 별도 private 메서드로 분리하지 않고 effect 내부에 직접 인라인한다
- multi 모드를 지원하려면 `value = model<number[] | undefined>()`로 변경 + `selectMode = input<"single"|"multi">("single")` 추가 + effect의 `expr.in(it.id, [v])`를 배열 전체로 바꾸고 배열 길이 분기 추가

### 5.1 시트 셀 안에 삽입

`[inset]="true"` + `[size]="'sm'"`로 시트 셀에 자연스럽게 녹아든다 (관용 규칙):

```html
<sd-sheet-column [key]="'lotId'" [header]="'LOT'">
  <ng-template [cell]="items()" let-item="item">
    <app-lot-select-button
      [inset]="true"
      [size]="'sm'"
      [(value)]="item.lotId"
      (valueChange)="mark(items)"
    />
  </ng-template>
</sd-sheet-column>
```

## 6. 주의사항

- **`SdDataSelectButton` / `SdDataSelectButtonBase`는 삭제됨.** 기존 `extends SdDataSelectButtonBase` 코드는 패턴 3(사용자 정의 select-button) 형태로 마이그레이션한다.
- **신규 추상화 클래스를 만들지 말 것.** `SelectButtonBase` 같은 공통 부모 클래스를 다시 만들면 본 WBS가 제거한 패턴이 되살아난다. 도메인별 wrapper 컴포넌트를 각자 직접 작성한다.
- **`SdSelectModal<T>` 인터페이스는 모달 컴포넌트가 직접 `implements`한다.** `selectMode`/`selectedItemKeys` `InputSignal`과 `close` `output<SelectModalOutputResult<T>>`를 모두 구현해야 한다.
- **`<sd-shared-data-select-button>`의 `selectedItems`는 외부 노출되지 않는다.** 내부 signal로 자동 관리되므로 외부에서는 `value` + `items`만 set한다. 직접 set이 필요하면 패턴 3로 wrapper를 작성한다.
- **`effect()` 내부의 비동기 호출은 `void` 키워드 또는 별도 메서드 호출**로 처리한다. effect 콜백을 `async`로 만들면 cleanup 시점이 어긋난다.

## 7. Cross-reference

- 선택 모달이 CRUD 리스트와 동일한 컴포넌트일 때 — [crud-list.md §8 확장 D: 선택 모달 전환](./crud-list.md#8-확장-d-선택-모달-전환) 참조
- 공유 데이터 드롭다운(`SdSharedDataSelect`) / 목록형 선택(`SdSharedDataSelectList`) — [features.md](../features.md) 참조
- `SdModalSelectButton` 자체 API — `packages/angular/src/controls/button/sd-modal-select-button.ts:148`
- `SharedDataBase` / `SdSharedDataProvider` — [features.md](../features.md), `packages/angular/src/core/shared-data/sd-shared-data.provider.ts`
