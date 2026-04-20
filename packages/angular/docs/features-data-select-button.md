# Feature: SdDataSelectButton

모달 기반 선택 버튼 추상화. 키(ID)만 value로 저장하고, 표시에 필요한 데이터는 비동기로 `load(keys)` 호출하여 조회한다. 선택 모달은 `SdSelectModal`을 구현하는 임의 컴포넌트.

- `SdDataSelectButtonBase`: `packages/angular/src/data/data-select-button/sd-data-select-button.base.ts`
- `SdDataSelectButton`: `packages/angular/src/data/data-select-button/sd-data-select-button.ts`

## 1. Overview

`SdDataSelectButtonBase<TItem, TKey, TMode>`를 상속하여 구현 클래스를 만들고, 템플릿 루트에 `<sd-data-select-button>`을 배치한다. `<sd-data-select-button>`은 `injectParent<SdDataSelectButtonBase<…>>()`로 부모 상속자를 자동 감지한다.

**핵심 동작**:
1. `value` (TKey 또는 TKey[])가 변경되면 자동으로 `load(keys)`를 호출하여 `selectedItems` 갱신
2. 검색 버튼 클릭 → 지정된 `modal`을 띄움 → 결과의 `selectedItemKeys`를 `value`로 반영
3. 지우기 버튼 클릭 → `value`를 초기값(single: `undefined`, multi: `[]`)으로 리셋

## 2. 언제 사용하는가

| 상황 | 권장 |
|---|---|
| 외부 대형 테이블(수만 건+)에서 모달로 선택해야 할 때 | **SdDataSelectButton** |
| 선택 후 ID만 저장하고, 표시 텍스트는 DB 조회로 구성 | **SdDataSelectButton** |
| 메모리에 로드된 공유 데이터 목록(`SharedDataBase`)에서 선택 | `SdSharedDataSelect` / `SdSharedDataSelectButton` |
| 단순 Enum 선택 (정적 옵션 목록) | `SdSelect` / `SdSelectItem` |
| 특정 모달 컴포넌트를 1회성으로 띄워 선택하는 경우 | `SdModalSelectButton` (직접 모달 컴포넌트 지정) |

실무 대비:
- `SdSharedDataSelect`와의 차이: 공유 데이터는 이미 메모리에 있어서 `load` 불필요, `items` input으로 직접 전달
- `SdModalSelectButton`과의 차이: 단일 범용 선택 버튼. 프로젝트 공통 선택 버튼으로 추상화할 때 `SdDataSelectButton` 사용
- v12 centurymes의 `LotSelectButtonControl`, `GoodsSelectButtonControl` 등이 전형 패턴

## 3. 기본 사용 패턴

```typescript
@Component({
  selector: "app-lot-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataSelectButton, SdItemOfTemplate],
  template: `
    <sd-data-select-button>
      <ng-template [itemOf]="selectedItems()" let-item>
        {{ item.code }}
      </ng-template>
    </sd-data-select-button>
  `,
})
export class LotSelectButton extends SdDataSelectButtonBase<ILot, number> {
  private readonly _appOrm = inject(AppOrmProvider);

  modalInputs = input.required<SdSelectModalInfo<LotPage>["inputs"]>();

  modal = computed(() => ({
    type: LotPage,
    title: "LOT조회",
    inputs: this.modalInputs(),
  }));

  override async load(keys: number[]): Promise<ILot[]> {
    return this._appOrm.connectAsync(async (db) => {
      return db.lot()
        .where((item) => [expr.in(item.id, keys)])
        .select((item) => ({
          id: item.id,
          code: item.code,
        }))
        .execute();
    });
  }
}

interface ILot {
  id: number;
  code: string;
}
```

사용:

```html
<app-lot-select-button
  [required]="true"
  [disabled]="!canEdit()"
  [(value)]="data().lotId"
  (valueChange)="mark(data)"
  [modalInputs]="{}"
/>
```

## 4. 추상 API (Base 클래스)

### 4.1 클래스 시그니처

```typescript
@Directive()
abstract class SdDataSelectButtonBase<
  TItem extends object,                                 // 선택 항목 타입 (load가 반환)
  TKey,                                                  // 키 타입 (value)
  TMode extends keyof SelectModeValue<TKey> = keyof SelectModeValue<TKey>,
                                                         // "single" | "multi"
>
```

`SelectModeValue<T>`는 `{ single: T; multi: T[] }`이며, `TMode`에 따라 `value`의 타입이 `T`(single) 또는 `T[]`(multi)가 된다.

### 4.2 필수 override (abstract 멤버)

| 멤버 | 타입 | 역할 |
|---|---|---|
| `modal` | `Signal<SdSelectModalInfo<SdSelectModal<any>>>` | 검색 클릭 시 띄울 모달 정보. `{ type, title?, inputs? }` |
| `load(keys)` | `async (TKey[]) => TItem[]` | value에 대응하는 실제 아이템 조회 (표시용). `selectedItems`에 반영됨 |

### 4.3 선택 override

없음. 동작 커스터마이즈는 override보다 template slot / `value` model 바인딩으로 수행.

### 4.4 타입 정의

```typescript
// Re-used from select
type SelectModeValue<T> = {
  multi: T[];
  single: T;
};

// From sd-modal-select-button
interface SdSelectModal<T> extends SdModalContentDef<SelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}

type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<
  T,
  "selectMode" | "selectedItemKeys"
>;

interface SelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}
```

모달 컴포넌트는 `SdSelectModal<TItem>`을 구현해야 한다. `SdDataSheetBase` 상속자는 자동으로 구현하므로 그대로 쓸 수 있다.

## 5. Base가 상속자에 노출하는 input / model / signal

### 5.1 input (소비 코드에서 `<app-lot-select-button [input]=…>` 형식으로 바인딩)

| Input | Type | Default | Description |
|---|---|---|---|
| `value` | `SelectModeValue<TKey>[TMode]` (model) | single: `undefined`, multi: `[]` | 선택된 키 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `required` | `boolean` | `false` | 필수 값 (empty 시 "값을 입력하세요" invalid 처리) |
| `inset` | `boolean` | `false` | 테두리·배경 제거 스타일 (시트 셀 삽입 등) |
| `size` | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `selectMode` | `TMode` | `"single"` | 단일/다중 선택 모드 |

### 5.2 signal

| signal | 타입 | 설명 |
|---|---|---|
| `selectedItems` | `WritableSignal<TItem[]>` | `load(value)` 결과. 템플릿에서 `{{ selectedItems() }}`로 표시 |
| `isNoValue` | `Signal<boolean>` | value 비어있음 여부 (single: null/undefined, multi: `length === 0`) |

### 5.3 메서드

| 메서드 | 시그니처 | 용도 |
|---|---|---|
| `doShowModal(options?)` | `async (SdModalOptions?) => void` | 검색 버튼 클릭 핸들러. `modal()`의 modal 띄우고 선택 결과를 `value`에 반영 |
| `doInitialValue()` | `() => void` | 지우기 버튼 핸들러. value를 초기값으로 리셋 |

### 5.4 protected 필드

| 필드 | 타입 | 용도 |
|---|---|---|
| `_sdModal` | `SdModalProvider` | `doShowModal` 내부에서 사용. 상속자가 커스텀 모달 호출 시 재사용 가능 |

### 5.5 자동 동작 (effect)

`value`와 `selectMode`를 의존성으로 하는 effect가 내부에 있다. value가 변경되면 자동으로:
- `selectMode === "multi"` + 배열 + `filterExists().length > 0` → `load()` 호출
- `selectMode === "single"` + 배열 아님 + value not null → `load()` 호출
- 그 외 → `selectedItems`를 `[]`로 리셋

**주의**: `load()`는 `value`가 **컴포넌트에 바인딩된 직후**에도 자동 호출된다. caller가 초기값을 전달하면 load가 자동 실행되어 표시 채움.

### 5.6 자동 validation

`required() === true` + `value() == null`이면 `setupInvalid`를 통해 `"값을 입력하세요."` invalid 메시지가 자동 붙는다 (form validation 연동).

## 6. SdDataSelectButton 컴포넌트 입력 / 템플릿 슬롯

### 6.1 `<sd-data-select-button>` 입력

`<sd-data-select-button>` 자체에는 사용자용 input이 없다. 모든 동작은 Base 상속자의 `input`에서 결정된다. Base의 input은 hostDirective처럼 자동으로 호스트 요소(`<app-xxx-select-button>`)에 노출된다.

### 6.2 Content Children (템플릿)

| 슬롯 | 형식 | 용도 |
|---|---|---|
| `SdItemOfTemplate` | `<ng-template [itemOf]="selectedItems()" let-item>` | 선택된 항목 표시 (필수) |

multi 모드에서는 선택된 각 항목을 `, `로 구분하여 나열한다.

`<ng-content>` 영역도 있어 `itemTplRef` 이후 추가 컨텐츠를 배치할 수 있다 (일반적으로 사용하지 않음).

### 6.3 host 속성

- `[attr.data-sd-disabled]`: `disabled()` 반영 (CSS 스타일링에 사용)

### 6.4 자동 렌더링 버튼

| 버튼 | 조건 |
|---|---|
| 지우기 (빨간 X) | `!disabled()` + `!isNoValue()` + `!required()` |
| 검색 (돋보기) | `!disabled()` |

내부적으로 `<sd-additional-button>` 래핑을 사용하여 input-style UI를 구성한다.

## 7. 모달 컴포넌트 요구사항

`modal()`이 가리키는 컴포넌트는 `SdSelectModal<TItem>`을 구현해야 한다.

```typescript
interface SdSelectModal<T> extends SdModalContentDef<SelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

요구 조건:
- `close = output<SelectModalOutputResult<T>>()` 선언 (`{ selectedItemKeys, selectedItems }` emit)
- `selectMode: InputSignal<…>` 노출 — `SdDataSelectButton`이 자동으로 전달
- `selectedItemKeys: InputSignal<any[]>` 노출 — 기존 선택 값이 자동 전달

**편리한 선택지**: `SdDataSheetBase` 상속자는 `SdSelectModal<TItem>`을 자동으로 구현하므로 바로 `modal.type`으로 사용 가능하다. 즉 CRUD 페이지를 그대로 선택 모달로 재사용 가능.

```typescript
// LotPage extends SdDataSheetBase<...> 이므로 SdSelectModal 구현함
modal = computed(() => ({
  type: LotPage,
  title: "LOT조회",
  inputs: { /* LotPage의 추가 input */ },
}));
```

## 8. 합성 패턴

### 8.1 modalInputs를 외부에서 받기

재사용성을 위해 모달 입력을 input으로 받아 pass-through:

```typescript
export class LotSelectButton extends SdDataSelectButtonBase<ILot, number> {
  modalInputs = input.required<SdSelectModalInfo<LotPage>["inputs"]>();

  modal = computed(() => ({
    type: LotPage,
    title: "LOT조회",
    inputs: this.modalInputs(),
  }));

  override async load(keys: number[]) { /* ... */ }
}
```

사용:

```html
<app-lot-select-button
  [modalInputs]="{ onlyActive: true, customerId: 123 }"
  [(value)]="data().lotId"
/>
```

### 8.2 시트 셀 안에 삽입

`[inset]="true"` + `[size]="'sm'"`로 시트 셀에 녹여서 사용:

```html
<sd-data-sheet-column [key]="'lotId'" [header]="'LOT'">
  <ng-template [cell]="items()" let-item>
    <app-lot-select-button
      [inset]="true"
      [size]="'sm'"
      [required]="true"
      [disabled]="!canEdit()"
      [(value)]="item.lotId"
      (valueChange)="mark(items)"
      [modalInputs]="{}"
    />
  </ng-template>
</sd-data-sheet-column>
```

### 8.3 상세 폼 안의 단일 선택

```html
<sd-data-detail>
  <ng-template #contentTpl>
    <table class="form-table">
      <tr>
        <th>LOT</th>
        <td>
          <app-lot-select-button
            [required]="true"
            [disabled]="!canEdit()"
            [(value)]="data().lotId"
            (valueChange)="mark(data)"
            [modalInputs]="{}"
          />
        </td>
      </tr>
    </table>
  </ng-template>
</sd-data-detail>
```

### 8.4 멀티 선택

```typescript
export class TagSelectButton extends SdDataSelectButtonBase<ITag, number> {
  override async load(keys: number[]) { /* ... */ }
}
```

```html
<app-tag-select-button
  [selectMode]="'multi'"
  [(value)]="data().tagIds"
  (valueChange)="mark(data)"
/>
```

multi 모드에서 `value`는 `number[]`, 표시는 `, ` 구분으로 자동 렌더링.

## 9. 관용 규칙

### 9.1 `load(keys)` 구현 시 주의

- `keys`는 항상 배열이지만 `selectMode === "single"`이면 길이 1, multi면 그대로 전달된 값
- `keys`에 포함된 순서를 유지할 필요 없음 (`selectedItems`는 `items` 순서 그대로 표시됨)
- 삭제된 항목도 조회 결과에 포함해야 표시 가능 (호출 측에서 필터하지 않음)

### 9.2 `modal` 시그널로 선언

`modal`은 **반드시 `Signal`**로 선언한다. 정적 객체를 쓰려고 `readonly modal = { … }`로 선언하면 안 됨 — abstract 시그니처가 Signal이므로 TypeScript 오류.

```typescript
// ✕ 오류
modal = { type: LotPage, title: "LOT조회", inputs: {} };

// ○ 정적이더라도 signal로
modal = computed(() => ({ type: LotPage, title: "LOT조회", inputs: {} }));

// ○ 동적
modalInputs = input.required<…>();
modal = computed(() => ({ type: LotPage, title: "LOT조회", inputs: this.modalInputs() }));
```

### 9.3 `selectMode` 재선언 불필요

abstract가 아닌 일반 input으로 Base에 선언되어 있어 상속자는 재선언 불필요. `<app-foo-select-button [selectMode]="'multi'">`로 바로 사용.

### 9.4 초기 로드 동작

컴포넌트 장착 시점에 `value`가 채워져 있으면 자동 `load` 호출. 초기에 `load` 호출을 피하고 싶으면 `value`를 `undefined`로 시작하고 나중에 주입.

### 9.5 value 변경 전파

`SdDataSelectButton`이 사용자 선택 후 `value.set(newValue)` 호출하므로 model 바인딩(`[(value)]`)으로 연결하면 caller의 data가 업데이트된다. `(valueChange)="mark(data)"`로 상위 signal 변경 감지 유발.

## 10. 실전 예시

### 10.1 단일 선택 (LotSelectButton, v12 번역)

v12 원본: `D:/workspaces-12/centurymes/packages/client-admin/src/app/home/base/lot/LotSelectButtonControl.ts`

v14 API로 번역:

```typescript
@Component({
  selector: "app-lot-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataSelectButton, SdItemOfTemplate],
  template: `
    <sd-data-select-button>
      <ng-template [itemOf]="selectedItems()" let-item>
        {{ item.code }}
      </ng-template>
    </sd-data-select-button>
  `,
})
export class LotSelectButton extends SdDataSelectButtonBase<ILot, number> {
  private readonly _appOrm = inject(AppOrmProvider);

  modalInputs = input.required<SdSelectModalInfo<LotPage>["inputs"]>();

  modal = computed(() => ({
    type: LotPage,
    title: "LOT조회",
    inputs: this.modalInputs(),
  }));

  override async load(keys: number[]): Promise<ILot[]> {
    return this._appOrm.connectAsync(async (db) => {
      return db.lot()
        .where((item) => [expr.in(item.id, keys)])
        .select((item) => ({
          id: item.id,
          code: item.code,
        }))
        .execute();
    });
  }
}

interface ILot {
  id: number;
  code: string;
}
```

**v12 → v14 매핑**:

| v12 | v14 |
|---|---|
| `AbsSdDataSelectButton` | `SdDataSelectButtonBase` |
| `SdDataSelectButtonControl` | `SdDataSelectButton` |
| `SdItemOfTemplateDirective` | `SdItemOfTemplate` |
| `TSdSelectModalInfo` | `SdSelectModalInfo` |
| `$computed(…)` | `computed(…)` (from @angular/core) |
| `db.lot.where(…).select(…).resultAsync()` | `db.lot().where(…).select(…).execute()` |
| `db.qh.in(...)` | `expr.in(...)` (from `@simplysm/orm-common`) |

사용:

```html
<app-lot-select-button
  [required]="true"
  [disabled]="!canEdit()"
  [(value)]="data().lotId"
  (valueChange)="mark(data)"
  [modalInputs]="{}"
/>
```

### 10.2 시트 내부에서 사용 (inset + sm)

```html
<sd-data-sheet-column [key]="'lotId'" [header]="'LOT'">
  <ng-template [cell]="items()" let-item>
    <app-lot-select-button
      [inset]="true"
      [size]="'sm'"
      [required]="true"
      [disabled]="!canEdit()"
      [(value)]="item.lotId"
      (valueChange)="mark(items)"
      [modalInputs]="{ customerId: item.customerId }"
    />
  </ng-template>
</sd-data-sheet-column>
```

셀 안에서 `modalInputs`를 row별로 다르게 전달 가능 (행마다 다른 조건으로 조회).

---

## Cross-reference

- `SdDataSheet` — 시트 CRUD 추상화 (모달 타입으로 자주 사용됨). → `features-data-sheet.md`
- `SdDataDetail` — 상세 폼 추상화. → `features-data-detail.md`
- `SdModalSelectButton` — 1회성 모달 선택 버튼 (modal input 직접 지정). → `ui-form.md` (또는 controls 섹션)
- `SdSharedDataSelect` / `SdSharedDataSelectButton` — 공유 데이터 선택. → `features.md`
- `SdSelectModal<T>`, `SdSelectModalInfo<T>`, `SelectModalOutputResult<T>` — 모달 선택 인터페이스. → `provider-types.md`
- `SelectModeValue<T>` — 선택 모드별 value 타입 매핑. → `provider-types.md` / `ui-form.md`
