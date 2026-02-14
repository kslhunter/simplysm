# AppStructure 설계

> 작성일: 2026-02-10
> 마이그레이션 문서 #15: AppStructureProvider → createAppStructure

## 개요

하나의 구조 정의 객체에서 **메뉴**, **라우트**, **권한**을 모두 파생하는 유틸리티 함수.
Angular의 `SdAppStructureProvider`를 SolidJS reactive primitive로 재설계한다.

- **Provider/Context 없음** — `createAppStructure()` 순수 유틸리티
- 앱에서 모듈 레벨로 생성 후 import로 공유

## 입력 타입

```typescript
// 그룹 아이템 (children 있음)
interface AppStructureGroupItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[]; // OR: 하나라도 활성이면 표시
  requiredModules?: TModule[]; // AND: 모두 활성이어야 표시
  children: AppStructureItem<TModule>[];
}

// 리프 아이템 (children 없음)
interface AppStructureLeafItem<TModule> {
  code: string;
  title: string;
  icon?: Component<IconProps>;
  modules?: TModule[];
  requiredModules?: TModule[];
  component?: Component; // lazy(() => import(...))
  perms?: ("use" | "edit")[];
  subPerms?: AppStructureSubPerm<TModule>[];
  isNotMenu?: boolean; // true면 메뉴에서 숨김
}

type AppStructureItem<TModule> = AppStructureGroupItem<TModule> | AppStructureLeafItem<TModule>;

interface AppStructureSubPerm<TModule> {
  code: string;
  title: string;
  modules?: TModule[];
  requiredModules?: TModule[];
  perms: ("use" | "edit")[];
}
```

## 출력 타입

```typescript
interface AppRoute {
  path: string; // "/form-control/button" (최상위 code 이하 상대 경로)
  component: Component;
}

interface AppFlatMenu {
  titleChain: string[]; // ["Form Control", "Button"]
  href: string; // "/home/form-control/button"
}

// usableMenus는 기존 SidebarMenuItem[] 타입 그대로 사용
```

## API

```typescript
function createAppStructure<TModule>(opts: {
  items: AppStructureItem<TModule>[];
  usableModules?: Accessor<TModule[] | undefined>;
  permRecord?: Accessor<Record<string, boolean>>;
}): AppStructure<TModule>;

interface AppStructure<TModule> {
  items: AppStructureItem<TModule>[];
  routes: AppRoute[]; // 정적 (한 번 추출)
  usableMenus: Accessor<SidebarMenuItem[]>; // 반응형 (createMemo)
  usableFlatMenus: Accessor<AppFlatMenu[]>; // 반응형
  permRecord: Accessor<Record<string, boolean>>;
}
```

## 내부 로직

### 라우트 추출 (정적)

`items` 트리를 순회하여 `component`가 있는 리프 아이템의 경로를 수집한다.
최상위 code가 base path가 되고, 그 이하를 상대 경로로 추출한다.

```
items[0].code = "home"  →  base path "/home"
children의 상대 경로:  "/form-control/button", "/layout/sidebar", ...
```

### 메뉴 필터링 (반응형, createMemo)

1. 각 아이템에 대해 모듈 체크
   - `modules` → OR (하나라도 `usableModules`에 포함되면 통과)
   - `requiredModules` → AND (모두 포함되어야 통과)
2. 리프 아이템: `permRecord[href + "/use"]`가 `true`인지 확인
3. `isNotMenu === true`이면 메뉴에서 제외
4. 그룹 아이템: 필터링 후 자식이 하나라도 남아야 포함
5. 결과를 `SidebarMenuItem[]` 형태로 변환 (title, href, icon, children)

### 평탄화 (반응형, createMemo)

`usableMenus` 트리를 재귀 순회하며 리프 노드만 수집.
`titleChain`과 `href` 구성.

### 권한 키 형식

`/` 구분자를 사용한 경로 형식:

- `/home/form-control/button/use`
- `/home/form-control/button/edit`
- `/home/sales/invoice/approval/use` (subPerm)

## 파일 구조

```
packages/solid/src/
  utils/
    createAppStructure.ts    # 함수 + 모든 타입
  index.ts                   # + export createAppStructure 및 타입들
```

## 사용 예시

### 구조 정의 (앱)

```typescript
// src/appStructure.ts
import { createAppStructure } from "@simplysm/solid";

const appItems: AppStructureItem<MyModule>[] = [
  {
    code: "home",
    title: "홈",
    children: [
      {
        code: "form-control",
        title: "Form Control",
        icon: IconPen,
        children: [
          {
            code: "button",
            title: "Button",
            component: lazy(() => import("./pages/form-control/ButtonPage")),
            perms: ["use"],
          },
          {
            code: "select",
            title: "Select",
            component: lazy(() => import("./pages/form-control/SelectPage")),
            perms: ["use"],
            modules: ["sales"],
          },
        ],
      },
    ],
  },
];

export const appStructure = createAppStructure({
  items: appItems,
  usableModules: modules,
  permRecord: perms,
});
```

### 라우트 등록 (main.tsx)

```typescript
import { appStructure } from "./appStructure";

<HashRouter>
  <Route path="/" component={App}>
    <Route path="/home" component={Home}>
      <Route path="/" component={MainPage} />
      {appStructure.routes.map((r) => (
        <Route path={r.path} component={r.component} />
      ))}
      <Route path="/*" component={NotFoundPage} />
    </Route>
    <Route path="/" component={() => <Navigate href="/home" />} />
  </Route>
</HashRouter>
```

### 메뉴 표시 (Home.tsx)

```typescript
import { appStructure } from "./appStructure";

<SidebarMenu menus={appStructure.usableMenus()} />
```

## 함께 진행할 작업

- **solid-demo 라우트 구조 수정**: 현재 `<Route path="/" component={Home}>` 안에
  `/home/...` 전체 경로가 반복되는 구조를 `<Route path="/home" component={Home}>` +
  상대 경로로 수정

## 후속 작업 (이번 범위 밖)

- #16 PermissionTable: `appStructure.items`에서 권한 트리를 추출하는 유틸리티 추가
- #17 SharedData 관련 컨트롤: SharedDataProvider 기반
- 라우트 권한 가드 래퍼: 필요 시 추가
