# 앱에서 ORM(DB) 사용 매뉴얼

앱에서 ORM(Object-Relational Mapping) 으로 DB(데이터베이스)에 접근하려면 `AppOrmProvider` 가 필요. `AppServiceProvider.orm` 위에 앱별 DB 설정(DbContext·데이터베이스명·스키마명)을 고정해 둔 root provider 로, 화면·프로바이더는 DB 옵션을 매번 적지 않고 `connectAsync` 한 번으로 쿼리를 실행.

- 전제: `AppServiceProvider` 가 먼저 있어야 함 ([client-service.md](./client-service.md) — `orm` getter 가 이 provider 의 기반).
- 쿼리 작성법(스키마 정의·`Queryable` 체이닝·`expr`)은 [orm.md](./orm.md) 참조.

## AppOrmProvider 를 정의하려면 (새 앱 1회성)

앱의 DbContext·DB명·스키마를 한 곳에 고정하고, `connectAsync` 한 메서드로 쿼리를 실행.

```ts
@Injectable({ providedIn: "root" })
export class AppOrmProvider {
  private readonly _appService = inject(AppServiceProvider);

  connectAsync<R>(callback: (db: MainDbContext) => Promise<R>): Promise<R> {
    return this._appService.orm.connect(
      {
        DbClass: MainDbContext,
        connOpt: { configName: "MAIN" },
        dbContextOpt: { database: "..." },
      },
      callback,
    );
  }
}
```

**약속**:

- `@Injectable({ providedIn: "root" })`.
- DbContext 는 앱별로 정의 (예: `@adtek/db-main` 의 `MainDbContext`). 스키마 정의는 [orm.md](./orm.md).
- 진입 메서드는 `connectAsync` (트랜잭션 포함).
- 콜백의 반환값이 그대로 메서드의 반환값이 됨.

## 화면·프로바이더에서 쿼리를 실행하려면

`AppOrmProvider` 를 inject 하고 `connectAsync` 콜백 안에서 쿼리.

```ts
private readonly _appOrm = inject(AppOrmProvider);

const rows = await this._appOrm.connectAsync(async (db) => {
  return db.order().select((item) => ({ id: item.id, status: item.status })).execute();
});
```

- 콜백 인자 `db` 는 `MainDbContext`. 테이블·뷰 빌더와 쿼리 작성은 [orm.md](./orm.md).

## 지킬 것

- DB 옵션(`DbClass`·`connOpt`·`dbContextOpt`)은 `AppOrmProvider` 한 곳에만 두고, 화면·프로바이더는 `connectAsync` 만 호출. 옵션을 호출부에 흩뿌리지 않음.
- 프리렌더(SSG) 대상 화면의 초기화 경로에서는 `connectAsync` 호출 금지 — 제약은 [client-ssg.md](./client-ssg.md) 참조.
