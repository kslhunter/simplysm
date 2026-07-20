# 데이터 변경 이력 적재, 조회, 표시 (누가, 언제, 무엇)

CRUD 처리에서 "누가, 언제, 무엇을 어떻게 바꿨는지" 를 한 모델(`SystemDataLog`)에 모아 적재하고, 목록 화면에서 각 행의 최종 변경 정보(수정일시, 수정자)를 함께 보여주는 패턴.

핵심은 `Queryable` 에 붙은 확장 메서드(`insertDataLogAsync`/`joinLastDataLog`/`joinFirstDataLog`)임.

- 변경을 수행한 그 테이블의 queryable 에서 `db.user.insertDataLogAsync(...)` 처럼 호출하면 `tableName`, `tableDescription`, `dateTime` 이 자동으로 채워짐.
- 조회 쪽에서는 본 쿼리 체인에 `.joinLastDataLog()` 를 끼우는 것만으로 각 행에 최종 변경 정보가 단건 조인됨.

이 확장 메서드들은 `@simplysm/sd-orm-common-ext` 의 `DbContextExt` 와 함께 로드되는 `Queryable.ext.ts`(side-effect 모듈)에서 `Queryable.prototype` 에 주입됨.
**따라서 프로젝트의 DbContext 가 `DbContextExt` 를 상속하고 있어야만 사용 가능함.** (DbContext 일반 사용, 연결은 [orm.md](./orm.md) 참고)

## DbContext 가 변경 이력 기능을 쓸 수 있는지 확인하려면

변경 이력 메서드는 `@simplysm/sd-orm-common-ext` 가 제공하므로, 프로젝트의 DbContext 가 그 패키지의 `DbContextExt` 를 상속하고 있어야 함.

```ts
// db-main/src/MainDbContext.ts (simplysm-ts / centurymes 동일 패턴)
import { DbContextExt } from "@simplysm/sd-orm-common-ext";
import { Queryable } from "@simplysm/sd-orm-common";

export class MainDbContext extends DbContextExt {
  override user = new Queryable(this, User);
  goods = new Queryable(this, Goods);
  // ...
}
```

- `DbContextExt` 를 상속하면 `db.systemDataLog`(이력 테이블 queryable), `db.user` 등 공통 모델이 함께 딸려 옴.
- 상속하면 모든 `Queryable` 인스턴스에 `insertDataLogAsync`/`joinLastDataLog`/`joinFirstDataLog` 가 붙음.
- 일반 `DbContext` 만 상속한 프로젝트에서는 이 메서드들이 존재하지 않아 호출 시 타입 오류가 남.

이력이 적재되는 테이블(`SystemDataLog`)의 컬럼은 다음과 같음.

- `tableName` — 테이블명.
- `tableDescription` — 테이블설명.
- `type` — 구분.
- `itemId` — 대상 레코드 ID.
- `valueJson` — 값 스냅샷.
- `dateTime` — 일시.
- `userId` — 수행 사용자.

호출부에서 `tableName`, `tableDescription`, `dateTime` 을 직접 적지 않는 이유는, 적재 메서드가 호출한 queryable 의 테이블 정의에서 이를 자동으로 채우기 때문임.

## 변경 시 이력을 적재하려면

변경을 수행한 그 테이블의 queryable 에서 `insertDataLogAsync` 를 호출함.

- 인자: `type`(구분 문자열), `itemId`(대상 레코드 ID), `valueJson`(값 스냅샷, 안 남기면 `undefined`), `userId`(수행 사용자 ID).
- `tableName`, `dateTime` 은 자동이므로 넘기지 않음.

`type` 문자열은 프로젝트 규약으로 통일한 집합을 씀.

- 실제 사용처에서 관찰되는 값: `"등록"`, `"수정"`, `"삭제"`, `"복구"`, `"엑셀업로드"`.

### 등록, 수정 (단건 편집 submit)

`submit(diffs)` 에서 각 항목을 upsert/update 한 뒤, 신규(`id == null`)면 `"등록"`, 기존이면 `"수정"` 으로 적재함.
simplysm-ts `UserPage.ts` 의 `submit` 패턴:

```ts
override async submit(diffs: TArrayDiffs2Result<IItem>[]): Promise<boolean> {
  const changedIds: number[] = [];
  await this.#appOrm.connectAsync(async (db) => {
    for (const diff of diffs) {
      const upsertId = (
        await db.user
          .where((item) => [db.qh.equal(item.id, diff.item.id)])
          .updateAsync(async () => ({ /* ...변경 필드... */ }), ["id"])
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
  // ...
  return true;
}
```

- 적재는 본 데이터 변경과 **같은 `connectAsync` 콜백(같은 트랜잭션) 안**에서 함.
  데이터만 바뀌고 이력이 누락되거나 그 반대가 되지 않게 하기 위함임.
- `userId` 는 현재 로그인 사용자 ID 를 넣음.
  simplysm-ts/centurymes 는 `this.#appAuth.authInfo()!.user.id` 로 가져옴. (인증 정보는 [client-app-structure.md](./client-app-structure.md) 참고)
- 값 스냅샷이 필요 없으면 `valueJson: undefined` 로 둠. (이 인자는 생략할 수 없고 명시적으로 `undefined` 를 넘김)

### 삭제, 복구 (toggleDeleteItems)

soft delete(삭제 플래그 토글) 처리에서도 변경된 각 ID 마다 적재함. centurymes `GoodsPage.ts` 의 `toggleDeleteItems` 패턴:

```ts
override async toggleDeleteItems(del: boolean) {
  const selectedItemIds = this.selectedItems().map((item) => item.id);

  const changedIds = await this.#appOrm.connectAsync(async (db) => {
    const changedIds = (
      await db.goods
        .where((item) => [db.qh.in(item.id, selectedItemIds), db.qh.equal(item.isDeleted, !del)])
        .updateAsync(() => ({ isDeleted: del }), ["id"])
    ).map((item) => item.id!);

    for (const changedId of changedIds) {
      await db.goods.insertDataLogAsync({
        type: del ? "삭제" : "복구",
        itemId: changedId,
        valueJson: undefined,
        userId: this.#appAuth.authInfo()!.user.id,
      });
    }
    return changedIds;
  });
  // ...
  return true;
}
```

`del` 이 `true` 면 `"삭제"`, `false` 면 `"복구"` 로 적재함.
두 type 은 아래 조회 단계에서 `excludeTypes` 로 걸러낼 수 있음.

### 엑셀 업로드

엑셀 일괄 업로드(`uploadExcel`)로 upsert 한 항목은 `"엑셀업로드"` type 으로 적재함. simplysm-ts/centurymes 공통 패턴:

```ts
override async uploadExcel(file: File) {
  const excelItems = await this.#excelWrapper.readAsync(file);

  const changedIds: number[] = [];
  await this.#appOrm.connectAsync(async (db) => {
    for (const excelItem of excelItems) {
      const upsertId = (
        await db.user
          .where((item) => [db.qh.equal(item.id, excelItem.id)])
          .upsertAsync(async () => ({ /* ...필드... */ }), ["id"])
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
  // ...
}
```

(엑셀 읽기/쓰기 자체는 [client-data-sheet.md](./client-data-sheet.md), CRUD 화면 전체 구조는 [client-data-sheet.md](./client-data-sheet.md) 참고)

## 목록 조회 시 최종 변경 정보를 함께 가져오려면

본 쿼리 체인에 `.joinLastDataLog()` 를 끼우면, 각 행에 그 행(`tableName` + 행 `id`)의 최신 이력 1건이 `lastDataLog` 로 단건 조인됨.

- 수행 사용자명(`userName`)까지 한 쿼리로 함께 조인되므로 별도 사용자 조회가 필요 없음.
- `lastDataLog` 가 부착하는 필드는 `type`, `dateTime`, `userId`, `userName` 임(이력이 없는 행은 각 필드가 `undefined`).

조인 후 `select` 에서 `item.lastDataLog.dateTime`, `item.lastDataLog.userName` 을 표시용 평탄 필드로 꺼냄.
simplysm-ts `UserPage.ts` 의 `search`:

```ts
override async search(usePagination: boolean): Promise<ISdDataSheetSearchResult<IItem>> {
  return await this.#appOrm.connectAsync(async (db) => {
    let qr1 = db.user;
    // ...필터(where/search)...

    const pageLength = usePagination ? Math.ceil((await qr1.countAsync()) / 50) : undefined;

    let qr2 = qr1
      .joinLastDataLog({ excludeTypes: ["사용자권한 설정"] })
      .select<IItem>((item) => ({
        id: item.id.notNull(),
        name: item.name,
        // ...표시 컬럼들...
        isDeleted: item.isDeleted,
        lastModifiedAt: item.lastDataLog.dateTime,
        lastModifiedBy: item.lastDataLog.userName,
      }));

    // ...orderBy / limit...
    const items = await qr2.resultAsync();
    return { items, pageLength };
  });
}
```

centurymes `GoodsPage.ts` 는 본 쿼리 시작부에서 다른 include 와 함께 한 번 끼움.

```ts
let qr1 = db.goods.include((item) => item.defaultVendor).joinLastDataLog();
// ...
let qr2 = qr1.select<IItem>((item) => ({
  // ...
  lastModifiedAt: item.lastDataLog.dateTime,
  lastModifiedBy: item.lastDataLog.userName,
}));
```

- `joinLastDataLog` 는 본 행의 `id` 컬럼을 join 키로 씀(`itemId = 본 행.id`). 따라서 적용 대상 모델의 PK 컬럼명이 `id` 여야 함.
- `tableName` + 행 `id` 로 격리되므로, 다른 테이블의 같은 `itemId` 이력이 섞이지 않음.
- `itemId` 없이 모델 단위로 적재된 이력(있다면)은 특정 행에 조인되지 않으므로 그 행은 빈칸으로 표시됨 — 정상.
- 페이지 길이 계산용 `countAsync()` 는 조인 전 `qr1` 에서 함(조인은 표시용 `select` 단계 직전에 붙임).

## 표시 대상 변경 유형을 한정, 제외하려면

`joinLastDataLog({ includeTypes?, excludeTypes? })` 로 어떤 `type` 만 "최신" 으로 칠지 조절함. 두 옵션 모두 `type` 문자열 배열임.

```ts
// "삭제" 는 빼고 최신 → 삭제 처리가 가장 최근이어도 그 직전 "수정" 이 lastDataLog 가 됨
.joinLastDataLog({ excludeTypes: ["삭제"] })

// 특정 type 들만 대상으로
.joinLastDataLog({ includeTypes: ["등록", "수정"] })
```

simplysm-ts `UserPage.ts` 는 `joinLastDataLog({ excludeTypes: ["사용자권한 설정"] })` 처럼, 사용자 화면에서 무의미한 권한 설정 이력을 "최종 수정" 집계에서 제외함.
`includeTypes`/`excludeTypes` 의 문자열은 적재 시 쓴 `type` 과 철자가 정확히 일치해야 함.

> 최초 등록 정보가 필요하면 같은 방식으로 `joinFirstDataLog()` 를 씀.
> 정렬만 반대(가장 오래된 1건)이고, 결과는 `item.firstDataLog.dateTime`, `firstDataLog.userName` 으로 꺼냄.

## 목록에 최종수정일시, 수정자 컬럼을 표시하려면

`AbsSdDataSheet` 기반 목록 화면은 `itemPropInfo` 에 `lastModifiedAt`, `lastModifiedBy` 필드명을 지정하면, 시트가 이를 "최종수정일시/수정자" 표시에 활용함.
(CRUD 화면 골격, `itemPropInfo` 전반은 [client-data-sheet.md](./client-data-sheet.md) 참고)

위 `search` 에서 채운 `lastModifiedAt`/`lastModifiedBy` 평탄 필드를 그대로 가리키게 함.
simplysm-ts `UserPage.ts`, centurymes `GoodsPage.ts` 공통:

```ts
override itemPropInfo: ISdDataSheetItemPropInfo<IItem> = {
  isDeleted: "isDeleted",
  lastModifiedAt: "lastModifiedAt",
  lastModifiedBy: "lastModifiedBy",
};
```

표시용 `IItem` 인터페이스에는 두 필드를 둠(이력이 없으면 `undefined`).

```ts
interface IItem {
  // ...
  isDeleted: boolean;
  lastModifiedAt?: DateTime; // from @simplysm/sd-core-common
  lastModifiedBy?: string;
}
```

엑셀 다운로드에도 최종수정 정보를 항상 포함하려면, `SdExcelWrapper` 정의에 두 필드를 추가함. simplysm-ts `UserPage.ts`:

```ts
#excelWrapper = new SdExcelWrapper(() => ({
  // ...업로드/다운로드 공통 필드...
  lastModifiedAt: { displayName: "최종수정일시", type: DateTime },
  lastModifiedBy: { displayName: "최종수정자", type: String },
}));
```

(업로드 시 이 두 필드는 다시 입력하지 않고, 업로드 처리에서 `insertDataLogAsync` 로 새 이력이 쌓임. 엑셀 래퍼 사용법은 [client-data-sheet.md](./client-data-sheet.md) 참고)

## 지킬 것

- 모델 변경을 적재할 땐 **변경을 수행한 그 모델의 queryable** 에서 `insertDataLogAsync` 를 호출함.
  `db.systemDataLog.insertAsync(...)` 로 `tableName` 을 직접 적지 않음(자동 도출이 깨지고, 조회 측 조인이 어긋남).
- 적재와 본 데이터 변경은 **같은 `connectAsync` 콜백(같은 트랜잭션)** 안에서 수행함.
  이력만 남고 데이터가 롤백되거나 그 반대가 되지 않게 함.
- "최종수정일시/수정자" 는 대상 테이블에 별도 컬럼을 추가하지 말고 `joinLastDataLog()` 조인 결과(`lastDataLog`)로 표시함.
- `type` 문자열은 프로젝트 단위로 고정된 집합(`등록`/`수정`/`삭제`/`복구`/`엑셀업로드` 등)을 쓰고, 조회 측 `includeTypes`/`excludeTypes` 와 철자를 정확히 일치시킴.
- `joinLastDataLog`/`joinFirstDataLog` 는 본 행의 PK 컬럼명이 `id` 임을 전제함. PK 가 `id` 가 아닌 모델에는 적용되지 않음.
- 이 기능은 DbContext 가 `DbContextExt`(`@simplysm/sd-orm-common-ext`)를 상속해야만 동작함.
  신규 프로젝트의 DbContext 가 일반 `DbContext` 만 상속한다면 변경 이력 적재, 조회를 쓸 수 없음.
