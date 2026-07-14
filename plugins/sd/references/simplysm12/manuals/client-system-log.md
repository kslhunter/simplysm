# 시스템 에러·로그 적재·조회 매뉴얼

서버에서 발생한 에러를 DB(`SystemLog` 테이블)에 적재하고, 적재된 로그를 관리자 화면에서 기간·검색어로 조회하려 할 때 참조.

v12 의 시스템 로그는 **서버 로거의 `customFn` 훅**으로 적재함. `SdLogger.setConfig` 의 `customFn` 이 `error` 심각도 로그를 받아 ORM 으로 DB 에 한 줄 넣고, 관리자 클라이언트는 그 `SystemLog` 테이블을 `AbsSdDataSheet` 기반 화면으로 읽음. 로거의 콘솔·파일 출력 설정 일반은 [logging.md](./logging.md), 조회 화면의 골격(`AbsSdDataSheet` 오버라이드 멤버 전반)은 [client-data-sheet.md](./client-data-sheet.md) 를 함께 봄.

> 참고: `@simplysm/sd-orm-common-ext` 의 `SystemLog` 모델과 `DbContextExt.writeSystemLog` 는 소스에서 `/** @deprecated */` 로 표시되어 있음(`packages/sd-orm-common-ext/src/models/SystemLog.ts`, `.../extensions/DbContextExt.ts`). 다만 simplysm-ts·centurymes 두 실사용 프로젝트가 지금도 이 경로로 에러를 적재·조회하고 있으므로, 본 매뉴얼은 그 실사용 패턴을 그대로 기술함.

## 시스템 로그 테이블이 무엇을 담는지 확인하려면

`SystemLog` 테이블은 `@simplysm/sd-orm-common-ext` 에 모델로 정의돼 있고, `DbContextExt` 를 상속한 프로젝트 `DbContext` 라면 `db.systemLog` 로 바로 쓸 수 있음(`DbContextExt` 가 `systemLog = new Queryable(this, SystemLog)` 를 들고 있음 — `packages/sd-orm-common-ext/src/extensions/DbContextExt.ts:16`). 별도로 테이블을 선언할 필요가 없음.

컬럼 구성(`packages/sd-orm-common-ext/src/models/SystemLog.ts`):

```ts
@Table({ description: "시스템 로그" })
export class SystemLog {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Column({ description: "클라이언트명" })
  clientName!: string;

  @Column({ description: "발생일시" })
  dateTime!: DateTime;

  @Column({ description: "구분" })
  type!: string; // "error" | "warn" | "log"

  @Column({ description: "메시지", dataType: { type: "STRING", length: "MAX" } })
  message!: string;

  @Column({ description: "사용자.ID", nullable: true })
  userId?: number;

  @ForeignKey(["userId"], () => User, "사용자")
  user?: Readonly<User>;
}
```

- `type` 에는 `customFn` 이 넘기는 심각도(`error`/`warn`/`log`)가 문자열 그대로 들어감.
- `message` 는 `STRING/MAX` 라 스택 트레이스처럼 긴 텍스트도 담음.
- `userId` 는 `nullable`. 서버 자체에서 난 에러처럼 사용자가 특정되지 않는 로그를 위해 비워둘 수 있음. `user` 외래키가 걸려 있어 조회 시 `include` 로 사용자명을 끌어올 수 있음.

## 서버 에러를 DB 에 적재하려면

서버 진입점(`main.ts`)의 `SdLogger.setConfig({ customFn })` 에서 `error` 심각도 로그만 골라 `db.writeSystemLog(...)` 로 넣음. `writeSystemLog` 는 `DbContextExt` 의 메서드라 `db` 에서 바로 부를 수 있음.

simplysm-ts 의 운영(production) 분기(`packages/server/src/main.ts:23`):

```ts
const orm = createOrm(import.meta.dirname);

if (process.env["NODE_ENV"] === "production") {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.none,
    },
    file: {
      level: SdLoggerSeverity.debug,
      outDir: path.resolve(import.meta.dirname, "_logs"),
    },
    customFn: async (severity, ...logs) => {
      if (severity === SdLoggerSeverity.error) {
        await orm.connectAsync(async (db) => {
          await db.writeSystemLog(undefined, "server", "error", ...logs);
        });
      }
    },
  });
}
```

`writeSystemLog` 의 시그니처와 동작(`packages/sd-orm-common-ext/src/extensions/DbContextExt.ts:151`):

```ts
async writeSystemLog(
  userId: number | undefined,
  clientName: string,
  severity: "error" | "warn" | "log",
  ...logs: any[]
) {
  await this.systemLog.insertAsync([
    {
      clientName: clientName,
      dateTime: new DateTime(),
      type: severity,
      message: util.format(...logs),  // node:util.format 으로 가변 인자를 한 문자열로
      userId: userId,
    },
  ]);
}
```

지킬 점:

- **`customFn` 에서 `severity` 를 직접 걸러냄.** `customFn` 은 설정한 레벨 이상의 모든 로그를 받으므로, DB 에는 에러만 남기고 싶다면 위처럼 `severity === SdLoggerSeverity.error` 일 때만 적재함. 무조건 적재하면 `log`/`warn` 까지 DB 로 쏟아짐.
- **`clientName` 으로 출처를 구분함.** 서버에서 직접 부를 때는 `"server"` 처럼 고정 문자열을 줌. 어느 노드에서 난 에러인지 조회 화면에서 이 값으로 구분함.
- **`customFn` 으로 넘어오는 `Error` 는 이미 stack 문자열로 변환돼 있음.** `SdLogger` 가 `customFn` 을 부르기 직전 `log instanceof Error && log.stack !== undefined ? log.stack : log` 로 매핑해서 넘김(`packages/sd-core-node/src/utils/SdLogger.ts:215`). 그래서 `message` 에는 에러 메시지뿐 아니라 스택까지 들어감 — 조회 화면에서 `<pre>` 로 그대로 보여줄 가치가 있음.
- **적재 실패가 원래 흐름을 막지 않게 함.** `SdLogger` 는 `customFn` 이 돌려준 Promise 의 거부를 `r.catch(...)` 로 받아 콘솔에만 남기고 삼킴(같은 파일 `:221`). 즉 DB 적재가 실패해도 로깅을 부른 본 코드는 멈추지 않음. `customFn` 안에서 또 try/catch 로 에러를 재차 던질 필요는 없음.
- **`customFn` 안에서 다시 에러 레벨로 로깅하지 않음.** `customFn` 적재 도중 에러를 `logger.error` 로 남기면 그 로그가 또 `customFn` 을 타 무한 재귀·중복 적재가 될 수 있음. 적재 실패는 위처럼 프레임워크의 `catch` 에 맡김.

로거 레벨·파일 출력(`console`/`file` 옵션) 설정의 일반 규칙은 [logging.md](./logging.md) 를 참조함. 여기서는 "에러를 DB 로 흘려보내는 `customFn` 배선"만 다룸.

## 적재된 로그를 조회 화면으로 보려면

관리자 클라이언트에 `AbsSdDataSheet` 를 상속한 목록 화면을 만듦. `db.systemLog` 를 `include(user).select(...)` 로 읽고, 기간(`sd-date-range-picker`)·검색어(`sd-textfield`) 필터를 걺. 아래는 simplysm-ts·centurymes 가 공통으로 쓰는 `SystemLogPage` 전문임(simplysm-ts `packages/client-admin/src/app/home/system/system-log/SystemLogPage.ts`, centurymes 도 동일 구조).

### 컴포넌트 골격과 권한

```ts
@Component({
  selector: "app-system-log",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdSheetColumnCellTemplateDirective,
    FormatPipe,
    SdDataSheetControl,
    SdDataSheetColumnDirective,
    SdDateRangePicker,
  ],
  template: `
    ...
  `, // 아래 템플릿 참조
})
export class SystemLogPage extends AbsSdDataSheet<IFilter, IItem, number> {
  #appOrm = inject(AppOrmProvider);

  perms = usePermsSignal(["system.system-log"], ["use"]);
  name = "시스템로그";

  override canUse = $computed(() => this.perms().includes("use"));
  override canEdit = $computed(() => false); // 로그는 편집 대상이 아님
  override editMode = "inline" as const;
  override selectMode = input<"single" | "multi" | undefined>();

  override bindFilter(): IFilter {
    return {};
  }

  override itemPropInfo: ISdDataSheetItemPropInfo<IItem> = {
    isDeleted: undefined,
    lastModifiedAt: undefined,
    lastModifiedBy: undefined,
  };
  override getItemInfoFn = (item: IItem) => ({
    key: item.id,
    canSelect: true,
    canEdit: true,
    canDelete: true,
  });
}

interface IFilter {
  fromDate?: DateOnly;
  toDate?: DateOnly;
  searchText?: string;
}

interface IItem {
  id: number;
  clientName: string;
  dateTime: DateTime;
  type: string;
  message: string;
  userName: string;
}
```

- 시스템 로그는 읽기 전용이므로 `canEdit` 를 `$computed(() => false)` 로 고정함. 시트에 신규/저장/삭제 도구가 뜨지 않음.
- `itemPropInfo` 의 `isDeleted`/`lastModifiedAt`/`lastModifiedBy` 를 모두 `undefined` 로 둠. `SystemLog` 테이블에 소프트삭제·수정이력 컬럼이 없기 때문임(위 모델 정의 참조).
- 권한 코드(`system.system-log`)와 화면 구조 등록은 [client-data-sheet.md](./client-data-sheet.md) 의 메뉴/권한 섹션을 따름.

### 기간·검색어 필터 템플릿

`filterTpl` 안에 조회기간과 검색어 입력을 둠. 필터 객체의 내부 필드를 바꾼 뒤 시그널 변경을 알리려면 `(...)Change` 에서 `filter.$mark()` 를 호출함.

```html
<sd-data-sheet>
  <ng-template #filterTpl>
    <div>
      <label>조회기간</label>
      <sd-date-range-picker
        [(from)]="filter().fromDate"
        (fromChange)="filter.$mark()"
        [(to)]="filter().toDate"
        (toChange)="filter.$mark()"
      />
    </div>
    <div>
      <label>검색어</label>
      <sd-textfield type="text" [(value)]="filter().searchText" (valueChange)="filter.$mark()" />
    </div>
  </ng-template>

  <sd-data-sheet-column fixed header="#" key="id">
    <ng-template [cell]="items()" let-item>
      <div class="p-xs-sm tx-right">{{ item.id }}</div>
    </ng-template>
  </sd-data-sheet-column>

  <sd-data-sheet-column header="일시" key="dateTime">
    <ng-template [cell]="items()" let-item>
      <div class="p-xs-sm">{{ item.dateTime | format: "yyyy-MM-dd HH:mm" }}</div>
    </ng-template>
  </sd-data-sheet-column>

  <sd-data-sheet-column header="구분" key="type">
    <ng-template [cell]="items()" let-item>
      <div class="p-xs-sm">{{ item.type }}</div>
    </ng-template>
  </sd-data-sheet-column>

  <sd-data-sheet-column header="사용자명" key="userName">
    <ng-template [cell]="items()" let-item>
      <div class="p-xs-sm">{{ item.userName }}</div>
    </ng-template>
  </sd-data-sheet-column>

  <sd-data-sheet-column header="클라이언트" key="clientName">
    <ng-template [cell]="items()" let-item>
      <div class="p-xs-sm">{{ item.clientName }}</div>
    </ng-template>
  </sd-data-sheet-column>

  <sd-data-sheet-column header="메시지" key="message">
    <ng-template [cell]="items()" let-item>
      <div class="p-xs-sm"><pre>{{ item.message }}</pre></div>
    </ng-template>
  </sd-data-sheet-column>
</sd-data-sheet>
```

- 메시지 컬럼은 `<pre>` 로 감쌈. `customFn` 이 적재한 스택 트레이스의 줄바꿈·들여쓰기를 살려 그대로 읽기 위함임.
- `(fromChange)`/`(toChange)`/`(valueChange)` 에서 `filter.$mark()` 를 부르지 않으면, 객체 시그널 `filter` 의 내부 필드만 바뀌고 시그널 자체는 "변경"으로 인식되지 않아 재조회가 트리거되지 않음. 필터 객체·배열 필드 변경 알림 패턴은 [client-data-sheet.md](./client-data-sheet.md) 참조.

### search() — include·필터·정렬·페이징

`AbsSdDataSheet.search(usePagination)` 를 오버라이드해 실제 조회를 구현함. 시점이 고정된 마지막 조회 조건은 `this.lastFilter()` 로 읽고, 정렬/페이지는 `this.sortingDefs()`/`this.page()` 를 씀(베이스 시그널 — `packages/sd-angular/src/features/data-view/sd-data-sheet.control.ts:575`,`:577`,`:582`).

```ts
override async search(usePagination: boolean): Promise<ISdDataSheetSearchResult<IItem>> {
  return await this.#appOrm.connectAsync(async (db) => {
    let qr1 = db.systemLog
      .include((item) => item.user)
      .select<IItem>((item) => ({
        id: item.id.notNull(),
        clientName: item.clientName,
        dateTime: item.dateTime,
        type: item.type,
        message: item.message,
        userName: item.user.name,
      }));

    //-- 기간 필터: dateTime 을 DateOnly 로 캐스팅해 between
    if (this.lastFilter().fromDate || this.lastFilter().toDate) {
      qr1 = qr1.where((item) => [
        db.qh.between(
          db.qh.cast(item.dateTime, DateOnly),
          this.lastFilter().fromDate,
          this.lastFilter().toDate,
        ),
      ]);
    }

    //-- 검색어: 여러 컬럼을 동시에 LIKE 검색
    if (!StringUtils.isNullOrEmpty(this.lastFilter().searchText)) {
      qr1 = qr1.search(
        (item) => [item.clientName, item.type, item.userName],
        this.lastFilter().searchText!,
      );
    }

    //-- 페이지 수 (시트 페이징)
    const pageLength = usePagination ? Math.ceil((await qr1.countAsync()) / 50) : undefined;

    let qr2 = qr1;

    //-- 정렬: 시트에서 지정한 정렬 + 기본 id 역순
    for (const sortingDef of this.sortingDefs()) {
      qr2 = qr2.orderBy(sortingDef.key, sortingDef.desc);
    }
    if (!this.sortingDefs().some((item) => item.key === "id")) {
      qr2 = qr2.orderBy((item) => item.id, true);
    }

    //-- 현재 페이지만큼 잘라오기
    if (usePagination) {
      qr2 = qr2.limit(this.page() * 50, 50);
    }

    const items = await qr2.resultAsync();
    return { items, pageLength };
  });
}
```

지킬 점:

- **사용자명은 `include(user)` 후 `select` 의 `item.user.name` 으로 끌어옴.** `userId` 가 `null` 인 서버 로그는 외래키 조인 결과가 비어 `userName` 이 `undefined` 가 됨 — 화면에서는 빈 셀로 표시됨. `IItem.userName` 을 비어 있을 수 있는 값으로 다룸.
- **기간 필터는 `qh.cast(item.dateTime, DateOnly)` 후 `qh.between` 함.** `dateTime` 은 시각까지 가진 `DateTime` 이라, `DateOnly` 로 자른 뒤 `from`/`to`(둘 다 `DateOnly`) 사이로 비교해야 "해당 날짜 포함" 이 의도대로 나옴. `between` 은 양끝 경계를 포함함.
- **검색어는 `Queryable.search([컬럼들], 텍스트)` 로 여러 컬럼을 한 번에 봄.** 위 예시는 `clientName`/`type`/`userName` 을 검색 대상으로 둠. `message`(스택 전문)는 검색 대상에서 빠져 있음 — 검색 범위를 넓히려면 이 배열에 컬럼을 추가함.
- **필터 조건은 반드시 `this.lastFilter()` 로 읽음.** `this.filter()`(입력 중인 값)가 아니라, 조회 버튼 시점에 고정된 `lastFilter` 를 써야 입력 중 값이 즉시 쿼리에 새지 않음. 베이스가 조회 시 `lastFilter.set(clone(filter()))` 로 스냅샷함(`sd-data-sheet.control.ts:643`).
- **페이지 수 계산용 `countAsync` 는 정렬·`limit` 적용 전 쿼리(`qr1`)로 함.** 정렬·페이징을 얹은 `qr2` 와 분리해, 전체 건수는 필터까지만 반영된 `qr1` 에서 셈.
- 쿼리 헬퍼(`qh.*`)·`include`·`select`·`orderBy`·`limit` 의 상세 의미는 [orm.md](./orm.md) 를 봄.

### 조회 결과를 엑셀로 받으려면

`downloadExcel(items)` 를 오버라이드해 `SdExcelWrapper` 로 내려줌. 컬럼 정의는 `IItem` 필드와 맞춤.

```ts
#excelWrapper = new SdExcelWrapper({
  id: { displayName: "ID", type: Number },
  dateTime: { displayName: "일시", type: DateTime },
  type: { displayName: "구분", type: String },
  userName: { displayName: "사용자명", type: String },
  clientName: { displayName: "클라이언트", type: String },
  message: { displayName: "메시지", type: String },
});

override async downloadExcel(items: IItem[]) {
  const wb = await this.#excelWrapper.writeAsync(this.name, items);
  const blob = await wb.getBlobAsync();
  blob.download(`${this.name}.xlsx`);
}
```

엑셀 읽기/쓰기 일반은 [excel.md](./client-data-sheet.md) 참조. 여기서는 조회된 시스템 로그를 그대로 시트 한 장으로 내보내는 용도만 다룸.

## 지킬 것 (요약)

- DB 적재는 서버 `SdLogger.setConfig` 의 `customFn` 한 곳에서만 배선하고, `severity === error` 만 골라 `writeSystemLog` 로 넣음. 화면·서비스 코드에서 직접 `systemLog.insert` 하지 않음.
- `customFn` 적재 실패는 프레임워크가 삼키므로 본 흐름을 막지 않음. `customFn` 안에서 에러 레벨로 재로깅해 재귀 적재를 만들지 않음.
- 조회 화면은 읽기 전용으로 — `canEdit` 를 `false` 로 고정하고 `itemPropInfo` 의 삭제·수정이력 필드를 비움.
- 필터는 `lastFilter()` 로 읽고, 기간은 `cast(DateOnly)+between`, 검색어는 `Queryable.search` 로 처리함.
- `SystemLog`·`writeSystemLog` 는 라이브러리에서 `@deprecated` 표시가 붙어 있으니, 신규 설계 시 이력 적재(`insertDataLogAsync`/`joinLastDataLog`) 등 다른 경로와 비교해 채택 여부를 판단함([orm.md](./orm.md) 의 데이터 변경 이력 섹션 참조).
