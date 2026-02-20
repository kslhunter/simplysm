# createAppStructure 권한 유틸리티 추가 + 타입 레이어 정리

## 배경

`createAppStructure`는 Angular `SdAppStructureProvider`에서 마이그레이션되었으나, 권한 관련 기능이 누락됨:
- `getPermissions()` — 권한 트리 (PermissionTable 연결)
- `getFlatPermissions()` — 전체 권한 코드 플랫 목록

또한 구조적 문제:
- `createAppStructure`(상위)가 `SidebarMenuItem`(하위 컴포넌트 타입)을 import — 레이어 역전
- `permRecord`가 단순 pass-through로 output에 불필요하게 존재

## 변경 요약

### 1. 새 타입 (`createAppStructure.ts`에 정의)

```typescript
// 메뉴 (SidebarMenuItem 대체)
export interface AppMenu {
  title: string;
  href?: string;
  icon?: Component<IconProps>;
  children?: AppMenu[];
}

// 권한 트리 (PermissionItem 대체)
export interface AppPerm<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: AppPerm<TModule>[];
}

// 권한 플랫 목록 (신규)
export interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;              // "/home/base/user/use"
  modulesChain: TModule[][];
}
```

### 2. AppStructure 반환값 변경

```typescript
export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  routes: AppRoute[];
  usableMenus: Accessor<AppMenu[]>;                       // 타입 변경: SidebarMenuItem[] → AppMenu[]
  usableFlatMenus: Accessor<AppFlatMenu[]>;                // 기존 유지
  usablePerms: Accessor<AppPerm<TModule>[]>;               // 신규
  usableFlatPerms: Accessor<AppFlatPerm<TModule>[]>;       // 신규
  usablePermRecord: Accessor<Record<string, boolean>>;     // 신규 (모듈 필터)
  getTitleChainByHref(href: string): string[];             // 기존 유지
  // permRecord 제거
}
```

### 3. 컴포넌트 타입 교체

| 파일 | 제거 | 사용 |
|------|------|------|
| `SidebarMenu.tsx` | `SidebarMenuItem` interface 제거 | `AppMenu` import하여 사용 |
| `Sidebar.tsx` | `SidebarMenuItem` re-export 제거 | `AppMenu` re-export |
| `PermissionTable.tsx` | `PermissionItem` interface 제거 | `AppPerm` import하여 사용 |

### 4. 내부 헬퍼 추가 (`createAppStructure.ts`)

Angular `SdAppStructureUtils`에서 마이그레이션:

```typescript
// AppStructureItem[] → AppPerm[] 변환 (모듈 필터)
function buildPerms<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
): AppPerm<TModule>[]

// AppStructureItem[] → AppFlatPerm[] 변환 (모듈 필터)
function collectFlatPerms<TModule>(
  items: AppStructureItem<TModule>[],
  usableModules: TModule[] | undefined,
): AppFlatPerm<TModule>[]

// permRecord에서 모듈 유효한 키만 필터
function filterPermRecord<TModule>(
  permRecord: Record<string, boolean>,
  flatPerms: AppFlatPerm<TModule>[],
): Record<string, boolean>
```

### 5. index.ts export 변경

```typescript
// createAppStructure exports에 추가
export type { AppMenu, AppPerm, AppFlatPerm } from "./helpers/createAppStructure";

// Sidebar re-export 변경 (SidebarMenuItem → AppMenu)
// PermissionTable: PermissionItem 제거됨, AppPerm 사용
```

### 6. PermissionTable 유틸리티 함수 시그니처 변경

```typescript
// PermissionItem → AppPerm
export function collectAllPerms<TModule>(items: AppPerm<TModule>[]): string[];
export function filterByModules<TModule>(items: AppPerm<TModule>[], modules: TModule[] | undefined): AppPerm<TModule>[];
export function changePermCheck<TModule>(value: Record<string, boolean>, item: AppPerm<TModule>, perm: string, checked: boolean): Record<string, boolean>;
```

## 영향 범위

### 수정 파일

| 파일 | 변경 |
|------|------|
| `packages/solid/src/helpers/createAppStructure.ts` | AppMenu/AppPerm/AppFlatPerm 타입 정의, 빌드 함수 추가, AppStructure 반환값 변경 |
| `packages/solid/src/components/layout/sidebar/SidebarMenu.tsx` | SidebarMenuItem → AppMenu |
| `packages/solid/src/components/layout/sidebar/Sidebar.tsx` | re-export 변경 |
| `packages/solid/src/components/data/permission-table/PermissionTable.tsx` | PermissionItem → AppPerm |
| `packages/solid/src/index.ts` | AppMenu, AppPerm, AppFlatPerm export 추가 |

### 테스트/데모 수정

| 파일 | 변경 |
|------|------|
| `packages/solid/tests/components/layout/sidebar/SidebarMenu.spec.tsx` | SidebarMenuItem → AppMenu |
| `packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx` | PermissionItem → AppPerm |
| `packages/solid-demo/src/pages/layout/TopbarPage.tsx` | SidebarMenuItem → AppMenu |
| `packages/solid-demo/src/pages/layout/SidebarPage.tsx` | SidebarMenuItem → AppMenu |
| `packages/solid-demo/src/pages/mobile/MobileLayoutDemoPage.tsx` | SidebarMenuItem → AppMenu |
| `packages/solid-demo/src/pages/data/PermissionTablePage.tsx` | PermissionItem → AppPerm |

## Breaking Changes

- `SidebarMenuItem` 타입 제거 → `AppMenu` 사용
- `PermissionItem` 타입 제거 → `AppPerm` 사용
- `AppStructure.permRecord` 제거 → `usablePermRecord` 사용
- `SidebarMenuProps.menus` 타입: `SidebarMenuItem[]` → `AppMenu[]`
- `PermissionTableProps.items` 타입: `PermissionItem[]` → `AppPerm[]`
