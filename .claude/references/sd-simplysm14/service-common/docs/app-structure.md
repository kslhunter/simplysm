# App Structure

## `AppStructureItem`

앱 구조 항목 유니언 타입. `children` 필드 유무로 그룹과 리프를 구분한다.

```typescript
export type AppStructureItem<TModule = unknown> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;
```

`TModule` 제네릭은 모듈 식별자 타입이다 (일반적으로 `string`).

## `AppStructureGroupItem`

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

## `AppStructureLeafItem`

말단 메뉴 항목. 실제 페이지 URL과 권한(perms)을 가진다.

```typescript
export interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms?: (use | edit)[];
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
| `perms` | `(use \| edit)[]?` | 이 항목에 부여 가능한 권한 종류 |
| `subPerms` | `AppStructureSubPermission<TModule>[]?` | 하위 권한 정의 배열 |
| `icon` | `string?` | 아이콘 식별자 |
| `url` | `string?` | 페이지 URL |
| `isNotMenu` | `boolean?` | true이면 메뉴에 표시하지 않음 |

## `AppStructureSubPermission`

리프 항목의 하위 권한 정의. 각 하위 권한도 모듈 접근 제어를 가진다.

```typescript
export interface AppStructureSubPermission<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: (use | edit)[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 하위 권한 코드 |
| `title` | `string` | 하위 권한 표시 이름 |
| `modules` | `TModule[]?` | 접근에 필요한 모듈 목록 (OR 조건) |
| `requiredModules` | `TModule[]?` | 접근에 필수인 모듈 목록 (AND 조건) |
| `perms` | `(use \| edit)[]` | 부여 가능한 권한 종류 |

## `FlatPermission`

트리를 플래트닝한 권한 결과. `getFlatPermissions()`의 반환 타입이다.

```typescript
export interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | 루트부터 현재 권한까지의 표시 이름 체인 (예: `[관리, 사용자]`) |
| `codeChain` | `string[]` | 루트부터 현재 권한까지의 코드 체인 (예: `[admin, user, use]`) |
| `modulesChain` | `TModule[][]` | 각 레벨에서 필요한 모듈 목록의 체인 |

## `isUsableModules`

단일 항목의 모듈 접근 가능 여부를 판단한다.

```typescript
export function isUsableModules<TModule>(
  modules: TModule[] | undefined,
  requiredModules: TModule[] | undefined,
  usableModules: TModule[] | undefined,
): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `modules` | `TModule[] \| undefined` | OR 조건 모듈 목록. 하나라도 `usableModules`에 포함되면 통과 |
| `requiredModules` | `TModule[] \| undefined` | AND 조건 모듈 목록. 모두 `usableModules`에 포함되어야 통과 |
| `usableModules` | `TModule[] \| undefined` | 사용자가 보유한 활성 모듈 목록 |

반환: `modules`와 `requiredModules` 조건을 모두 만족하면 `true`.

- `modules`가 undefined이거나 빈 배열이면 OR 조건은 자동 통과
- `requiredModules`가 undefined이거나 빈 배열이면 AND 조건은 자동 통과
- `usableModules`가 undefined이면 `modules`가 있을 때 `false`

## `isUsableModulesChain`

모듈 체인 전체의 접근 가능 여부를 판단한다. 트리의 각 레벨에서 모듈 조건을 모두 만족해야 한다.

```typescript
export function isUsableModulesChain<TModule>(
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
  usableModules: TModule[] | undefined,
): boolean;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `modulesChain` | `TModule[][]` | 각 레벨의 OR 조건 모듈 배열 |
| `requiredModulesChain` | `TModule[][]` | 각 레벨의 AND 조건 모듈 배열 |
| `usableModules` | `TModule[] \| undefined` | 사용자가 보유한 활성 모듈 목록 |

반환: 모든 레벨의 조건을 만족하면 `true`. 하나라도 실패하면 `false`.

## `getFlatPermissions`

앱 구조 트리를 BFS로 순회하며 모듈 조건을 필터링하여 `FlatPermission[]`으로 플래트닝한다.

```typescript
export function getFlatPermissions<TModule>(
  items: AppStructureItem<TModule>[],
  usableModules: TModule[] | undefined,
): FlatPermission<TModule>[];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `items` | `AppStructureItem<TModule>[]` | 앱 구조 트리의 최상위 항목 배열 |
| `usableModules` | `TModule[] \| undefined` | 사용자가 보유한 활성 모듈 목록. undefined이면 모듈 조건이 없는 항목만 포함 |

반환: 모듈 조건을 만족하는 모든 권한의 플랫 목록.

처리 로직:
1. BFS로 트리를 순회하며 각 레벨의 `modules`(OR)와 `requiredModules`(AND) 조건을 체크
2. 조건 미충족 항목은 하위 트리 전체를 건너뜀
3. `AppStructureLeafItem`의 `perms`를 `codeChain`에 추가하여 `FlatPermission` 생성
4. `subPerms`도 개별 모듈 조건을 체크하여 `FlatPermission`으로 변환
