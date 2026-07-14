# 목록·단건편집 화면 (AbsSdDataSheet / AbsSdDataDetail / AbsSdDataSelectButton)

v12 의 표준 목록·단건편집 화면은 v14 의 `sd-crud-list`/`sd-crud-detail` 처럼 컴포넌트에 입출력을 묶는 방식이 아니라, **추상 클래스를 상속해 오버라이드 멤버를 채우는 방식**임. 화면 클래스가 `AbsSdDataSheet`(목록) / `AbsSdDataDetail`(단건) 을 상속하고, 템플릿에는 `<sd-data-sheet>` / `<sd-data-detail>` 컨테이너 컴포넌트를 둠. 컨테이너는 `injectParent()` 로 상속 클래스(=화면)를 부모로 주입받아, 화면이 채운 추상 멤버를 읽어 버튼·시트·폼·페이징·모달 처리를 자동으로 구성함(`packages/sd-angular/src/features/data-view/sd-data-sheet.control.ts`, `sd-data-detail.control.ts`).

화면 파일·`@Component` 일반 규약(파일명 접미사, `standalone`, `OnPush`, `ViewEncapsulation.None`, 인라인 template, `selector "app-*"`, `imports` 명시)은 [client-component.md](./client-component.md) 를 따름. 권한 시그널은 [client-permission.md](./client-app-structure.md), ORM 쿼리 상세는 [orm.md](./orm.md), 공유데이터는 [client-shared-data.md](./client-shared-data.md), 변경이력은 [data-log.md](./data-log.md), 엑셀은 [excel.md](./client-data-sheet.md) 를 함께 봄.

---

## 목록 화면을 만들려면 (AbsSdDataSheet)

`AbsSdDataSheet<TFilter, TItem, TKey>` 를 상속함. 세 타입 인자는 차례로 **필터 객체 타입**, **시트 한 행의 타입**, **행의 키 타입**(보통 `number | undefined` 또는 `number`)임. 템플릿에는 `<sd-data-sheet>` 하나만 두고, 그 안에 검색 폼(`#filterTpl`)과 컬럼(`<sd-data-sheet-column>`)을 투영함.

```ts
@Component({
  selector: "app-user",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdCheckboxControl,
    SdSheetColumnCellTemplateDirective,
    SdDataSheetControl,
    SdDataSheetColumnDirective,
  ],
  template: `
    <sd-data-sheet>
      <ng-template #filterTpl>...</ng-template>
      <sd-data-sheet-column fixed header="#" key="id">...</sd-data-sheet-column>
      <!-- 컬럼들 -->
    </sd-data-sheet>
  `,
})
export class UserPage extends AbsSdDataSheet<IFilter, IItem, number | undefined> {
  // 오버라이드 멤버 ...
}
```

(`packages/client-admin/src/app/home/base/user/UserPage.ts`)

`<sd-data-sheet>` 가 동작하려면 화면 클래스가 다음 멤버를 채워야 함. `abstract` 로 선언된 것은 **필수**, `?` 로 선언된 것은 **선택**(있으면 해당 기능 버튼이 켜짐)임(`sd-data-sheet.control.ts` 의 `AbsSdDataSheet` 정의).

### 필수로 채우는 멤버

- **`name`** — 화면/도메인 이름. 엑셀 파일명 등에 쓰임(`name = "사용자"`).
- **`perms`** — 권한 시그널. `usePermsSignal(["base.user"], ["use","edit", ...])` 로 만듦. [client-permission.md](./client-app-structure.md).
- **`canUse: Signal<boolean>`** — 화면 진입 권한. false 면 `<sd-base-container restricted>` 로 막힘.
- **`canEdit: Signal<boolean>`** — 편집 권한. false 면 저장/등록/삭제 버튼과 인라인 편집이 모두 비활성.
- **`editMode: "inline" | "modal" | undefined`** — 편집 방식(아래 별도 절).
- **`selectMode: InputSignal<"single" | "multi" | undefined>`** — 선택 방식(아래 별도 절). `input<...>()` 으로 선언해 부모/모달이 주입할 수 있게 함.
- **`bindFilter(): TFilter`** — 필터의 초기값을 반환. 이 반환값이 `filter()` 시그널의 시작 상태가 됨.
- **`itemPropInfo: ISdDataSheetItemPropInfo<TItem>`** — 행 타입에서 삭제/수정일시/수정자 필드명을 알려줌.
- **`getItemInfoFn: (item) => ISdDataSheetItemInfo<TKey>`** — 행별 key·선택가능·편집가능·삭제가능 여부를 반환.
- **`search(usePagination): Promise<ISdDataSheetSearchResult<TItem>>`** — 검색 본체. 반환은 `{ items, pageLength?, summary? }`.

```ts
override canUse = $computed(() => this.perms().includes("use"));
override canEdit = $computed(() => this.perms().includes("edit") && !this.disabled());

override editMode = "inline" as const;
override selectMode = input<"single" | "multi" | undefined>();

override bindFilter(): IFilter {
  return { isIncludeLeft: false, isIncludeDeleted: false };
}

override itemPropInfo: ISdDataSheetItemPropInfo<IItem> = {
  isDeleted: "isDeleted",
  lastModifiedAt: "lastModifiedAt",
  lastModifiedBy: "lastModifiedBy",
};
override getItemInfoFn = (item: IItem) => ({
  key: item.id,
  canSelect: item.id != null,
  canEdit: true,
  canDelete: item.id !== this.#appAuth.authInfo()!.user.id,  // 본인 계정은 삭제 불가
});
```

(`UserPage.ts`)

`itemPropInfo.isDeleted` 를 지정하면 컨테이너가 삭제된 행에 취소선(`text-decoration: line-through`)을 자동으로 입히고(`getItemCellStyleFn`), 선택 삭제/복구 버튼의 활성 조건을 계산함. `lastModifiedAt`/`lastModifiedBy` 를 지정하면 "수정일시"·"수정자" 컬럼이 숨김 컬럼으로 자동 추가됨(시트 컬럼 설정에서 켤 수 있음). 해당 개념이 없는 모델이면 `undefined` 를 줌.

### 검색 본체 (search)

`search(usePagination)` 는 ORM 으로 직접 조회함. `usePagination` 이 true 면 시트 표시용(페이지당 50건 + `pageLength`), false 면 엑셀 내려받기 같은 전건 조회임. **필터는 `filter()` 가 아니라 `lastFilter()` 를 읽음** — `filter()` 는 사용자가 입력 중인 값, `lastFilter()` 는 "조회" 버튼을 눌러 확정된 값임. 조회 버튼/새로고침이 눌리면 컨테이너가 `lastFilter` 를 갱신하고 `search` 를 다시 호출함.

```ts
override async search(usePagination: boolean): Promise<ISdDataSheetSearchResult<IItem>> {
  return await this.#appOrm.connectAsync(async (db) => {
    let qr1 = db.user;

    if (!StringUtils.isNullOrEmpty(this.lastFilter().searchText)) {
      qr1 = qr1.search((item) => [item.name, item.email], this.lastFilter().searchText!);
    }
    if (!this.lastFilter().isIncludeDeleted) {
      qr1 = qr1.where((item) => [db.qh.equal(item.isDeleted, false)]);
    }

    const pageLength = usePagination ? Math.ceil((await qr1.countAsync()) / 50) : undefined;

    let qr2 = qr1.joinLastDataLog().select<IItem>((item) => ({
      id: item.id.notNull(),
      name: item.name,
      isDeleted: item.isDeleted,
      lastModifiedAt: item.lastDataLog.dateTime,
      lastModifiedBy: item.lastDataLog.userName,
    }));

    // 시트 헤더로 지정한 정렬을 우선 적용, 마지막에 기본 정렬
    for (const sortingDef of this.sortingDefs()) {
      qr2 = qr2.orderBy(sortingDef.key, sortingDef.desc);
    }
    if (!this.sortingDefs().some((item) => item.key === "id")) {
      qr2 = qr2.orderBy((item) => item.id, true);
    }

    if (usePagination) {
      qr2 = qr2.limit(this.page() * 50, 50);
    }

    return { items: await qr2.resultAsync(), pageLength };
  });
}
```

(`UserPage.ts`)

- `select` 의 별칭은 `<sd-data-sheet-column>` 의 `key` 와 일치시킴. `key` 가 곧 시트 정렬 키(`sortingDef.key`)이므로, 정렬은 컬럼별 분기 없이 `orderBy(sortingDef.key, sortingDef.desc)` 한 줄로 적용함.
- `pageLength` 는 전체 건수 / 50 을 올림한 페이지 수임. 컨테이너가 `<sd-sheet>` 의 `[totalPageCount]` 와 `[(currentPage)]="page"` 에 연결하므로, 페이지를 바꾸면 `page()` 가 바뀌고 `search` 가 다시 호출됨.
- 검색은 `this.page()`·`this.lastFilter()`·`this.sortingDefs()` 변화에 반응하는 `$effect` 안에서 호출됨(`AbsSdDataSheet` 생성자). 화면이 이들을 직접 호출할 필요는 없음.

`prepareRefreshEffect()` 를 오버라이드해 외부 입력(예: 모달로 주입된 `isProduct` 등)을 그 안에서 읽으면, 그 입력이 바뀔 때도 자동 재조회됨(`GoodsPage.ts` 의 `prepareRefreshEffect`).

### 검색 폼 (#filterTpl)

`#filterTpl` 슬롯에 검색 필드를 둠. 컨테이너가 이 슬롯을 "조회" 버튼과 함께 `<sd-form>` 안에 자동으로 감쌈(`sd-data-sheet.control.ts` 의 `filterTplRef`). 필드는 `filter()` 의 멤버에 양방향 바인딩하고, **값이 바뀌면 `filter.$mark()` 를 호출**해 객체 시그널 내부 변경을 알림(시그널 헬퍼는 [client-signals.md](./client-component.md)).

```html
<ng-template #filterTpl>
  <div>
    <label>검색어</label>
    <sd-textfield type="text" [(value)]="filter().searchText" (valueChange)="filter.$mark()" />
  </div>
  <div>
    <sd-checkbox [(value)]="filter().isIncludeDeleted" (valueChange)="filter.$mark()">
      삭제항목 포함
    </sd-checkbox>
  </div>
</ng-template>
```

(`UserPage.ts`) 조회 버튼을 누르면 `filter()` 의 현재 값이 `lastFilter()` 로 확정되고 1페이지부터 재조회됨.

### 컬럼 (<sd-data-sheet-column>)

각 컬럼은 `<sd-data-sheet-column>` 으로 선언하고, 셀 본문은 `<ng-template [cell]="items()" let-item>` 안에 둠. `key`(필수)·`fixed`·`header`(문자열 또는 `['그룹','하위']` 배열)·`width`·`hidden` 등을 입력으로 받음(`sd-sheet-column.directive.ts`). 읽기 전용 표시 컬럼은 단순히 값을 출력함.

```html
<sd-data-sheet-column fixed header="#" key="id">
  <ng-template [cell]="items()" let-item>
    <div class="p-xs-sm tx-right">{{ item.id }}</div>
  </ng-template>
</sd-data-sheet-column>

<sd-data-sheet-column [header]="['작업', '생산공정']" key="productionProcess">
  <ng-template [cell]="items()" let-item>
    <div class="p-xs-sm tx-center">{{ item.productionProcess }}</div>
  </ng-template>
</sd-data-sheet-column>
```

(`GoodsPage.ts`)

`items()` 는 현재 페이지의 행 배열임. 권한에 따라 컬럼 자체를 `@if (perms().includes("auth.use")) { ... }` 로 감싸 노출을 분기할 수 있음(`UserPage.ts` 의 인증정보 컬럼).

---

## 인라인 편집과 모달 편집 중 하나를 고르려면 (editMode)

`editMode` 값에 따라 컨테이너가 띄우는 버튼과 셀 동작이 달라짐(`sd-data-sheet.control.ts` 템플릿의 `parent.editMode === ...` 분기).

### 인라인 편집 (`editMode = "inline"`)

시트를 `<sd-form>` 으로 감싸 **셀 안에서 직접 편집**함. "행 추가" 버튼·"저장(CTRL+S)" 버튼·행별 삭제 컬럼이 켜짐. 화면은 `newItem()` 과 `submit(diffs)` 를 채워야 함.

셀 편집 컨트롤은 `let-edit="edit"` 로 받은 편집 여부를 `[readonly]` 에, `canEdit()` 를 `[disabled]` 에 연결하고, 값 변경 시 `items.$mark()` 로 배열 시그널 내부 변경을 알림.

```html
<sd-data-sheet-column header="이름" key="name">
  <ng-template [cell]="items()" let-item let-edit="edit">
    <sd-textfield
      type="text"
      inset
      size="sm"
      required
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.name"
      (valueChange)="items.$mark()"
    />
  </ng-template>
</sd-data-sheet-column>
```

```ts
override editMode = "inline" as const;

override newItem(): IItem {
  return { isDeleted: false };  // "행 추가" 시 시트 맨 위에 추가되는 빈 행
}
```

(`UserPage.ts`) `newItem()` 이 반환한 행이 `items` 맨 앞에 추가되고(`doAddItem`), 사용자가 셀을 채운 뒤 저장하면 `submit(diffs)` 로 전달됨.

### 모달 편집 (`editMode = "modal"`)

셀을 클릭하면 **단건 편집 모달**이 뜸. "등록" 버튼이 켜지고, 시트 셀은 클릭 시 편집 아이콘이 붙은 앵커가 됨. 화면은 `editItem(item?)` 를 채움. `editItem` 은 단건 편집 컴포넌트(`AbsSdDataDetail`, 아래 절)를 모달로 띄우고, 모달이 저장/삭제로 닫혔으면 truthy 를 반환함 — 그러면 컨테이너가 목록을 자동 새로고침함(`doEditItem`).

```ts
override editMode = "modal" as const;

override async editItem(item?: IItem) {
  return await this.#sdModal.showAsync({
    type: GoodsDetail,
    title: item?.id != null ? `${this.name}수정(#${item.id})` : `${this.name}등록`,
    inputs: { itemId: item?.id, /* 잠금/기본값 입력들 */ },
  });
}
```

(`GoodsPage.ts`) 모달 편집 모드에서 어떤 컬럼을 클릭하면 편집 진입으로 만들지는 컬럼에 `[edit]="true"` 를 주어 정함(`SdDataSheetColumnDirective.edit`). 편집 진입 컬럼은 `getItemInfoFn(item).canEdit` 가 true 일 때만 앵커로 표시됨(`sd-data-sheet.control.ts` 의 셀 분기).

> 규칙: `editMode = "inline"` 이면 `newItem`/`submit` 을, `"modal"` 이면 `editItem` 을 채움. 모드와 핸들러가 어긋나면(예: inline 인데 `submit` 미구현) 저장 버튼이 동작하지 않음. 컨테이너가 `parent.editMode === "inline" && parent.newItem`, `parent.editMode === "modal" && parent.editItem` 으로 버튼 노출을 가르기 때문임.

---

## 다중/단일 선택을 켜려면 (selectMode)

`selectMode` 를 `input<...>()` 으로 선언하면 부모 화면이나 선택 모달이 주입할 수 있음(`AbsSdDataSheet.selectMode`).

- 값이 없으면(`undefined`) 일반 목록 화면.
- `"multi"` — 행 체크박스 다중 선택. 선택 삭제/복구·엑셀 등 선택 기반 동작이 모두 선택된 행에 적용됨.
- `"single"` — 단일 선택. 편집 권한이 없거나 `editMode === "modal"` 이면 클릭 즉시 선택되도록 `autoSelect` 가 `"click"` 으로 계산됨(`AbsSdDataSheet.autoSelect`).

```ts
// 일반 목록(부모가 주입 가능)
override selectMode = input<"single" | "multi" | undefined>();
// 항상 다중 선택 기본값을 주려면
override selectMode = input<"single" | "multi" | undefined>("multi");
```

(`UserPage.ts`, `GoodsPage.ts`)

`AbsSdDataSheet` 는 `ISdSelectModal<TItem>` 을 구현하므로, **목록 화면 자체가 그대로 선택 모달**이 됨. 모달로 띄울 때 `selectMode` 와 `selectedItemKeys` 가 주입되고, `selectMode` 가 켜져 있으면 컨테이너 하단에 "확인(N)"/"해제" 버튼이 자동으로 나타나며 닫을 때 `{ selectedItemKeys, selectedItems }` 페이로드를 반환함(`sd-data-sheet.control.ts` 의 `modalBottomTpl`, `doModalConfirm`). 이 점이 아래 "마스터 선택 버튼" 의 토대임.

행별로 선택을 막으려면 `getItemInfoFn(item).canSelect` 를 false 로 반환함(컨테이너가 `getItemSelectableFn` 에 연결). 예: 키가 없는 신규 행은 `canSelect: item.id != null` (`UserPage.ts`).

---

## 소프트 삭제·복구를 처리하려면

삭제는 물리 삭제가 아니라 `isDeleted = true` 로 표시하는 소프트 삭제임. `itemPropInfo.isDeleted` 와 `getItemInfoFn(...).canDelete` 가 토대가 됨.

- **인라인 모드** — 행별 삭제/복구는 컨테이너가 띄우는 삭제 컬럼(아이콘 앵커)이 처리함. 키가 있는 행은 `isDeleted` 를 토글하고(`doToggleDeleteItem`), 키가 없는 신규 행은 시트에서 제거함. 토글된 삭제 상태는 다음 `submit(diffs)` 에서 DB 에 반영함. `canDelete` 가 false 인 행은 삭제 앵커가 비활성됨.
- **모달 모드** — 화면이 `toggleDeleteItems(del)` 를 채우면 "선택 삭제"/"선택 복구" 버튼이 켜짐. 선택된 행들을 한 번에 처리하고, 성공 시 truthy 를 반환하면 컨테이너가 새로고침함(`doToggleDeleteItems`).

```ts
override async toggleDeleteItems(del: boolean) {
  const selectedItemIds = this.selectedItems().map((item) => item.id);

  const changedIds = await this.#appOrm.connectAsync(async (db) => {
    const ids = (
      await db.goods
        .where((item) => [db.qh.in(item.id, selectedItemIds), db.qh.equal(item.isDeleted, !del)])
        .updateAsync(() => ({ isDeleted: del }), ["id"])
    ).map((item) => item.id!);

    for (const id of ids) {
      await db.goods.insertDataLogAsync({
        type: del ? "삭제" : "복구",
        itemId: id,
        valueJson: undefined,
        userId: this.#appAuth.authInfo()!.user.id,
      });
    }
    return ids;
  });

  await this.#appSharedData.emitAsync("품목", changedIds);
  return true;
}
```

(`GoodsPage.ts`)

> 규칙: 삭제/복구 시 데이터 변경과 변경이력 적재(`insertDataLogAsync`)·공유데이터 통지(`emitAsync`)를 같은 `connectAsync` 트랜잭션·동작 안에서 함께 함. 이력 type 은 삭제 시 `"삭제"`, 복구 시 `"복구"`. 상세는 [data-log.md](./data-log.md)·[client-shared-data.md](./client-shared-data.md).

---

## 변경분을 저장하려면 (submit(diffs))

인라인 모드에서 저장 버튼/CTRL+S 를 누르면, 컨테이너가 시트에서 **바뀐 행만 추려** `submit(diffs)` 로 넘김(`AbsSdDataSheet.doSubmit` → `$arr(this.items).diffs()`). `diffs` 는 `TArrayDiffs2Result<TItem>[]` 이고, 각 원소의 `diff.item` 이 변경 후 행 데이터임. 변경분이 없으면 컨테이너가 "변경사항이 없습니다." 토스트만 띄우고 `submit` 을 호출하지 않음.

`submit` 본체에서 한 건씩 검증·upsert·이력 적재·통지를 한 트랜잭션에서 처리하고, 성공 시 `true` 를 반환함. 반환이 truthy 면 컨테이너가 "저장되었습니다." 토스트를 띄우고 목록을 새로고침함.

```ts
override async submit(diffs: TArrayDiffs2Result<IItem>[]): Promise<boolean> {
  const changedIds: number[] = [];
  await this.#appOrm.connectAsync(async (db) => {
    for (const diff of diffs) {
      // 활성 유니크 검증
      if (
        !diff.item.isDeleted &&
        (await db.user
          .where((item) => [
            db.qh.equal(item.name, diff.item.name),
            db.qh.notEqual(item.id, diff.item.id),
            db.qh.isFalse(item.isDeleted),
          ])
          .existsAsync())
      ) {
        throw new ArgumentError("동일한 이름이 이미 등록되어 있습니다.", { 이름: diff.item.name });
      }

      const upsertId = (
        await db.user
          .where((item) => [db.qh.equal(item.id, diff.item.id)])
          .updateAsync(async () => ({
            name: diff.item.name!,
            email: diff.item.email,
            isDeleted: diff.item.isDeleted,
          }), ["id"])
      ).single()!.id!;
      changedIds.push(upsertId);

      await db.user.insertDataLogAsync({
        type: diff.item.id == null ? "등록" : "수정",
        itemId: upsertId,
        valueJson: undefined,
        userId: this.#appAuth.authInfo()!.user.id,
      });
    }
  });

  await this.#appSharedData.emitAsync("사용자", changedIds);
  return true;
}
```

(`UserPage.ts`)

- 신규/수정 분기는 `diff.item.id == null` 로 함. 신규면 이력 type `"등록"`, 수정이면 `"수정"`.
- 검증 실패는 `throw` — 한 건이라도 실패하면 트랜잭션 전체가 롤백됨. 던진 에러 메시지는 컨테이너의 `SdToastProvider.try` 가 토스트로 띄움.
- 일부 파생 컬럼을 diff 비교에서 빼려면 `diffsExcludes = ["..."]` 를 지정함(`AbsSdDataSheet.diffsExcludes`).

---

## 검색 결과를 엑셀로 내려받고 업로드로 일괄 반영하려면

화면에 `downloadExcel(items)` 를 채우면 "엑셀 다운로드" 버튼이, `uploadExcel(file)` 를 채우면 "엑셀 업로드" 버튼이 켜짐(`sd-data-sheet.control.ts` 의 `parent.downloadExcel`/`parent.uploadExcel` 분기). 다운로드 시 컨테이너는 **페이징을 끈 전건 조회**(`search(false)`)로 받은 결과를 핸들러에 넘김(`doDownloadExcel`).

양식은 `SdExcelWrapper` 로 정의함. 같은 wrapper 로 `writeAsync`(다운로드)와 `readAsync`(업로드)를 양방향으로 씀.

```ts
#excelWrapper = new SdExcelWrapper(() => ({
  id: { displayName: "ID", type: Number },
  name: { displayName: "이름", type: String, notnull: true },
  isDeleted: { displayName: "삭제", type: Boolean, notnull: true },
  lastModifiedAt: { displayName: "최종수정일시", type: DateTime },
  lastModifiedBy: { displayName: "최종수정자", type: String },
}));

override async downloadExcel(items: IItem[]) {
  const wb = await this.#excelWrapper.writeAsync(this.name, items);
  const blob = await wb.getBlobAsync();
  blob.download(`${this.name}.xlsx`);
}

override async uploadExcel(file: File) {
  const excelItems = await this.#excelWrapper.readAsync(file);

  const changedIds: number[] = [];
  await this.#appOrm.connectAsync(async (db) => {
    for (const excelItem of excelItems) {
      // 검증 후 upsert (id 유무로 신규/수정 분기)
      const upsertId = (
        await db.user
          .where((item) => [db.qh.equal(item.id, excelItem.id)])
          .upsertAsync(() => ({ name: excelItem.name, isDeleted: excelItem.isDeleted }), ["id"])
      ).single()!.id!;

      await db.user.insertDataLogAsync({
        type: "엑셀업로드",
        itemId: upsertId,
        valueJson: undefined,
        userId: this.#appAuth.authInfo()!.user.id,
      });
      changedIds.push(upsertId);
    }
  });
  await this.#appSharedData.emitAsync("사용자", changedIds);
}
```

(`UserPage.ts`)

- 업로드 후 컨테이너가 새로고침·성공 토스트를 자동으로 띄우므로(`doUploadExcel`), 핸들러는 저장과 통지만 하면 됨.
- 업로드 이력 type 은 `"엑셀업로드"`.
- 참조 마스터(예: 공급사)는 엑셀에 명칭으로 두고, 업로드 시 공유데이터로 명칭→ID 역변환함. 매칭 실패는 `throw`(`GoodsPage.ts` 의 `vendorNameMap`).
- `权한`에 따라 다운로드/업로드 컬럼을 가변으로 두려면 wrapper 정의를 함수형(`() => ({...})`)으로 만들어 `perms()` 분기를 넣음(`UserPage.ts`). 양식 컬럼 정의 상세는 [excel.md](./client-data-sheet.md).

---

## 단건 편집 모달을 만들려면 (AbsSdDataDetail + ISdModal)

모달 편집 모드(`editItem`)에서 띄울 단건 편집 컴포넌트는 `AbsSdDataDetail<TData>` 를 상속함. 이 추상 클래스가 `ISdModal` 을 구현하므로(`sd-data-detail.control.ts`), `SdModalProvider.showAsync({ type, title, inputs })` 로 그대로 띄울 수 있고 모달 하단 "확인" 버튼·CTRL+S 저장이 자동으로 붙음.

템플릿은 `<sd-data-detail>` 안에 `#contentTpl`(필수) 슬롯을 두고, 폼 본문을 `table.form-table` 로 작성함.

```ts
@Component({
  selector: "app-facility-detail",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdSelectControl,
    SdSelectItemControl,
    SdItemOfTemplateDirective,
    SdSharedDataSelectControl,
    SdDataDetailControl,
  ],
  template: `
    <sd-data-detail>
      <ng-template #contentTpl>
        <div class="flex-column fill gap-xl p-default">
          <div>
            <header class="page-header">기본정보</header>
            <table class="form-table">
              <tbody>
                <tr>
                  <th>명칭</th>
                  <td>
                    <sd-textfield
                      [type]="'text'"
                      [required]="true"
                      [disabled]="!canEdit()"
                      [(value)]="data().name"
                      (valueChange)="data.$mark()"
                    />
                  </td>
                </tr>
                <tr>
                  <th>상위설비</th>
                  <td>
                    <sd-shared-data-select
                      [disabled]="!canEdit()"
                      [items]="sharedFacilities()"
                      [(value)]="data().parentId"
                      (valueChange)="data.$mark()"
                    >
                      <ng-template [itemOf]="sharedFacilities()" let-item>
                        {{ item.name }}
                      </ng-template>
                    </sd-shared-data-select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-template>
    </sd-data-detail>
  `,
})
export class FacilityDetail extends AbsSdDataDetail<IData> {
  // ...
}
```

(`packages/client-admin/src/app/home/base/facility/FacilityDetail.ts`)

폼 필드는 모두 `data()` 의 멤버에 양방향 바인딩하고 `data.$mark()` 로 변경을 알림. `[disabled]="!canEdit()"` 로 편집 권한을 검. 마스터 참조 필드는 `<sd-shared-data-select>`(공유데이터, [client-shared-data.md](./client-shared-data.md)) 로 둠.

`AbsSdDataDetail` 에서 채우는 멤버(`sd-data-detail.control.ts` 의 `AbsSdDataDetail` 정의):

- **`canUse`/`canEdit`** (필수) — 진입/편집 권한.
- **`load()`** (필수) — `{ data, info }` 를 반환. `info` 는 `{ isNew, isDeleted, lastModifiedAt, lastModifiedBy }`. 신규 등록이면 빈 기본값과 `isNew: true` 를, 수정이면 DB 조회 결과와 `isNew: false` 를 반환함.
- **`submit?(data)`** — 저장 본체. truthy 반환 시 컨테이너가 성공 토스트·`close.emit` 후 새로고침함(`doSubmit`).
- **`toggleDelete?(del)`** — 삭제/복구 본체. 채우면 신규가 아닐 때 삭제/복구 버튼이 뜸(`doToggleDelete`). 성공 시 truthy 반환하면 `close.emit` 으로 모달이 닫힘.
- **`canDelete?`** (선택) — 삭제 가능 권한.

```ts
override canUse = $computed(() => this.perms().includes("use"));
override canEdit = $computed(() => this.perms().includes("edit"));

itemId = input<number>();
override prepareRefreshEffect() { this.itemId(); }  // itemId 가 바뀌면 자동 재로드

override async load() {
  if (this.itemId() == null) {
    return {
      data: { isDeleted: false },
      info: { isNew: true, isDeleted: false, lastModifiedAt: undefined, lastModifiedBy: undefined },
    };
  }
  return await this.#appOrm.connectAsync(async (db) => {
    const data = (await db.facility
      .where((item) => [db.qh.equal(item.id, this.itemId())])
      .joinLastDataLog()
      .select((item) => ({
        id: item.id, name: item.name, parentId: item.parentId, isDeleted: item.isDeleted,
        lastModifiedAt: item.lastDataLog.dateTime, lastModifiedBy: item.lastDataLog.userName,
      }))
      .singleAsync())!;
    return {
      data,
      info: { isNew: false, isDeleted: data.isDeleted,
              lastModifiedAt: data.lastModifiedAt, lastModifiedBy: data.lastModifiedBy },
    };
  });
}

override async submit() {
  const data = this.data();
  const upsertId = await this.#appOrm.connectAsync(async (db) => {
    // 활성 유니크 검증 후 upsert
    const id = (await db.facility
      .where((item) => [db.qh.equal(item.id, data.id)])
      .upsertAsync(() => ({ name: data.name!, parentId: data.parentId, isDeleted: false }), ["id"])
    ).single()!.id!;
    await db.facility.insertDataLogAsync({
      type: data.id == null ? "등록" : "수정", itemId: id,
      valueJson: undefined, userId: this.#appAuth.authInfo()!.user.id,
    });
    return id;
  });
  await this.#appSharedData.emitAsync("설비", [upsertId]);
  return true;
}

override async toggleDelete(del: boolean) {
  await this.#appOrm.connectAsync(async (db) => {
    await db.facility.where((item) => [db.qh.equal(item.id, this.data().id)])
      .updateAsync(() => ({ isDeleted: del }));
    await db.facility.insertDataLogAsync({
      type: del ? "삭제" : "복구", itemId: this.data().id!,
      valueJson: undefined, userId: this.#appAuth.authInfo()!.user.id,
    });
  });
  await this.#appSharedData.emitAsync("설비", [this.data().id!]);
  return true;
}
```

(`FacilityDetail.ts`)

- 변경 없는 저장은 컨테이너가 "변경사항이 없습니다." 로 막음(`doSubmit` 가 `$obj(this.data).changed()` 로 판단). 단, `info.isNew` 면 변경 없이도 저장됨.
- `submit`/`toggleDelete` 모두 데이터 변경·이력·통지를 한 트랜잭션·동작에서 처리함(목록의 규칙과 동일). 더 복잡한 예(공급사 잠금·필드 연동)는 `GoodsDetail.ts` 참고.

---

## 다른 화면에서 마스터 선택 버튼을 만들려면 (AbsSdDataSelectButton)

폼에서 "품목 선택", "거래처 선택" 같이 **목록 화면을 모달로 띄워 선택**하게 하는 버튼은 `AbsSdDataSelectButton<TItem, TKey>` 를 상속함. 위에서 본 대로 목록 화면(`AbsSdDataSheet`)이 곧 선택 모달이므로, 선택 버튼은 그 목록을 모달 정보로 가리키기만 하면 됨.

채울 멤버(`sd-data-select-button.control.ts` 의 `AbsSdDataSelectButton` 정의):

- **`modal: Signal<TSdSelectModalInfo<...>>`** — 띄울 선택 모달 정보(`{ type, title, inputs }`). `type` 에 목록 화면 클래스를 줌.
- **`load(keys): TItem[]`** — 현재 `value`(선택된 키)에 해당하는 항목을 조회해 버튼에 표시할 텍스트를 만듦.

```ts
@Component({
  selector: "app-goods-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgTemplateOutlet, SdDataSelectButtonControl, SdItemOfTemplateDirective],
  template: `
    <sd-data-select-button>
      <ng-template [itemOf]="selectedItems()" let-item>
        {{ item.code }}
      </ng-template>
    </sd-data-select-button>
  `,
})
export class GoodsSelectButtonControl extends AbsSdDataSelectButton<IGoods, number> {
  #appOrm = inject(AppOrmProvider);

  modalInputs = input.required<TSdSelectModalInfo<GoodsPage>["inputs"]>();

  modal = $computed(() => ({
    type: GoodsPage,
    title: "품목조회",
    inputs: this.modalInputs(),
  }));

  override async load(keys: number[]) {
    return await this.#appOrm.connectAsync(async (db) => {
      return await db.goods
        .where((item) => [db.qh.in(item.id, keys)])
        .select<IGoods>((item) => ({
          id: item.id.notNull(),
          code: item.code,
          name: item.name,
          model: item.model,
        }))
        .resultAsync();
    });
  }
}
```

(`packages/client-admin/src/app/home/base/goods/GoodsSelectButtonControl.ts`)

`AbsSdDataSelectButton` 은 `value` 모델·`selectMode`·`required`·`disabled` 입력을 자체 제공함. 버튼을 누르면 `doShowModal()` 이 `modal()` 정보에 `selectMode`·`selectedItemKeys` 를 합쳐 모달을 띄우고, 확인으로 닫히면 선택한 키를 `value` 에 반영함. `value` 가 바뀌면 `$effect` 가 `load()` 를 호출해 표시 항목을 갱신함(생성자의 `$effect([this.value], ...)`).

이 버튼은 단건 편집 폼의 `form-table` 안에서 마스터 참조 필드로 바로 씀.

```html
<tr>
  <th>제품</th>
  <td>
    <app-goods-select-button
      required
      [disabled]="!canEdit()"
      [(value)]="data().productId"
      (valueChange)="data.$mark()"
      [modalInputs]="{ isProduct: true }"
    />
  </td>
</tr>
```

(`packages/client-admin/src/app/home/base/product-bom/ProductBomDetail.ts`) `[modalInputs]` 로 목록 화면(`GoodsPage`)에 잠금/필터 입력을 그대로 전달해, 선택 모달이 그 조건으로 필터된 목록을 보이게 함.

> 참고: 마스터가 공유데이터로 관리되는 경량 항목이면 별도 선택 버튼 대신 `<sd-shared-data-select>` 만으로 충분함(`FacilityDetail.ts` 의 상위설비). 항목 수가 많거나 복잡한 필터/검색이 필요해 전체 목록 화면을 모달로 띄워야 할 때 `AbsSdDataSelectButton` 을 씀.

---

## 지킬 것

- 목록은 `AbsSdDataSheet` + `<sd-data-sheet>`, 단건은 `AbsSdDataDetail` + `<sd-data-detail>`, 선택 버튼은 `AbsSdDataSelectButton` + `<sd-data-select-button>`. 컨테이너 컴포넌트는 상속 클래스를 부모로 주입받아 동작하므로, **반드시 추상 클래스를 상속한 화면 클래스의 템플릿 안에** 둠.
- 필수 추상 멤버(`canUse`/`canEdit`/`editMode`/`selectMode`/`bindFilter`/`itemPropInfo`/`getItemInfoFn`/`search`)를 모두 채움. 빠뜨리면 컴파일 오류(`abstract`)임.
- `editMode` 와 핸들러를 일치시킴: `"inline"` → `newItem`+`submit(diffs)`, `"modal"` → `editItem`. 선택 기능(`downloadExcel`/`uploadExcel`/`toggleDeleteItems`)은 채운 것만 버튼이 켜짐.
- 검색은 `filter()` 가 아니라 `lastFilter()` 를 읽음. select 별칭 = 컬럼 `key` = 정렬 키로 일치시킴.
- 필터 입력 변경 시 `filter.$mark()`, 시트 셀/단건 폼 값 변경 시 `items.$mark()`/`data.$mark()` 를 호출해 객체/배열 시그널 내부 변경을 알림.
- 데이터 변경(저장·삭제·복구·엑셀업로드)은 변경이력 적재(`insertDataLogAsync`)·공유데이터 통지(`emitAsync`)와 같은 `connectAsync` 트랜잭션·동작 안에서 함께 함. 이력 type 은 `"등록"`/`"수정"`/`"삭제"`/`"복구"`/`"엑셀업로드"`.
- 검증 실패는 `throw` — 한 건이라도 실패하면 트랜잭션 전체가 롤백됨(원자성). 던진 에러는 컨테이너의 토스트가 자동으로 띄움.
- 권한 게이팅은 `canEdit()`(편집 버튼·인라인 편집), 컬럼/필드 단위는 세부 권한(`perms().includes(...)`)으로 함. 본인 계정 삭제 금지 같은 행별 제약은 `getItemInfoFn(...).canDelete`/`canSelect` 로 표현함.
