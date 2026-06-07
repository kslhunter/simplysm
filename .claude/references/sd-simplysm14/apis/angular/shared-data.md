# @simplysm/angular — 공유 마스터 데이터

고객사·품목 등 자주 참조하는 마스터 데이터를 한 번 등록해 어느 화면에서든 공유 시그널로 쓰고, 그 데이터를 선택하는 드롭다운/버튼/리스트 컨트롤을 제공하는 군. 등록·항목 추가 절차는 `client-shared-data.md` 참조.

## SdSharedDataProvider<T>

마스터 데이터를 이름별로 등록·로드·공유하는 추상 프로바이더. 앱에서 상속해 `initialize()` 안에서 `register`. `@Injectable()`.

- `loadingCount: WritableSignal<number>` — 로딩 중 항목 수. 0 보다 크면 로드 진행 중(`sd-base-container` 가 대기).
- `abstract initialize(): void` — 앱이 override 해 `register` 들을 호출.
- `register<K>(name, info: SharedDataInfo): void` — 이름으로 데이터 항목 등록. 재호출 시 기존 리스너/세대 갱신(이전 이벤트 무시).
- `getHandle<K>(name): SharedDataHandle<T[K]>` — 핸들 조회. 최초 조회 시 lazy 로드 + 변경 이벤트 리스너 등록. 미등록 이름이면 throw.
- `emitAsync<K>(name, changeKeys?): Promise<void>` — 데이터 변경을 다른 클라이언트/탭에 알림(`changeKeys` 지정 시 부분 갱신, 미지정 시 전체 리로드).
- `wait(): Promise<void>` — `loadingCount <= 0` 까지 대기.

`SdSharedDataChangeEvent` — `defineEvent` 로 정의된 공유 데이터 변경 이벤트(서비스 서버 경유 브로드캐스트).

## 타입 (shared-data.provider)

- `SharedDataBase<TKey>` — 모든 공유 항목이 상속할 매직 필드: `__valueKey: TKey`(키), `__searchText: string`(검색 텍스트), `__isHidden: boolean`(숨김 여부), `__parentKey?: TKey`(트리 부모 키).
- `SharedDataInfo<T>` — `register` 옵션. `serviceKey: string`(연결 키), `getter: (changeKeys?) => Promise<T[]>`(데이터 로더, `changeKeys` 주어지면 그 키만 재조회), `filter?: unknown`(이벤트 필터), `orderBy?: (item) => 정렬키`(정렬).
- `SharedDataHandle<T>` — `items: Signal<T[]>`(항목 시그널), `get(key): T | undefined`(키로 단건 조회).

```ts
override initialize() {
  this.register("고객사", {
    serviceKey: "MAIN",
    getter: async (changeKeys) => this._appOrm.connectAsync((db) => { /* ... */ }),
    orderBy: (item) => item.code,
  });
}
```

## SdSharedDataSelect

공유 데이터를 드롭다운으로 선택하는 컨트롤. selector `sd-shared-data-select`. 검색·트리(`__parentKey`)·관리/선택 모달 지원.

- `value: model<단일|배열>` — 선택된 키(들). `selectMode` 에 따라 단건/배열.
- `items: input.required<TItem[]>` — 공유 데이터 항목 배열(보통 `sharedX.items()`).
- `selectMode: "single"|"multi"` — 선택 모드(기본 `"single"`). 다중 선택이면 `"multi"`.
- `required`/`disabled`/`useUndefined`/`inset`/`inline: boolean` — 필수/비활성/미지정 항목 노출/inset 스타일/인라인.
- `size: "sm"|"lg"` — 컨트롤 크기.
- `filterFn: (item, index, ...params) => boolean` + `filterFnParams: any[]` — 표시 항목 필터(추가 파라미터 주입).
- `modal: SdSelectModalInfo<TModal>` — 관리·선택 모달. 열릴 때 `selectMode`/현재 선택키가 주입되고 닫힘 결과로 선택 갱신.
- `editModal: SdModalInfo<SdModalContentDef<boolean>>` — 관리 전용 모달(선택을 바꾸지 않음).
- `getIsHiddenFn`/`getSearchTextFn: (item, index) => ...` — 숨김 판정·검색 텍스트(기본 `__isHidden`/`__searchText`).
- `displayOrderByFn: (item) => 정렬키` — 표시 정렬.
- 컨텐츠: `<ng-template [itemOf]="...">` 로 항목 렌더, `#undefinedTpl` 로 미지정 항목 표시.

```html
<sd-shared-data-select [items]="sharedCustomers.items()" [(value)]="data().customerId" [required]="true">
  <ng-template [itemOf]="sharedCustomers.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select>
```

## SdSharedDataSelectButton

공유 데이터를 모달로만 선택하는 버튼형 컨트롤. selector `sd-shared-data-select-button`.

- `value: model<단일|배열>` — 선택 키(들).
- `items: input<TItem[]>` — 항목 배열.
- `modal: input.required<SdSelectModalInfo<TModal>>` — 선택 모달(필수).
- `selectMode: "single"|"multi"` — 선택 모드(기본 single).
- `disabled`/`required`/`inset: boolean`, `size: "sm"|"lg"` — 상태/크기.

## SdSharedDataSelectList

좌측 마스터 목록형 선택 컨트롤(항목 객체를 모델로). selector `sd-shared-data-select-list`. 공유데이터+detail 합성 화면의 좌측에 사용.

- `selectedItem: model<TItem>` — 선택된 **항목 객체**(키가 아니라 객체).
- `items: input.required<TItem[]>` — 항목 배열.
- `canChangeFn: (item) => boolean | Promise<boolean>` — 선택 변경 허용 가드.
- `selectedIcon: string` — 선택 표시 아이콘.
- `useUndefined: boolean` — 미지정 항목 노출.
- `filterFn: (item, index) => boolean` — 표시 필터.
- `modal: SdSelectModalInfo<TModal>` — 관리·선택 모달(목록 화면 재사용).
- `header: string` — 목록 헤더 라벨.
- `pageItemCount: number` — 페이지당 항목 수.

```html
<sd-shared-data-select-list [items]="sharedRoles.items()" [(selectedItem)]="selectedRole"
  [header]="'역할'" [modal]="{ type: RoleList, title: '역할', inputs: {} }">
  <ng-template [itemOf]="sharedRoles.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select-list>
```

## matchesSearchText

공백 분리 AND 검색 일치 판정 유틸(선택 컨트롤이 내부 사용).

- `matchesSearchText(itemText: string, searchQuery: string | undefined): boolean` — `searchQuery` 를 공백으로 나눈 모든 단어가(대소문자 무시) `itemText` 에 포함되면 true. 검색어 없으면 항상 true.
