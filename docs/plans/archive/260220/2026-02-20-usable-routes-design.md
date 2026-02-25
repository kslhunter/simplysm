# createAppStructure: routes → usableRoutes (리액티브 필터링)

## 배경

`createAppStructure`에서 `routes`는 정적(`AppRoute[]`)으로, module/perm 필터링 없이 모든 route를 포함한다.
`usableMenus`, `usablePerms` 등은 `usableModules`와 `permRecord` 기반으로 동적 필터링하는데, routes만 예외.

## 목표

사용 가능한(module + perm 조건 통과) route만 포함하는 리액티브 `usableRoutes`로 교체.

## 변경 요약

### 1. AppStructure 인터페이스

```typescript
export interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  // routes: AppRoute[];                    // 제거
  usableRoutes: Accessor<AppRoute[]>;       // 추가 (리액티브)
  usableMenus: Accessor<AppMenu[]>;
  usableFlatMenus: Accessor<AppFlatMenu[]>;
  usablePerms: Accessor<AppPerm<TModule>[]>;
  usableFlatPerms: Accessor<AppFlatPerm<TModule>[]>;
  usablePermRecord: Accessor<Record<string, boolean>>;
  getTitleChainByHref(href: string): string[];
}
```

### 2. 새 내부 헬퍼: `buildUsableRoutes`

기존 `collectRoutes`/`extractRoutes` 제거, `buildUsableRoutes`로 대체:

```typescript
function buildUsableRoutes<TModule>(
  items: AppStructureItem<TModule>[],
  basePath: string,
  usableModules: TModule[] | undefined,
  permRecord: Record<string, boolean>,
): AppRoute[] {
  const result: AppRoute[] = [];

  for (const item of items) {
    if (!checkModules(item.modules, item.requiredModules, usableModules)) continue;

    const path = basePath + "/" + item.code;

    if (isGroupItem(item)) {
      result.push(...buildUsableRoutes(item.children, path, usableModules, permRecord));
    } else if (item.component !== undefined) {
      if (item.perms?.includes("use") && !permRecord[path + "/use"]) continue;
      result.push({ path, component: item.component });
    }
  }

  return result;
}
```

### 3. createAppStructure 내부 변경

```typescript
// createRoot 내부로 이동
const usableRoutes = createMemo(() => {
  const routes: AppRoute[] = [];
  for (const top of opts.items) {
    if (isGroupItem(top)) {
      routes.push(
        ...buildUsableRoutes(top.children, "/" + top.code, opts.usableModules?.(), permRecord()),
      );
    }
  }
  return routes;
});
```

### 4. 필터링 조건

`buildMenus`와 동일한 로직:
- 부모 group의 `modules`/`requiredModules` 체크 통과 필요
- leaf item의 `modules`/`requiredModules` 체크 통과 필요
- `perms`에 `"use"` 포함 시 `permRecord[path + "/use"]`가 `true`여야 함
- `isNotMenu` 항목도 route에는 포함 (메뉴에만 안 보임)

## 영향 범위

### 수정 파일

| 파일 | 변경 |
|------|------|
| `packages/solid/src/helpers/createAppStructure.ts` | `routes` → `usableRoutes`, `collectRoutes`/`extractRoutes` 제거, `buildUsableRoutes` 추가 |

### Breaking Changes

- `AppStructure.routes: AppRoute[]` 제거 → `usableRoutes: Accessor<AppRoute[]>` 사용
- 소비자: `structure.routes` → `structure.usableRoutes()` 변경 필요
