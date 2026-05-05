# `AppStructureItem`

> **읽어야 하는 상황**: 앱 메뉴 트리와 권한 구조를 정의할 때. 권한 플래트닝은 [`getFlatPermissions`](./get-flat-permissions.md), 모듈 접근 판단은 [`isUsableModules`](./is-usable-modules.md) 참조.

앱 구조 항목 유니언 타입. `children` 필드 유무로 그룹(`AppStructureGroupItem`)과 리프(`AppStructureLeafItem`)를 구분한다.

```typescript
export type AppStructureItem<TModule = unknown> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;
```

`TModule` 제네릭은 모듈 식별자 타입이다 (일반적으로 `string`).

## Related Types

### `AppStructureGroupItem`

자식을 가진 그룹 메뉴 항목. `children` 필드로 하위 항목을 재귀적으로 포함한다.

```typescript
export interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  icon?: string;
  children: AppStructureItem<TModule>[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 항목 코드 (권한 코드 체인에 사용) |
| `title` | `string` | 표시 이름 |
| `modules` | `TModule[]?` | 접근에 필요한 모듈 목록 (OR 조건: 하나라도 있으면 접근 가능) |
| `requiredModules` | `TModule[]?` | 접근에 필수인 모듈 목록 (AND 조건: 모두 있어야 접근 가능) |
| `icon` | `string?` | 아이콘 식별자 |
| `children` | `AppStructureItem<TModule>[]` | 하위 메뉴 항목 배열 |

### `AppStructureLeafItem`

말단 메뉴 항목. 실제 페이지 URL과 권한(`perms`)을 가진다.

```typescript
export interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPermission<TModule>[];
  icon?: string;
  url?: string;
  isNotMenu?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 항목 코드 |
| `title` | `string` | 표시 이름 |
| `modules` | `TModule[]?` | 접근에 필요한 모듈 목록 (OR 조건) |
| `requiredModules` | `TModule[]?` | 접근에 필수인 모듈 목록 (AND 조건) |
| `perms` | `("use" \| "edit")[]?` | 이 항목에 부여 가능한 권한 종류 |
| `subPerms` | `AppStructureSubPermission<TModule>[]?` | 하위 권한 정의 배열 |
| `icon` | `string?` | 아이콘 식별자 |
| `url` | `string?` | 페이지 URL |
| `isNotMenu` | `boolean?` | `true`이면 메뉴에 표시하지 않음 |

### `AppStructureSubPermission`

리프 항목의 하위 권한 정의. 각 하위 권한도 모듈 접근 제어를 가진다.

```typescript
export interface AppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 하위 권한 코드 |
| `title` | `string` | 하위 권한 표시 이름 |
| `modules` | `TModule[]?` | 접근에 필요한 모듈 목록 (OR 조건) |
| `requiredModules` | `TModule[]?` | 접근에 필수인 모듈 목록 (AND 조건) |
| `perms` | `("use" \| "edit")[]` | 부여 가능한 권한 종류 |

### `FlatPermission`

트리를 플래트닝한 권한 결과. [`getFlatPermissions`](./get-flat-permissions.md)의 반환 타입이다.

```typescript
export interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | 루트부터 현재 권한까지의 표시 이름 체인 (예: `["관리", "사용자"]`) |
| `codeChain` | `string[]` | 루트부터 현재 권한까지의 코드 체인 (예: `["admin", "user", "use"]`) |
| `modulesChain` | `TModule[][]` | 각 레벨에서 필요한 모듈 목록의 체인 |
