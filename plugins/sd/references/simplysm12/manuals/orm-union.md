# 이종 엔티티를 하나의 목록으로 합쳐 표시 (UNION)

[단일 쿼리 우선](./orm.md) 원칙을 지키면서, 서로 다른 테이블(입고/출고/생산/불량, 출고/반품, 매출/매입/급여 등)을 **하나의 목록, 집계로** 보여줘야 할 때 씀.
두 테이블을 각각 조회해 애플리케이션 코드에서 배열로 이어붙이지 말고, 각 하위 쿼리의 `select` 출력 형태(필드 이름, 타입)를 동일하게 맞춘 뒤 `Queryable.union([...])` 으로 DB 단에서 한 번에 합침.
이렇게 해야 합친 결과를 그대로 `orderBy`, 페이징, 재집계할 수 있고, 왕복 한 번으로 끝남.

`Queryable.union` 은 `@simplysm/sd-orm-common` 에 있으며, 시그니처는 `static union<ND, NT>(qrs: Queryable<ND, NT>[], as?): Queryable<ND, NT>` 임 (배열을 받음).
합쳐진 결과는 다시 하나의 `Queryable` 이므로 그 위에서 `orderBy` / `limit` / `groupBy` / `wrap` 후 `joinSingle` 등을 이어서 호출할 수 있음.

## 여러 테이블을 한 목록으로 합치려면

각 하위 쿼리를 `select` 까지 만들어 배열로 `Queryable.union([...])` 에 넘기고, 합친 결과에 `orderBy` 를 건 뒤 `resultAsync()` 로 가져옴.
핵심은 **모든 하위 쿼리의 select 출력 필드가 동일 스키마**여야 한다는 것임.
아래는 LOT 한 건의 변동 이력(입고/출고/생산/불량/투입/사용)을 합치는 화면임.
출력 스키마는 `type` / `date` / `quantity` 세 필드로 통일함.

`centurymes` `client-admin` `LotHistoryControl.ts`:

```ts
import { Queryable } from "@simplysm/sd-orm-common";
import { DateOnly } from "@simplysm/sd-core-common";

interface IItem {
  date: DateOnly;
  type: "입고" | "출고" | "생산" | "불량" | "투입" | "사용";
  quantity: number;
}

async #refresh() {
  await this.#appOrm.connectAsync(async (db) => {
    this.items.set(
      await Queryable.union([
        db.inbound
          .include((item) => item.requestItem.request)
          .where((item) => [db.qh.equal(item.requestItem.lotId, this.lotId())])
          .select<IItem>((item) => ({
            type: db.qh.val("입고"),
            date: item.requestItem.request.inboundDate.notNull(),
            quantity: db.qh.sum(item.quantity),
          }))
          .groupBy((item) => [item.date]),
        db.outbound
          .include((item) => item.requestItem.request)
          .where((item) => [db.qh.equal(item.lotId, this.lotId())])
          .select<IItem>((item) => ({
            type: db.qh.val("출고"),
            date: item.requestItem.request.completedDate.notNull(),
            quantity: db.qh.sum(item.quantity),
          }))
          .groupBy((item) => [item.date]),
        db.production
          .where((item) => [db.qh.equal(item.lotId, this.lotId())])
          .select<IItem>((item) => ({
            type: db.qh.val("생산"),
            date: db.qh.cast(item.dateTime, DateOnly),
            quantity: db.qh.sum(item.quantity),
          }))
          .groupBy((item) => [item.date]),
        // ... 불량/투입/사용도 동일 스키마로 이어붙임
      ])
        .orderBy((item) => item.date, true) // 합친 결과를 일자 DESC 로 정렬
        .resultAsync(),
    );
  });
}
```

여기서 관찰할 점:

- 각 하위 쿼리의 `where` 는 union **전에** 각 테이블에 동일 조건(`lotId` 일치)으로 걸려 있음.
  - 미리 걸어야 각 소스에서 행 수를 줄인 뒤 합침.
- 소스를 구분하는 식별 문자열은 `db.qh.val("입고")` 처럼 리터럴을 컬럼으로 넣음.
  - 이렇게 넣은 `type` 으로 화면에서 행 종류를 구분함(이 화면은 출고/투입/사용 행에 `tx-theme-danger-default` 클래스를 줘 빨갛게 표시함).
- 집계가 필요하면 각 하위 쿼리에서 미리 `db.qh.sum(...)` + `groupBy` 로 일자별 소계까지 만들어 합침.
- 합친 결과는 다시 하나의 `Queryable` 이므로 `orderBy((item) => item.date, true)` 가 외부 union 결과 전체에 적용됨(두 번째 인자 `true` 가 DESC).
  - 정렬, 집계 쿼리 일반은 [orm.md](./orm.md) 참조.

목록을 `<sd-sheet>` / `<sd-data-sheet>` 로 그리는 방법은 [client-data-sheet.md](./client-data-sheet.md) 를 봄.
화면 골격(컨테이너, `busyCount`, `$effect` 로딩)은 [client-component.md](./client-component.md) 를 봄.

## 각 하위 쿼리의 출력 스키마를 동일하게 맞추려면

union 으로 합치려면 **모든 하위 쿼리의 select 결과 객체가 같은 필드 이름, 같은 타입**이어야 함.
한쪽 소스에만 의미 있는 컬럼이 있고 다른 쪽엔 없을 때는, 없는 쪽 select 에 `db.qh.val<number>(0)` 같은 자리채움 값을 같은 필드 이름으로 넣어 형태를 맞춤.
그 다음 합친 결과를 다시 `groupBy` + `sum` 으로 묶으면, 한 행에 양쪽 수치가 한꺼번에 모임.

`centurymes` `client-admin` `ProcessInventoryUsageReportPage.ts` 는 "사용량(생산, 불량 기준)" 과 "투입량(자재 투입, 소비 기준)" 을 한 행에 합침.
사용량 소스에는 `usedQuantity` 만, 투입량 소스에는 `inputQuantity` 만 의미가 있으므로, 각자 반대편 필드를 `db.qh.val<number>(0)` 으로 0 채워 스키마를 맞춤:

```ts
let qr1 = Queryable.union([
  // 생산 → 사용량(BOM 소요량)만 채우고, inputQuantity 는 0 자리채움
  db.production
    .include((item) => item.instruction.product.bomMaterials)
    .where((item) => [/* 공정/기간 필터 */])
    .select((item) => ({
      process: item.instruction.product.productionProcess.notNull(),
      goodsId: item.instruction.product.bomMaterials[0].materialId,
      usedQuantity: db.qh.query<number>(Number, [
        item.quantity,
        " * ",
        item.instruction.product.bomMaterials[0].quantity,
      ]),
      inputQuantity: db.qh.val<number>(0),
    })),
  // 자재 투입 → inputQuantity 만 채우고, usedQuantity 는 0 자리채움
  db.productionMaterialInput
    .include((item) => item.lot)
    .where((item) => [/* 공정/기간 필터 */])
    .select((item) => ({
      process: item.process.notNull(),
      goodsId: item.lot.goodsId,
      usedQuantity: db.qh.val<number>(0),
      inputQuantity: item.quantity,
    })),
  // ... 불량/소비 소스도 동일 4필드 스키마로
])
  .groupBy((item) => [item.process, item.goodsId])
  .select((item) => ({
    process: item.process,
    goodsId: item.goodsId,
    usedQuantity: db.qh.sum(item.usedQuantity), // 합친 뒤 품목·공정별로 다시 합산
    inputQuantity: db.qh.sum(item.inputQuantity),
  }))
  .wrap()
  .joinSingle(Goods, "goods", (q, e) => q.where((item) => [db.qh.equal(item.id, e.goodsId)]));
// ... 재고 등 추가 join
```

주의할 점:

- 양쪽 select 의 필드 집합이 정확히 일치해야 함(`process` / `goodsId` / `usedQuantity` / `inputQuantity`).
  - 한쪽에만 있는 필드가 있으면 union 형태가 어긋남.
- 타입도 맞춰야 함.
  - 위에서 `usedQuantity` / `inputQuantity` 는 양쪽 모두 number 임.
  - 0 자리채움도 `db.qh.val<number>(0)` 으로 number 타입을 명시함.
- 문자열 리터럴 구분값도 같은 방식임.
  - `simplysm-ts` `client-admin` `MonthlyFinancialReportPage.ts` 는 세금계산서/현금영수증/급여/계좌 로그를
    각각 `{ year, month, type, totalAmount }` 한 스키마로 select 하면서
    `type: "매입"`, `type: "급여"`, `type: "현금"` 처럼 소스별 리터럴을 넣어 합침.
- 합친 직후 다시 `groupBy` + `db.qh.sum(...)` 으로 묶으면, 0 으로 채운 자리값은 합산에 영향을 주지 않으므로 품목 한 행에 사용량, 투입량이 동시에 모임.
- union 결과 위에서 원본 엔티티의 join 경로(`item.lot...` 등)에는 더는 접근할 수 없음.
  - union 한 select 에 남긴 필드만 보이므로, 이후 `Goods`, 재고 등을 붙이려면 `.wrap()` 후 `joinSingle` 로 다시 조인함(쿼리 join 일반은 [orm.md](./orm.md) 참조).

## 합친 결과를 정렬, 페이징해 가져오려면

union 결과는 하나의 `Queryable` 이므로, 목록 화면 표준 흐름(정렬 → 건수 → 페이지 limit → 조회)을 그대로 적용함.
목록 화면을 `AbsSdDataSheet` 로 만들 때 `search(usePagination)` 안에서 union 쿼리를 만든 뒤, 페이지 건수는 `countAsync()`, 본문은 `limit(...)` + `resultAsync()` 로 가져옴.

`centurymes` `client-admin` `ProductionLogPage.ts` (생산실적: 생산 + 불량을 합쳐 1행씩) 의 `search`:

```ts
override async search(usePagination: boolean): Promise<ISdDataSheetSearchResult<IItem>> {
  return await this.#appOrm.connectAsync(async (db) => {
    let qr1 = Queryable.union([
      db.production
        .include((item) => item.instruction.processLine)
        .where((item) => [
          db.qh.equal(item.instruction.processLine.process, this.lastFilter().process),
          db.qh.between(db.qh.cast(item.dateTime, DateOnly),
            this.lastFilter().fromDate, this.lastFilter().toDate),
        ])
        .select((item) => ({
          instructionId: item.instructionId,
          dateTime: item.dateTime,
          quantity: item.quantity,
          defectQuantity: 0,        // 생산 행: 불량은 0 자리채움
        })),
      db.defect
        .include((item) => item.productionInstruction.processLine)
        .where((item) => [
          db.qh.equal(item.productionInstruction.processLine.process, this.lastFilter().process),
          db.qh.between(db.qh.cast(item.dateTime, DateOnly),
            this.lastFilter().fromDate, this.lastFilter().toDate),
        ])
        .select((item) => ({
          instructionId: item.productionInstructionId,
          dateTime: item.dateTime,
          quantity: 0,              // 불량 행: 양품은 0 자리채움
          defectQuantity: item.quantity,
        })),
    ])
      .wrap()
      // ... 합친 뒤 상태변경로그/지시 joinSingle, groupBy, having, select<IItem>
      .wrap();

    //-- 페이지 건수: union 결과의 행 수를 센다
    const pageLength = usePagination ? Math.ceil((await qr1.countAsync()) / 50) : undefined;

    let qr2 = qr1;
    //-- 정렬: 시트의 정렬 정의를 그대로 union 결과에 적용
    for (const sortingDef of this.sortingDefs()) {
      qr2 = qr2.orderBy(sortingDef.key, sortingDef.desc);
    }
    if (!this.sortingDefs().some((item) => item.key === "key")) {
      qr2 = qr2.orderBy((item) => item.key);
    }
    //-- 페이지 limit (offset = page * 50, take = 50)
    if (usePagination) {
      qr2 = qr2.limit(this.page() * 50, 50);
    }

    const items = await qr2.resultAsync();
    return { items, pageLength };
  });
}
```

관찰할 점:

- 시트가 보내는 정렬(`this.sortingDefs()`)을 union 결과 `Queryable` 에 그대로 `orderBy` 로 적용함.
  - union 결과 위의 fluent 연산은 합쳐진 derived table 전체에 걸리므로, 정렬, 페이징이 합쳐진 결과 기준으로 동작함.
- 건수는 union 결과에 `countAsync()` 를 씀.
  - 단, 이 화면처럼 union 위에서 다시 `groupBy`/`having` 을 거친 경우 `countAsync` 직전에 `wrap()` 으로 한 번 감싸야 함(`groupBy` 이후 바로 `countAsync` 는 막혀 있음 - [orm.md](./orm.md)).
- 본문은 `limit(this.page() * 50, 50)` 으로 현재 페이지 구간만 가져옴.
- `AbsSdDataSheet` 화면 골격(`name` / `perms` / `bindFilter` / 필터 템플릿 / 컬럼)과 `search` 반환 규약(`{ items, pageLength }`)은 [client-data-sheet.md](./client-data-sheet.md) 를 봄.
  - 권한 신호는 [client-app-structure.md](./client-app-structure.md).

집계나 그래프만 필요하고 시트 페이징이 필요 없다면, 위 `LotHistoryControl` / `CustomerOutboundReport` 처럼 union 결과에 `orderBy` 만 걸고 `resultAsync()` 로 전부 가져와 화면에서 가공해도 됨.

## 가감(증감)으로 합산하려면

입고는 더하고 출고는 빼는 식의 "가감 합계" 는 두 가지로 표현함. 어느 쪽이든 union 으로 두 소스를 합쳐 한 목록으로 만든 뒤 처리함.

### 1) 소스별 구분값을 남기고, 화면/집계에서 부호를 적용

union 시 `type` 으로 소스를 구분해 두고, 합산할 때 한쪽을 음수로 다룸.
`simplysm-ts` `MonthlyFinancialReportPage.ts` 는 union 결과를 `type` 별 합계로 만든 뒤, 손익을 매출에서 나머지를 빼는 식으로 계산함:

```ts
const totalIncomeAmount = salesAmount - purchaseAmount - cardPaymentAmount - payrollAmount;
```

(`salesAmount` 등은 union, groupBy 로 만든 `type` 별 `sumAmount` 를 꺼낸 값임.)

차트에서도 같음.
`centurymes` `CustomerOutboundReportPage.ts` 는 출고, 반품을 union 으로 합쳐 거래처별로 모은 뒤, 반품을 음수로 매핑해 stacked bar 의 아래쪽으로 표시함:

```ts
{
  name: item.customerName,
  type: "bar",
  stack: "total",
  data: item.returnQuantities.map((item1) => -item1), // 반품 수량을 음수로 가감
}
```

### 2) select 단계에서 부호를 직접 넣어 합치기

집계 자체에서 입고는 +, 출고는 -로 들어가도록, 빼야 하는 소스의 수량 컬럼을 select 에서 음수 식으로 만들어 union 하는 방법도 있음.
이때도 `db.qh.query<number>(Number, [item.quantity, " * -1"])` 처럼 수식으로 부호를 만들어 양쪽 스키마(필드 이름, number 타입)를 그대로 유지한 채 합침.
그 union 결과에서 `db.qh.sum(...)` 하면 가감 합계가 됨.
수식 표현(`db.qh.query`)과 사칙 연산은 [orm.md](./orm.md) 참조.

음수가 나올 수 있는 합계 컬럼은 화면에서 음수 표시(빨간색 등)를 함께 적용함.

## 지킬 것

- 두 쿼리 결과를 애플리케이션 코드에서 배열로 이어붙이지 말고, `Queryable.union([...])` 으로 DB 단에서 합침.
  - 합친 결과를 그대로 정렬, 페이징, 재집계할 수 있음.
- 모든 하위 쿼리의 `select` 출력은 **필드 이름, 타입이 정확히 같은** 동일 스키마여야 함.
  - 한쪽에만 있는 값은 `db.qh.val<number>(0)` (혹은 적절한 0/빈 리터럴)로 같은 필드 이름에 자리채움함.
- 소스 구분은 `db.qh.val("입고")` / `type: "매입"` 같은 리터럴 컬럼으로 남김.
  - 이후 화면 표시(색상), 집계 분기에 씀.
- `where`(필터)는 union **전에** 각 하위 쿼리에 동일 조건으로 걺.
  - union 후에는 select 로 남긴 필드만 보이고 원본 엔티티의 join 경로로는 거를 수 없음.
- union 결과 위에서 원본 테이블을 다시 조인하려면 `.wrap()` 후 `joinSingle` 함.
  - `groupBy`/`having` 뒤에 `countAsync` 를 쓸 때도 그 사이에 `wrap()` 을 넣음.
- 가감 합계는 소스 구분값으로 화면/집계에서 부호를 적용하거나(권장), select 단계에서 음수 수식으로 만들어 합침.
  - 음수가 나오는 수치는 화면에서 음수 표시를 함께 둠.
