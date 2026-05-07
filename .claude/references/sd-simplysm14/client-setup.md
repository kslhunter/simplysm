# 클라이언트 환경 셋업 매뉴얼

이 문서는 `@simplysm/angular` 위에 앱이 만들어두는 표준 추상화 계층(서비스 클라이언트·ORM·공유 데이터)을 정의·등록하는 컨벤션을 모은다. 화면 작성 시점에는 거의 건드리지 않으며, 새 앱 부트스트랩이나 새 서비스/마스터 데이터 추가 시에만 본다. 화면 컨벤션은 [client-component.md](./client-component.md) 참조.

## AppServiceProvider

`@simplysm/service-client` 위에 앱이 만드는 root provider. 서비스/이벤트 프록시와 ORM 커넥터를 lazy 캐싱으로 노출한다.

```ts
@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  private readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  private _orm?: OrmClientConnector;
  private _user?: ServiceProxy<UserServiceType>;
  private _authInfoEvent?: ClientEventProxy<typeof AuthInfoEvent>;
  // ...

  get client() {
    return this._sdServiceClientFactory.get("MAIN");
  }

  get orm(): OrmClientConnector {
    return (this._orm ??= createOrmClientConnector(this.client));
  }

  get user(): ServiceProxy<UserServiceType> {
    return (this._user ??= this.client.getService<UserServiceType>("User"));
  }

  get authInfoEvent(): ClientEventProxy<typeof AuthInfoEvent> {
    return (this._authInfoEvent ??= this.client.getEvent<typeof AuthInfoEvent>("AuthInfo"));
  }

  async connectAsync() {
    await this._sdServiceClientFactory.connectAsync("MAIN");
  }
}
```

**약속**:

- `@Injectable({ providedIn: "root" })`.
- 서비스/이벤트는 `private _xxx?` 캐시 필드 + getter 로 노출. lazy 초기화는 `??=` 패턴.
- 서비스: `client.getService<XxxServiceType>("XxxName")`. 이벤트: `client.getEvent<typeof XxxEvent>("XxxName")`.
- ORM 커넥터: `createOrmClientConnector(this.client)` 로 `orm` getter.
- `connectAsync()` — 앱 부트스트랩 시 서버 연결.

## AppOrmProvider

`AppServiceProvider.orm` 위에 앱별 DB 설정(DbContext / 데이터베이스 / 스키마)을 고정해 둔 root provider.

```ts
@Injectable({ providedIn: "root" })
export class AppOrmProvider {
  private readonly _appService = inject(AppServiceProvider);

  connectAsync<R>(callback: (db: MainDbContext) => Promise<R>): Promise<R> {
    return this._appService.orm.connect(
      {
        DbClass: MainDbContext,
        connOpt: { configName: "MAIN" },
        dbContextOpt: { database: "...", schema: "dbo" },
      },
      callback,
    );
  }

  connectWithoutTransAsync<R>(callback: (db: MainDbContext) => Promise<R>): Promise<R> {
    return this._appService.orm.connectWithoutTransaction(
      { /* 같은 옵션 */ },
      callback,
    );
  }
}
```

**약속**:

- `@Injectable({ providedIn: "root" })`.
- DbContext 는 앱별 정의 (예: `@adtek/db-main` 의 `MainDbContext`).
- 기본은 `connectAsync` (트랜잭션). `connectWithoutTransAsync` 는 initialize 등 트랜잭션 안에서 동작하지 않는 작업용 헬퍼.
- 콜백 반환값이 그대로 메서드 반환값.

## AppSharedDataProvider

`@simplysm/angular` 의 `SdSharedDataProvider` 를 상속해, 화면에서 자주 참조하는 마스터 데이터(고객사·품목·로케이션 등)를 등록한 root provider.

```ts
export function useSharedSignal<K extends keyof TAppSharedData>(
  name: K,
): SharedDataHandle<TAppSharedData[K]> {
  const appSharedData = inject(AppSharedDataProvider);
  return appSharedData.getHandle(name);
}

@Injectable({ providedIn: "root" })
export class AppSharedDataProvider extends SdSharedDataProvider<TAppSharedData> {
  private readonly _appOrm = inject(AppOrmProvider);

  override initialize() {
    this.register("고객사", {
      serviceKey: "MAIN",
      getter: async (changeKeys) => {
        return this._appOrm.connectAsync(async (db) => {
          let qr = db.customer().select((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            isDeleted: item.isDeleted,

            __valueKey: item.id,
            __searchText: expr.concat(item.code, "|_|", item.name),
            __isHidden: item.isDeleted,
          }));

          if (changeKeys) {
            qr = qr.where((item) => [expr.in(item.id, changeKeys as number[])]);
          }
          return qr.execute();
        });
      },
      orderBy: (item) => item.code,
    });

    // ... 다른 마스터 데이터 등록 ...
  }
}

export type TAppSharedData = {
  고객사: ISharedCustomer;
  // ...
};

export interface ISharedCustomer extends SharedDataBase<number> {
  id: number;
  code: string;
  name: string;
  isDeleted: boolean;
}
```

**약속**:

- `@Injectable({ providedIn: "root" })`, `SdSharedDataProvider<TAppSharedData>` 상속.
- 등록은 `override initialize()` 안에서 `this.register(name, opts)`.
- 각 항목 인터페이스는 `SharedDataBase<TKey>` 상속.
- getter 의 select 결과에 매직 필드 포함:
  - `__valueKey` — 항목 키.
  - `__searchText` — 검색 텍스트.
  - `__isHidden` — 숨김 여부 (보통 `isDeleted`).
- `getter(changeKeys)` 가 있으면 그 키들만 다시 조회 (incremental refresh).
- `orderBy` 는 정렬 키를 반환하는 함수 (`(item) => item.code`).
- `useSharedSignal<K>(name)` 헬퍼 함수를 같이 export — 컴포넌트는 inject 없이 이름만으로 접근.
