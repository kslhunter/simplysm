# 앱에서 공유 마스터 데이터 사용 매뉴얼

화면에서 자주 참조하는 마스터 데이터(고객사·품목·로케이션 등)를 공유 시그널로 쓰려면 `AppSharedDataProvider` 가 필요. `@simplysm/angular` 의 `SdSharedDataProvider` 를 상속해, 한 번 등록해 두면 어느 화면에서든 `useSharedSignal("<이름>")` 로 동일 데이터를 공유.

- 새 앱이라 provider 자체가 없으면 → "AppSharedDataProvider 를 정의하려면".
- provider 는 있고 데이터 항목만 더할 때 → "마스터 데이터 항목을 추가하려면".
- 전제: getter 가 DB 를 조회하므로 `AppOrmProvider` 가 먼저 있어야 함 ([client-orm.md](./client-orm.md)).

## AppSharedDataProvider 를 정의하려면 (새 앱 1회성)

`SdSharedDataProvider<TAppSharedData>` 를 상속하고, `useSharedSignal` 헬퍼를 함께 export. `initialize()` 안에서 항목을 `register`.

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
            isDisabled: item.isDisabled,

            __valueKey: item.id,
            __searchText: expr.concat(item.code, "|", item.name),
            __isHidden: item.isDisabled,
          }));

          if (changeKeys) {
            qr = qr.where((item) => [expr.in(item.id, changeKeys as number[])]);
          }
          return qr.execute();
        });
      },
      orderBy: (item) => item.code,
    });
  }
}

export type TAppSharedData = {
  고객사: ISharedCustomer;
};

export interface ISharedCustomer extends SharedDataBase<number> {
  id: number;
  code: string;
  name: string;
  isDisabled: boolean;
}
```

**약속**:

- `@Injectable({ providedIn: "root" })` 사용, `SdSharedDataProvider<TAppSharedData>` 를 상속.
- 등록은 `override initialize()` 안에서 `this.register(name, opts)` 호출로 수행.
- `useSharedSignal<K>(name)` 헬퍼를 함께 export — 컴포넌트는 inject 없이 이름만으로 접근.

## 마스터 데이터 항목을 추가하려면

세 곳을 함께 손봄: ① `initialize()` 의 `register` ② `TAppSharedData` 타입 항목 ③ 항목 인터페이스.

### 1. `initialize()` 에 `register` 추가

```ts
this.register("품목", {
  serviceKey: "MAIN",
  getter: async (changeKeys) => {
    return this._appOrm.connectAsync(async (db) => {
      let qr = db.product().select((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        isDisabled: item.isDisabled,

        __valueKey: item.id,
        __searchText: expr.concat(item.code, "|", item.name),
        __isHidden: item.isDisabled,
      }));

      if (changeKeys) {
        qr = qr.where((item) => [expr.in(item.id, changeKeys as number[])]);
      }
      return qr.execute();
    });
  },
  orderBy: (item) => item.code,
});
```

- getter 의 select 결과에 매직 필드를 포함:
  - `__valueKey` — 항목의 키.
  - `__searchText` — 검색용 텍스트.
  - `__isHidden` — 숨김 여부 (예: `isDisabled` 값으로 지정).
- `getter(changeKeys)` 의 `changeKeys` 인자가 주어지면 해당 키들만 다시 조회 (incremental refresh). 위 `where` 분기가 그 처리.
- `orderBy` 는 정렬 키를 반환하는 함수.

### 2. `TAppSharedData` 에 항목 추가

```ts
export type TAppSharedData = {
  고객사: ISharedCustomer;
  품목: ISharedProduct;
};
```

### 3. 항목 인터페이스 정의 (`SharedDataBase` 상속)

```ts
export interface ISharedProduct extends SharedDataBase<number> {
  id: number;
  code: string;
  name: string;
  isDisabled: boolean;
}
```

- 제네릭 인자는 키 타입(여기선 `number`).

## 화면에서 참조하려면

```ts
sharedProducts = useSharedSignal("품목");

// sharedProducts.items()  — 시그널, 항목 배열
// sharedProducts.get(id)  — id 로 단건 조회
```

- `register` 에 쓴 이름 문자열을 그대로 넘기면 `TAppSharedData` 에서 타입이 추론됨.

## 지킬 것

- 항목 추가 시 세 곳(`register` · `TAppSharedData` · 인터페이스)을 모두 갱신. 하나라도 빠지면 타입 불일치 또는 미등록 데이터가 됨.
- select 결과에 매직 필드(`__valueKey` · `__searchText` · `__isHidden`)를 빠짐없이 포함.
- `changeKeys` 분기를 생략하지 않음 — incremental refresh 가 동작하지 않으면 변경 시 전체 재조회가 됨.
