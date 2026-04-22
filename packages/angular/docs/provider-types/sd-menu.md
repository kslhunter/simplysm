# `SdMenu`

메뉴 트리 노드.

```typescript
interface SdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: SdMenu[];
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 제목 |
| `codeChain` | `string[]` | 코드 체인 (루트부터 현재까지) |
| `url` | `string \| undefined` | 외부 URL |
| `icon` | `string \| undefined` | 아이콘 |
| `children` | `SdMenu[] \| undefined` | 하위 메뉴 |

## Related Types

### `SdFlatMenu`

플랫 메뉴 항목 (리프만).

```typescript
interface SdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | 타이틀 체인 |
| `codeChain` | `string[]` | 코드 체인 |
| `modulesChain` | `TModule[][]` | 모듈 체인 |

### `SdPermission`

권한 트리 노드.

```typescript
interface SdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: SdPermission<TModule>[] | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 권한 제목 |
| `codeChain` | `string[]` | 코드 체인 |
| `modules` | `TModule[] \| undefined` | 모듈 제한 |
| `perms` | `("use" \| "edit")[] \| undefined` | 권한 목록 |
| `children` | `SdPermission<TModule>[] \| undefined` | 하위 권한 |
