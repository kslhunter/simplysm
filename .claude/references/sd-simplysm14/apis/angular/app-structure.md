# @simplysm/angular — app-structure

서버 `AppStructureService` 에서 받은 메뉴·권한 트리(`AppStructureItem<TModule>[]`)를 클라이언트에서 사용 가능 형태로 변환·캐시.

## SdAppStructureProvider<TModule> (root)

```ts
usableModules: WritableSignal<TModule[]|undefined>;
permRecord: WritableSignal<Record<string, boolean>|undefined>;
items: WritableSignal<AppStructureItem<TModule>[]>;

usableMenus: Signal<SdMenu[]>;                // items × modules × perms 필터된 트리 메뉴
usableFlatMenus: Signal<SdFlatMenu<TModule>[]>;  // 평탄화된 메뉴 리스트 (검색 등)

initialize(serviceKey: string): Promise<void>;
getPermissionsByStructure(items, codeChain?): SdPermission<TModule>[];
getTitleByFullCode(fullCode: string): string;       // 부모 chain 포함 타이틀("[A > B] C")
getItemChainByFullCode(fullCode: string): AppStructureItem<TModule>[];
getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[];
```

- `initialize` — `SdServiceClientFactoryProvider.get(serviceKey)` 에서 `AppStructureService.getItems()` 호출, `clientName` (`SdAngularConfigProvider`) 키로 트리 적재.
- `usableModules` — 활성 모듈 식별자 배열. 메뉴/권한 필터링에 사용. 미세팅(`undefined`) 이면 모듈 체크 통과(전체 허용).
- `permRecord` — `<fullCode>.<permKey>` (예: `sales.invoice.use`) → boolean. `undefined` 면 권한 체크 통과.
- `usableMenus` — 그룹 메뉴는 표시 가능한 leaf 자식이 있어야 포함. leaf 는 `<code>.use` 권한 검사.
- `usableFlatMenus` — leaf 만 평탄화. modulesChain 정보 포함.
- `getPermsByFullCode` — 해당 화면들에 대해 사용자가 가진 권한키들 추출(`perms` 자체가 정의 안된 화면은 모든 permKey 통과).

## SdAppStructureUtils (abstract static class)

```ts
static getTitleByFullCode/getPermsByFullCode/getItemChainByFullCode
static getMenus(items, codeChain, usableModules, permRecord): SdMenu[]
static getFlatMenus(items, usableModules, permRecord): SdFlatMenu<TModule>[]
static getPermissions(items, codeChain, usableModules): SdPermission<TModule>[]
static getFlatPermissions(items, usableModules)        // service-common 의 동명 함수 위임
```

- 프로바이더가 내부적으로 호출. 트리 변환 로직 직접 쓰고 싶으면 호출 가능.

## injectPermsSignal

```ts
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

- 컴포넌트/페이지에서 자기 화면 코드들과 검사할 권한키 배열을 주면, 현재 사용자가 가진 키만 담은 signal 반환. 버튼 enable 조건 등에 사용.

```ts
readonly perms = injectPermsSignal(["sales.invoice"], ["use", "edit"]);
// 템플릿: @if (perms().includes("edit")) { <sd-button>편집</sd-button> }
```

## SdPermissionTable — `<sd-permission-table>`

```ts
class SdPermissionTable<TModule>
value = model<Record<string, boolean>>({});      // permRecord 형태(key: <fullCode>.<permKey>)
items = input<SdPermission<TModule>[]>([]);
disabled = input(false);
```

- 권한 트리를 표 형태로 표시·편집. `value` 양방향. 관리자 권한 설정 화면용.

## 타입

```ts
interface SdMenu {
  title: string; codeChain: string[]; url?: string; icon?: string; children?: SdMenu[];
}
interface SdFlatMenu<TModule = unknown> {
  titleChain: string[]; codeChain: string[]; modulesChain: TModule[][];
}
interface SdPermission<TModule = unknown> {
  title: string; codeChain: string[]; modules: TModule[]|undefined;
  perms: ("use"|"edit")[]|undefined;
  children: SdPermission<TModule>[]|undefined;
}
```

- `SdMenu` — `url` 또는 `children` 중 하나. 라우터 링크 분기는 `getMenuRouterLinkOption` 이 담당 ([routing.md](./routing.md)).
- `SdFlatMenu.modulesChain` — 조상부터 자신까지 누적된 modules 배열 묶음. 모듈 활성 여부 검사 시 사용.
- `SdPermission.perms` — 해당 화면이 정의한 권한 키들. undefined 면 권한 개념 없음(모두 허용).

## 부트스트랩 순서

```ts
const sdAppStructure = inject(SdAppStructureProvider);
sdAppStructure.usableModules.set(myActiveModules);
sdAppStructure.permRecord.set(myPermRecord);
await sdAppStructure.initialize("main");   // serviceKey = SdServiceClientFactoryProvider 의 등록 key
```
