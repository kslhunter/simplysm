# `SdAppStructureProvider`

> **읽어야 하는 상황**: 앱 구조(메뉴 트리, 권한 매트릭스)를 관리하거나 조회할 때.

앱 구조(메뉴/권한) 관리 프로바이더. 서브클래스 없이 직접 사용한다.

```typescript
@Injectable({ providedIn: "root" })
class SdAppStructureProvider<TModule = unknown> {
  readonly usableModules = signal<TModule[] | undefined>(undefined);
  readonly permRecord = signal<Record<string, boolean> | undefined>(undefined);
  readonly items = signal<AppStructureItem<TModule>[]>([]);

  usableMenus: Signal<SdMenu[]>;
  usableFlatMenus: Signal<SdFlatMenu<TModule>[]>;

  async initialize(serviceKey: string): Promise<void>;
  getPermissionsByStructure(items, codeChain?): SdPermission<TModule>[];
  getTitleByFullCode(fullCode: string): string;
  getItemChainByFullCode(fullCode: string): AppStructureItem<TModule>[];
  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[];
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `usableModules` | property | `WritableSignal<TModule[] \| undefined>` | 사용 가능한 모듈 목록. 외부에서 `set()`/`update()`로 설정 |
| `permRecord` | property | `WritableSignal<Record<string, boolean> \| undefined>` | 권한 레코드. 외부에서 `set()`/`update()`로 설정 |
| `items` | property | `WritableSignal<AppStructureItem<TModule>[]>` | 앱 구조 항목 배열 (`initialize()`로 초기화) |
| `usableMenus` | computed | `Signal<SdMenu[]>` | 사용 가능한 메뉴 트리 |
| `usableFlatMenus` | computed | `Signal<SdFlatMenu<TModule>[]>` | 사용 가능한 플랫 메뉴 |
| `initialize(serviceKey)` | method | `(string) => Promise<void>` | 서비스에서 앱 구조 로드 |
| `getTitleByFullCode(fullCode)` | method | `(string) => string` | fullCode로 타이틀 조회 |
| `getItemChainByFullCode(fullCode)` | method | `(string) => AppStructureItem<TModule>[]` | fullCode로 항목 체인 조회 |
| `getPermsByFullCode(fullCodes, permKeys)` | method | `(string[], K[]) => K[]` | fullCode 배열에서 보유 권한 키 반환 |

## Related Types

### `injectPermsSignal`

앱 구조(`SdAppStructureProvider`)에서 지정된 뷰 코드와 키 배열에 대한 권한을 조회하는 signal. 생성자/필드 이니셜라이저에서 호출한다.

```typescript
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewCodes` | `string[]` | 조회할 뷰 코드 배열 (예: `["sales.customer"]`) |
| `keys` | `K[]` | 권한 키 배열 (예: `["use", "edit"]`) |

반환: 현재 사용자가 보유한 권한 키 배열의 signal

#### 사용 패턴

```typescript
protected readonly perms = injectPermsSignal(["sales.customer"], ["use", "edit"]);
protected readonly canEdit = computed(() => this.perms().includes("edit"));
```

```html
@if (!perms().includes("use")) {
  <sd-note theme="warning">이 화면의 사용 권한이 없습니다.<$sd-note>
}
```

### `SdAppStructureUtils`

앱 구조 유틸리티. 정적 메서드로 메뉴/권한 조회 로직을 제공한다.

```typescript
abstract class SdAppStructureUtils {
  static getTitleByFullCode<TModule>(items, fullCode): string;
  static getPermsByFullCode<TModule, K extends string>(items, fullCodes, permKeys, permRecord): K[];
  static getItemChainByFullCode<TModule>(items, fullCode): AppStructureItem<TModule>[];
  static getMenus<TModule>(items, codeChain, usableModules, permRecord): SdMenu[];
  static getFlatMenus<TModule>(items, usableModules, permRecord): SdFlatMenu<TModule>[];
  static getPermissions<TModule>(items, codeChain, usableModules): SdPermission<TModule>[];
  static getFlatPermissions<TModule>(items, usableModules): FlatPermission<TModule>[];
}
```
