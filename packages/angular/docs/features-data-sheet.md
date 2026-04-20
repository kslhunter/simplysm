# Feature: SdDataSheet

데이터 시트 CRUD 추상화. 조회 필터, 페이지네이션, 정렬, 인라인/모달 편집, 엑셀 업·다운로드, 모달 선택을 한 번에 제공한다.

- `SdDataSheetBase`: `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts`
- `SdDataSheet`: `packages/angular/src/data/data-sheet/sd-data-sheet.ts`
- `SdDataSheetColumn`: `packages/angular/src/data/data-sheet/sd-data-sheet-column.ts`
- 타입: `packages/angular/src/data/data-sheet/sd-data-sheet.types.ts`

## 1. Overview

`SdDataSheetBase<TFilter, TItem, TKey>`를 상속하여 구현 클래스를 만들고, 템플릿 루트에 `<sd-data-sheet>`를 배치한다. `<sd-data-sheet>`는 `injectParent<SdDataSheetBase<…>>()`로 부모 상속자를 자동 감지하여 렌더링한다.

`SdDataSheetBase`는 `SdSelectModal<TItem>`을 구현하므로 `<sd-modal-select-button>` / `<sd-shared-data-select>`의 `modal` 입력으로 그대로 사용 가능하다.

## 2. 언제 사용하는가

| 상황 | 권장 |
|---|---|
| CRUD 화면의 루트 (list + filter + pagination + 등록/저장/삭제/엑셀) | **SdDataSheet** |
| 동일 화면을 모달 선택 용도로도 재사용해야 하는 경우 | **SdDataSheet** (`selectMode` input으로 자동 대응) |
| 상세 화면 내부의 단순 행렬 표시 (필터/페이지네이션 불필요) | `SdSheet` (기본 시트) |
| 정적 데이터를 단순 나열만 하는 경우 | `SdSheet` |

실무 대비:
- `InboundInstructionPage.ts:18` — 루트에 `<app-inbound-instruction-sheet>`(`SdDataSheetBase` 상속) + 상세 분할
- `InboundInstructionDetail.ts:226` — `<sd-data-detail>` 내부에 `<sd-sheet>`(단순 시트) 사용
- `CustomerPage.ts:295` — `CustomerPage extends SdDataSheetBase<…>`, 루트 `<sd-data-sheet>`

## 3. 기본 사용 패턴 (인라인 편집)

```typescript
@Component({
  selector: "app-foo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn, SdSheetColumnCellTemplate, SdTextfield],
  template: `
    <sd-data-sheet>
      <ng-template #filterTpl>
        <div>
          <label>검색어</label>
          <sd-textfield [(value)]="filter().searchText" (valueChange)="mark(filter)" />
        </div>
      </ng-template>

      <sd-data-sheet-column [key]="'id'" [header]="'#'" [fixed]="true">
        <ng-template [cell]="items()" let-item>
          <div class="p-xs-sm tx-right">{{ item.id }}</div>
        </ng-template>
      </sd-data-sheet-column>

      <sd-data-sheet-column [key]="'name'" [header]="'명칭'">
        <ng-template [cell]="items()" let-item let-edit="edit">
          <sd-textfield
            [inset]="true" [size]="'sm'" [type]="'text'" [required]="true"
            [disabled]="!canEdit()" [readonly]="!edit"
            [(value)]="item.name" (valueChange)="mark(items)"
          />
        </ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
export class FooPage extends SdDataSheetBase<IFilter, IItem, number | undefined> {
  private readonly _appOrm = inject(AppOrmProvider);

  override canUse = computed(() => true);
  override canEdit = computed(() => true);
  override editMode = "inline" as const;
  override selectMode = input<"single" | "multi" | undefined>();

  override bindFilter(): IFilter {
    return { searchText: undefined };
  }

  override itemPropInfo: SdDataSheetItemPropInfo<IItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: "lastModifiedAt",
    lastModifiedBy: "lastModifiedBy",
  };

  override getItemInfoFn = (item: IItem) => ({
    key: item.id,
    canSelect: item.id != null,
    canEdit: true,
    canDelete: true,
  });

  override async search(usePagination: boolean): Promise<SdDataSheetSearchResult<IItem>> {
    return this._appOrm.connectAsync(async (db) => {
      let qr = db.foo();
      if (!str.isNullOrEmpty(this.lastFilter().searchText)) {
        qr = qr.search((item) => [item.name], this.lastFilter().searchText!);
      }
      const pageLength = usePagination ? Math.ceil((await qr.count()) / 50) : undefined;
      for (const s of this.sortingDefs()) {
        qr = qr.orderBy((item) => obj.getChainValue(item, s.key) as any, s.desc ? "DESC" : "ASC");
      }
      if (usePagination) qr = qr.limit(this.page() * 50, 50);
      return { items: await qr.execute(), pageLength };
    });
  }

  override newItem(): IItem {
    return { isDeleted: false };
  }

  override async submit(diffs: ArrayOneWayDiffResult<IItem>[]): Promise<boolean> {
    // DB 저장 로직
    return true;
  }

  protected readonly mark = mark;
}

interface IFilter { searchText?: string; }
interface IItem {
  id?: number;
  name?: string;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
```

## 4. 추상 API (Base 클래스)

### 4.1 클래스 시그니처

```typescript
@Directive()
abstract class SdDataSheetBase<
  TFilter extends Record<string, any>,        // 필터 상태 타입
  TItem,                                       // 행 아이템 타입
  TKey extends string | number | undefined,    // 아이템 키 타입
> implements SdSelectModal<TItem>
```

### 4.2 필수 override (abstract 멤버)

| 멤버 | 타입 | 역할 |
|---|---|---|
| `canUse` | `Signal<boolean>` | 조회/사용 권한. `false`면 `<sd-base-container>`가 "권한 없음" 메시지 표시 |
| `canEdit` | `Signal<boolean>` | 편집 권한. `false`면 등록/저장/삭제 등 편집 UI 숨김 |
| `editMode` | `"inline" \| "modal"` | 편집 모드. `inline`=시트에서 직접 편집, `modal`=별도 상세 모달(`editItem`) 호출 |
| `selectMode` | `InputSignal<"single" \| "multi" \| undefined>` | 모달 선택 모드. `input<…>()`로 **재선언**하여 override |
| `bindFilter()` | `() => TFilter` | 필터 초기값. `linkedSignal`의 source로 사용되어 상위 context 변경 시 자동 재설정 |
| `itemPropInfo` | `SdDataSheetItemPropInfo<TItem>` | 아이템의 메타 속성 키 매핑 (삭제플래그/최종수정일시/최종수정자) |
| `getItemInfoFn` | `(item: TItem) => SdDataSheetItemInfo<TKey>` | 아이템별 동적 정보 (key/canSelect/canEdit/canDelete) |
| `search(usePagination)` | `async (boolean) => SdDataSheetSearchResult<TItem>` | 조회 로직. `usePagination=false`면 엑셀용 전체 조회 |

### 4.3 선택 override (optional 멤버)

| 멤버 | 타입 | 역할 | 언제 |
|---|---|---|---|
| `hideTool` | `Signal<boolean>` | `true`면 도구 바 전체 숨김 | 필요 시 |
| `diffsExcludes` | `string[]` | inline 변경 diff 비교에서 제외할 필드 키 목록 | 표시전용 파생 필드가 있을 때 |
| `prepareRefreshEffect()` | `() => void` | 새로고침 effect 의존성 등록점 | 외부 input/signal 변경 시 refresh 트리거 필요할 때 |
| `editItem(item?)` | `async (item?) => boolean \| undefined` | 등록/편집 모달 띄우고 성공 여부 반환 | `editMode === "modal"` |
| `toggleDeleteItems(del)` | `async (boolean) => boolean` | 선택 항목 일괄 삭제/복구 | `editMode === "modal"` |
| `newItem()` | `async () => TItem` | 행 추가 시 초기 아이템 반환 | `editMode === "inline"` |
| `submit(diffs)` | `async (diffs) => boolean` | 변경된 항목 일괄 저장 | `editMode === "inline"` |
| `downloadExcel(items)` | `async (items) => void` | 엑셀 다운로드 구현 | 다운로드 기능 제공 시 |
| `uploadExcel(file)` | `async (file) => void` | 엑셀 업로드 구현 | 업로드 기능 제공 시 |

> 선택 override가 **정의되어 있으면** 해당 기능 버튼이 자동으로 도구 바에 나타난다.

### 4.4 타입 정의

```typescript
interface SdDataSheetItemPropInfo<I> {
  isDeleted: (keyof I & string) | undefined;       // 지정 시 inline 모드에서 삭제/복구 컬럼 자동 추가, 삭제행에 취소선 자동 적용
  lastModifiedAt: (keyof I & string) | undefined;  // 지정 시 '수정일시' 컬럼 자동 추가 (기본 hidden)
  lastModifiedBy: (keyof I & string) | undefined;  // 지정 시 '수정자' 컬럼 자동 추가 (기본 hidden)
}

interface SdDataSheetItemInfo<K> {
  key: K;             // trackBy 및 selectedItemKeys에 사용되는 고유 키
  canSelect: boolean; // false면 모달 선택 모드에서 체크박스 비활성
  canEdit: boolean;   // modal 모드에서 false면 행 편집 앵커 비활성
  canDelete: boolean; // inline 모드에서 false면 행 삭제 앵커 비활성
}

interface SdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;     // usePagination=true일 때 총 페이지 수
  summary?: Partial<I>;    // 요약 행 데이터
}
```

## 5. Base가 상속자에 노출하는 signal / 메서드

상속자의 **템플릿과 메서드**에서 직접 접근 가능하다.

### 5.1 signal

| signal | 타입 | 설명 |
|---|---|---|
| `items` | `WritableSignal<TItem[]>` | 조회된 항목 (search 결과) |
| `filter` | `WritableSignal<TFilter>` | 현재 입력 중인 필터 (조회 전). `bindFilter()`를 source로 한 `linkedSignal` |
| `lastFilter` | `WritableSignal<TFilter>` | 실제 적용된 필터 (조회 후). **`search()` 내부에서 이 값을 사용** |
| `sortingDefs` | `WritableSignal<SortingDef[]>` | 정렬 상태. `search()` 내부에서 사용. **`SortingDef.key`는 컬럼 `key`에 지정된 값 그대로이므로 `"vendor.name"` 같은 체인 경로일 수 있다.** `search()`에서 `item[s.key]` 단순 접근 금지 → `obj.getChainValue(item, s.key)` 사용 (자세한 내용은 §9.4) |
| `page` | `WritableSignal<number>` | 현재 페이지 (0-index) |
| `pageLength` | `WritableSignal<number>` | 총 페이지 수 (search 결과로 자동 세팅) |
| `selectedItems` | `WritableSignal<TItem[]>` | 현재 선택된 항목 |
| `selectedItemKeys` | `ModelSignal<TKey[]>` | 페이지 전환에도 유지되는 누적 선택 키 |
| `summaryData` | `WritableSignal<Partial<TItem>>` | 요약 행 데이터 (search 결과로 자동 세팅) |
| `busyCount` | `WritableSignal<number>` | busy 카운터 (>0이면 busy 표시) |
| `busyMessage` | `WritableSignal<string \| undefined>` | busy 메시지 |
| `initialized` | `WritableSignal<boolean>` | 초기화 완료 여부 |
| `viewType` | `Signal<SdViewType>` | 현재 뷰 타입 (`"page" \| "modal" \| "control"`) |
| `autoSelect` | `Signal<"click" \| undefined>` | 내부 계산. single 모달 모드에서 행 클릭 즉시 선택 |
| `isSelectedItemsHasDeleted` | `Signal<boolean>` | 선택 항목 중 삭제된 것 존재 여부 |
| `isSelectedItemsHasNotDeleted` | `Signal<boolean>` | 선택 항목 중 미삭제인 것 존재 여부 |

### 5.2 메서드 (액션 핸들러)

| 메서드 | 시그니처 | 용도 |
|---|---|---|
| `doFilterSubmit()` | `() => void` | 조회 버튼 핸들러. `filter` → `lastFilter` 복제 + 페이지 0 |
| `doRefresh()` | `() => void` | 새로고침 (Ctrl+Alt+L 기본 연결). 내부적으로 `mark(lastFilter)`로 refresh effect 재실행 |
| `refresh()` | `async () => void` | 직접 refresh 호출 (저장 완료 등 직후) |
| `doAddItem()` | `async () => void` | inline 행 추가 (`newItem()` 호출) |
| `doSubmit(opt?)` | `async (opt?) => void` | inline 저장 (Ctrl+S). `opt.permCheck`·`opt.hideNoChangeMessage` |
| `doToggleDeleteItem(item)` | `(item) => void` | inline 단일 행 삭제/복구 토글 (신규 행이면 배열에서 제거) |
| `doEditItem(item?)` | `async (item?) => void` | modal 편집/등록 (`editItem()` 호출 + refresh) |
| `doToggleDeleteItems(del)` | `async (boolean) => void` | modal 선택 항목 일괄 삭제/복구 |
| `doModalConfirm()` | `() => void` | 모달 선택 확인. `close.emit({ selectedItemKeys, selectedItems })` |
| `doModalCancel()` | `() => void` | 모달 선택 해제. `close.emit({ selectedItemKeys: [], selectedItems: [] })` |
| `doDownloadExcel()` | `async () => void` | 엑셀 다운로드. 내부적으로 `search(false)` 호출 후 `downloadExcel(items)` |
| `doUploadExcel()` | `async () => void` | 엑셀 업로드. 파일 다이얼로그 → `uploadExcel(file)` → refresh |
| `checkIgnoreChanges()` | `() => boolean` | 변경사항 있으면 confirm, 없으면 true. `setupCanDeactivate` 연결 |

### 5.3 헬퍼 필드

| 필드 | 타입 | 용도 |
|---|---|---|
| `trackByFn` | `(item) => TKey \| TItem` | 시트 trackBy (`getItemInfoFn(item).key ?? item`) |
| `getItemCellStyleFn` | `(item) => string \| undefined` | 삭제된 행에 `text-decoration: line-through;` 자동 적용 |
| `getItemSelectableFn` | `(item) => boolean` | `getItemInfoFn(item).canSelect` 반환 |
| `key` | `string` | `reflectComponentType(constructor).selector ?? constructor.name`. 내부 `<sd-sheet>`에 `key + '-sheet'`로 전달되어 설정 저장에 사용 |
| `actionTplRef` | `TemplateRef<any> \| undefined` | `<sd-data-sheet>`가 세팅하는 모달 액션 템플릿 참조 (직접 건드리지 않음) |

### 5.4 output

| output | 타입 | 설명 |
|---|---|---|
| `close` | `OutputEmitterRef<SelectModalOutputResult<TItem>>` | 모달 선택 시 emit. `{ selectedItemKeys, selectedItems }` |
| `submitted` | `OutputEmitterRef<boolean>` | inline 저장 성공 시 emit |

## 6. SdDataSheet 컴포넌트 입력 / 템플릿 슬롯

### 6.1 `<sd-data-sheet>` 입력

| Input | Type | Default | Description |
|---|---|---|---|
| `insertText` | `string \| undefined` | `undefined` | modal 모드 등록 버튼 텍스트 (기본 `"등록"`) |
| `deleteText` | `string \| undefined` | `undefined` | 삭제 버튼 텍스트 (기본 `"삭제"`) |
| `restoreText` | `string \| undefined` | `undefined` | 복구 버튼 텍스트 (기본 `"복구"`) |
| `deleteIcon` | `string` | `tablerEraser` | 삭제 아이콘 |
| `restoreIcon` | `string` | `tablerRestore` | 복구 아이콘 |

### 6.2 Content Children (명명 템플릿)

`<sd-data-sheet>` 안에 `<ng-template #슬롯명>` 형식으로 배치한다.

| 슬롯명 | 렌더링 위치 | 용도 |
|---|---|---|
| `#pageTopbarTpl` | 페이지 탑바 (기본 저장/새로고침 뒤) | 페이지 모드 전용 추가 버튼 |
| `#prevTpl` | 상단 고정 바 | 안내/요약 영역 |
| `#filterTpl` | 조회 폼 내부 (조회 버튼 옆) | 필터 폼 내용. 조회 버튼은 자동 렌더링되고 form submit에 연결됨 |
| `#beforeToolTpl` | 도구 바 — "등록/행 추가" 뒤, "선택 삭제/엑셀" 앞 | 커스텀 도구 버튼 (앞쪽) |
| `#toolTpl` | 도구 바 마지막 | 커스텀 도구 버튼 (뒤쪽) |
| `#modalBottomTpl` | 모달 바닥 (selectMode 활성 시) | 모달 하단 커스텀 영역 (확인/해제 버튼 왼쪽) |

### 6.3 컬럼 정의

`<sd-data-sheet-column>` 디렉티브로 컬럼을 정의한다. `SdSheetColumn`을 확장하여 `edit` input을 추가한다.

```typescript
@Directive({ selector: "sd-data-sheet-column" })
class SdDataSheetColumn extends SdSheetColumn {
  edit = input(false, { transform: booleanAttribute });
}
```

| Input (상속 포함) | Type | Description |
|---|---|---|
| `key` | `string` | 컬럼 식별 키 (required) |
| `header` | `string \| string[]` | 헤더 텍스트. 배열이면 멀티 행 헤더 |
| `headerStyle` | `string` | 헤더 셀 인라인 스타일 |
| `tooltip` | `string` | 헤더 툴팁 |
| `width` | `string` | 너비 (예: `"100px"`) |
| `fixed` | `boolean` | 고정 컬럼 |
| `hidden` | `boolean` | 숨김 |
| `collapse` | `boolean` | 접힘 |
| `disableSorting` | `boolean` | 정렬 비활성화 |
| `disableResizing` | `boolean` | 리사이즈 비활성화 |
| `ordering` | `number` | 순서 |
| `edit` | `boolean` | **data-sheet 추가**: `editMode === "modal"`일 때 셀 클릭 시 편집 앵커 렌더링 |

Content children (`SdSheetColumn`과 동일):
- `ng-template[cell]` (required, `SdSheetColumnCellTemplate`): 셀 내용
- `#headerTpl`: 커스텀 헤더
- `#summaryTpl`: 요약 행

**셀 내용 규칙**: 일반 값은 `<div class="p-xs-sm">` 래퍼로 감싼다. 컨트롤(textfield/select/checkbox 등) 삽입 시 반드시 `[inset]="true"`와 `[size]="'sm'"` 지정 (자세한 예시는 `ui-data.md`의 `SdSheetColumnCellTemplate` 섹션).

### 6.4 자동 렌더링 컬럼

다음 컬럼은 조건에 따라 자동으로 추가된다.

| 조건 | 컬럼 |
|---|---|
| `editMode === "inline" && canEdit() && itemPropInfo.isDeleted != null` | 삭제/복구 토글 컬럼 (맨 앞, fixed) |
| `itemPropInfo.lastModifiedAt != null` | '수정일시' 컬럼 (hidden 기본) |
| `itemPropInfo.lastModifiedBy != null` | '수정자' 컬럼 (hidden 기본) |

## 7. 내장 버튼 / 단축키

### 7.1 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Ctrl+S` | `doSubmit({ permCheck: true })` | inline 모드 (submit 정의 시) |
| `Ctrl+Alt+L` | `doRefresh()` | 항상 |

> `Ctrl+Insert`는 `SdDataSheet` 자체에는 연결되어 있지 않다. 페이지 레벨 `[sdInsertCommand]` 디렉티브로 별도 배치한다.

### 7.2 자동 렌더링 버튼

| 버튼 | 조건 |
|---|---|
| 페이지 저장 (`CTRL+S`) | page 모드 + `canEdit()` + `submit` 정의 |
| 페이지 새로고침 (`CTRL+ALT+L`) | page 모드 (항상) |
| control 모드 저장/새로고침 바 | control 모드 + `canEdit()` + `submit` 정의 |
| 조회 | `#filterTpl` 슬롯 있을 때 (form submit) |
| 등록 (modal) | `canEdit()` + `editMode === "modal"` + `editItem` 정의 |
| 행 추가 (inline) | `canEdit()` + `editMode === "inline"` + `newItem` 정의 |
| 선택 삭제 | `canEdit()` + `editMode === "modal"` + `toggleDeleteItems` 정의 |
| 선택 복구 | 위 조건 + `isSelectedItemsHasDeleted()` |
| 엑셀 업로드 | `canEdit()` + `uploadExcel` 정의 |
| 엑셀 다운로드 | `downloadExcel` 정의 (편집 권한 무관) |
| 모달 확인 (`확인(N)`) | `selectMode() === "multi"` |
| 모달 해제 | `selectedItemKeys().length > 0` |

## 8. 합성 패턴

### 8.1 마스터-디테일 (시트 + 상세 분할)

```typescript
@Component({
  template: `
    <sd-base-container [restricted]="!canUse()">
      <ng-template #contentTpl>
        <div class="flex-row fill">
          <app-foo-sheet
            #headerSheet
            selectMode="single"
            class="flex-min bdr bdr-color-lighter"
          />
          @let _selectedId = headerSheet.selectedItems().first()?.id;
          @if (_selectedId == null) {
            <div class="flex-fill p-xxl">선택하세요.</div>
          } @else {
            <app-foo-detail
              class="flex-fill"
              [fooId]="_selectedId"
              (close)="headerSheet.doRefresh()"
            />
          }
        </div>
      </ng-template>
    </sd-base-container>
  `,
})
```

- 시트의 `selectMode="single"` + `setupCloserWhenSingleSelectionChange` 덕에 선택 변경 시 자동 close emit.
- 부모에서 `#headerSheet`로 참조하여 `selectedItems()` 조회, `doRefresh()` 호출.
- 참고: `InboundInstructionPage.ts:14-42`.

### 8.2 모달 선택으로 사용

`SdDataSheetBase` 상속자는 `SdSelectModal<TItem>`을 구현하므로 별도 래핑 없이 모달로 쓸 수 있다.

```html
<sd-modal-select-button
  [modal]="{ title: '고객사', type: CustomerPage, inputs: {} }"
  [(value)]="item.customerId"
/>
```

### 8.3 SdDataDetail 내부에 SdSheet

상세 폼 내부의 단순 목록은 `<sd-data-sheet>` 아닌 `<sd-sheet>`를 사용한다 (중첩 피함).

```html
<sd-data-detail>
  <ng-template #contentTpl>
    <!-- 상세 폼 필드 ... -->
    <sd-sheet [items]="data().boxes" [selectMode]="'multi'" ...>
      <sd-sheet-column ...>...</sd-sheet-column>
    </sd-sheet>
  </ng-template>
</sd-data-detail>
```

참고: `InboundInstructionDetail.ts:226`.

## 9. 관용 규칙

### 9.1 `mark(...)` 호출 타이밍

signal이 보유한 **객체/배열의 내부 필드**를 변경했을 때, consumer에게 변경을 알리려면 `mark(sig)`를 호출한다.

```html
<!-- 필터 객체 필드 변경 -->
<sd-textfield [(value)]="filter().searchText" (valueChange)="mark(filter)" />

<!-- 행 아이템 필드 변경 -->
<sd-textfield [(value)]="item.name" (valueChange)="mark(items)" />
```

`mark`는 `@simplysm/angular`에서 re-export: `import { mark } from "@simplysm/angular"`.

### 9.2 시트 내 컨트롤 스타일

`<sd-data-sheet-column>` 셀 안의 컨트롤은 반드시 `[inset]="true"` + `[size]="'sm'"` 지정:

```html
<ng-template [cell]="items()" let-item let-edit="edit">
  <sd-textfield
    [inset]="true" [size]="'sm'" [type]="'text'"
    [required]="true" [disabled]="!canEdit()" [readonly]="!edit"
    [(value)]="item.code" (valueChange)="mark(items)"
  />
</ng-template>
```

표시 텍스트는 `<div class="p-xs-sm">` (+ 필요 시 `tx-right` / `tx-center`)로 감싼다.

### 9.3 `selectMode` override 방식

abstract `selectMode: InputSignal<…>`은 `input<…>()`로 **재선언**한다 (일반 override가 아님):

```typescript
override selectMode = input<"single" | "multi" | undefined>();
```

### 9.4 `search()` 내부에서 signal 읽기

필터/정렬/페이지 변경 시 자동으로 refresh effect가 재실행된다. `search()` 안에서는 `lastFilter()`, `sortingDefs()`, `page()`를 읽어 쿼리에 반영한다.

```typescript
override async search(usePagination: boolean) {
  let qr = db.foo();
  if (!str.isNullOrEmpty(this.lastFilter().searchText)) {
    qr = qr.search((item) => [item.name], this.lastFilter().searchText!);
  }
  for (const s of this.sortingDefs()) {
    qr = qr.orderBy((item) => obj.getChainValue(item, s.key) as any, s.desc ? "DESC" : "ASC");
  }
  const pageLength = usePagination ? Math.ceil((await qr.count()) / 50) : undefined;
  if (usePagination) qr = qr.limit(this.page() * 50, 50);
  return { items: await qr.execute(), pageLength };
}
```

> **중요**: `sortingDef.key`는 `"vendor.name"`, `"lot.goods.code"` 같은 체인 문자열일 수 있다 (컬럼 key에 중첩 경로 지정 시). 따라서 `(item as any)[s.key]` 식의 단순 property access는 flat key에서만 동작하며 체인 key에서는 `undefined`를 반환한다. 반드시 `obj.getChainValue(item, s.key)`로 체인 경로를 따라 접근한다. `obj`는 `@simplysm/core-common`의 네임스페이스: `import { obj } from "@simplysm/core-common"`.

### 9.5 `prepareRefreshEffect` 사용 시점

외부 input(라우팅 파라미터 등)이 바뀌면 자동 refresh가 필요할 때 override하여 **signal을 읽기만** 한다(값을 쓸 필요 없음).

```typescript
override prepareRefreshEffect() {
  this.someInputId();  // signal 읽기만으로 effect 의존성 등록
}
```

### 9.6 inline vs modal 편집 구현 API 매칭

| editMode | 구현 필수 쌍 |
|---|---|
| `"inline"` | `newItem()` + `submit(diffs)` + (선택) `itemPropInfo.isDeleted` |
| `"modal"` | `editItem(item?)` + `toggleDeleteItems(del)` |

양쪽 다 구현하면 두 기능이 충돌할 수 있으므로 단일 모드에 맞춰 구현한다.

### 9.7 공유 데이터 변경 알림

저장 후 공유 데이터가 바뀌었으면 submit 내부에서 emit:

```typescript
await this._appSharedData.emitAsync("고객사", changedIds);
```

## 10. 실전 예시

### 10.1 inline 편집 + 엑셀 (CustomerPage 축약)

참고: `D:/workspaces-14/adtek/packages/client-admin/src/app/home/base/customer/CustomerPage.ts`.

```typescript
@Component({
  selector: "app-customer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdDataSheet, SdDataSheetColumn, SdSheetColumnCellTemplate, SdTextfield, SdCheckbox],
  template: `
    <sd-data-sheet>
      <ng-template #filterTpl>
        <div>
          <label>검색어</label>
          <sd-textfield [(value)]="filter().searchText" (valueChange)="mark(filter)" />
        </div>
        <div>
          <sd-checkbox [(value)]="filter().isIncludeDeleted" (valueChange)="mark(filter)">
            삭제항목 포함
          </sd-checkbox>
        </div>
      </ng-template>

      <sd-data-sheet-column [key]="'id'" [header]="'#'" [fixed]="true">
        <ng-template [cell]="items()" let-item>
          <div class="p-xs-sm tx-right">{{ item.id }}</div>
        </ng-template>
      </sd-data-sheet-column>

      <sd-data-sheet-column [key]="'code'" [header]="'코드'">
        <ng-template [cell]="items()" let-item let-edit="edit">
          <sd-textfield
            [inset]="true" [size]="'sm'" [type]="'text'"
            [required]="true" [disabled]="!canEdit()" [readonly]="!edit"
            [(value)]="item.code" (valueChange)="mark(items)"
          />
        </ng-template>
      </sd-data-sheet-column>
      <!-- ... 추가 컬럼 ... -->
    </sd-data-sheet>
  `,
})
export class CustomerPage extends SdDataSheetBase<IFilter, IItem, number | undefined> {
  private readonly _appOrm = inject(AppOrmProvider);
  private readonly _appSharedData = inject(AppSharedDataProvider);

  name = "고객사";
  perms = injectPermsSignal(["base.customer"], ["use", "edit"]);

  override canUse = computed(() => this.perms().includes("use"));
  override canEdit = computed(() => this.perms().includes("edit") && this.viewType() === "page");

  override editMode = "inline" as const;
  override selectMode = input<"single" | "multi" | undefined>();

  override bindFilter(): IFilter {
    return { isIncludeDeleted: false };
  }

  override itemPropInfo: SdDataSheetItemPropInfo<IItem> = {
    isDeleted: "isDeleted",
    lastModifiedAt: "lastModifiedAt",
    lastModifiedBy: "lastModifiedBy",
  };

  override getItemInfoFn = (item: IItem) => ({
    key: item.id,
    canSelect: item.id != null,
    canEdit: true,
    canDelete: true,
  });

  override async search(usePagination: boolean): Promise<SdDataSheetSearchResult<IItem>> {
    return this._appOrm.connectAsync(async (db) => {
      let qr = db.customer();
      if (!str.isNullOrEmpty(this.lastFilter().searchText)) {
        qr = qr.search((item) => [item.code, item.name], this.lastFilter().searchText!);
      }
      if (!this.lastFilter().isIncludeDeleted) {
        qr = qr.where((item) => [expr.eq(item.isDeleted, false)]);
      }
      const pageLength = usePagination ? Math.ceil((await qr.count()) / 50) : undefined;
      for (const s of this.sortingDefs()) {
        qr = qr.orderBy((item) => obj.getChainValue(item, s.key) as any, s.desc ? "DESC" : "ASC");
      }
      if (usePagination) qr = qr.limit(this.page() * 50, 50);
      return { items: await qr.execute(), pageLength };
    });
  }

  override newItem(): IItem {
    return { isDeleted: false };
  }

  override async submit(diffs: ArrayOneWayDiffResult<IItem>[]): Promise<boolean> {
    const changedIds: number[] = [];
    await this._appOrm.connectAsync(async (db) => {
      for (const diff of diffs) {
        changedIds.push(await this._upsertCustomer(db, diff.item));
      }
    });
    await this._appSharedData.emitAsync("고객사", changedIds);
    return true;
  }

  override async downloadExcel(items: IItem[]): Promise<void> { /* ExcelWrapper 사용 */ }
  override async uploadExcel(file: File): Promise<void> { /* ExcelWrapper 사용 */ }

  private async _upsertCustomer(db: MainDbContext, item: IItem): Promise<number> { /* ... */ }

  protected readonly mark = mark;
}
```

### 10.2 modal 편집 + 커스텀 도구 바 (InboundInstructionSheet 축약)

참고: `D:/workspaces-14/adtek/packages/client-admin/src/app/home/inventory/inbound-instruction/InboundInstructionSheet.ts`.

```typescript
@Component({
  selector: "app-inbound-instruction-sheet",
  // ...
  template: `
    <sd-data-sheet [insertText]="'신규등록'">
      <ng-template #filterTpl>
        <div>
          <label>입고예정일</label>
          <sd-date-range-picker
            [(from)]="filter().fromDate"
            (fromChange)="mark(filter)"
            [(to)]="filter().toDate"
            (toChange)="mark(filter)"
          />
        </div>
      </ng-template>

      @if (canEdit()) {
        <ng-template #toolTpl>
          <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onPackingListUploadButtonClick()">
            <ng-icon [svg]="tablerFileExcel" />
            PL업로드
          </sd-button>
        </ng-template>
      }

      <sd-data-sheet-column [key]="'id'" [header]="'#'" [fixed]="true">
        <ng-template [cell]="items()" let-item>
          <div class="p-xs-sm tx-right">{{ item.id }}</div>
        </ng-template>
      </sd-data-sheet-column>
      <!-- ... -->
    </sd-data-sheet>
  `,
})
export class InboundInstructionSheet extends SdDataSheetBase<IFilter, IItem, number | undefined> {
  // canUse / canEdit / bindFilter / itemPropInfo / getItemInfoFn / search ...

  override editMode = "modal" as const;
  override selectMode = input<"single" | "multi" | undefined>();

  // inline과 달리 newItem/submit 대신 editItem만 구현
  override async editItem(): Promise<boolean> {
    await this._appOrm.connectAsync(async (db) => {
      await db.inboundInstruction().insert([{ date: new DateOnly() }]);
    });
    return true;
  }

  async onPackingListUploadButtonClick() { /* 커스텀 업로드 로직 */ }
}
```

---

## Cross-reference

- `SdDataDetail` — 상세 폼 추상화. (TODO: `features-data-detail.md`)
- `SdDataSelectButton` — 모달 기반 선택 버튼 추상화. (TODO: `features-data-select-button.md`)
- `SdSheet` — 기본 시트 컴포넌트 (필터/페이지네이션 없는 단순 시트). → `ui-data.md`
- `SdBaseContainer` — 페이지/모달/뷰 공통 컨테이너. → `features.md`
- `SdSelectModal<T>`, `SdSelectModalInfo<T>` — 모달 선택 인터페이스. → `provider-types.md`
- `getOrmDataEditToastErrorMessage` — 저장 에러 메시지 변환. `SdDataSheetBase` 내부에서 자동 사용.
