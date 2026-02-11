# PermissionTable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 계층형 권한 트리를 테이블로 표시하고 체크박스로 권한을 관리하는 SolidJS 컴포넌트 구현

**Architecture:** `PermissionItem` 트리를 `<table>`로 렌더링. 메인 `PermissionTable`이 상태 관리와 헤더를 담당하고, 내부 `PermissionTableRow`가 재귀적으로 행을 렌더링. 기존 `CheckBox` 컴포넌트를 셀 안에서 재사용.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge, vitest + @solidjs/testing-library

**설계 문서:** `docs/plans/2026-02-10-permission-table-design.md`

---

### Task 1: 스타일 파일 생성

**Files:**

- Create: `packages/solid/src/components/data/permission-table/PermissionTable.styles.ts`

**Step 1: 스타일 파일 작성**

```typescript
import clsx from "clsx";

// 테이블 기본
export const tableBaseClass = clsx("w-full", "border-separate border-spacing-0", "text-sm");

// 헤더 셀 (th)
export const thClass = clsx(
  "px-2 py-1.5",
  "border-b border-base-300 dark:border-base-600",
  "bg-base-100 dark:bg-base-800",
  "text-left font-semibold",
  "text-base-700 dark:text-base-300",
);

export const thPermClass = clsx("text-center", "w-20");

// 행 (tr)
export const trBaseClass = clsx("group");

// depth별 배경색 (레거시 테마 대응)
export const depthClasses: Record<number, string> = {
  0: clsx("bg-info-500 text-white", "[&_label]:text-white"),
  1: clsx("bg-info-50 dark:bg-info-950"),
  2: clsx("bg-warning-50 dark:bg-warning-950"),
  3: clsx("bg-success-50 dark:bg-success-950"),
};

export const getDepthClass = (depth: number): string => {
  if (depth === 0) return depthClasses[0];
  return depthClasses[((depth - 1) % 3) + 1];
};

// 타이틀 셀 (td)
export const tdTitleClass = clsx("px-2 py-1");

// 권한 셀 (td)
export const tdPermClass = clsx("px-1 py-1", "text-center");

// 접기/펼치기 버튼
export const collapseButtonClass = clsx(
  "inline-flex items-center gap-1",
  "cursor-pointer",
  "hover:text-primary-600 dark:hover:text-primary-400",
);

// 화살표 아이콘 회전
export const chevronClass = clsx("transition-transform duration-150");

export const chevronOpenClass = "rotate-90";
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/permission-table/PermissionTable.styles.ts
git commit -m "feat(solid): add PermissionTable styles"
```

---

### Task 2: 타입 정의 + 유틸리티 함수가 포함된 메인 컴포넌트 뼈대

**Files:**

- Create: `packages/solid/src/components/data/permission-table/PermissionTable.tsx`

**Step 1: 타입과 유틸리티 함수 작성**

`PermissionTable.tsx`에 다음 내용을 작성한다:

```typescript
import { type Component, createMemo, createSignal, For, Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  tableBaseClass,
  thClass,
  thPermClass,
} from "./PermissionTable.styles";
import { PermissionTableRow } from "./PermissionTableRow";

// --- 타입 ---

export interface PermissionItem<TModule = string> {
  title: string;
  href?: string;
  modules?: TModule[];
  perms?: string[];
  children?: PermissionItem<TModule>[];
}

export interface PermissionTableProps<TModule = string> {
  items?: PermissionItem<TModule>[];
  value?: Record<string, boolean>;
  onValueChange?: (value: Record<string, boolean>) => void;
  modules?: TModule[];
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
}

// --- 유틸리티 ---

/** 트리에서 모든 고유 perm 타입을 수집 */
export function collectAllPerms<TModule>(items: PermissionItem<TModule>[]): string[] {
  const set = new Set<string>();
  const walk = (list: PermissionItem<TModule>[]) => {
    for (const item of list) {
      if (item.perms) {
        for (const p of item.perms) set.add(p);
      }
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return [...set];
}

/** modules 필터: 활성 모듈과 교차가 있는 아이템만 남김 */
export function filterByModules<TModule>(
  items: PermissionItem<TModule>[],
  modules: TModule[] | undefined,
): PermissionItem<TModule>[] {
  if (!modules || modules.length === 0) return items;

  return items
    .map((item) => {
      // 이 아이템에 modules가 있는데 교차가 없으면 제외
      if (item.modules && !item.modules.some((m) => modules.includes(m))) {
        return undefined;
      }
      // children도 재귀 필터
      const children = item.children ? filterByModules(item.children, modules) : undefined;
      // children이 있었는데 전부 필터링되면 이 그룹도 제외
      if (item.children && (!children || children.length === 0) && !item.perms) {
        return undefined;
      }
      return { ...item, children };
    })
    .filter((item): item is PermissionItem<TModule> => item !== undefined);
}

/** 체크 변경 시 cascading 처리 */
export function changePermCheck<TModule>(
  value: Record<string, boolean>,
  item: PermissionItem<TModule>,
  perm: string,
  checked: boolean,
): Record<string, boolean> {
  const result = { ...value };

  const apply = (target: PermissionItem<TModule>) => {
    if (target.perms && target.href) {
      const permIndex = target.perms.indexOf(perm);
      if (permIndex >= 0) {
        result[target.href + "/" + perm] = checked;
      }

      // 기본 권한(perms[0]) 해제 시 나머지도 해제
      if (perm === target.perms[0] && !checked) {
        for (let i = 1; i < target.perms.length; i++) {
          result[target.href + "/" + target.perms[i]] = false;
        }
      }

      // 기본 권한이 아닌 perm을 체크하려는데 기본 권한이 꺼져있으면 무시
      if (permIndex > 0 && checked) {
        const basePerm = target.perms[0];
        if (!result[target.href + "/" + basePerm]) {
          return; // 기본 권한 없으면 하위 권한 체크 불가
        }
      }
    }

    // cascading down
    if (target.children) {
      for (const child of target.children) {
        apply(child);
      }
    }
  };

  apply(item);
  return result;
}

// --- 컴포넌트 ---

export const PermissionTable: Component<PermissionTableProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "items", "value", "onValueChange", "modules", "disabled", "class", "style",
  ]);

  const filteredItems = createMemo(() =>
    filterByModules(local.items ?? [], local.modules),
  );

  const allPerms = createMemo(() => collectAllPerms(filteredItems()));

  const getValue = () => local.value ?? {};

  const [collapsedSet, setCollapsedSet] = createSignal(new Set<string>());

  const handleToggleCollapse = (key: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handlePermChange = (item: PermissionItem, perm: string, checked: boolean) => {
    const newValue = changePermCheck(getValue(), item, perm, checked);
    local.onValueChange?.(newValue);
  };

  const getClassName = () => twMerge(tableBaseClass, local.class);

  return (
    <table class={getClassName()} style={local.style} data-permission-table>
      <thead>
        <tr>
          <th class={thClass}>권한 항목</th>
          <For each={allPerms()}>
            {(perm) => <th class={clsx(thClass, thPermClass)}>{perm}</th>}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={filteredItems()}>
          {(item) => (
            <PermissionTableRow
              item={item}
              depth={0}
              allPerms={allPerms()}
              value={getValue()}
              collapsedSet={collapsedSet()}
              disabled={local.disabled}
              onToggleCollapse={handleToggleCollapse}
              onPermChange={handlePermChange}
            />
          )}
        </For>
      </tbody>
    </table>
  );
};
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/permission-table/PermissionTable.tsx
git commit -m "feat(solid): add PermissionTable component skeleton with types and utils"
```

---

### Task 3: 재귀 행 컴포넌트

**Files:**

- Create: `packages/solid/src/components/data/permission-table/PermissionTableRow.tsx`

**Step 1: PermissionTableRow 작성**

```typescript
import { type Component, For, Show } from "solid-js";
import clsx from "clsx";
import { CheckBox } from "../../form-control/checkbox/CheckBox";
import { Icon } from "../../display/Icon";
import type { PermissionItem } from "./PermissionTable";
import {
  trBaseClass,
  getDepthClass,
  tdTitleClass,
  tdPermClass,
  collapseButtonClass,
  chevronClass,
  chevronOpenClass,
} from "./PermissionTable.styles";

// @tabler/icons-solidjs에서 아이콘을 가져올 수 없으므로
// 기존 코드베이스의 Icon 컴포넌트 + 아이콘 패턴 확인 필요
// → 아래에서 확인 후 결정

export interface PermissionTableRowProps<TModule = string> {
  item: PermissionItem<TModule>;
  depth: number;
  allPerms: string[];
  value: Record<string, boolean>;
  collapsedSet: Set<string>;
  disabled?: boolean;
  onToggleCollapse: (key: string) => void;
  onPermChange: (item: PermissionItem<TModule>, perm: string, checked: boolean) => void;
}

/** 그룹 노드의 체크 상태: 하위 중 하나라도 체크면 true */
function isGroupPermChecked<TModule>(
  item: PermissionItem<TModule>,
  perm: string,
  value: Record<string, boolean>,
): boolean {
  if (item.perms && item.href) {
    return value[item.href + "/" + perm] ?? false;
  }
  if (item.children) {
    return item.children.some((child) => isGroupPermChecked(child, perm, value));
  }
  return false;
}

/** 그룹 노드에서 특정 perm 존재 여부: 하위에 하나라도 있으면 true */
function hasPermInTree<TModule>(item: PermissionItem<TModule>, perm: string): boolean {
  if (item.perms?.includes(perm)) return true;
  if (item.children) {
    return item.children.some((child) => hasPermInTree(child, perm));
  }
  return false;
}

/** 아이템의 고유 키 (collapse 식별용) */
function itemKey<TModule>(item: PermissionItem<TModule>): string {
  return item.href ?? item.title;
}

/** 기본 권한(perms[0])이 꺼져 있어서 비활성화해야 하는지 */
function isPermDisabled<TModule>(
  item: PermissionItem<TModule>,
  perm: string,
  value: Record<string, boolean>,
): boolean {
  if (!item.perms || !item.href) return false;
  const basePerm = item.perms[0];
  if (perm === basePerm) return false;
  return !(value[item.href + "/" + basePerm] ?? false);
}

export const PermissionTableRow: Component<PermissionTableRowProps> = (props) => {
  const hasChildren = () => (props.item.children?.length ?? 0) > 0;
  const isCollapsed = () => props.collapsedSet.has(itemKey(props.item));

  const depthClass = () => getDepthClass(props.depth);

  return (
    <>
      <tr class={clsx(trBaseClass, depthClass())}>
        {/* 타이틀 셀 */}
        <td
          class={tdTitleClass}
          style={{ "padding-left": `${props.depth * 1.5 + 0.5}rem` }}
        >
          <Show
            when={hasChildren()}
            fallback={<span>{props.item.title}</span>}
          >
            <button
              class={collapseButtonClass}
              onClick={() => props.onToggleCollapse(itemKey(props.item))}
            >
              <span
                class={clsx(chevronClass, !isCollapsed() && chevronOpenClass)}
                style={{ "font-size": "0.75rem" }}
              >
                ▶
              </span>
              {props.item.title}
            </button>
          </Show>
        </td>

        {/* 권한 셀들 */}
        <For each={props.allPerms}>
          {(perm) => (
            <td class={tdPermClass}>
              <Show when={hasPermInTree(props.item, perm)}>
                <CheckBox
                  value={isGroupPermChecked(props.item, perm, props.value)}
                  onValueChange={(checked) => props.onPermChange(props.item, perm, checked)}
                  disabled={
                    props.disabled ||
                    isPermDisabled(props.item, perm, props.value)
                  }
                  inset
                  inline
                />
              </Show>
            </td>
          )}
        </For>
      </tr>

      {/* 하위 행 (재귀) */}
      <Show when={hasChildren() && !isCollapsed()}>
        <For each={props.item.children}>
          {(child) => (
            <PermissionTableRow
              item={child}
              depth={props.depth + 1}
              allPerms={props.allPerms}
              value={props.value}
              collapsedSet={props.collapsedSet}
              disabled={props.disabled}
              onToggleCollapse={props.onToggleCollapse}
              onPermChange={props.onPermChange}
            />
          )}
        </For>
      </Show>
    </>
  );
};
```

**Step 2: 커밋**

```bash
git add packages/solid/src/components/data/permission-table/PermissionTableRow.tsx
git commit -m "feat(solid): add PermissionTableRow recursive tree rendering"
```

---

### Task 4: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`// data` 섹션 끝에 추가:

```typescript
export * from "./components/data/permission-table/PermissionTable";
```

**참고:** `PermissionTableRow`와 `PermissionTable.styles`는 export하지 않는다 (내부 전용).

**Step 2: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): export PermissionTable from index"
```

---

### Task 5: 타입체크 + 린트 확인

**Step 1: 타입체크**

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

**Step 2: 린트**

```bash
pnpm lint packages/solid/src/components/data/permission-table
```

Expected: 에러 없음. 에러가 있으면 수정.

**Step 3: 수정 사항이 있으면 커밋**

```bash
git add -A
git commit -m "fix(solid): fix lint/type issues in PermissionTable"
```

---

### Task 6: 테스트 - 유틸리티 함수

**Files:**

- Create: `packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx`

**Step 1: 유틸리티 함수 테스트 작성**

```typescript
import { describe, it, expect } from "vitest";
import {
  collectAllPerms,
  filterByModules,
  changePermCheck,
  type PermissionItem,
} from "../../../../src/components/data/permission-table/PermissionTable";

const sampleItems: PermissionItem[] = [
  {
    title: "사용자 관리",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "권한 설정", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "사용자 목록", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "시스템",
    href: "/system",
    perms: ["use"],
    modules: ["admin"],
  },
];

describe("collectAllPerms", () => {
  it("트리에서 모든 고유 perm 타입을 수집한다", () => {
    const result = collectAllPerms(sampleItems);
    expect(result).toContain("use");
    expect(result).toContain("edit");
    expect(result).toContain("approve");
    expect(result.length).toBe(3);
  });

  it("빈 배열이면 빈 결과를 반환한다", () => {
    expect(collectAllPerms([])).toEqual([]);
  });
});

describe("filterByModules", () => {
  it("modules가 undefined이면 전체 반환", () => {
    const result = filterByModules(sampleItems, undefined);
    expect(result.length).toBe(2);
  });

  it("활성 모듈과 교차가 없는 아이템을 제외한다", () => {
    const result = filterByModules(sampleItems, ["user"]);
    // "시스템"은 modules: ["admin"]이므로 제외
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("사용자 관리");
  });

  it("modules가 없는 아이템은 항상 포함된다", () => {
    const result = filterByModules(sampleItems, ["admin"]);
    // "사용자 관리"는 modules 없으므로 포함, "시스템"은 admin 포함
    expect(result.length).toBe(2);
  });
});

describe("changePermCheck", () => {
  it("leaf 아이템의 perm을 체크한다", () => {
    const result = changePermCheck({}, sampleItems[0].children![0], "use", true);
    expect(result["/user/permission/use"]).toBe(true);
  });

  it("상위 아이템 체크 시 하위도 함께 체크된다 (cascading)", () => {
    const result = changePermCheck({}, sampleItems[0], "use", true);
    expect(result["/user/use"]).toBe(true);
    expect(result["/user/permission/use"]).toBe(true);
    expect(result["/user/list/use"]).toBe(true);
  });

  it("기본 권한(perms[0]) 해제 시 나머지도 해제된다", () => {
    const initial: Record<string, boolean> = {
      "/user/permission/use": true,
      "/user/permission/edit": true,
      "/user/permission/approve": true,
    };
    const result = changePermCheck(initial, sampleItems[0].children![0], "use", false);
    expect(result["/user/permission/use"]).toBe(false);
    expect(result["/user/permission/edit"]).toBe(false);
    expect(result["/user/permission/approve"]).toBe(false);
  });

  it("기본 권한이 꺼진 상태에서 하위 권한 체크를 시도하면 무시된다", () => {
    const result = changePermCheck({}, sampleItems[0].children![0], "edit", true);
    // use가 false이므로 edit 체크 불가
    expect(result["/user/permission/edit"]).toBeUndefined();
  });
});
```

**Step 2: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx --project=solid --run
```

Expected: 모든 테스트 통과

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx
git commit -m "test(solid): add PermissionTable utility function tests"
```

---

### Task 7: 테스트 - 컴포넌트 렌더링 및 상호작용

**Files:**

- Modify: `packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx`

**Step 1: 컴포넌트 테스트 추가**

같은 파일 끝에 추가:

```typescript
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { PermissionTable } from "../../../../src/components/data/permission-table/PermissionTable";

const testItems: PermissionItem[] = [
  {
    title: "사용자 관리",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "권한 설정", href: "/user/permission", perms: ["use", "edit"] },
    ],
  },
  {
    title: "게시판",
    href: "/board",
    perms: ["use"],
  },
];

describe("PermissionTable 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("테이블로 렌더링된다", () => {
      const { container } = render(() => <PermissionTable items={testItems} />);
      expect(container.querySelector("[data-permission-table]")).toBeTruthy();
    });

    it("헤더에 perm 타입이 표시된다", () => {
      const { getByText } = render(() => <PermissionTable items={testItems} />);
      expect(getByText("use")).toBeTruthy();
      expect(getByText("edit")).toBeTruthy();
    });

    it("아이템 타이틀이 표시된다", () => {
      const { getByText } = render(() => <PermissionTable items={testItems} />);
      expect(getByText("사용자 관리")).toBeTruthy();
      expect(getByText("권한 설정")).toBeTruthy();
      expect(getByText("게시판")).toBeTruthy();
    });
  });

  describe("체크박스 동작", () => {
    it("체크박스 클릭 시 onValueChange가 호출된다", () => {
      const [value, setValue] = createSignal<Record<string, boolean>>({});
      const { container } = render(() => (
        <PermissionTable items={testItems} value={value()} onValueChange={setValue} />
      ));

      // 첫 번째 체크박스 클릭 (게시판의 use)
      const checkboxes = container.querySelectorAll("[role='checkbox']");
      expect(checkboxes.length).toBeGreaterThan(0);

      fireEvent.click(checkboxes[0]);
      expect(Object.values(value()).some((v) => v === true)).toBe(true);
    });
  });

  describe("접기/펼치기", () => {
    it("children이 있는 행에 접기 버튼이 있다", () => {
      const { getByText } = render(() => <PermissionTable items={testItems} />);
      // "사용자 관리"는 children이 있으므로 button으로 렌더링
      const userButton = getByText("사용자 관리");
      expect(userButton.closest("button")).toBeTruthy();
    });

    it("접기 버튼 클릭 시 하위 행이 숨겨진다", () => {
      const { getByText, queryByText } = render(() => <PermissionTable items={testItems} />);

      // 초기: 하위 행 표시
      expect(getByText("권한 설정")).toBeTruthy();

      // 접기
      fireEvent.click(getByText("사용자 관리").closest("button")!);

      // 하위 행 숨겨짐
      expect(queryByText("권한 설정")).toBeNull();
    });
  });

  describe("disabled", () => {
    it("disabled 시 모든 체크박스가 비활성화된다", () => {
      const { container } = render(() => <PermissionTable items={testItems} disabled />);
      const checkboxes = container.querySelectorAll("[role='checkbox']");
      for (const cb of checkboxes) {
        expect(cb.getAttribute("tabindex")).toBe("-1");
      }
    });
  });
});
```

**Step 2: 테스트 실행**

```bash
pnpm vitest packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx --project=solid --run
```

Expected: 모든 테스트 통과. 실패 시 구현 코드 수정.

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/data/permission-table/PermissionTable.spec.tsx
git commit -m "test(solid): add PermissionTable component rendering tests"
```

---

### Task 8: 데모 페이지 추가

**Files:**

- Create: `packages/solid-demo/src/pages/PermissionTablePage.tsx`
- Modify: solid-demo의 라우트/메뉴에 추가 (기존 패턴 확인 필요)

**Step 1: 기존 데모 페이지 패턴 확인**

데모 앱의 라우트 설정과 기존 페이지 구조를 Read하여 패턴을 파악한다.
파일 경로: `packages/solid-demo/src/App.tsx` 또는 라우트 설정 파일.

**Step 2: 데모 페이지 작성**

```tsx
import { createSignal } from "solid-js";
import { PermissionTable, type PermissionItem } from "@simplysm/solid";

const demoItems: PermissionItem[] = [
  {
    title: "사용자 관리",
    href: "/user",
    perms: ["use", "edit"],
    children: [
      { title: "권한 설정", href: "/user/permission", perms: ["use", "edit", "approve"] },
      { title: "사용자 목록", href: "/user/list", perms: ["use", "edit"] },
    ],
  },
  {
    title: "게시판",
    href: "/board",
    perms: ["use", "edit"],
    children: [
      { title: "공지사항", href: "/board/notice", perms: ["use", "edit"] },
      { title: "자유게시판", href: "/board/free", perms: ["use"] },
    ],
  },
  {
    title: "시스템",
    href: "/system",
    perms: ["use"],
    modules: ["admin"],
  },
];

export default function PermissionTablePage() {
  const [value, setValue] = createSignal<Record<string, boolean>>({});

  return (
    <div class="p-4 flex flex-col gap-4">
      <h1 class="text-xl font-bold">PermissionTable</h1>

      <PermissionTable items={demoItems} value={value()} onValueChange={setValue} />

      <div class="mt-4">
        <h2 class="font-semibold">현재 값:</h2>
        <pre class="bg-base-100 dark:bg-base-800 p-2 rounded text-xs">{JSON.stringify(value(), null, 2)}</pre>
      </div>
    </div>
  );
}
```

**Step 3: 라우트/메뉴에 추가**

기존 패턴에 따라 라우트와 사이드바 메뉴에 PermissionTable 데모 페이지를 등록한다.

**Step 4: dev 서버로 확인**

```bash
pnpm dev
```

브라우저에서 PermissionTable 데모 페이지 접속하여 동작 확인.

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/PermissionTablePage.tsx
# 라우트 파일도 add
git commit -m "feat(solid-demo): add PermissionTable demo page"
```

---

### Task 9: 최종 검증 + 스타일 미세 조정

**Step 1: 전체 타입체크**

```bash
pnpm typecheck packages/solid
```

**Step 2: 전체 린트**

```bash
pnpm lint packages/solid
```

**Step 3: 전체 테스트**

```bash
pnpm vitest --project=solid --run
```

**Step 4: dev 서버에서 시각적 확인**

- 계층 들여쓰기 간격
- depth별 배경색
- 체크박스 정렬
- 접기/펼치기 애니메이션
- 다크 모드

필요하면 스타일 조정 후 커밋.

**Step 5: 최종 커밋**

```bash
git add -A
git commit -m "refine(solid): polish PermissionTable styles and fix issues"
```
