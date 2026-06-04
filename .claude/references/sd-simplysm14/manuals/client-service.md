# 앱에서 서버 서비스·이벤트 호출 매뉴얼

앱이 서버와 통신(서비스 RPC 호출·실시간 이벤트 구독)하려면 `AppServiceProvider` 가 필요. `@simplysm/service-client` 위에 앱이 만드는 root provider 로, 서버 연결·서비스 프록시·이벤트 프록시·ORM 커넥터의 공통 진입점.

- 새 앱이라 provider 자체가 없으면 → 아래 "AppServiceProvider 를 정의하려면".
- provider 는 이미 있고 서비스·이벤트만 더할 때 → "새 서비스 호출을 추가하려면" / "새 이벤트 프록시를 추가하려면".

ORM 사용은 [client-orm.md](./client-orm.md), 이벤트 정의·발생 메커니즘은 [event.md](./event.md) 참조.

## AppServiceProvider 를 정의하려면 (새 앱 1회성)

서버 연결·서비스·이벤트·ORM 진입점을 한 root provider 에 모음. 서비스·이벤트는 `private _xxx?` 캐시 필드 + getter 로 lazy 노출(`??=`).

```ts
@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  private readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  get client() {
    return this._sdServiceClientFactory.get("MAIN");
  }

  private _orm?: OrmClientConnector;
  get orm(): OrmClientConnector {
    return (this._orm ??= createOrmClientConnector(this.client));
  }

  private _user?: ServiceProxy<UserServiceMethods>;
  get user(): ServiceProxy<UserServiceMethods> {
    return (this._user ??= this.client.getService<UserServiceMethods>("User"));
  }

  private _authInfoEvent?: ClientEventProxy<typeof AuthInfoEvent>;
  get authInfoEvent(): ClientEventProxy<typeof AuthInfoEvent> {
    return (this._authInfoEvent ??= this.client.getEvent(AuthInfoEvent));
  }

  async connectAsync() {
    await this._sdServiceClientFactory.connectAsync("MAIN");
  }
}
```

**약속**:

- `@Injectable({ providedIn: "root" })`.
- `client` getter — `SdServiceClientFactoryProvider.get("MAIN")` 결과. 서비스·이벤트·ORM 의 공통 진입점.
- `orm` getter — `createOrmClientConnector(this.client)` 결과. DB 설정을 얹는 `AppOrmProvider` 가 이 위에 올라감 ([client-orm.md](./client-orm.md)).
- `connectAsync()` — 앱 부트스트랩 시점에 서버 연결 수행. `addListener` 등 통신은 이 호출 이후에만 가능.

## 부트스트랩에서 서버에 연결하려면

`provideAppInitializer` 안에서 `AppServiceProvider.connectAsync()` 를 호출하고 그 Promise 를 반환. Angular 가 이 Promise 를 기다린 뒤 앱을 띄우므로, 화면·프로바이더가 통신을 시작하는 시점에는 연결이 이미 끝나 있음.

```ts
// 앱 부트스트랩 (main.ts)
provideAppInitializer(async () => {
  await inject(AppServiceProvider).connectAsync();
});
```

- `connectAsync()` 의 Promise 를 **반환**해야 Angular 가 연결 완료까지 부트스트랩을 대기. 반환을 빠뜨리면 연결 전에 화면이 떠 통신 호출이 실패함.

## 새 서비스 호출을 추가하려면

`client.getService<XxxServiceMethods>("XxxName")` 결과를 캐시 필드 + getter 로 노출.

```ts
@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  // ... 기존 멤버 ...
  private _order?: ServiceProxy<OrderServiceMethods>;

  get order(): ServiceProxy<OrderServiceMethods> {
    return (this._order ??= this.client.getService<OrderServiceMethods>("Order"));
  }
}
```

- 타입 `XxxServiceMethods` 는 server 패키지가 export 한 `ServiceMethods<typeof XxxService>`.
- 첫 인자 `"XxxName"` 은 server 의 `defineService("XxxName", ...)` 이름과 일치해야 함.
- 호출: `await this._appService.order.ship(orderId)`.

## 새 이벤트 프록시를 추가하려면

`client.getEvent(XxxEvent)` 결과를 캐시 필드 + getter 로 노출. `appService.client.getEvent(...)` 를 매번 적는 대신 `appService.xxxEvent` 로 짧게 씀.

```ts
@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  // ... 기존 멤버 ...
  private _orderStatusChangedEvent?: ClientEventProxy<typeof OrderStatusChangedEvent>;

  get orderStatusChangedEvent(): ClientEventProxy<typeof OrderStatusChangedEvent> {
    return (this._orderStatusChangedEvent ??= this.client.getEvent(OrderStatusChangedEvent));
  }
}
```

- `XxxEvent` 는 공통 패키지가 `defineEvent(...)` 로 export 한 정의 객체 — 이름·타입이 객체에서 추론됨. 문자열 이름이나 `<typeof X>` 를 따로 적지 않음.
- 구독: `const key = await this._appService.orderStatusChangedEvent.addListener(info, cb)`.
- 이벤트 정의·발생·구독 메커니즘 전반은 [event.md](./event.md) 참조.

## 지킬 것

- 캐시 필드(`private _xxx?`)와 getter(`??=`)를 항목별로 인접 배치하고, 항목마다 동일 패턴 유지.
- 서비스 이름·이벤트 정의 객체는 단일 소스(server `defineService` 이름 / 공통 `defineEvent` 객체)를 그대로 따름. 호출부에서 문자열·제네릭을 중복으로 적지 않음.
- `connectAsync()` 이전에는 통신 호출 불가 — 부트스트랩 순서 준수.
