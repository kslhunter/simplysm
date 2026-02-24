# SelectList 제거 및 SharedDataSelectList 흡수 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** SelectList 컴포넌트를 제거하고, 필요한 기능을 SharedDataSelectList에 직접 흡수

**Architecture:** SelectList의 선택/페이지네이션/필터 로직을 SharedDataSelectList로 이동, List + List.Item을 직접 사용. 슬롯 시스템(SelectListContext) 및 검색 기능은 제거.

**Tech Stack:** SolidJS, Tailwind CSS, vitest + @solidjs/testing-library

---

### Task 1: SharedDataSelectList 재작성

**Files:**
- Modify: `packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx`

**Step 1: SharedDataSelectList를 다음 코드로 교체**

```tsx
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  Show,
  splitProps,
} from "solid-js";
import { IconExternalLink } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { List } from "../../data/list/List";
import { Pagination } from "../../data/Pagination";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";
import { textMuted } from "../../../styles/tokens.styles";

/** SharedDataSelectList Props */
export interface SharedDataSelectListProps<TItem> {
  /** 공유 데이터 접근자 */
  data: SharedDataAccessor<TItem>;

  /** 현재 선택된 값 */
  value?: TItem;
  /** 값 변경 콜백 */
  onValueChange?: (value: TItem | undefined) => void;
  /** 필수 입력 */
  required?: boolean;
  /** 비활성화 */
  disabled?: boolean;

  /** 항목 필터 함수 */
  filterFn?: (item: TItem, index: number) => boolean;
  /** 값 변경 가드 (false 반환 시 변경 차단) */
  canChange?: (item: TItem | undefined) => boolean | Promise<boolean>;
  /** 페이지 크기 (있으면 Pagination 자동 표시) */
  pageSize?: number;
  /** 헤더 텍스트 */
  header?: string;
  /** 관리 모달 컴포넌트 팩토리 */
  modal?: () => JSX.Element;

  /** 아이템 렌더 함수 */
  children: (item: TItem, index: number) => JSX.Element;

  /** 커스텀 class */
  class?: string;
  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

// ─── 스타일 ──────────────────────────────────────────────

const containerClass = clsx("flex-col gap-1");

const headerClass = clsx("px-2 py-1 text-sm font-semibold flex items-center gap-1");

// ─── 컴포넌트 ───────────────────────────────────────────

export function SharedDataSelectList<TItem>(props: SharedDataSelectListProps<TItem>): JSX.Element {
  const [local, rest] = splitProps(props, [
    "data",
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "required",
    "disabled",
    "filterFn",
    "canChange",
    "pageSize",
    "header",
    "modal",
  ]);

  const dialog = useDialog();

  // ─── 페이지네이션 상태 ─────────────────────────────────

  const [page, setPage] = createSignal(1);

  // ─── 필터링 파이프라인 ─────────────────────────────────

  const filteredItems = createMemo(() => {
    let result = local.data.items();

    // getIsHidden 필터
    const isHidden = local.data.getIsHidden;
    if (isHidden) {
      result = result.filter((item) => !isHidden(item));
    }

    // filterFn
    if (local.filterFn) {
      const fn = local.filterFn;
      result = result.filter((item, index) => fn(item, index));
    }

    return result;
  });

  // ─── 페이지 계산 ───────────────────────────────────────

  const totalPageCount = createMemo(() => {
    if (local.pageSize == null) return 1;
    return Math.max(1, Math.ceil(filteredItems().length / local.pageSize));
  });

  // 필터 변경 시 페이지 리셋
  createEffect(() => {
    void filteredItems();
    setPage(1);
  });

  // 페이지 슬라이스
  const displayItems = createMemo(() => {
    const items = filteredItems();
    if (local.pageSize == null) return items;

    const start = (page() - 1) * local.pageSize;
    const end = start + local.pageSize;
    return items.slice(start, end);
  });

  // ─── 선택/토글 핸들러 ─────────────────────────────────

  const handleSelect = async (item: TItem | undefined) => {
    if (local.disabled) return;

    // canChange 가드
    if (local.canChange) {
      const allowed = await local.canChange(item);
      if (!allowed) return;
    }

    // 토글: 이미 선택된 값을 다시 클릭하면 선택 해제 (required가 아닐 때만)
    if (item !== undefined && item === local.value && !local.required) {
      local.onValueChange?.(undefined);
    } else {
      local.onValueChange?.(item);
    }
  };

  // ─── modal 열기 ────────────────────────────────────────

  const handleOpenModal = async () => {
    if (!local.modal) return;
    await dialog.show(local.modal, {});
  };

  // ─── 렌더링 ────────────────────────────────────────────

  return (
    <div
      {...rest}
      data-shared-data-select-list
      class={twMerge(containerClass, local.class)}
      style={local.style}
    >
      {/* Header */}
      <Show when={local.header != null || local.modal != null}>
        <div class={headerClass}>
          <Show when={local.header != null}>
            {local.header}
          </Show>
          <Show when={local.modal != null}>
            <Button size="sm" onClick={() => void handleOpenModal()}>
              <Icon icon={IconExternalLink} />
            </Button>
          </Show>
        </div>
      </Show>

      {/* Pagination */}
      <Show when={local.pageSize != null && totalPageCount() > 1}>
        <Pagination
          page={page()}
          onPageChange={setPage}
          totalPageCount={totalPageCount()}
          size="sm"
        />
      </Show>

      {/* List */}
      <List inset>
        {/* 미지정 항목 (required가 아닐 때) */}
        <Show when={!local.required}>
          <List.Item
            selected={local.value === undefined}
            disabled={local.disabled}
            onClick={() => handleSelect(undefined)}
          >
            <span class={textMuted}>미지정</span>
          </List.Item>
        </Show>

        {/* 아이템 목록 */}
        <For each={displayItems()}>
          {(item, index) => (
            <List.Item
              selected={item === local.value}
              disabled={local.disabled}
              onClick={() => handleSelect(item)}
            >
              {local.children(item, index())}
            </List.Item>
          )}
        </For>
      </List>
    </div>
  );
}
```

**Step 2: 빌드 확인**

Run: `cd /d/workspaces-13/simplysm/.worktrees/remove-selectlist && pnpm -C packages/solid exec tsc --noEmit --pretty`
Expected: PASS (또는 SelectList 관련 import 에러만 — Task 2에서 해결)

**Step 3: Commit**

```bash
git add packages/solid/src/components/features/shared-data/SharedDataSelectList.tsx
git commit -m "refactor(solid): rewrite SharedDataSelectList with direct List usage"
```

---

### Task 2: SelectList 삭제 및 export 정리

**Files:**
- Delete: `packages/solid/src/components/form-control/select-list/SelectList.tsx`
- Delete: `packages/solid/src/components/form-control/select-list/SelectListContext.ts`
- Delete: `packages/solid/tests/components/form-control/select-list/SelectList.spec.tsx`
- Modify: `packages/solid/src/index.ts`

**Step 1: SelectList 파일 삭제**

```bash
rm packages/solid/src/components/form-control/select-list/SelectList.tsx
rm packages/solid/src/components/form-control/select-list/SelectListContext.ts
rm packages/solid/tests/components/form-control/select-list/SelectList.spec.tsx
rmdir packages/solid/src/components/form-control/select-list
rmdir packages/solid/tests/components/form-control/select-list
```

**Step 2: index.ts에서 SelectList export 제거**

`packages/solid/src/index.ts`에서 다음 라인 삭제:

```tsx
// SelectList
export * from "./components/form-control/select-list/SelectList";
```

**Step 3: 타입 체크**

Run: `cd /d/workspaces-13/simplysm/.worktrees/remove-selectlist && pnpm -C packages/solid exec tsc --noEmit --pretty`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(solid): remove SelectList component and exports"
```

---

### Task 3: form-controls.md에서 SelectList 문서 제거

**Files:**
- Modify: `packages/solid/docs/form-controls.md`

**Step 1: SelectList 섹션 삭제**

`packages/solid/docs/form-controls.md`에서 라인 439-525 (## SelectList ~ --- 구분선) 삭제.

**Step 2: Commit**

```bash
git add packages/solid/docs/form-controls.md
git commit -m "docs(solid): remove SelectList section from form-controls"
```

---

### Task 4: SharedDataSelectList 테스트 작성

**Files:**
- Create: `packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx`

**Step 1: 테스트 파일 작성**

SharedDataSelectList는 `useDialog()`에 의존하므로 DialogProvider로 감싸야 한다. SharedDataAccessor mock이 필요하다.

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SharedDataSelectList } from "@simplysm/solid";
import { DialogProvider } from "@simplysm/solid";

// SharedDataAccessor mock 팩토리
function createMockAccessor<T>(
  items: T[],
  options?: {
    getIsHidden?: (item: T) => boolean;
  },
) {
  const [itemsSignal] = createSignal(items);
  return {
    items: itemsSignal,
    get: (key: string | number | undefined) => items.find((_, i) => i === Number(key)),
    emit: vi.fn(),
    getKey: (_item: T, index: number) => index,
    getIsHidden: options?.getIsHidden,
  };
}

// DialogProvider 래퍼
function renderWithDialog(ui: () => import("solid-js").JSX.Element) {
  return render(() => <DialogProvider>{ui()}</DialogProvider>);
}

describe("SharedDataSelectList", () => {
  // ─── 아이템 렌더링 ─────────────────────────────────────

  describe("아이템 렌더링", () => {
    it("items가 List.Item으로 렌더링된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.getByText("Banana")).toBeTruthy();
      expect(screen.getByText("Cherry")).toBeTruthy();

      cleanup();
    });

    it("children render function에 item과 index가 전달된다", () => {
      const accessor = createMockAccessor(["A", "B"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item, index) => <>{`${index}:${item}`}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("0:A")).toBeTruthy();
      expect(screen.getByText("1:B")).toBeTruthy();

      cleanup();
    });
  });

  // ─── 선택/토글 ─────────────────────────────────────────

  describe("선택/토글", () => {
    it("아이템 클릭 시 onValueChange가 호출된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} onValueChange={onChange} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).toHaveBeenCalledWith("Banana");

      cleanup();
    });

    it("이미 선택된 아이템 재클릭 시 선택 해제 (required가 아닐 때)", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange}>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Apple"));
      expect(onChange).toHaveBeenCalledWith(undefined);

      cleanup();
    });

    it("required일 때 재클릭해도 선택 해제되지 않는다", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Apple"));
      expect(onChange).toHaveBeenCalledWith("Apple");

      cleanup();
    });

    it("disabled일 때 클릭이 무시된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} onValueChange={onChange} disabled required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).not.toHaveBeenCalled();

      cleanup();
    });
  });

  // ─── 미지정 항목 ───────────────────────────────────────

  describe("미지정 항목", () => {
    it("required가 아니면 미지정 항목이 표시된다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor}>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("미지정")).toBeTruthy();

      cleanup();
    });

    it("required이면 미지정 항목이 표시되지 않는다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.queryByText("미지정")).toBeNull();

      cleanup();
    });

    it("미지정 클릭 시 undefined로 변경된다", () => {
      const accessor = createMockAccessor(["Apple"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} value="Apple" onValueChange={onChange}>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("미지정"));
      expect(onChange).toHaveBeenCalledWith(undefined);

      cleanup();
    });
  });

  // ─── canChange 가드 ────────────────────────────────────

  describe("canChange 가드", () => {
    it("canChange가 false를 반환하면 변경 차단", () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          onValueChange={onChange}
          canChange={() => false}
          required
        >
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));
      expect(onChange).not.toHaveBeenCalled();

      cleanup();
    });

    it("canChange가 true를 반환하면 변경 허용", async () => {
      const accessor = createMockAccessor(["Apple", "Banana"]);
      const onChange = vi.fn();

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          onValueChange={onChange}
          canChange={() => true}
          required
        >
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("Banana"));

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith("Banana");
      });

      cleanup();
    });
  });

  // ─── 페이지네이션 ──────────────────────────────────────

  describe("페이지네이션", () => {
    it("pageSize가 있으면 항목이 페이지 단위로 표시된다", () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const accessor = createMockAccessor(items);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={3} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      const listItems = screen.getAllByRole("treeitem");
      expect(listItems.length).toBe(3);
      expect(listItems[0]?.textContent).toBe("Item 1");

      cleanup();
    });

    it("Pagination 컴포넌트로 페이지 전환이 동작한다", () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const accessor = createMockAccessor(items);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={3} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      fireEvent.click(screen.getByText("2"));

      const listItems = screen.getAllByRole("treeitem");
      expect(listItems[0]?.textContent).toBe("Item 4");

      cleanup();
    });

    it("총 항목이 pageSize 이하이면 Pagination이 표시되지 않는다", () => {
      const accessor = createMockAccessor(["A", "B"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} pageSize={5} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(document.querySelector("[data-pagination]")).toBeNull();

      cleanup();
    });
  });

  // ─── 필터링 ────────────────────────────────────────────

  describe("필터링", () => {
    it("getIsHidden으로 숨겨진 항목은 표시되지 않는다", () => {
      const accessor = createMockAccessor(
        ["Apple", "Banana", "Cherry"],
        { getIsHidden: (item) => item === "Banana" },
      );

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.queryByText("Banana")).toBeNull();
      expect(screen.getByText("Apple")).toBeTruthy();
      expect(screen.getByText("Cherry")).toBeTruthy();

      cleanup();
    });

    it("filterFn으로 필터링된 항목만 표시된다", () => {
      const accessor = createMockAccessor(["Apple", "Banana", "Cherry"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} filterFn={(item) => item.startsWith("B")} required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("Banana")).toBeTruthy();
      expect(screen.queryByText("Apple")).toBeNull();
      expect(screen.queryByText("Cherry")).toBeNull();

      cleanup();
    });
  });

  // ─── header / modal ────────────────────────────────────

  describe("header / modal", () => {
    it("header가 있으면 헤더 텍스트가 표시된다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList data={accessor} header="과일 목록" required>
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      expect(screen.getByText("과일 목록")).toBeTruthy();

      cleanup();
    });

    it("modal이 있으면 관리 버튼이 표시된다", () => {
      const accessor = createMockAccessor(["Apple"]);

      renderWithDialog(() => (
        <SharedDataSelectList
          data={accessor}
          header="과일"
          modal={() => <div>Modal</div>}
          required
        >
          {(item) => <>{item}</>}
        </SharedDataSelectList>
      ));

      // Button이 렌더링됨 (IconExternalLink 포함)
      const headerArea = screen.getByText("과일").parentElement!;
      const button = headerArea.querySelector("button");
      expect(button).toBeTruthy();

      cleanup();
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `cd /d/workspaces-13/simplysm/.worktrees/remove-selectlist && pnpm vitest packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx --run --project=solid`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/solid/tests/components/features/shared-data/SharedDataSelectList.spec.tsx
git commit -m "test(solid): add SharedDataSelectList tests"
```
