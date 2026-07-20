# 앱에서 DB(ORM)에 접속하기

앱 화면이나 프로바이더에서 DB(데이터베이스)에 쿼리를 보내려면 `AppOrmProvider` 를 거침.
`AppOrmProvider` 는 "어느 DbContext 를, 어느 서버 접속 설정(`configName`)으로, 어느 데이터베이스, 스키마에 붙일지" 를 앱에서 한 곳에 고정해 둔 root provider 임.
화면, 프로바이더는 이 옵션을 매번 적지 않고 `connectAsync(async (db) => { ... })` 한 줄로 접속, 트랜잭션, 쿼리를 끝냄.

- 전제: `AppServiceProvider` 가 먼저 있어야 함 — `AppOrmProvider` 는 `appService.orm()` 위에 옵션만 얹은 얇은 래퍼임. `AppServiceProvider` 정의는 [client-service.md](./client-service.md) 참조.
- 쿼리 작성법은 이 매뉴얼에서 다루지 않음 — [orm.md](./orm.md) 참조.
  - 대상 예: 스키마 정의, `Queryable` 체이닝, `db.qh`, `search`/`where`/`select`/`orderBy`/`limit`, `resultAsync`/`existsAsync`/`upsertAsync`.
- 클라이언트는 DB 에 직접 붙지 않음. `connectAsync` 의 모든 쿼리는 서버를 경유해 실행됨 ([client-service.md](./client-service.md)).

## AppOrmProvider 를 정의하려면 (앱당 1회)

앱마다 `client-common` 패키지의 `providers/AppOrmProvider.ts` 에 root provider 를 하나 둠.
여기서 DbContext 타입과 서버 접속 옵션을 고정하고, 외부에는 `connectAsync` / `connectWithoutTransAsync` 두 메서드만 노출함.

```ts
// simplysm-ts/packages/client-common/src/providers/AppOrmProvider.ts
import { inject, Injectable } from "@angular/core";
import { AppServiceProvider } from "./AppServiceProvider";
import { MainDbContext } from "@simplysm-ts/db-main";

@Injectable({ providedIn: "root" })
export class AppOrmProvider {
  #appService = inject(AppServiceProvider);

  async connectAsync<R>(callback: (db: MainDbContext) => Promise<R>): Promise<R> {
    return await this.#appService.orm().connectAsync(
      {
        dbContextType: MainDbContext,
        connOpt: {
          configName: "MAIN",
          config: {
            database: "SIMPLYSM_TS",
            schema: "dbo",
          },
        },
      },
      async (db) => {
        return await callback(db);
      },
    );
  }

  async connectWithoutTransAsync<R>(callback: (db: MainDbContext) => Promise<R>): Promise<R> {
    return await this.#appService.orm().connectWithoutTransactionAsync(
      {
        dbContextType: MainDbContext,
        connOpt: {
          configName: "MAIN",
          config: {
            database: "SIMPLYSM_TS",
            schema: "dbo",
          },
        },
      },
      async (db) => {
        return await callback(db);
      },
    );
  }
}
```

지켜야 할 것:

- `@Injectable({ providedIn: "root" })` 로 등록함.
- `#appService = inject(AppServiceProvider)` — DI 는 hard private(`#`) 필드로 받음.
- `this.#appService.orm()` 은 `SdOrmServiceClientConnector` 임(`AppServiceProvider` 에서 `orm = $computed(() => new SdOrmServiceClientConnector(this.client))` 로 노출).
  이 커넥터의 `connectAsync` / `connectWithoutTransactionAsync` 가 실제 접속 메서드임.
- `dbContextType` 에는 앱 전용 DbContext(예: `@simplysm-ts/db-main` 의 `MainDbContext`)를 넣음.
  `MainDbContext` 는 `extends DbContextExt`(`@simplysm/sd-orm-common-ext`) 이며 테이블/뷰를 `new Queryable(this, 모델)` 로 가짐 — 스키마, 모델 정의는 [orm.md](./orm.md).
- `connOpt.configName` 은 서버에 정의된 DB 접속 설정 이름임(여기서는 `"MAIN"`).
  `connOpt.config.database` / `connOpt.config.schema` 로 실제 데이터베이스명과 스키마를 지정함.
  centurymes 는 같은 구조로 `database: "CENTURYMES"` 를 씀 — 앱마다 이 값만 다름.
- 콜백의 반환값이 그대로 `connectAsync` 의 반환값이 됨(제네릭 `R`).
- DB 옵션은 이 파일에만 둠. 화면, 프로바이더는 `connectAsync` 만 호출하고 `configName`/`database`/`schema` 를 다시 적지 않음.

## 화면, 프로바이더에서 쿼리를 실행하려면

`AppOrmProvider` 를 inject 하고, `connectAsync` 콜백 안에서 `db` 로 쿼리함. 콜백 인자 `db` 가 곧 `MainDbContext` 이므로 `db.partner`, `db.qh` 등 테이블, 쿼리 헬퍼를 바로 씀.

```ts
// simplysm-ts/.../base/partner/PartnerPage.ts (목록 조회)
export class PartnerPage extends AbsSdDataSheet<IFilter, IItem, number | undefined> {
  #appOrm = inject(AppOrmProvider);

  override async search(usePagination: boolean): Promise<ISdDataSheetSearchResult<IItem>> {
    return await this.#appOrm.connectAsync(async (db) => {
      let qr = db.partner;

      if (!StringUtils.isNullOrEmpty(this.lastFilter().searchText)) {
        qr = qr.search((item) => [item.name, item.remark], this.lastFilter().searchText!);
      }
      if (!this.lastFilter().isIncludeDeleted) {
        qr = qr.where((item) => [db.qh.equal(item.isDeleted, false)]);
      }
      if (usePagination) {
        qr = qr.limit(this.page() * 50, 50);
      }

      const items = await qr.resultAsync();
      return { items, pageLength };
    });
  }
}
```

- `db` 의 사용 범위는 콜백 안으로 한정됨. 콜백을 벗어난 뒤 `db` 를 다시 쓰면 안 됨(접속이 이미 닫힘).
- 콜백 안에서 `await` 한 쿼리 결과를 가공해 반환하면 그 값이 `search` 의 결과가 되고, 그대로 `<sd-data-sheet>` 의 행으로 그려짐.
  (목록, 편집 화면 골격은 [client-data-sheet.md](./client-data-sheet.md) 참조.)

## 한 트랜잭션 안에서 여러 쓰기를 묶으려면

`connectAsync` 콜백 전체가 하나의 트랜잭션임.
콜백이 정상 종료하면 커밋되고, 콜백 안에서 예외가 던져지면 그때까지의 모든 쓰기가 롤백됨.
따라서 여러 행을 검증, 저장하는 작업은 한 번의 `connectAsync` 안에 모두 넣어, "일부만 저장되는" 상태를 만들지 않음.

```ts
// simplysm-ts/.../base/partner/PartnerPage.ts (저장)
override async submit(diffs: TArrayDiffs2Result<IItem>[]): Promise<boolean> {
  const changedIds: number[] = [];

  await this.#appOrm.connectAsync(async (db) => {
    for (const diff of diffs) {
      // 중복 검증 — 실패 시 throw 하면 이 트랜잭션의 앞선 쓰기까지 모두 롤백된다
      if (
        !diff.item.isDeleted &&
        (await db.partner
          .where((item) => [
            db.qh.equal(item.name, diff.item.name),
            db.qh.notEqual(item.id, diff.item.id),
            db.qh.isFalse(item.isDeleted),
          ])
          .existsAsync())
      ) {
        throw new ArgumentError("동일한 명칭이 이미 등록되어 있습니다.", { 명칭: diff.item.name });
      }

      const upsertId = (
        await db.partner
          .where((item) => [db.qh.equal(item.id, diff.item.id)])
          .upsertAsync(
            () => ({ name: diff.item.name!, remark: diff.item.remark, isDeleted: diff.item.isDeleted }),
            ["id"],
          )
      ).single()!.id!;
      changedIds.push(upsertId);

      await db.partner.insertDataLogAsync({
        type: diff.item.id == null ? "등록" : "수정",
        itemId: upsertId,
        valueJson: undefined,
        userId: this.#appAuth.authInfo()!.user.id,
      });
    }
  });

  // 트랜잭션이 커밋된 뒤에 후처리(공유데이터 갱신 알림 등)
  await this.#appSharedData.emitAsync("거래처", changedIds);
  return true;
}
```

지켜야 할 것:

- 검증 실패는 콜백 안에서 `throw` 함. 콜백에서 던진 예외는 트랜잭션을 롤백시키므로, 검증 전에 한 쓰기가 DB 에 남지 않음.
- 외래키(FK) 제약 위반(참조 중인 데이터를 지우려는 등)으로 발생한 DB 오류는 커넥터가 사용자용 한국어 메시지로 바꿔 다시 던짐("경고! 연결된 작업에 의한 처리 거부. 후속작업 확인요망").
  화면에서 같은 안내를 별도로 만들 필요는 없음.
- 트랜잭션이 끝난 뒤에 해야 할 일(공유데이터 `emitAsync`, 토스트 성공 안내 등)은 `connectAsync` 호출 바깥에 둠.
  콜백 안에 넣으면 커밋 전에 실행되어, 롤백된 변경을 알림으로 내보낼 수 있음.
- 이 메서드들은 보통 `SdToastProvider.try(async () => { ... })` 안에서 호출함.
  콜백이 던진 에러(검증 실패, FK 위반 등)가 토스트로 자동 표시됨 — 토스트 사용은 [client-component.md](./client-component.md) 참조.

## 트랜잭션 없이 실행해야 할 때 connectWithoutTransAsync 를 쓰려면

일부 DB 작업은 트랜잭션 안에서 실행할 수 없음(예: 스키마/프로시저를 다시 만드는 DDL 성격의 초기화 작업, `USE <DB>` 가 섞인 배치 등).
이런 작업은 `connectAsync` 대신 `connectWithoutTransAsync` 를 씀.
접속은 동일하게 열리지만 `begin/commit/rollback` 트랜잭션으로 감싸지 않음.

```ts
// centurymes/.../modals/DevModal.ts (개발자용 DB 초기화)
async onDbInitViewButtonClick() {
  this.busyCount.update((v) => v + 1);
  await this.#sdToast.try(async () => {
    await this.#appOrm.connectWithoutTransAsync(async (db) => {
      // 트랜잭션으로 묶을 수 없는 초기화성 배치 작업을 실행
      // ...
    });
  });
}
```

지켜야 할 것:

- 평범한 조회, 저장은 `connectAsync` 를 씀.
  `connectWithoutTransAsync` 는 "트랜잭션으로 감쌀 수 없는 작업" 에만 씀 — 트랜잭션이 없으므로 콜백 도중 실패해도 앞선 변경이 자동 롤백되지 않음.
- centurymes 와 simplysm-ts 모두 `AppOrmProvider` 에 `connectWithoutTransAsync` 를 정의해 두지만, 화면에서 실제로 쓰는 곳은 DevModal 같은 운영/초기화 도구에 한정됨.
  일반 업무 화면에서는 `connectAsync` 만 씀.

## 지킬 것 (요약)

- DB 옵션(`dbContextType`/`configName`/`database`/`schema`)은 `AppOrmProvider` 한 곳에만 둠. 화면, 프로바이더는 `connectAsync`(또는 필요 시 `connectWithoutTransAsync`)만 호출함.
- `db` 는 콜백 안에서만 유효함. 콜백 밖으로 `db` 를 들고 나가지 않음.
- 관련된 여러 쓰기는 한 번의 `connectAsync` 콜백 안에 모아 한 트랜잭션으로 묶음. 검증 실패는 콜백 안에서 `throw` 함.
- 커밋 이후에만 의미 있는 후처리(공유데이터 알림, 외부 통지)는 `connectAsync` 바깥에 둠.
- 쿼리 문법 자체는 [orm.md](./orm.md), 접속을 떠받치는 서비스 계층은 [client-service.md](./client-service.md).
