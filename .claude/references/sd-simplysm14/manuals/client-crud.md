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
  [currDeletedItems]="deletedItems()"
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

- **`[currDeletedItems]`** — 삭제(soft delete)된 행을 시트에서 취소선으로 구분하고 "선택 복구" 버튼을 띄우는 입력. `deletedItems = computed(() => this.items().filter((i) => i.isDeleted))` 를 넘김. 삭제항목 포함 검색을 지원하는 목록에는 필수 — 빠뜨리면 삭제 행이 일반 행과 구분되지 않고 복구 버튼이 나오지 않음.

### 슬롯 규약

| 슬롯                | 용도                                                                       |
| ------------------- | -------------------------------------------------------------------------- |
| `#filterTpl`        | 검색 폼 필드. 있으면 상단에 조회 버튼과 함께 노출.                         |
| `#toolTpl`          | 등록/삭제 버튼 옆 추가 도구 버튼.                                          |
| `#commandTpl`       | 상단 명령 영역(viewType 이 `modal`·`control` 인 경우 해당 모드의 명령 영역)에 추가 액션 버튼. |
| `#bottomCommandTpl` | modal 하단 좌측 영역. modal + selectMode 인 경우 "선택 해제/확인" 버튼과 함께 표시. |

`<sd-sheet-column>` 은 `<sd-crud-list>` 의 직속 자식으로 두면 내부 시트로 자동 투영됨.

### 와이어프레임이 표준 버튼 위치와 충돌하면

`(create)/(delete)/(restore)` 표준 출력이 와이어프레임에 명시된 버튼 위치를 가린다면, 표준 출력 사용을 포기하고 `#toolTpl` 등 슬롯 안에 `sd-button` 으로 직접 배치. 시각 요소 배치는 와이어프레임이 1순위 ([client-component.md "시각 요소 배치 기준"](./client-component.md)).

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
    <ng-icon [svg]="tablerDownload" />
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
- 같은 `_excelWrapper`(zod 스키마) 를 아래 업로드 레시피와 **공유**함 — `write` 가 다운로드, `read` 가 업로드.
- `ExcelWrapper`/`downloadBlob` 자체 사용법은 [apis/excel/README.md](../apis/excel/README.md) · [apis/core-browser/README.md](../apis/core-browser/README.md).

### 엑셀 업로드로 일괄 등록·수정하려면

다운로드와 **같은 `_excelWrapper`(zod 스키마) 를 공유**해 역방향으로 읽음. `#toolTpl` 의 다운로드 버튼 옆에 업로드 버튼을 `edit` 권한으로 게이팅해 두고, `openFileDialog` → `_excelWrapper.read` → 정합성 검증 → `save` 일괄 저장. 아래 예시는 참조 마스터(예: 역할) 컬럼을 포함한 목록 기준.

```html
<ng-template #toolTpl>
  @if (perms().includes("edit")) {
    <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
      <ng-icon [svg]="tablerUpload" />
      엑셀 업로드
    </sd-button>
  }
  <!-- 위 '엑셀 다운로드' 버튼과 같은 #toolTpl 안에 둠 -->
</ng-template>
```

```ts
async onUploadExcelButtonClick(): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.perms().includes("edit")) return;

  const files = await openFileDialog({ accept: ".xlsx" });
  if (files == null) return; // 취소

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 파생 컬럼(수정일시·수정자)은 업로드에서 제외하고 파싱.
    const records = await this._excelWrapper.read(files[0], 0, {
      excludes: ["lastModifiedAt", "lastModifiedBy"],
    });
    if (records.length === 0) throw new Error("업로드할 데이터가 없습니다.");

    // 다건일 때만 에러 메시지에 항목명을 붙임(단건이면 평문).
    const label = (itemName: string): string =>
      records.length > 1 ? `직원 '${itemName}': ` : "";

    // 참조 마스터: 명칭 → ID 역변환(활성 기준). 매칭 안 되는 명칭은 throw.
    const roleIdByName = new Map(this.sharedRoles.items().map((r) => [r.name, r.id] as const));
    const inputs = records.map((rec) => {
      let roleId: number | undefined;
      const roleName = rec.roleName?.trim();
      if (roleName != null && roleName !== "") {
        roleId = roleIdByName.get(roleName);
        if (roleId == null) throw new Error(`${label(rec.name)}존재하지 않는 역할입니다. (${roleName})`);
      }
      return { id: rec.id, name: rec.name, roleId, isDeleted: rec.isDeleted };
    });

    // ID↔이름 정합성 — id 있는 행은 DB의 (id, name) 과 대조. id 없으면 신규.
    const ids = inputs.flatMap((x) => (x.id != null ? [x.id] : []));
    const dbRows =
      ids.length === 0
        ? []
        : await this._appOrm.connectAsync((db) =>
            db
              .employee()
              .where((c) => [expr.in(c.id, ids)])
              .select((c) => ({ id: c.id, name: c.name }))
              .execute(),
          );
    const dbNameById = new Map(dbRows.map((r) => [r.id, r.name] as const));

    // 기존 이름(비즈니스키)이 바뀌면 엑셀 행 어긋남(정렬 사고) 의심 → 변경 건수를 입력받아 확인.
    let nameChangedCount = 0;
    for (const x of inputs) {
      if (x.id == null) continue;
      const dbName = dbNameById.get(x.id);
      if (dbName == null) throw new Error(`${label(x.name)}ID ${x.id} 에 해당하는 직원이 없습니다.`);
      if (dbName !== x.name.trim()) nameChangedCount++;
    }
    if (nameChangedCount >= 1) {
      const answer = prompt(
        `기존 항목 ${nameChangedCount}건의 이름이 변경됩니다.\n계속하려면 ${nameChangedCount} 을(를) 입력하세요.`,
      );
      if (answer == null || answer.trim() !== String(nameChangedCount)) return;
    }

    const results = await this._appService.employee.save(inputs); // 일괄 저장(트랜잭션)
    await this._appSharedData.emitAsync(
      "직원",
      results.map((r) => r.id),
    );
    this._sdToast.success(`${results.length}건이 반영되었습니다.`);
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}
```

- 다운로드와 같은 `_excelWrapper` 를 그대로 재사용 — `read(file, sheetIndex, { excludes })` 가 역방향. `excludes` 로 파생 컬럼(수정일시·수정자)을 파싱에서 뺌.
- 빈 파일(0건)은 throw — 정상 처리하지 않음.
- 참조 마스터(역할 등)는 **명칭 → ID 역변환**. 매칭 안 되는 명칭은 throw — 일부만 건너뛰지 않음(다중 작업 원자성).
- `id` 유무로 신규/수정 분기. `id` 있는 행은 DB의 `(id, name)` 과 대조해 존재·정합성 확인(없으면 throw).
- 기존 이름(비즈니스키) 변경은 엑셀 행이 밀린 사고일 수 있어, 변경 건수를 직접 입력받아 확인 후 진행.
- 저장은 `save(inputs)` 한 번으로 일괄 — 한 건이라도 실패하면 전체 롤백(트랜잭션 원자성).
- 업로드 버튼은 `edit` 권한일 때만 노출. import 추가: `openFileDialog`(`@simplysm/core-browser`) · `tablerUpload`(`@ng-icons/tabler-icons`).

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

### 시트 정렬을 서버 정렬로 반영하려면

`[(sorts)]="sortingDefs"` 로 받은 정렬 조건을 `_search` 쿼리에 반영. 시트 컬럼 `key` 가 select 별칭과 일치하므로, 컬럼별 분기 없이 `obj.getChainValue` 로 `key` 를 컬럼으로 풀어 `orderBy` 에 전달.

```ts
// 화면 사용자가 지정한 정렬을 우선순위대로 적용
for (const sort of this.sortingDefs()) {
  qr2 = qr2.orderBy((c) => obj.getChainValue(c, sort.key) as any, sort.desc ? "DESC" : "ASC");
}
// 이 화면의 기본 정렬 — 여기를 고쳐 화면별 기본값을 바꿈
if (!this.sortingDefs().some((s) => s.key === "id")) {
  qr2 = qr2.orderBy((c) => c.id, "DESC");
}
```

- 아래 `if` 블록이 그 화면의 기본 정렬을 정하는 자리. 예시는 `id DESC` — 다른 기본 정렬이 필요하면 `orderBy` 의 컬럼·방향과 `s.key` 를 같은 키로 함께 바꿈.
- 화면 사용자가 시트 헤더로 정렬하면 그 정렬이 1순위로 적용되고, 기본 정렬은 맨 뒤에 깔림.
- 컬럼마다 `if (sort.key === "X") orderBy((c) => c.X, ...)` 식 분기 금지 — `sort.key` 가 select 별칭과 일치하므로 한 줄로 처리.
- `obj` 는 `@simplysm/core-common`, `SortingDef` 는 `@simplysm/angular`.

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

`confirm` → soft delete(`isDeleted=true`) → 이력 적재 → 공유 데이터 통지 → 목록(list)은 `_refresh()` / 단건(detail)은 `submitted.emit(true)`.

**벌크 삭제 (list)**:

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

**단건 삭제 (detail)**: `sd-crud-detail` 표준 호출에는 `(delete)` output 이 없으므로, 삭제 버튼을 슬롯에 직접 둠 — 모달로 띄우는 detail 은 `#bottomCommandTpl`(모달 "확인" 버튼과 같은 하단 줄)에 두고 `(click)="onDelete()"` 로 배선. 목록의 `_refresh()` 대신 detail 통지 output(임베드면 `submitted.emit(true)`, 모달이면 `close.emit(payload)`)으로 부모(list) 에 통지.

```ts
async onDelete(): Promise<void> {
  if (this.busyCount() > 0) return;
  if (!this.canEdit()) return;
  if (!confirm("삭제하시겠습니까?")) return;

  const id = this.dataId();
  const employeeId = this._appAuth.authInfo()?.employeeId;
  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    await this._appOrm.connectAsync(async (db) => {
      await db.role().where((c) => [expr.eq(c.id, id)]).update(() => ({ isDeleted: true }));
      await db.role().insertDataLog({ action: "삭제", itemId: id, employeeId });
    });
    await this._appSharedData.emitAsync("역할", [id]);
    this._sdToast.success("삭제되었습니다.");
    this.submitted.emit(true);
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
- 단건(detail)은 삭제 후 부모에 통지 — 임베드(컨트롤)면 `submitted.emit(true)`, 모달이면 `close.emit(payload)` 로 결과 반환(호출 측이 `showAsync` 반환으로 refresh). 두 output 은 독립이며 사용 맥락에 따라 한쪽 또는 양쪽 ([client-component.md "detail 데이터 흐름"](./client-component.md) 참조). 복구 후엔 닫지 않고 refresh — 복구 직후 상세를 계속 보도록.
