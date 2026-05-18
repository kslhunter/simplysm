# @simplysm/angular — app-structure

서버의 `AppStructureService`에서 받은 메뉴/권한 트리(`AppStructureItem<TModule>[]`)를 클라이언트 측에서 사용 가능 형태로 변환.

## `SdAppStructureProvider<TModule>`

```typescript
const sas = inject<SdAppStructureProvider<MyModule>>(SdAppStructureProvider);
await sas.initialize("main");                // 서비스 키 → AppStructureService.getItems()
sas.usableModules.set(myModules);            // 활성 모듈
sas.permRecord.set({ "order.list.use": true });

sas.usableMenus();        // Signal<SdMenu[]>          (트리)
sas.usableFlatMenus();    // Signal<SdFlatMenu[]>      (flat)
sas.getTitleByFullCode("order.list");
sas.getPermsByFullCode(["order.list"], ["use","edit"]);
sas.getPermissionsByStructure(items, codeChain);
```

내부적으로 `SdAppStructureUtils.getMenus/getFlatMenus/getPermissions/...` 위임.

## `injectPermsSignal<K>(viewCodes, keys)`

```typescript
const perms = injectPermsSignal(["order.list"], ["use", "edit"] as const);
perms(); // 갖고 있는 권한만 필터된 배열
```

## 타입

```typescript
interface SdMenu      { title; codeChain: string[]; url?; icon?; children? }
interface SdFlatMenu  { titleChain; codeChain; modulesChain: TModule[][] }
interface SdPermission { title; codeChain; modules; perms: ("use"|"edit")[]?; children? }
```

## `SdAppStructureUtils` 정적 메서드

- `getMenus(items, codeChain, usableModules, permRecord)` — `isNotMenu` 제외, 모듈 활성·`.use` 권한 통과한 항목.
- `getFlatMenus(items, usableModules, permRecord)` — 평탄화 + 부모 modules 누적 검사.
- `getPermissions(items, codeChain, usableModules)` — 권한 트리 (`SdPermissionTable` 입력용).
- `getFlatPermissions(items, usableModules)` — `@simplysm/service-common` 재노출.
- `getTitleByFullCode`, `getItemChainByFullCode`, `getPermsByFullCode`.

## 주의

- `permRecord` 키는 `"<code>.<perm>"` (예: `"order.list.use"`).
- 그룹 메뉴는 자식 중 하나라도 표시 가능해야 노출.
- Leaf 가 `perms`를 가지면 `.use` 권한 필수, `perms`가 없거나 권한 자체가 없으면 통과.
