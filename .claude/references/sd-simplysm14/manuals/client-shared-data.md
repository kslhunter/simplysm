# 앱에서 공유 마스터 데이터 사용 매뉴얼

화면에서 자주 참조하는 마스터 데이터(고객사·품목·로케이션 등)를 공유 시그널로 쓰려면 `AppSharedDataProvider` 가 필요. `@simplysm/angular` 의 `SdSharedDataProvider` 를 상속해, 한 번 등록해 두면 어느 화면에서든 `useSharedSignal("<이름>")` 로 동일 데이터를 공유.

- 새 앱이라 provider 자체가 없으면 → "AppSharedDataProvider 를 정의하려면".
- provider 는 있고 데이터 항목만 더할 때 → "마스터 데이터 항목을 추가하려면".
- 전제: getter 가 DB 를 조회하므로 `AppOrmProvider` 가 먼저 있어야 함 ([client-orm.md](./client-orm.md)).

## AppSharedDataProvider 를 정의하려면 (새 앱 1회성)

`SdSharedDataProvider<TAppSharedData>` 를 상속하고, `useSharedSignal` 헬퍼를 함께 export. `initialize()` 안에서 항목을 `register`.

```ts
export function useSharedSignal<K extends keyof TAppSharedData>(
  dataKey: K,
): SharedDataHandle<TAppSharedData[K]> {
  const appSharedData = inject(AppSharedDataProvider);
  return appSharedData.getHandle(dataKey);
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
- `useSharedSignal<K>(dataKey)` 헬퍼를 함께 export — 컴포넌트는 inject 없이 이름만으로 접근.

## 부트스트랩에 연결하려면 (새 앱 1회성)

라이브러리 공유데이터 컨트롤(`sd-shared-data-select` · `sd-shared-data-select-list`)은 base 토큰 `SdSharedDataProvider` 를 inject 하므로, 부트스트랩 providers 에 앱 provider 를 그 토큰의 별칭으로 등록.

```ts
// 앱 부트스트랩 (main.ts)
bootstrapApplication(AppRoot, {
  providers: [
    // ...
    { provide: SdSharedDataProvider, useExisting: AppSharedDataProvider },
  ],
});
```

- 이 별칭이 없으면 컨트롤이 데이터가 등록된 `AppSharedDataProvider` 가 아니라 빈 base 인스턴스를 잡아, 공유데이터 select 컨트롤에 항목이 표시되지 않음.

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

## 선택 컨트롤에서 관리·선택 모달 띄우기

공유데이터 선택 컨트롤(`sd-shared-data-select` · `sd-shared-data-select-list`)은 그 자리에서 해당 마스터를 관리·선택하는 모달을 여는 입력을 가짐. 마스터 목록 화면(`sd-crud-list` 기반)을 모달로 재사용해, 선택 컨트롤 옆에서 등록·수정·선택을 끝낼 수 있음.

| 입력         | 컨트롤              | 동작                                                                                               |
| ------------ | ------------------- | -------------------------------------------------------------------------------------------------- |
| `[modal]`    | select · select-list | 선택형 모달. 모달에 `selectMode: "single"` 과 현재 선택 키가 주입되어 열리고, 닫힘 결과의 첫 키로 선택을 갱신. |
| `[editModal]` | select              | 관리 전용 모달(선택을 바꾸지 않음). 닫혀도 현재 선택은 그대로 유지.                                |

```html
<sd-shared-data-select-list
  [items]="sharedRoles.items()"
  [(selectedItem)]="selectedRole"
  [modal]="{ type: RoleList, title: '역할', inputs: {} }"
>
  <ng-template [itemOf]="sharedRoles.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select-list>
```

- `[modal]` 값은 `{ type, title, inputs }` (모달 호출과 동일 형태, [client-component.md](./client-component.md) 의 '모달 호출' 참조).
- `[modal]` 로 띄울 목록 컴포넌트는 **선택 모달 계약**을 구현해야 함:
  - `selectMode` input + `selectedKeys` model 보유.
  - `SdModalContentDef<SelectModalOutputResult<TKey> | undefined>` 구현 (close 페이로드로 `{ selectedKeys }` 전달).
  - 이 계약은 `sd-crud-list` 의 모달 선택 모드와 동일 ([client-crud.md](./client-crud.md) 참조). 즉 목록 화면 하나가 일반 페이지·선택 모달 양쪽으로 재사용됨.
- 선택 컨트롤이 띄울 때는 항상 `selectMode: "single"` 로 주입되므로, 목록은 단건 선택 모드로 동작함.

## 좌측 선택 목록 + 우측 상세(master-detail) 레이아웃을 구성하려면

`sd-shared-data-select-list` 를 좌측에 두어 마스터를 고르고, 선택된 항목의 상세를 우측에 임베드하는 2-pane 화면. 선택을 바꾸거나 화면을 떠날 때 우측 상세의 미저장 변경을 보호하려면 자식 상세의 변경 가드를 부모가 위임 호출하도록 연결.

```html
<div class="flex-row fill">
  <sd-shared-data-select-list
    class="flex-min"
    [items]="sharedRoles.items()"
    [(selectedItem)]="selectedRole"
    [canChangeFn]="checkCanLeave"
    [header]="'역할'"
    [modal]="{ type: RoleList, title: '역할', inputs: {} }"
  >
    <ng-template [itemOf]="sharedRoles.items()" let-item="item">{{ item.name }}</ng-template>
  </sd-shared-data-select-list>

  @let _selectedRole = selectedRole();
  @if (_selectedRole == null) {
    <div class="flex-fill tx-theme-gray-default p-xxl" style="font-size: 48px; line-height: 1.5em">
      <ng-icon [svg]="tablerArrowLeft" />
      역할을 선택하세요.
    </div>
  } @else {
    <app-role-permission-detail class="flex-fill" [roleId]="_selectedRole.id" />
  }
</div>
```

```ts
detail = viewChild(RolePermissionDetail);

// 자식 상세의 미저장 변경 가드를 부모가 위임 호출
protected readonly checkCanLeave = (): boolean => {
  const detail = this.detail();
  return detail == null || detail.checkIgnoreChanges();
};

constructor() {
  setupCanDeactivate(this.checkCanLeave); // 라우팅 이탈 보호
}
```

- 자식 상세는 변경 가드를 `public` 메서드(`checkIgnoreChanges()`)로 노출해 부모가 호출. 이 화면에선 자식이 직접 `setupCanDeactivate` 를 두지 않고 부모가 가드를 소유.
- 두 이탈 경로를 모두 막음:
  - `[canChangeFn]="checkCanLeave"` — 좌측에서 **다른 항목으로 전환**하기 전 확인.
  - `setupCanDeactivate(checkCanLeave)` — **페이지(라우팅) 이탈** 전 확인.
- 선택 전(`selectedItem == null`)에는 미선택 빈 상태를 둠 — 아이콘 + 안내 문구 구조와 `NgIcon` 등록은 [client-component.md](./client-component.md) 의 'list + detail 합성' 빈 상태 규약을 따름.

## 지킬 것

- 항목 추가 시 세 곳(`register` · `TAppSharedData` · 인터페이스)을 모두 갱신. 하나라도 빠지면 타입 불일치 또는 미등록 데이터가 됨.
- select 결과에 매직 필드(`__valueKey` · `__searchText` · `__isHidden`)를 빠짐없이 포함.
- `changeKeys` 분기를 생략하지 않음 — incremental refresh 가 동작하지 않으면 변경 시 전체 재조회가 됨.
- 공유데이터는 서버 연결을 전제하므로 프리렌더(SSG) 대상 화면의 초기화 경로에서 사용 금지 — 제약은 [client-ssg.md](./client-ssg.md) 참조.
