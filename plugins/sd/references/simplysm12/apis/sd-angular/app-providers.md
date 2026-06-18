# @simplysm/sd-angular — app providers (앱 구조·권한·공유데이터·설정·테마·스토리지)

앱 전역 상태/구성 providers. 메뉴·권한 트리, 서버 공유데이터 캐시, 사용자/시스템 설정 저장, 테마 전환. 대부분 `providedIn: "root"`, 일부는 앱에서 abstract 를 상속해 구현.

## SdAngularConfigProvider (root)
`provideSdAngular` 가 채우는 설정 보관소.
- **clientName: string** — 클라이언트명(스토리지 키 프리픽스·서비스명).
- **defaultTheme: TSdTheme** / **defaultDark: boolean** — 기본 테마/다크.

## SdThemeProvider (root)
- **theme: SdWritableSignal<TSdTheme>** — `"compact" | "mobile" | "kiosk"`. 변경 시 body className(`sd-theme-{theme}`) 갱신 + localStorage 저장.
- **dark: SdWritableSignal<boolean>** — 다크모드. body 에 `sd-theme-dark` 토글.
- **TSdTheme = "compact" | "mobile" | "kiosk"** — compact(데스크톱 조밀)/mobile/kiosk.

## SdLocalStorageProvider<T> (root)
clientName 프리픽스로 localStorage 에 JsonConvert 직렬화 저장.
- **set<K>(key, value: T[K])** / **get<K>(key): T[K] | undefined** / **remove(key)**.
- **injectSdLocalStorage<T>(): SdLocalStorageProvider<T>** — 타입 지정 주입 단축.

## SdSystemConfigProvider<T> (root)
시스템/사용자 설정 영속화. 기본은 localStorage, `fn` 지정 시 서버 위임.
- **fn?: { set(key, data): Promise|void; get(key): PromiseLike }** — 지정 시 서버 저장/조회 사용.
- **setAsync<K>(key, data)** / **getAsync(key)** — fn 있으면 fn, 없으면 localStorage.

## SdSystemLogProvider (root)
- **writeFn?: (severity: "error"|"warn"|"log", ...data) => Promise|void** — 외부 로그 위임 함수.
- **writeAsync(severity, ...data)** — `console[severity]` 출력 후 writeFn 호출(실패해도 console.error 만). 전역 에러 핸들러가 사용.

## SdAppStructureProvider<TModule> (root, abstract)
메뉴/권한 트리 정의·조회의 핵심. 앱에서 상속하여 `items`/`usableModules`/`permRecord` 구현.
- **abstract items: TSdAppStructureItem<TModule>[]** — 화면 구조 트리(group/leaf).
- **abstract usableModules: Signal<TModule[] | undefined>** — 활성 모듈 목록(라이선스 등).
- **abstract permRecord: Signal<Record<string, boolean> | undefined>** — `"<fullCode>.<perm>" → boolean` 권한 맵.
- **usableMenus: Signal<ISdMenu[]>** — 모듈·권한 필터링된 메뉴 트리(computed).
- **usableFlatMenus: Signal<ISdFlatMenu[]>** — 평면 메뉴 목록(computed).
- **getPermissionsByStructure(items, codeChain?=[]): ISdPermission[]** — 권한표용 권한 트리.
- **getTitleByFullCode(fullCode): string** — `[부모 > 부모] 현재` 형태 제목.
- **getItemChainByFullCode(fullCode): TSdAppStructureItem[]** — code 체인을 따라간 항목 배열.
- **getPermsByFullCode<K>(fullCodes: string[], permKeys: K[]): K[]** — 해당 권한이 켜져있거나 권한정의 자체가 없으면 허용으로 포함.

### `usePermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>`
SdAppStructureProvider 를 주입해 `getPermsByFullCode` 결과를 computed Signal 로 반환(화면별 보유 권한 키).

### `SdAppStructureUtils` (abstract, static 메서드 모음)
순수 함수로 트리 가공. getTitleByFullCode/getItemChainByFullCode/getPermsByFullCode/getMenus/getFlatMenus/getPermissions/getFlatPermissions. 모듈 규칙: `modules`=OR(하나라도 활성), `requiredModules`=AND(모두 활성). leaf 의 `perms`(`("use"|"edit")[]`) 가 있으면 `.use` 권한 필요, `isNotMenu` 면 메뉴 제외.

### 구조 타입
- **TSdAppStructureItem<TModule>** = group(`{ code; title; modules?; requiredModules?; icon?; children }`) | leaf(`{ code; title; modules?; requiredModules?; perms?: ("use"|"edit")[]; subPerms?; icon?; isNotMenu? }`).
- **ISdMenu** `{ title; codeChain; icon; modules; children }`, **ISdFlatMenu** `{ titleChain; codeChain; modulesChain }`.
- **ISdPermission** `{ title; codeChain; modules; perms: ("use"|"edit")[]|undefined; children }`, **ISdFlatPermission** `{ titleChain; codeChain; modulesChain }`.

## SdSharedDataProvider<T> (root, abstract)
서버 공유 마스터데이터를 signal 캐시로 보유하고 변경 이벤트로 동기화. 앱에서 상속해 `initialize()` 구현하고 register 호출.
- **abstract initialize(): void** — 앱 기동 시 register 들 등록.
- **register<K>(name, getter: ISharedDataInfo<T[K]>)** — 데이터 소스 등록(이미 signal 있으면 getter 교체 후 재로딩).
- **getSignal<K>(name): ISharedSignal<T[K]>** — 데이터 signal 반환(최초 호출 시 변경 리스너 등록+로딩). `ISharedSignal` = `Signal<T[]> & { $get(key): T | undefined }`(키 조회).
- **emitAsync<K>(name, changeKeys?)** — 다른 클라이언트에 변경 이벤트 발행(같은 name·filter 대상).
- **wait()** — loadingCount<=0 까지 대기(화면 초기화에서 데이터 준비 보장).
- **ISharedDataInfo<T>** `{ serviceKey; getDataAsync(changeKeys?) => Promise<T[]>; orderBy: [(d)=>any, "asc"|"desc"][]; filter? }`.
- **ISharedDataBase<VK>** `{ __valueKey: VK; __searchText: string; __isHidden: boolean; __parentKey? }` — 공유데이터 항목이 구현해야 할 기반 필드.
- **SdSharedDataChangeEvent** — 변경 이벤트 리스너 베이스(`{ name; filter }`, payload=변경 키 배열|undefined).
