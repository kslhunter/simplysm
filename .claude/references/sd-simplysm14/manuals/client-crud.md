# sd-crud-list / sd-crud-detail 매뉴얼

화면 작성 시 표준 목록 컴포넌트(`sd-crud-list`) 또는 표준 단건 편집 컴포넌트(`sd-crud-detail`) 를 채택하기로 결정했을 때의 사용법. 컴포넌트 일반 규약·데이터 흐름은 [client-component.md](./client-component.md).

## `sd-crud-list`

목록 화면의 표준 골격. 다음 기능을 일괄 제공: 시트, 검색 폼, 등록/삭제/복구 버튼, CTRL+S 단축키 저장, 모달 선택 모드.

### 표준 호출

```html
<sd-crud-list
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')"
  [readonly]="!canEdit()"
  [viewType]="viewType()"
  [selectMode]="selectMode() ?? 'multi'"
  [key]="'<도메인-키>'"
  [items]="items()"
  [trackByFn]="trackByFn"
  [(selectedKeys)]="selectedKeys"
  [(currentPage)]="page"
  [totalPageCount]="pageLength()"
  [(sorts)]="sortingDefs"
  (filterSubmit)="onFilterSubmit()"
  (submit)="onSubmit()"
  (create)="onCreate()"
  (delete)="onDelete($event)"
  (restore)="onRestore($event)"
>
  <ng-template #filterTpl>...</ng-template>
  <ng-template #toolTpl>...</ng-template>

  <sd-sheet-column ...>
    <ng-template [cell]="items()" let-item="item">...</ng-template>
  </sd-sheet-column>
</sd-crud-list>
```

### 슬롯 규약

| 슬롯                | 용도                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `#filterTpl`        | 검색 폼 필드. 있으면 상단에 조회 버튼과 함께 노출.                         |
| `#toolTpl`          | 등록/삭제 버튼 옆 추가 도구 버튼.                                          |
| `#commandTpl`       | 상단 명령 영역(viewType 이 `modal`·`control` 인 경우 해당 모드의 명령 영역)에 추가 액션 버튼. |
| `#bottomCommandTpl` | modal 하단 좌측 영역. modal + selectMode 인 경우 "선택 해제/확인" 버튼과 함께 표시. |

`<sd-sheet-column>` 은 `<sd-crud-list>` 의 직속 자식으로 두면 내부 시트로 자동 투영됨.

### viewType 별 동작

- **`'page'`** — 라우팅 진입 단위. 상단에 저장 버튼.
- **`'control'`** — view 안에 임베드. 명령 영역에 저장 버튼.
- **`'modal'`** — 모달. `selectMode` 와 함께 쓰면 close 시 `{ selectedKeys }` 페이로드를 자동 전달.

### 편집 방식 (`inlineEdit`, 기본 `true`)

- `true` — 시트를 `<sd-form>` 으로 감싸 셀 인라인 편집 + 저장 버튼/CTRL+S + per-row 삭제 컬럼 제공.
- `false` — 인라인 편집 chrome 제거. 시트는 조회·선택 전용이며, 편집은 호스트가 `selectedKeys`(또는 별도 진입)로 상세/모달을 열어 처리. 등록·선택 삭제·복구·필터·페이징은 그대로 유지. 이 모드에선 `submit` 출력이 발화하지 않음.
- `readonly` 와 직교: `readonly=true` 면 편집 자체 불가, `readonly=false` + `inlineEdit=false` 면 편집은 가능하되 인라인이 아님(외부 모달·상세).

### 모달 선택 모드

`viewType="modal"` + `selectMode` 지정 시:

- `single` — 행 클릭 즉시 modal close.
- `multi` — 하단 "확인(N)" 버튼 클릭으로 modal close.

호출측은 `_sdModal.showAsync(...)` 결과로 `{ selectedKeys }` 페이로드 수신.

`selectMode` 는 `readonly` 와 독립 — selectMode 지정만으로는 편집이 막히지 않음. 등록·인라인 편집은 그대로 유지되고, `single` 일 때 "선택 삭제/복구" 버튼만 숨김. 읽기 전용이 필요하면 `readonly=true` 를 별도로 전달. `sd-shared-data-select-list` 가 모달을 띄울 때도 `selectMode="single"` 만 주입하므로 모달 내용은 편집 가능 상태로 유지됨.

### 행을 클릭해 상세 편집으로 진입하려면 (inlineEdit=false)

`inlineEdit=false` 목록의 편집 진입은 첫 컬럼(`#`)을 권한 분기된 진입점으로 만들어 처리. 편집 가능하면 편집 아이콘이 붙은 앵커를 눌러 상세 모달을 열고, 불가하면 값만 표시.

```html
<sd-sheet-column [key]="'id'" [header]="'#'">
  <ng-template [cell]="items()" let-item="item">
    @if (canEdit()) {
      <sd-anchor class="flex-row gap-sm p-xs-sm" (click)="onEdit(item, $event)">
        <div><ng-icon [svg]="tablerEdit" /></div>
        <div class="flex-fill tx-right">{{ item.id }}</div>
      </sd-anchor>
    } @else {
      <div class="p-xs-sm tx-right">{{ item.id }}</div>
    }
  </ng-template>
</sd-sheet-column>
```

```ts
async onEdit(item: IItem, event: Event): Promise<void> {
  event.preventDefault(); // 앵커 기본 동작 차단
  event.stopPropagation(); // 행 선택과 분리
  await this._openDetail(item.id); // 상세 모달 열고, 닫힘 결과 있으면 refresh
}
```

- `canEdit()` 가 false 면 앵커 대신 텍스트만 — 권한 없는 사용자에게 편집 진입을 노출하지 않음.
- 앵커 레이아웃(`flex-row`·아이콘/값 정렬)은 화면 사정에 맞춤. 정규는 "`#` 컬럼 = 권한 분기된 편집 진입점" 까지.

### 현재 검색 결과를 엑셀로 내려받게 하려면

`#toolTpl` 에 다운로드 버튼을 두고, 페이징을 무시한 **현재 검색·필터 결과 전체**를 받아 엑셀로 변환. `ExcelWrapper`(zod 스키마) + `downloadBlob` 을 화면에 직접 둠.

```html
<ng-template #toolTpl>
  <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
    <ng-icon [svg]="tablerFileExcel" />
    엑셀 다운로드
  </sd-button>
</ng-template>
```

```ts
private readonly _excelWrapper = new ExcelWrapper(
  z.object({
    id: z.number().optional().describe("ID"),
    name: z.string().describe("이름"),
    isDeleted: z.boolean().describe("삭제"),
    lastModifiedAt: z.custom<DateTime>().optional().describe("수정일시"),
    lastModifiedBy: z.string().optional().describe("수정자"),
  }),
);

async onDownloadExcelButtonClick(): Promise<void> {
  if (this.busyCount() > 0) return;
  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const r = await this._search(false); // 페이징 무시 — 검색·필터 결과 전체
    const wb = await this._excelWrapper.write(this.viewTitle(), r.items);
    try {
      downloadBlob(
        await wb.toBlob(),
        `${this.viewTitle()}_${new DateTime().toFormatString("yyMMdd")}.xlsx`,
      );
    } finally {
      await wb.close(); // 워크북 자원 해제
    }
  });
  this.busyCount.update((v) => v - 1);
}
```

- 조회는 목록과 같은 `_search` 를 페이징 인자만 꺼서 재사용 — 보이는 페이지가 아니라 결과 전체를 받음.
- 파일명은 `<화면제목>_<yyMMdd>.xlsx`. 화면 제목은 `injectViewTitleSignal()`.
- 양식 컬럼 = 화면 표시 컬럼 + `삭제`(참/거짓) + `수정일시`·`수정자`([data-log.md](./data-log.md) 의 표시 규약). 참조 마스터는 명칭으로 출력.
- 비밀번호 등 평문으로 못 꺼내는 값은 양식에서 제외.
- `ExcelWrapper`/`downloadBlob` 자체 사용법은 [apis/excel/README.md](../apis/excel/README.md) · [apis/core-browser/README.md](../apis/core-browser/README.md).

### 특정 행의 선택·삭제를 막으려면

`[getItemSelectableFn]` 로 행별 선택 가능 여부를 반환. 문자열을 반환하면 그 사유가 안내되고 해당 행은 선택(→삭제) 불가. 개별 선택·전체 선택 모든 경로에 적용됨.

```ts
// 로그인한 본인 계정은 선택(→삭제) 불가
getItemSelectableFn = (item: IItem): boolean | string =>
  item.id === this._appAuth.authInfo()?.employeeId
    ? "본인 계정은 삭제할 수 없습니다."
    : true;
```

- `true` = 선택 가능, `string` = 선택 불가 + 사유. 선택 자체가 막히므로 핸들러에 같은 가드를 또 두지 않아도 됨.
- 단건 상세에는 선택 개념이 없으므로, 같은 제약을 삭제 버튼을 조건부로 숨겨 적용(`@if (!isSelf() && perms().includes("edit")) { ...삭제 버튼... }`).

## `sd-crud-detail`

단일 레코드 편집 화면의 표준 골격. 다음 기능을 일괄 제공: 폼 래핑, CTRL+S 단축키 저장, 저장 버튼, 모달의 "확인" 버튼 자동 처리.

### 표준 호출

```html
<sd-crud-detail
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')"
  [readonly]="!canEdit()"
  [viewType]="viewType()"
  (submit)="onSubmit()"
>
  <ng-template #contentTpl>
    <!-- 폼 본문 -->
  </ng-template>
</sd-crud-detail>
```

### 슬롯 규약

| 슬롯                 | 용도                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `#contentTpl` (필수) | 폼 본문. `readonly` 면 `<sd-form>` 래핑 없이 그대로 표시.         |
| `#commandTpl`        | 상단/명령 영역 추가 버튼.                                         |
| `#bottomCommandTpl`  | modal 하단 좌측. modal 일 때 우측 "확인" 버튼이 항상 자동 추가됨. |

### viewType 별 동작

- **`'page'`** — 라우팅 진입 단위. 상단에 저장 버튼.
- **`'control'`** — view 안에 임베드. 명령 영역에 저장 버튼.
- **`'modal'`** — 모달. 하단 우측에 "확인" 버튼이 자동으로 추가.

## 삭제·복구를 처리하려면 (목록·단건 공통)

삭제는 soft delete, 복구는 그 반대. 두 처리 모두 변경 이력 적재([data-log.md](./data-log.md))와 공유 데이터 통지([client-shared-data.md](./client-shared-data.md))를 같은 트랜잭션·동작 안에서 함께 수행.

### 삭제 (onDelete)

`confirm` → soft delete(`isDeleted=true`) → 이력 적재 → 공유 데이터 통지 → 목록은 refresh / 단건은 close.

```ts
async onDelete(targets: IItem[]): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.canEdit()) return;
  if (targets.length === 0) return;
  if (!confirm("삭제하시겠습니까?")) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const ids = targets.map((t) => t.id);
    const employeeId = this._appAuth.authInfo()?.employeeId;
    await this._appOrm.connectAsync(async (db) => {
      await db.role().where((c) => [expr.in(c.id, ids)]).update(() => ({ isDeleted: true }));
      for (const id of ids) {
        await db.role().insertDataLog({ action: "삭제", itemId: id, employeeId });
      }
    });
    await this._appSharedData.emitAsync("역할", ids);
    this._sdToast.success("삭제되었습니다.");
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}
```

### 복구 (onRestore)

복구는 `confirm` 없이 진행하되, **활성 유니크 컬럼(명칭·코드)이 있으면 복구로 활성 중복이 생기지 않는지 재검증**해야 함(삭제된 동안 같은 값의 활성 레코드가 생겼을 수 있음). 검증 위치가 단건/벌크에서 다름. 활성 유니크 정책 자체는 [orm.md](./orm.md) 의 유니크 전략.

**단건 복구 (detail) — 선검증**: 복구 전에 `exists` 로 충돌을 막음.

```ts
// 복구 전 활성 유니크 재검증
const isNameDuplicated = await db
  .role()
  .where((c) => [
    expr.eq(c.name, roleName),
    expr.eq(c.isDeleted, false),
    expr.not(expr.eq(c.id, roleId)), // 자기 자신 제외
  ])
  .exists();
if (isNameDuplicated) throw new Error("같은 이름의 활성 역할이 있어 복구할 수 없습니다.");

await db.role().where((c) => [expr.eq(c.id, roleId)]).update(() => ({ isDeleted: false }));
await db.role().insertDataLog({ action: "복구", itemId: roleId, employeeId });
// → emitAsync → refresh (단건 복구는 닫지 않고 refresh)
```

**벌크 복구 (list) — 후검증**: update 전엔 대상이 모두 삭제 상태라 대상끼리 충돌을 쿼리로 못 봄 → update **후** 한 쿼리로 활성 중복을 검사하고, 충돌 시 throw 해 트랜잭션 전체를 롤백.

```ts
await db.role().where((c) => [expr.in(c.id, ids)]).update(() => ({ isDeleted: false }));

// 복구 후 활성 유니크 재검증 — 대상끼리·기존 활성과의 충돌을 복구한 이름으로 한정해 한 번에
const conflicts = await db
  .role()
  .where((c) => [expr.in(c.name, names), expr.eq(c.isDeleted, false)])
  .groupBy((c) => [c.name])
  .having(() => [expr.gt(expr.count(), 1)])
  .select((c) => ({ name: c.name }))
  .execute();
if (conflicts.length > 0) {
  const conflictNames = conflicts.map((x) => `'${x.name}'`).join(", ");
  throw new Error(`같은 이름(${conflictNames})의 활성 역할이 있어 복구할 수 없습니다.`);
}

for (const id of ids) {
  await db.role().insertDataLog({ action: "복구", itemId: id, employeeId });
}
// → emitAsync → refresh
```

### 지킬 것

- 삭제·복구·이력 적재는 한 `connectAsync` 트랜잭션 안에서 수행 — 데이터만 바뀌고 이력이 빠지거나 그 반대가 되지 않게 함.
- 벌크 복구는 하나라도 충돌하면 전체 롤백(원자성). 충돌분만 빼고 나머지를 복구하지 않음.
- 활성 유니크 검증은 복구 경로에서 빠뜨리지 않음 — 단건은 선검증, 벌크는 후검증. 활성 유니크가 없는 모델이면 생략 가능.
- 단건은 삭제 후 닫고(close), 복구 후엔 닫지 않고 refresh — 복구 직후 상세를 계속 보도록.
