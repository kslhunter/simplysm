# ORM 쿼리 작성 가이드 (v12)

`@simplysm/sd-orm-common` 기반. 테이블을 클래스(데코레이터)로 정의하고, 화면에서 `inject(AppOrmProvider).connectAsync(async (db) => { ... })` 안에서 `db.<테이블>` 에 `Queryable` 체이닝 + `db.qh`(QueryHelper) 함수로 타입세이프 쿼리를 조립해 실행한다.

이 문서는 조회 흐름·저장·삭제·페이징을 다룬다. 이종 엔티티 합치기는 [orm-union.md](./orm-union.md), 변경 이력 적재·조회는 [data-log.md](./data-log.md) 로 분리한다. 화면(시트/상세) 구조 자체는 [client-crud.md](./client-data-sheet.md) 를 참고한다.

## 단일 쿼리 우선

연관 데이터는 한 쿼리에 모아 가져온다. 여러 쿼리로 나눠 받아 코드에서 합치지 않는다. 행 필터·정렬·페이징·집계는 전부 ORM 절로 표현하고, 실행 결과 배열을 코드에서 `.filter()`/`.sort()`/`.slice()`/`.reduce()` 로 후처리하지 않는다(아래 [안티패턴](#안티패턴) 참고).

ORM 빌더로 표현 불가능한 경우, 작성 전 사용자에게 보고하고 중단한다.

---

## 테이블을 정의하려면

테이블은 클래스에 `@Table`, 각 컬럼은 프로퍼티에 `@Column` 을 붙여 정의한다(`@simplysm/sd-orm-common`). 정의한 클래스를 `DbContext` 의 `Queryable` 필드로 등록하면 `db.<필드명>` 으로 쓸 수 있다.

centurymes 의 `Goods` (`packages/db-main/src/models/base/Goods.ts`):

```ts
import { Column, ForeignKey, ForeignKeyTarget, Table } from "@simplysm/sd-orm-common";
import { Partner } from "./Partner";

@Table({ description: "품목" })
export class Goods {
  @Column({ description: "ID", autoIncrement: true, primaryKey: 1 })
  id?: number;

  @Column({ description: "품번" })
  code!: string;

  @Column({ description: "품명" })
  name!: string;

  @Column({
    description: "개당중량(kg)",
    dataType: { type: "DECIMAL", precision: 18, digits: 8 },
    nullable: true,
  })
  unitWeightKg?: number;

  @Column({ description: "삭제여부" })
  isDeleted!: boolean;

  @Column({ description: "기본구매처(입고사용시에만 입력가능)", nullable: true })
  defaultVendorId?: number;

  // FK 보유 측: defaultVendorId 로 Partner 단일 객체를 연결
  @ForeignKey(["defaultVendorId"], () => Partner, "기본공급사")
  defaultVendor?: Readonly<Partner>;
}
```

작성 규칙:

- **`description` 은 필수.** 한글 설명을 넣는다.
- **PK + 자동증가**: `@Column({ ..., autoIncrement: true, primaryKey: 1 })`. `primaryKey` 는 1-base 순번이므로 복합 PK 면 `primaryKey: 1`, `primaryKey: 2` 로 부여한다. `autoIncrement` 컬럼은 INSERT 시 값을 넣지 않고 DB 가 채운다.
- **NOT NULL 이 기본.** TS 에서 `code!: string` 처럼 non-null 로 선언하고 `@Column` 에 `nullable` 을 주지 않으면 NOT NULL 이다. 값이 도메인상 없을 수 있을 때만 `nullable: true` 를 주고 TS 타입도 `phoneNumber?: string` 처럼 옵셔널로 맞춘다. "초기값 애매"·"마이그레이션 중간단계"는 nullable 근거가 아니다.
- **타입 명시가 필요할 때만 `dataType`.** 미지정 시 TS 타입(`string`→NVARCHAR(255), `number`→정수, `boolean`, `DateOnly`, `DateTime` 등)에서 자동 추론된다. 소수가 필요하면 `dataType: { type: "DECIMAL", precision, digits }`, 긴 문자열은 `{ type: "STRING", length: "MAX" }` 등을 명시한다.
- **`default` 는 사용자가 명시 지시한 경우에만.** 기본은 호출자(등록 화면)가 값을 넣도록 강제한다.

데코레이터 옵션 전체는 [apis/sd-orm-common/decorators.md](../apis/sd-orm-common/decorators.md) 참고.

### 공통 베이스를 확장하려면

`User` 같은 공통 엔티티는 `@simplysm/sd-orm-common-ext` 의 베이스를 상속해 프로젝트 컬럼만 추가한다. simplysm-ts 의 `User` (`packages/db-main/src/models/base/User.ts`):

```ts
import { Column, Table } from "@simplysm/sd-orm-common";
import { DateOnly } from "@simplysm/sd-core-common";
import * as ext from "@simplysm/sd-orm-common-ext";

@Table({ description: "사용자" })
export class User extends ext.User {
  @Column({ description: "전화번호", nullable: true })
  phoneNumber?: string;

  @Column({ description: "입사일자", nullable: true })
  enteringDate?: DateOnly;
}
```

베이스(`ext.User`)가 `id`/`name`/`loginId`/`encryptedPassword`/`isDeleted` 등을 이미 갖고 있으므로 중복 선언하지 않는다.

### 관계를 정의하려면

- **`@ForeignKey([컬럼명들], () => 대상클래스, "설명")`** — FK 를 가진 "다" 쪽에 붙인다. 위 `Goods.defaultVendor` 처럼 `defaultVendorId` → `Partner` 단일 객체를 연결한다.
- **`@ForeignKeyTarget(() => 자식클래스, "자식의FK프로퍼티", "설명")`** — FK 의 대상(부모) 쪽에서 역방향 컬렉션을 노출한다. `Goods` 의 `bomMaterials?: Readonly<ProductBom>[]` 가 예.

관계 선언은 그 자체로 쿼리에 영향을 주지 않는다. 실제 JOIN 은 조회 시 `include` 로 한다(아래 [관계를 한 행에 붙이려면](#관계를-한-행에-붙이려면)).

### DbContext 에 등록하려면

정의한 클래스를 `DbContext` 서브클래스(예: `MainDbContext`)에 `Queryable` 필드로 등록한다. centurymes `packages/db-main/src/MainDbContext.ts`:

```ts
import { DbContextExt } from "@simplysm/sd-orm-common-ext";
import { IDbMigration, Queryable } from "@simplysm/sd-orm-common";

export class MainDbContext extends DbContextExt {
  get migrations(): Type<IDbMigration>[] {
    return [Migration250716, Migration250722];
  }

  goods = new Queryable(this, Goods);
  partner = new Queryable(this, Partner);
  override user = new Queryable(this, User); // 베이스에 있는 필드는 override
}
```

`DbContextExt`(`@simplysm/sd-orm-common-ext`)를 상속하면 변경이력(`insertDataLogAsync`/`joinLastDataLog`) 등이 따라온다([data-log.md](./data-log.md)). `db.<필드명>`(= `db.goods`, `db.user`)이 곧 그 테이블의 `Queryable` 이다.

---

## 조회 쿼리를 조립하려면

조회는 항상 `connectAsync` 안에서 `db.<테이블>` 부터 시작해 다음 순서로 체이닝한다. `Queryable` 은 불변이므로 메서드 호출마다 새 객체가 반환된다 — 조건을 누적할 때는 반환값을 다시 변수에 담는다.

표준 흐름(목록/시트 화면 `search`):

1. root queryable: `let qr1 = db.<테이블>` (필요하면 `.include(...)` / `joinLastDataLog()` 부착)
2. 필터: `qr1 = qr1.where((item) => [db.qh....])` / `qr1 = qr1.search(...)` 를 조건별로 누적
3. 페이지 수: `Math.ceil((await qr1.countAsync()) / 50)`
4. projection: `const qr2 = qr1.select<IItem>((item) => ({ ... }))`
5. 정렬: `qr2 = qr2.orderBy(...)`
6. 페이징: `qr2 = qr2.limit(this.page() * 50, 50)`
7. 실행: `await qr2.resultAsync()`

centurymes `GoodsPage.search` (`packages/client-admin/src/app/home/base/goods/GoodsPage.ts`) 의 골격:

```ts
override async search(usePagination: boolean): Promise<ISdDataSheetSearchResult<IItem>> {
  return await this.#appOrm.connectAsync(async (db) => {
    let qr1 = db.goods.include((item) => item.defaultVendor).joinLastDataLog();

    //-- FILTER
    if (this.isProduct() === true) {
      qr1 = qr1.where((item) => [db.qh.isNotNull(item.productionProcess)]);
    }
    if (this.lastFilter().includeProductionProcesses.length > 0) {
      qr1 = qr1.where((item) => [
        db.qh.in(item.productionProcess, this.lastFilter().includeProductionProcesses),
      ]);
    }
    if (!StringUtils.isNullOrEmpty(this.lastFilter().searchText)) {
      qr1 = qr1.search(
        (item) => [item.code, item.name, item.model, item.productionProcess],
        this.lastFilter().searchText!,
      );
    }
    if (!this.lastFilter().isIncludeDeleted) {
      qr1 = qr1.where((item) => [db.qh.equal(item.isDeleted, false)]);
    }

    //-- PAGE LENGTH
    const pageLength = usePagination ? Math.ceil((await qr1.countAsync()) / 50) : undefined;

    let qr2 = qr1.select<IItem>((item) => ({
      id: item.id.notNull(),
      code: item.code,
      name: item.name,
      isDeleted: item.isDeleted,
      defaultVendor: {
        name: item.defaultVendor.name,
        isDeleted: item.defaultVendor.isDeleted,
      },
      lastModifiedAt: item.lastDataLog.dateTime,
      lastModifiedBy: item.lastDataLog.userName,
    }));

    //-- ORDERING
    for (const sortingDef of this.sortingDefs()) {
      qr2 = qr2.orderBy(sortingDef.key, sortingDef.desc);
    }
    if (!this.sortingDefs().some((item) => item.key === "code")) {
      qr2 = qr2.orderBy((item) => item.code);
    }

    //-- LIMIT
    if (usePagination) {
      qr2 = qr2.limit(this.page() * 50, 50);
    }

    const items = await qr2.resultAsync();
    return { items, pageLength };
  });
}
```

### WHERE 조건을 거는 방법 (`db.qh`)

`where` 의 콜백은 `item`(각 컬럼이 표현식)을 받아 **조건 배열**을 반환한다. 배열의 원소들은 AND 로 묶이고, 여러 번 `where` 를 호출해도 누적 AND 다. 각 조건은 `db.qh`(QueryHelper) 함수로 만든다.

자주 쓰는 조건 함수(인자는 컬럼 또는 리터럴 둘 다 가능):

- `db.qh.equal(컬럼, 값)` / `db.qh.notEqual(컬럼, 값)` — `=` / `!=`. 값이 `null`/`undefined` 면 `IS NULL` / `IS NOT NULL` 로 안전 처리된다.
- `db.qh.isNull(컬럼)` / `db.qh.isNotNull(컬럼)` — NULL 검사.
- `db.qh.isTrue(컬럼)` / `db.qh.isFalse(컬럼)` — 불리언 컬럼 참/거짓. `isFalse` 는 NULL 도 거짓으로 본다.
- `db.qh.greaterThen` / `db.qh.greaterThenOrEqual` / `db.qh.lessThen` / `db.qh.lessThenOrEqual(컬럼, 값)` — 대소 비교(숫자·날짜·문자).
- `db.qh.in(컬럼, 값배열)` / `db.qh.notIn(...)` — `IN` / `NOT IN`. 빈 배열이면 각각 "항상 거짓" / "항상 참" 으로 처리된다.
- `db.qh.between(컬럼, from, to)` — from/to 중 들어온 쪽만 범위 조건이 된다.
- `db.qh.includes(컬럼, 값)` — `LIKE %값%` (부분 일치).
- `db.qh.or([조건들])` / `db.qh.and([조건들])` — 조건들을 OR/AND 로 묶어 하나의 조건으로 만든다.

리터럴은 그대로 넘긴다 — `equal`/`in` 등의 값 자리는 표현식 또는 값을 받으므로 `db.qh.val(...)` 같은 래핑이 필요 없다.

simplysm-ts `UserPage` 의 "퇴사자 제외" 필터는 OR 조합 예다:

```ts
qr1 = qr1.where((item) => [
  db.qh.or([
    db.qh.isNull(item.leavingDate),
    db.qh.greaterThen(item.leavingDate, new DateOnly()),
  ]),
]);
```

조건부 필터는 그냥 `if` 로 분기해 `qr1` 에 `where` 를 누적하면 된다(위 `GoodsPage.search`). 필터 값이 없으면 그 `where` 를 아예 호출하지 않는다.

### 다중 컬럼 텍스트 검색을 하려면

검색어 한 줄로 여러 컬럼을 동시에 훑으려면 `search` 를 쓴다. 첫 인자는 검색 대상 문자열 컬럼 배열, 둘째 인자는 검색어다.

```ts
qr1 = qr1.search(
  (item) => [item.code, item.name, item.model],
  this.lastFilter().searchText!,
);
```

검색어는 공백으로 토큰 분할되어 각 토큰이 AND(부분 일치)로, 컬럼 간에는 OR 로 묶인다. 검색어가 비었으면 `StringUtils.isNullOrEmpty` 로 거른 뒤 `search` 를 호출하지 않는다.

### 출력 컬럼을 고르려면 (`select`)

`select((item) => ({ ... }))` 로 화면에 필요한 컬럼만 골라 projection 한다. 결과 타입을 `select<IItem>(...)` 로 명시하면 반환 배열이 `IItem[]` 로 타입된다.

- 중첩 객체로 join 된 컬럼을 묶을 수 있다(`defaultVendor: { name: item.defaultVendor.name }`).
- PK 처럼 nullable 로 선언됐지만 조회 결과에선 항상 존재하는 컬럼은 `item.id.notNull()` 로 non-null 로 좁힌다(런타임 동작 없이 타입만 좁힘).
- 권한에 따라 컬럼을 조건부로 포함하려면 스프레드로 합친다(simplysm-ts `UserPage`):

```ts
.select<IItem>((item) => ({
  id: item.id.notNull(),
  name: item.name,
  ...(this.perms().includes("personal.use")
    ? { socialSecurityNumber: item.socialSecurityNumber }
    : {}),
  isDeleted: item.isDeleted,
}))
```

`select` 이후의 Queryable 은 "커스텀 엔티티"가 되어 INSERT/UPDATE 류 편집이 금지된다 — 편집 쿼리는 `select` 없이 짠다.

### 정렬·페이징을 하려면

- **정렬**: `orderBy((item) => item.code)` 또는 컬럼명 문자열 `orderBy("code", desc)`. 두 번째 인자 `true` 면 내림차순. 시트 헤더 정렬(`this.sortingDefs()`)을 그대로 적용한 뒤, 기본 정렬 컬럼이 없으면 보강한다(위 `GoodsPage.search` 의 `code` 보강).
- **페이징**: `limit(skip, take)`. 50개씩이면 `limit(this.page() * 50, 50)`. `page()` 는 0-base.

### 결과를 받는 방법

- **`resultAsync(): Promise<T[]>`** — 목록 전체. JOIN 트리까지 파싱된 배열.
- **`singleAsync(): Promise<T | undefined>`** — 1건 조회(상세 화면). 2건 이상이면 throw 하므로 PK 조건과 함께 쓴다. centurymes `GoodsDetail.load` 는 `where(id).select(...).singleAsync()` 로 단건을 읽는다.
- **`countAsync(): Promise<number>`** — 행 수. 페이지 수 계산(`Math.ceil(count / 50)`)에 쓴다.
- **`existsAsync(): Promise<boolean>`** — 1건이라도 있으면 true. 중복 검증에 쓴다(아래 [중복 검증](#등록전-중복을-검증하려면)).

`select(...).resultAsync()` vs `where(...).existsAsync()` 처럼, 무엇을 받느냐에 따라 조립 끝에 붙이는 실행 메서드만 달라진다.

---

## 관계를 한 행에 붙이려면

### FK 정의를 따라 자동 JOIN — `include`

`@ForeignKey`/`@ForeignKeyTarget` 으로 선언한 관계는 `include((item) => item.<관계프로퍼티>)` 로 JOIN 한다. centurymes `GoodsPage` 는 `defaultVendor`(공급사) 를 붙인다:

```ts
let qr1 = db.goods.include((item) => item.defaultVendor);
// ... select 에서
defaultVendor: {
  name: item.defaultVendor.name,
  isDeleted: item.defaultVendor.isDeleted,
},
```

체인으로 여러 단계도 가능하다(`include((item) => item.inboundRequestItem.request.inspection)` — centurymes `LotLabelPrintTemplate`). FK(다대일)는 단일 객체로, FKT 는 다중성에 따라 배열/단일로 붙는다.

include 한 관계 컬럼은 `where`/`orderBy` 에서도 바로 참조할 수 있다 — centurymes `AppPage` 는 `db.qh.equal(item.processLine.process, ...)` 로 join 컬럼에 필터를 건다.

### 집계·도메인 boolean 을 붙이려면 — `joinSingle`

`SUM`/`COUNT`/존재여부 같은 집계는 **`joinSingle(테이블, "별칭", (q, e) => ...)`** 안에서 `where + select(집계)` 로 묶어 outer 행에 컬럼으로 부착한다. centurymes `AppPage` 는 지시 1건당 생산수량/불량수량 합계를 한 번에 붙인다:

```ts
let qr1 = db.productionInstruction
  .joinSingle(Production, "resultSummary", (q, e) =>
    q
      .where((item) => [db.qh.equal(item.instructionId, e.id)])
      .select((item) => ({ quantity: db.qh.sum(item.quantity) })),
  )
  .joinSingle(Defect, "defectSummary", (q, e) =>
    q
      .where((item) => [db.qh.equal(item.productionInstructionId, e.id)])
      .select((item) => ({ quantity: db.qh.sum(item.quantity) })),
  );
```

`(q, e)` 의 `e` 는 바깥 행(outer entity)이라 `e.id` 로 상관(correlated) 조건을 건다. 집계 함수는 `db.qh.sum/count/avg/max/min` 을 쓴다.

> `select` 절 안에 서브쿼리/EXISTS 를 직접 넣지 않는다 — outer 행마다 inner 쿼리가 N회 실행된다. 집계·존재여부는 위처럼 `joinSingle` 로 한 번에 부착한다.

### 변경 이력(최종 수정자/일시)을 붙이려면

`DbContextExt` 기반 컨텍스트는 `joinLastDataLog()` 로 마지막 변경 로그를 붙여 `item.lastDataLog.dateTime` / `item.lastDataLog.userName` 을 select 할 수 있다(위 `GoodsPage.search`). 적재·조회 상세는 [data-log.md](./data-log.md) 참고.

---

## 등록·수정·업서트를 하려면

편집 쿼리는 `connectAsync` 안에서 `select` 없이 `db.<테이블>` 에 바로 건다.

### 신규 등록 — `insertAsync`

새 행을 넣을 때는 `insertAsync([레코드])`. 자동증가 PK 등 생성된 값을 돌려받으려면 둘째 인자에 컬럼명 배열을 준다. centurymes `ProductionAddModal`:

```ts
const newId = (
  await db.production.insertAsync(
    [
      {
        dateTime: new DateTime(),
        instructionId: this.instructionId(),
        lotId: lot.id,
        quantity: this.quantity()!,
        workerId: this.worker()?.id,
      },
    ],
    ["id"], // 생성된 id 를 반환
  )
).single()!.id!;
```

`autoIncrement` PK 인 `id` 는 레코드에 넣지 않는다 — DB 가 채우고 `["id"]` 로 돌려받는다. 반환은 배열이므로 단건이면 `.single()` 로 꺼낸다.

### 기존 행 수정 — `updateAsync`

`where(...)` 로 대상 행을 좁힌 뒤 `updateAsync(() => ({ 변경필드 }))`. 변경할 컬럼만 객체에 담는다. simplysm-ts `UserPage.submit` 은 id 로 좁혀 수정하고 `["id"]` 로 대상 id 를 돌려받는다:

```ts
const upsertId = (
  await db.user
    .where((item) => [db.qh.equal(item.id, diff.item.id)])
    .updateAsync(
      async () => ({
        name: diff.item.name!,
        email: diff.item.email,
        isDeleted: diff.item.isDeleted,
      }),
      ["id"],
    )
).single()!.id!;
```

`updateAsync` 의 콜백은 `async` 도 된다(위 예에서 비밀번호 암호화 등 await 가 필요할 때). 콜백 인자로 현재 행 표현식을 받아 `db.qh` 식으로 컬럼을 다른 컬럼 기준으로 갱신할 수도 있다.

### 있으면 수정·없으면 등록 — `upsertAsync`

엑셀 업로드나 등록/수정 공용 폼처럼 신규/기존을 함께 처리할 때는 `where(...).upsertAsync(() => ({ ... }), ["id"])` 를 쓴다. **`where` 가 필수** 다 — 어떤 행을 기준으로 존재 판단할지를 정한다. centurymes `GoodsDetail.submit`:

```ts
const upsertId = (
  await db.goods
    .where((item) => [db.qh.equal(item.id, data.id)]) // id 가 null 이면 신규
    .upsertAsync(
      () => ({
        code: data.code!,
        name: data.name!,
        model: data.model!,
        isDeleted: false,
        defaultVendorId: data.defaultVendorId,
        // ... 나머지 컬럼
      }),
      ["id"],
    )
).single()!.id!;
```

`data.id` 가 없으면(`= null`) WHERE 가 매칭되지 않아 INSERT 되고, 있으면 UPDATE 된다. 둘째 인자 `["id"]` 로 신규/기존 모두에서 최종 id 를 돌려받는다.

### 등록 전 중복을 검증하려면

DB 유니크 제약 대신 앱에서 `existsAsync` 로 선검증하는 것이 기본이다(에러를 사용자 메시지로 보여주기 위함). 활성(`isDeleted=false`) 레코드끼리만, 자기 자신은 제외하고 검사한다. centurymes `GoodsDetail.submit`:

```ts
if (
  !data.isDeleted &&
  (await db.goods
    .where((item) => [
      db.qh.equal(item.code, data.code),
      db.qh.notEqual(item.id, data.id), // 수정 시 자기 자신 제외
      db.qh.isFalse(item.isDeleted),    // 활성만 검사
    ])
    .existsAsync())
) {
  throw new ArgumentError("동일한 품번이 이미 등록되어 있습니다.", { 품번: data.code });
}
```

업서트/수정 직전에 이 검증을 두고, 충돌이면 `ArgumentError` 를 던진다(토스트로 사용자에게 노출됨).

### 변경 후 공유데이터 갱신

기초정보를 바꿨으면 트랜잭션이 끝난 뒤 `await this.#appSharedData.emitAsync("품목", changedIds)` 로 변경 키를 알려 다른 화면의 캐시를 갱신한다. 공유데이터 메커니즘은 별도 매뉴얼을 참고한다.

---

## 소프트 삭제를 하려면

마스터(기초정보)는 물리 삭제 대신 `isDeleted` 플래그를 켜는 소프트 삭제를 쓴다 — FK 참조 무결성을 보존한다. 삭제/복구는 `updateAsync(() => ({ isDeleted: del }))` 한 번으로 토글한다. centurymes `GoodsPage.toggleDeleteItems`:

```ts
override async toggleDeleteItems(del: boolean) {
  const selectedItemIds = this.selectedItems().map((item) => item.id);

  const changedIds = await this.#appOrm.connectAsync(async (db) => {
    const ids = (
      await db.goods
        .where((item) => [
          db.qh.in(item.id, selectedItemIds),
          db.qh.equal(item.isDeleted, !del), // 현재 상태가 반대인 행만
        ])
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

- 조회 화면에서는 기본적으로 `where((item) => [db.qh.equal(item.isDeleted, false)])` 로 삭제 항목을 가린다. "삭제항목 포함" 필터가 켜졌을 때만 이 조건을 빼면 삭제된 행도 보인다(위 `GoodsPage.search`).
- 삭제/복구도 변경 이력에 적재한다([data-log.md](./data-log.md)).
- 활성 유니크 컬럼(코드·명칭)은 복구 시 충돌할 수 있으니 복구 경로에서도 중복 재검증한다.

> 프로세스 문서(트랜잭션성 데이터)는 소프트 삭제가 아니라 물리 삭제(`deleteAsync`)로 상세 행까지 캐스케이드한다. 단, 다른 테이블이 FK 로 참조 중이면 삭제를 막고 사유를 안내한다.

---

## 페이징 처리 흐름

시트 화면의 페이징은 "총 페이지 수 산출 → 현재 페이지 행만 조회" 두 단계다.

1. 필터까지 적용한 `qr1` 에서 `await qr1.countAsync()` 로 총 건수를 구하고 `Math.ceil(count / 50)` 로 페이지 수를 만든다. 이 값을 `pageLength` 로 시트에 돌려주면 페이저가 그려진다.
2. `select`·정렬을 끝낸 `qr2` 에 `limit(this.page() * 50, 50)` 을 붙여 현재 페이지 50건만 조회한다.

`usePagination` 이 false 면(전체 다운로드 등) `countAsync`/`limit` 을 건너뛰고 전건을 조회한다(위 `GoodsPage.search`).

`countAsync` 는 `select`(projection) 전의 `qr1` 에서 부른다. `distinct()`/`groupBy()` 이후엔 `count` 가 throw 하므로 그 경우 `wrap()` 으로 감싼 뒤 센다.

---

## 안티패턴

### 실행 결과를 코드에서 후처리 금지

가져올 데이터는 DB 단에서 최소화한다. 중복 제거·필터·정렬·페이징·집계는 ORM 절로 처리하고, `resultAsync()` 로 받은 배열을 코드에서 가공하지 않는다. 전건을 메모리로 끌어온 뒤 거르면 네트워크·메모리 비용이 행 수에 비례해 커진다.

| 코드 후처리 (나쁜 예)                       | ORM 절 (좋은 예)                                  |
| ------------------------------------------- | ------------------------------------------------- |
| `(await q.resultAsync()).filter(...)`       | `.where((item) => [...])`                         |
| `(await q.resultAsync()).sort(...)`         | `.orderBy((item) => item.x, desc)`                |
| `(await q.resultAsync()).slice(p*50, ...)`  | `.limit(page * 50, 50)`                           |
| `.reduce((sum, x) => ...)`                  | `joinSingle(...).select(() => ({ sum: db.qh.sum(x) }))` |
| `result.length` 로 건수 세기                | `.countAsync()`                                   |

이종 엔티티(입고+출고 등)를 한 목록에 합쳐야 할 때도 코드 merge 가 아니라 DB 단 UNION 으로 처리한다 → [orm-union.md](./orm-union.md).

### `select` 안에 서브쿼리/EXISTS 직접 사용 금지

집계(`SUM`/`COUNT`)나 도메인 boolean(존재여부)은 `joinSingle` 로 한 번 부착해 컬럼으로 참조한다. `select` 컬럼에 서브쿼리를 넣으면 outer 행마다 inner 쿼리가 N회 돈다(위 [집계·도메인 boolean 을 붙이려면](#집계도메인-boolean-을-붙이려면)).

### 불필요한 `wrap()` / 값 래핑 금지

- `wrap()` 은 프레임워크가 요구할 때만 쓴다(예: `distinct()`/`groupBy()` 후 `count`). 도출 컬럼에 필터/정렬을 걸려고 무작정 wrap 을 끼우지 않는다.
- `where` 비교값·`update`/`upsert`/`insert` 값 자리는 리터럴을 그대로 넘긴다 — `db.qh.val(...)` 로 감쌀 필요 없다. `val` 은 `select` 에서 상수 컬럼을 만들 때처럼 표현식이 강제되는 자리에서만 쓴다.

### nullable / default 남용 금지

컬럼은 NOT NULL 이 기본. `nullable` 은 도메인상 값이 없을 수 있을 때만, `default` 는 사용자가 명시 지시한 경우에만 사용한다. "넣을 값을 모름"·"마이그레이션 중간 단계"는 근거가 아니다 — 호출자가 값을 넣게 강제하거나 backfill 후 NOT NULL 로 전환한다.
