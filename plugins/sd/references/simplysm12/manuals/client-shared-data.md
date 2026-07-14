# 공유 마스터 데이터 정의·사용 매뉴얼 (v12)

여러 화면에서 반복 참조하는 마스터(사용자·거래처·품목·로케이션 등)를 매번 DB 조회하지 않고, 앱 전역에서 하나의 시그널로 공유해 쓰려면 `AppSharedDataProvider` 를 씀. 한 번 등록해 두면 어느 화면에서든 `useSharedSignal("<이름>")` 로 같은 배열·같은 인스턴스를 받아 쓰고, 마스터를 CRUD 한 화면이 `emitAsync` 로 통지하면 그 마스터를 구독 중인 모든 접속 클라이언트의 시그널이 자동 갱신됨.

- `AppSharedDataProvider` 는 라이브러리의 `SdSharedDataProvider<T>`(`@simplysm/sd-angular`) 를 상속해 앱 `client-common` 패키지에 둠.
- 데이터 조회는 `getDataAsync` 안에서 `AppOrmProvider.connectAsync` 로 수행하므로 ORM 이 먼저 있어야 함. 쿼리 상세는 [orm.md](./orm.md) 참조.
- 변경 통지/구독은 내부적으로 실시간 이벤트(`SdServiceEventListenerBase`) 위에서 동작함. 이벤트 일반론은 [client-realtime.md](./event.md) 참조.

근거: `simplysm-ts` `client-common/providers/AppSharedDataProvider.ts`, `client-admin .../user/UserPage.ts`, `.../bank-account-log/BankAccountLogPage.ts`; `centurymes` `client-common/providers/AppSharedDataProvider.ts`; 라이브러리 `sd-angular/.../storage/sd-shared-data.provider.ts`, `.../shared-data/sd-shared-data-select.control.ts`.

## 새 공유데이터를 등록하려면

세 곳을 함께 손봄: ① `initialize()` 안의 `register("<이름>", { ... })` ② `TAppSharedData` 타입에 항목 추가 ③ 항목 인터페이스(`ISharedDataBase<키타입>` 상속) 정의. 하나라도 빠지면 타입 불일치 또는 미등록 데이터가 됨.

`register` 의 둘째 인자에 `serviceKey` · `getDataAsync(changeKeys)` · `orderBy` 를 준다. `getDataAsync` 의 `select` 결과에는 화면 표시용 일반 필드와 함께 **매직 필드 `__valueKey` · `__searchText` · `__isHidden`** 을 반드시 포함해야 함(인터페이스 `ISharedDataBase` 가 요구). 아래는 `centurymes` 의 "거래처" 등록 예다.

```ts
import { inject, Injectable } from "@angular/core";
import { ISharedDataBase, SdSharedDataProvider } from "@simplysm/sd-angular";
import { APP_MAIN_SERVICE_KEY } from "../commons/commons";
import { AppOrmProvider } from "./AppOrmProvider";

export function useSharedSignal<K extends keyof TAppSharedData>(name: K) {
  return inject(AppSharedDataProvider).getSignal(name);
}

@Injectable({ providedIn: "root" })
export class AppSharedDataProvider extends SdSharedDataProvider<TAppSharedData> {
  #appOrm = inject(AppOrmProvider);

  initialize() {
    this.register("거래처", {
      serviceKey: APP_MAIN_SERVICE_KEY,
      getDataAsync: async (changeKeys) => {
        return await this.#appOrm.connectAsync(async (db) => {
          let qr = db.partner.select((item) => ({
            id: item.id.notNull(),
            name: item.name,
            isVendor: item.isVendor,
            isCustomer: item.isCustomer,
            isDeleted: item.isDeleted,

            __valueKey: item.id.notNull(),
            __searchText: item.name,
            __isHidden: item.isDeleted,
          }));

          if (changeKeys) {
            qr = qr.where((item) => [db.qh.in(item.id, changeKeys)]);
          }

          return await qr.resultAsync();
        });
      },
      orderBy: [[(data) => data.name, "asc"]],
      filter: undefined,
    });

    // this.register("품목", { ... });
    // this.register("로케이션", { ... });
  }
}

export type TAppSharedData = {
  거래처: ISharedPartner;
  // 품목: ISharedGoods;
};

export interface ISharedPartner extends ISharedDataBase<number> {
  id: number;
  name: string;
  isVendor: boolean;
  isCustomer: boolean;
  isDeleted: boolean;
}
```

매직 필드의 역할(`sd-shared-data-select.control.ts` 가 이 필드들로 동작):

- `__valueKey` — 항목의 키. select 컨트롤의 `value`(선택 결과)와 `$get(key)` 조회 키가 이 값이다. PK 가 nullable 타입이면 `item.id.notNull()` 로 non-null 화해서 넣음.
- `__searchText` — select 드롭다운의 검색 입력이 부분일치로 훑는 텍스트. 여러 컬럼을 묶으려면 쿼리헬퍼 `db.qh.concat(item.code, "|", item.name)` 로 합침(공백 분리 다중 토큰 AND 검색이 기본).
- `__isHidden` — 숨김 여부. `true` 면 검색 결과에서 가려지고(이미 선택된 값은 취소선으로 계속 표시), 보통 `isDeleted` 나 "퇴사+삭제" 같은 조건으로 넣음. 조건식이 필요하면 `db.qh.case(...).else(...)` 로 계산함(아래 "사용자" 예).

`changeKeys` 분기를 생략하지 않음. `getDataAsync(changeKeys)` 의 `changeKeys` 가 주어지면 그 키들만 다시 조회(부분 갱신)하고, 생략(`undefined`)이면 전체 로드함. `where ... db.qh.in(item.id, changeKeys)` 분기가 이 부분 갱신을 담당함. 이 분기가 없으면 변경 통지마다 전체 재조회가 됨.

`orderBy` 는 `[정렬키함수, "asc" | "desc"]` 튜플의 배열이다(여러 키 정렬 가능). 예: `centurymes` "불량유형" 은 `[[(d) => d.productionProcess ?? "기타", "asc"], [(d) => d.displayOrder ?? 9999, "asc"], [(d) => d.name, "asc"]]`.

조건이 복잡한 숨김/표시 필드와, select 결과를 후처리해 항목 형태를 바꾸는 경우는 `simplysm-ts` 의 "사용자"/"메일계정" 등록이 근거다.

```ts
this.register("사용자", {
  serviceKey: APP_MAIN_SERVICE_KEY,
  getDataAsync: async (changeKeys) => {
    return await this.#appOrm.connectAsync(async (db) => {
      let qr = db.user.select((item) => ({
        id: item.id.notNull(),
        name: item.name,
        loginId: item.loginId,
        isDeleted: item.isDeleted,

        __valueKey: item.id.notNull(),
        __searchText: item.name,
        // 퇴사(퇴사일 도래) 또는 삭제면 숨김
        __isHidden: db.qh
          .case(
            db.qh.or([
              db.qh.and([
                db.qh.isNotNull(item.leavingDate),
                db.qh.lessThenOrEqual(item.leavingDate, new DateOnly()),
              ]),
              db.qh.isTrue(item.isDeleted),
            ]),
            true as boolean,
          )
          .else(false),
      }));

      if (changeKeys) {
        qr = qr.where((item) => [db.qh.in(item.id, changeKeys)]);
      }

      return await qr.resultAsync();
    });
  },
  orderBy: [[(data) => data.name, "asc"]],
});
```

`getDataAsync` 의 반환은 `resultAsync()` 결과를 `.map(...)` 으로 한 번 더 가공해도 됨. `simplysm-ts` "메일계정" 은 `connConf` JSON 을 파싱해 `username` 필드를 만들어 넣되, `__valueKey`·`__searchText`·`__isHidden` 은 그대로 유지함.

### 부트스트랩 등록과 initialize 호출

- 앱 부트스트랩(`main.ts`)의 providers 에 base 토큰 별칭을 등록함: `{ provide: SdSharedDataProvider, useExisting: AppSharedDataProvider }`. `AbsSdDataSheet`·`AbsSdDataDetail` 가 base 토큰 `SdSharedDataProvider` 를 inject 하므로 이 별칭이 필요함(`sd-data-sheet.control.ts`, `sd-data-detail.control.ts` 의 `inject(SdSharedDataProvider)`).
- `initialize()` 는 인증 직후 한 번 호출함. `simplysm-ts` 는 `AppAuthProvider.#initializeAsync()` 안에서 `this.#appSharedData.initialize()` 를 호출함(로그인 사용자 권한이 정해진 뒤 마스터를 로드).

## 화면에서 항목을 조회하려면 (useSharedSignal)

화면 클래스 필드에 `useSharedSignal("<등록한 이름>")` 을 둠. `register` 에 쓴 이름 문자열을 그대로 넘기면 `TAppSharedData` 에서 항목 타입이 추론됨. 반환값은 `T[]` 시그널이면서 `$get(key)` 단건 조회 메서드를 가짐(`ISharedSignal`).

```ts
// 화면 클래스 안
sharedPartners = useSharedSignal("거래처");
sharedGoodsList = useSharedSignal("품목");
```

- 배열 전체: `sharedPartners()` — 정렬·로드까지 끝난 항목 배열.
- 단건: `sharedGoodsList.$get(data().goodsId)` — `__valueKey` 로 단건을 즉시 조회. 키가 `undefined` 면 `undefined` 반환.

`centurymes` `InboundRequestDetail.ts` 는 선택된 품목의 부가속성을 단건 조회로 꺼내 씀. 템플릿·로직 양쪽에서 같은 시그널을 그대로 호출함.

```html
@if (this.sharedGoodsList.$get(data().goodsId)?.paintType) {
<tr>
  <th>유효기한</th>
  <td><!-- ... --></td>
</tr>
}
```

```ts
const shelfLifeDays = this.sharedGoodsList.$get(this.data().goodsId)?.paintShelfLifeDays;
const vendorId = this.sharedGoodsList.$get(this.data().goodsId)?.defaultVendorId;
```

엑셀 업로드처럼 이름→키 역매핑이 필요할 땐 시그널 배열을 그대로 가공함. `BankAccountLogPage.ts` 는 `this.sharedPartners().groupBy((item) => item.name).toMap(...)` 로 거래처명→항목 맵을 만들어 업로드 행의 거래처명을 키로 변환함.

## 선택 입력을 만들려면 (sd-shared-data-select)

마스터에서 하나(또는 여럿)를 고르는 입력 컨트롤은 `<sd-shared-data-select>`(`SdSharedDataSelectControl`) 다. `[items]` 에 공유 시그널 배열을, `[(value)]` 에 선택 키(들)를 바인딩하고, 항목 표시 템플릿은 `<ng-template [itemOf]="...">` 로 줌. 검색창·미지정 항목·숨김 처리는 컨트롤이 매직 필드를 보고 자동 처리함.

단건 선택(시트 셀 안, `BankAccountLogPage.ts` 의 거래처 열):

```html
<sd-shared-data-select
  inset
  size="sm"
  [disabled]="!canEdit()"
  [items]="sharedPartners()"
  [(value)]="item.partnerId"
  (valueChange)="items.$mark()"
>
  <ng-template [itemOf]="sharedPartners()" let-item>{{ item.name }}</ng-template>
</sd-shared-data-select>
```

다중 선택(필터 영역, `BankAccountLogPage.ts` 의 거래처 필터). `selectMode="multi"` 면 `value` 가 키 배열이 되고, `useUndefined` 로 "미지정" 항목을 켤 수 있음.

```html
<sd-shared-data-select
  [items]="sharedPartners()"
  selectMode="multi"
  [(value)]="filter().includePartnerIds"
  (valueChange)="filter.$mark()"
  useUndefined
>
  <ng-template [itemOf]="sharedPartners()" let-item>{{ item.name }}</ng-template>
</sd-shared-data-select>
```

- 객체/배열 시그널의 내부 필드를 바꾼 직후에는 변경 알림을 발동시켜야 함 — 시트 셀이면 `items.$mark()`, 필터 객체면 `filter.$mark()`. (시그널 마킹 일반론은 [client-component.md](./client-component.md) 참조.)
- 컨트롤을 쓰는 화면 `@Component({ imports: [...] })` 에 `SdSharedDataSelectControl` 과 표시 템플릿용 `SdItemOfTemplateDirective` 를 함께 명시함.
- 트리(부모-자식) 표시가 필요하면 `[parentKeyProp]="'parentKey'"`, 표시 순서 컬럼이 있으면 `[displayOrderKeyProp]="'..."` 를 줌(컨트롤이 그 prop 으로 children 을 묶어 들여쓰기 표시). `displayOrderKeyProp` 미지정 시 `[items]` 입력 순서대로 표시됨.

## 마스터 변경을 전 클라이언트에 통지하려면 (emitAsync)

마스터를 등록·수정·삭제·복구한 화면은 변경 트랜잭션 커밋 뒤 `emitAsync("<이름>", changedIds)` 로 통지함. 그러면 그 마스터를 구독 중인 모든 접속 클라이언트의 공유 시그널이 `getDataAsync(changedIds)` 로 부분 재조회되어 갱신됨. 이 호출이 없으면 다른 화면(또는 다른 사용자)의 시그널이 옛 데이터를 유지함.

`UserPage.ts` 의 `submit`/`uploadExcel` 이 근거다. `connectAsync` 안에서 변경한 항목 키를 `changedIds` 에 모으고, **콜백 밖**(=커밋 후)에서 통지함.

```ts
override async submit(diffs: TArrayDiffs2Result<IItem>[]): Promise<boolean> {
  const changedIds: number[] = [];
  await this.#appOrm.connectAsync(async (db) => {
    for (const diff of diffs) {
      // ... 검증 ...
      const upsertId = (
        await db.user
          .where((item) => [db.qh.equal(item.id, diff.item.id)])
          .updateAsync(async () => ({ /* ... */ }), ["id"])
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

  await this.#appSharedData.emitAsync("사용자", changedIds);
  return true;
}
```

- `#appSharedData = inject(AppSharedDataProvider)` 로 주입함(hard-private `#`).
- 둘째 인자 `changedIds` 를 주면 수신측이 그 키들만 다시 조회(부분 갱신), 생략하면 전체 리로드됨. `register` 의 `getDataAsync(changeKeys)` 수신 분기와 짝을 이룸.
- `register` 하지 않은 이름을 넘기면 throw(`'<이름>'에 대한 공유데이터 정보가 없습니다.`) — 등록한 이름과 정확히 일치시킴.
- 변경 이력(`insertDataLogAsync`)·`itemPropInfo`·`getItemInfoFn` 등 목록 화면 자체의 작성법은 [client-list-detail.md](./client-data-sheet.md) 참조.

## 선택 컨트롤에서 관리·선택 모달을 띄우려면

`<sd-shared-data-select>` 옆의 버튼으로, 해당 마스터의 목록 화면을 모달로 띄워 그 자리에서 검색·선택하거나(관리) 할 수 있음. 입력은 두 가지다.

- `[modal]="{ type, title, inputs }"` — 검색(돋보기) 버튼. 선택형 모달을 엶. 컨트롤이 모달 열 때 `selectMode`(현재 컨트롤의 모드)와 `selectedItemKeys`(현재 선택 키 배열)를 inputs 에 주입하고, 모달이 닫힐 때의 결과 `result.selectedItemKeys` 첫 키(또는 multi 면 배열)로 `value` 를 갱신함.
- `[editModal]="{ type, title, inputs }"` — 편집(연필) 버튼. 관리 전용 모달을 열며 선택을 바꾸지 않음.

`centurymes` `InboundRequestDetail.ts` 의 공급사 선택이 근거다. 마스터 목록 화면(`PartnerPage`)을 그대로 선택 모달로 재사용함.

```html
<sd-shared-data-select
  [required]="true"
  [disabled]="!canEdit() || data().outsourcingVendorOutboundId != null"
  [items]="sharedVendors()"
  [(value)]="data().vendorId"
  (valueChange)="data.$mark()"
  [modal]="{
    type: PartnerPage,
    title: '공급사조회',
    inputs: { isTypeLocked: true, type: '공급사' },
  }"
>
  <ng-template [itemOf]="sharedVendors()" let-item>{{ item.name }}</ng-template>
</sd-shared-data-select>
```

- `[modal]` 로 띄울 목록 컴포넌트는 **선택 모달 계약**을 만족해야 함. `AbsSdDataSheet` 기반 목록 화면은 이를 기본 충족함: `selectMode` input 과 `selectedItemKeys` model 을 가지고, 닫힘 결과로 `{ selectedItemKeys }` 를 돌려줌(`sd-data-sheet.control.ts`). 즉 목록 화면 하나가 일반 페이지와 선택 모달 양쪽으로 재사용됨. 목록 화면의 `selectMode` 오버라이드는 [client-list-detail.md](./client-data-sheet.md) 참조.
- `inputs` 에 추가로 넘긴 값(`isTypeLocked` 등)은 컨트롤이 주입하는 `selectMode`/`selectedItemKeys` 와 병합되어 목록 화면 input 으로 전달됨.
- 모달 호출 일반론(`SdModalProvider.showAsync`)은 [client-component.md](./client-component.md) 의 '모달' 절 참조.

## 지킬 것

- 항목 추가 시 세 곳(`register` · `TAppSharedData` · 인터페이스)을 모두 갱신함. 인터페이스는 `ISharedDataBase<키타입>` 를 상속함.
- `getDataAsync` 의 select 결과에 매직 필드 `__valueKey` · `__searchText` · `__isHidden` 을 빠짐없이 넣음.
- `changeKeys` 분기(`where ... db.qh.in(item.id, changeKeys)`)를 생략하지 않음 — 없으면 변경 시 전체 재조회가 됨.
- 마스터 CRUD 후 `emitAsync("<이름>", changedIds)` 통지를 빠뜨리지 않음 — 통지가 없으면 다른 화면/클라이언트의 시그널이 옛 데이터를 유지함.
- `emitAsync`·`useSharedSignal` 의 이름 문자열은 `register` 한 이름과 정확히 일치시킴(불일치 시 throw).
- 부트스트랩 providers 에 `{ provide: SdSharedDataProvider, useExisting: AppSharedDataProvider }` 별칭을, 인증 직후 `initialize()` 호출을 둠.
