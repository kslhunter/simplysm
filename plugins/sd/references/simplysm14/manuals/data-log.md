# 데이터 변경 이력 적재·조회

CRUD 처리에서 "누가·언제·무엇을 어떻게 바꿨는지" 를 한 모델(`SystemDataLog`)에 모아 적재하고, 목록·단건 화면에서 각 행의 최근/최초 변경 이력을 함께 보여주는 패턴.

핵심은 `Queryable.prototype` 확장 메서드 3개(`insertDataLog`/`joinLastDataLog`/`joinFirstDataLog`)를 만들어, 어떤 모델이든 `db.X().insertDataLog(...)` 처럼 동일하게 쓰는 것. `tableName`·`tableDescription` 은 호출한 테이블 정의에서 자동으로 채워지므로 호출부에서 모델명을 직접 적지 않음.

## 변경 이력 인프라를 프로젝트에 세팅하려면

세 가지를 만들고 연결함: 이력 저장 테이블 + Queryable 확장 + db-context 등록.

### 1. 이력 저장 테이블

```ts
// tables/system-data-log.ts
import { Table } from "@simplysm/orm-common";
import { Employee } from "./employee";

export const SystemDataLog = Table("SystemDataLog")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    tableName: c.varchar(200),
    tableDescription: c.varchar(200).nullable(),
    action: c.varchar(50),
    itemId: c.bigint().nullable(),
    valueJson: c.text().nullable(),
    dateTime: c.datetime(),
    employeeId: c.bigint().nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("tableName", "itemId"), i.index("dateTime").orderBy("DESC")])
  .relations((r) => ({
    employee: r.foreignKey(["employeeId"], () => Employee),
  }));
```

- `itemId` nullable: 단건 변경은 대상 레코드 PK, 전체 초기화 등 모델 단위 변경은 NULL.
- `employeeId` nullable: 수행 직원. NULL = 시스템 수행.
- 인덱스: 조회는 `(tableName, itemId)` 로 격리·`dateTime DESC` 로 최신 정렬하므로 두 인덱스를 둠.

### 2. Queryable 확장 (`*.ext.ts`)

`declare module` 로 타입을 보강하고 `Queryable.prototype` 에 런타임 구현을 붙임. `tableName`/`tableDescription` 은 `this.meta.from` 의 `meta.name`/`meta.description` 에서 자동 도출.

```ts
// system-data-log.ext.ts
import { DateTime } from "@simplysm/core-common";
import {
  type DataRecord,
  expr,
  Queryable,
  queryable,
  type TableBuilder,
} from "@simplysm/orm-common";
import { SystemDataLog } from "./tables/system-data-log";

export interface IDataLogJoinOptions {
  includeActions?: string[];
  excludeActions?: string[];
}

export interface IDataLogJoinResult {
  action?: string;
  dateTime?: DateTime;
  employeeId?: number;
  employeeName?: string;
}

export interface IInsertDataLogParam {
  action: string;
  itemId?: number;
  valueJson?: string;
  employeeId?: number;
}

declare module "@simplysm/orm-common" {
  interface Queryable<TData extends DataRecord, TFrom extends TableBuilder<any, any> | never> {
    joinLastDataLog(
      opts?: IDataLogJoinOptions,
    ): Queryable<TData & { lastDataLog?: IDataLogJoinResult }, TFrom>;
    joinFirstDataLog(
      opts?: IDataLogJoinOptions,
    ): Queryable<TData & { firstDataLog?: IDataLogJoinResult }, TFrom>;
    insertDataLog(log: IInsertDataLogParam): Promise<void>;
  }
}

Queryable.prototype.insertDataLog = async function (this: Queryable<any, any>, log) {
  const fromTable = this.meta.from as TableBuilder<any, any>;
  const qr = queryable(this.meta.db, SystemDataLog);
  await qr().insert([
    {
      tableName: fromTable.meta.name,
      tableDescription: fromTable.meta.description,
      action: log.action,
      itemId: log.itemId,
      valueJson: log.valueJson,
      dateTime: new DateTime(),
      employeeId: log.employeeId,
    },
  ]);
};

// tableName + 본 행 id 로 격리해 joinSingle 단건 부착. last/first 는 정렬만 다름.
Queryable.prototype.joinLastDataLog = function (this: Queryable<any, any>, opts) {
  const tableName = (this.meta.from as TableBuilder<any, any>).meta.name;
  return this.joinSingle("lastDataLog", (qr, en) =>
    qr
      .from(SystemDataLog)
      .where((dl) => [
        expr.eq(dl.tableName, tableName),
        expr.eq(dl.itemId, en["id"]),
        ...(opts?.includeActions ? [expr.in(dl.action, opts.includeActions)] : []),
        ...(opts?.excludeActions ? [expr.not(expr.in(dl.action, opts.excludeActions))] : []),
      ])
      .orderBy((dl) => dl.dateTime, "DESC")
      .top(1)
      .include((dl) => dl.employee)
      .select((dl) => ({
        action: dl.action,
        dateTime: dl.dateTime,
        employeeId: dl.employeeId,
        employeeName: dl.employee!.name,
      })),
  );
};

// joinFirstDataLog 는 위와 동일하되 키 이름 "firstDataLog" + orderBy 를 "ASC" 로.
```

`tableDescription` 을 채우려면 테이블에 `.description("역할")` 을 선언해야 함. 미선언 모델은 NULL 로 적재됨.

`joinLastDataLog`/`joinFirstDataLog` 는 본 행의 `id` 컬럼을 join 키로 사용함 → 적용 대상 모델은 PK 컬럼명이 `id` 여야 함.

### 3. db-context 등록

확장 메서드는 `*.ext.ts` 가 한 번이라도 로드돼야 prototype 에 붙음. `*.ext.ts` 가 진입점 import 그래프에 포함되면 로드 보장됨 — 표준 구조에선 `index.ts` 의 배럴 재export(`export * from "./db-main/system-data-log.ext"`)가 이를 충족. 배럴을 거치지 않고 db-context 를 직접 import 하는 경로가 따로 있으면 그 db-context 에 side-effect import 추가. 이력 직접 조회용 queryable 도 db-context 에 등록.

```ts
// main.db-context.ts
// ...
export class MainDbContext extends DbContext {
  role = this.queryable(Role);
  // ...
  dataLog = this.queryable(SystemDataLog); // 이력 직접 조회 화면용
}
```

## CRUD 처리에서 변경 이력을 적재하려면

변경을 수행한 모델의 queryable 에서 `insertDataLog` 를 호출. `tableName`·`dateTime` 은 자동이므로 `action` 과 대상 식별 정보만 넘김.

```ts
// 단건 등록/수정/삭제: itemId 로 대상 레코드 지정
const [role] = await db.role().insert([{ name: "관리자", isDeleted: false }], ["id"]);
await db.role().insertDataLog({ action: "등록", itemId: role.id });

// 전체 초기화(엑셀 업로드 등 모델 단위 변경): itemId 생략 → NULL 로 적재
await db.rolePermission().insertDataLog({ action: "초기화" });

// 수행 직원·변경 값 스냅샷까지 남기기
await db.role().insertDataLog({
  action: "수정",
  itemId: role.id,
  employeeId: ctx.employeeId,
  valueJson: JSON.stringify(changed),
});
```

`action` 문자열(`등록`/`수정`/`삭제`/`복구`/`초기화` 등)은 프로젝트 규약으로 통일. 조회 시 `includeActions`/`excludeActions` 가 이 문자열로 필터함.

## 목록·단건에 최근/최초 변경 이력을 함께 표시하려면

본 쿼리 체인에 `joinLastDataLog()`/`joinFirstDataLog()` 를 끼우면 각 행에 `lastDataLog`/`firstDataLog` 단건이 부착됨(없으면 `undefined`). 수행 직원명까지 한 쿼리로 조인됨.

```ts
const rows = await db
  .role()
  .where((p) => [expr.eq(p.id, role.id)])
  .joinLastDataLog() // 최신 변경 1건 → 행.lastDataLog
  .joinFirstDataLog() // 최초 변경 1건 → 행.firstDataLog
  .execute();

rows[0].lastDataLog?.action; // "삭제"
rows[0].lastDataLog?.dateTime; // DateTime
rows[0].lastDataLog?.employeeName; // "홍길동" (employee 조인 결과)
rows[0].firstDataLog?.action; // "등록"
```

`tableName` + 행 `id` 로 격리되므로 다른 모델의 같은 `itemId` 이력은 섞이지 않음. "최종 수정자/일시", "최초 등록자/일시" 컬럼은 별도 컬럼을 두지 말고 이 조인 결과로 표시.

## 표시 대상 변경 유형을 한정·제외하려면

`includeActions`/`excludeActions` 로 어떤 `action` 만 최근/최초로 칠지 조절.

```ts
// "등록"·"수정"만 대상 → "삭제" 가 최신이어도 제외하고 "수정" 이 lastDataLog
.joinLastDataLog({ includeActions: ["등록", "수정"] })

// "삭제" 만 빼고 최신 → "최종 수정 일시" 컬럼에 적합
.joinLastDataLog({ excludeActions: ["삭제"] })
```

## 목록 시트에 수정일시·수정자 컬럼을 두려면

`joinLastDataLog()` 로 부착한 `lastDataLog` 를 표시용 필드로 평탄화한 뒤 시트 컬럼으로 노출. 컬럼은 기본 숨김으로 두고 사용자가 컬럼 설정에서 켜 보게 함. 엑셀 다운로드에는 숨김과 무관하게 항상 포함.

```ts
.joinLastDataLog()
.select((c) => ({
  // ...표시 컬럼들...
  lastModifiedAt: c.lastDataLog?.dateTime,
  lastModifiedBy: c.lastDataLog?.employeeName,
}))
```

```html
<sd-sheet-column [key]="'lastModifiedAt'" [header]="'수정일시'" [hidden]="true">
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm">{{ item.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}</div>
  </ng-template>
</sd-sheet-column>

<sd-sheet-column [key]="'lastModifiedBy'" [header]="'수정자'" [hidden]="true">
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm">{{ item.lastModifiedBy ?? "&nbsp;" }}</div>
  </ng-template>
</sd-sheet-column>
```

- `[hidden]="true"` 로 기본 숨김 — 평소엔 안 보이고, 사용자가 시트 컬럼 설정에서 켜야 노출.
- 엑셀 다운로드 양식에는 항상 포함([client-crud.md](./client-crud.md) 의 엑셀 다운로드).
- 모델 단위 변경 로그(`itemId` 없음, 예: 초기화)는 개별 행에 조인되지 않아 그 행은 빈칸 — 정상.

## 지킬 것

- 모델 변경을 적재할 땐 변경을 수행한 그 모델의 queryable 에서 `insertDataLog` 호출. `db.dataLog().insert(...)` 로 `tableName` 을 손으로 적지 않음(자동 도출이 깨짐).
- "최종 수정자/일시"·"최초 등록자/일시" 는 대상 테이블에 별도 컬럼을 추가하지 말고 `joinLastDataLog`/`joinFirstDataLog` 조인으로 표시.
- 적재와 본 데이터 변경은 같은 트랜잭션 안에서 수행 — 이력만 남고 데이터가 롤백되거나 그 반대가 되지 않게 함.
- `action` 문자열은 프로젝트 단위로 고정된 집합을 쓰고, 조회 측 `includeActions`/`excludeActions` 와 철자를 일치시킴.
- 목록 시트의 `수정일시`·`수정자` 컬럼은 `[hidden]="true"` 기본(사용자가 켜서 봄)이고, 엑셀 다운로드에는 항상 포함.
