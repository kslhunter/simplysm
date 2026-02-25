# createAppStructure: allRoutes + allFlatPerms 리팩터링

## 배경

`createAppStructure`의 `usableRoutes`는 `createMemo` 기반 reactive signal인데,
`@solidjs/router`의 `<Route>`는 static configuration 컴포넌트라 DOM 노드를 생성하지 않는다.
`usableRoutes()`를 `<For>`나 `.map()`으로 동적 생성하면, 인증 상태 변경 시
`reconcileArrays`가 존재하지 않는 DOM 노드의 `.remove()`를 호출하여 crash 발생.

추가로 기존 `flatPerms.modulesChain`은 `requiredModules`를 수집하지 않아 불완전.

## 변경 사항

### 1. `usableRoutes` 제거

- `<Route>` 용도로 사용하면 crash 발생하는 깨진 API
- 접근 가능한 페이지 목록은 `usableMenus`가 이미 제공

### 2. `allRoutes` 추가 (static, non-reactive)

`flatPerms`처럼 static 배열로, 모든 route를 permission/module 필터링 없이 제공.
각 route에 perm/module 정보를 포함해서 consumer가 route guard를 만들 수 있도록.

```typescript
export interface AppRoute<TModule = string> {
  path: string;
  component: Component;
  permCode?: string;                 // "/home/user/use" (perms에 "use" 포함 시)
  modulesChain: TModule[][];         // 계층별 modules (any-match 체크용)
  requiredModulesChain: TModule[][]; // 계층별 requiredModules (all-match 체크용)
}
```

### 3. `flatPerms` → `allFlatPerms` 이름 변경

`allRoutes`와 네이밍 일관성 확보. `requiredModulesChain` 필드도 추가.

```typescript
export interface AppFlatPerm<TModule = string> {
  titleChain: string[];
  code: string;
  modulesChain: TModule[][];
  requiredModulesChain: TModule[][];  // NEW
}
```

### 4. `checkRouteAccess` 헬퍼 메서드 추가

`AppStructure`에 메서드로 추가. `permRecord`와 `usableModules`를 이미 알고 있으므로
consumer는 route만 넘기면 됨.

```typescript
export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  allRoutes: AppRoute<TModule>[];
  allFlatPerms: AppFlatPerm<TModule>[];
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  perms: InferPerms<TItems>;
  checkRouteAccess(route: AppRoute<TModule>): boolean;
  getTitleChainByHref(href: string): string[];
}
```

`checkRouteAccess` 내부 로직:
- `modulesChain` 각 level: 해당 modules 중 하나라도 `usableModules`에 있는지 (.some)
- `requiredModulesChain` 각 level: 해당 modules 전부 `usableModules`에 있는지 (.every)
- `permCode`: `permRecord`에서 해당 key가 true인지

### 5. Consumer 사용 예시

```tsx
const appStructure = createAppStructure({
  permRecord: () => auth.authInfo()?.permissions,
  items: [/* ... */],
});

// Static route 정의 (reconciliation 문제 없음)
{appStructure.allRoutes.map((r) => (
  <Route
    path={r.path}
    component={() => {
      if (!appStructure.checkRouteAccess(r)) {
        return <Navigate href="/login" />;
      }
      return <r.component />;
    }}
  />
))}
```

## 내부 구현

### `buildAllRoutes` 함수 추가

`buildUsableRoutes`와 유사하지만, module/perm 필터링 없이 정보만 수집:

```typescript
function buildAllRoutes<TModule>(
  items: AppStructureItem<TModule>[],
  routeBasePath: string,
  permBasePath: string,
  modulesChain: TModule[][],
  requiredModulesChain: TModule[][],
): AppRoute<TModule>[] {
  const result: AppRoute<TModule>[] = [];
  for (const item of items) {
    const currModulesChain = item.modules
      ? [...modulesChain, item.modules] : modulesChain;
    const currRequiredModulesChain = item.requiredModules
      ? [...requiredModulesChain, item.requiredModules] : requiredModulesChain;
    const routePath = routeBasePath + "/" + item.code;
    const permPath = permBasePath + "/" + item.code;

    if (isGroupItem(item)) {
      result.push(...buildAllRoutes(
        item.children, routePath, permPath,
        currModulesChain, currRequiredModulesChain,
      ));
    } else if (item.component !== undefined) {
      result.push({
        path: routePath,
        component: item.component,
        permCode: item.perms?.includes("use") ? permPath + "/use" : undefined,
        modulesChain: currModulesChain,
        requiredModulesChain: currRequiredModulesChain,
      });
    }
  }
  return result;
}
```

### `collectFlatPerms` 수정

`requiredModulesChain` 수집 추가:

```typescript
const currRequiredModulesChain: TModule[][] = item.requiredModules
  ? [...requiredModulesChain, item.requiredModules]
  : requiredModulesChain;
```

### `buildUsableRoutes` 제거

`usableRoutes`와 함께 삭제.

## 영향 범위

| 파일 | 변경 |
|------|------|
| `createAppStructure.ts` | 핵심 변경 (타입, 함수, 메인 로직) |
| `createAppStructure.spec.tsx` | `usableRoutes` → `allRoutes` 테스트, `flatPerms` → `allFlatPerms` |
| `SidebarMenu.tsx` | `flatPerms` 참조를 `allFlatPerms`로 변경 (있다면) |
| `PermissionTable.tsx` | `flatPerms` 참조를 `allFlatPerms`로 변경 (있다면) |
| `index.ts` | export 변경 |
| `README.md` | API 문서 업데이트 |
| `docs/hooks.md` | 문서 업데이트 |

## Breaking Changes

- `usableRoutes` 제거 (사용 시 crash 발생하므로 실질적 영향 없음)
- `flatPerms` → `allFlatPerms` 이름 변경
- `AppRoute`에 generic parameter 추가 (기본값 `string`이므로 기존 타입 참조는 호환)
- `AppFlatPerm`에 `requiredModulesChain` 필드 추가
