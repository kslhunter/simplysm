# Pagination 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular sd-pagination을 SolidJS Pagination 컴포넌트로 마이그레이션

**Architecture:** Button 컴포넌트를 내부적으로 재사용하는 Pagination 컴포넌트. 0-based page, `page`+`onPageChange` 제어 패턴. `<nav>` 요소 기반 레이아웃.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge, @tabler/icons-solidjs, vitest, @solidjs/testing-library

---

### Task 1: Pagination 컴포넌트 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/data/Pagination.spec.tsx`

**Step 1: 테스트 파일 작성**

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "../../../src/components/data/Pagination";

describe("Pagination 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("nav 요소로 렌더링된다", () => {
      const { container } = render(() => <Pagination page={0} totalPages={10} />);
      const nav = container.firstChild as HTMLElement;
      expect(nav.tagName).toBe("NAV");
    });

    it("페이지 번호가 1-based로 표시된다", () => {
      const { getByText } = render(() => <Pagination page={0} totalPages={5} />);
      expect(getByText("1")).toBeTruthy();
      expect(getByText("5")).toBeTruthy();
    });

    it("totalPages가 0이면 페이지 번호 버튼이 없다", () => {
      const { container } = render(() => <Pagination page={0} totalPages={0} />);
      const buttons = container.querySelectorAll("[data-button]");
      // 네비게이션 버튼 4개만 존재
      expect(buttons.length).toBe(4);
    });
  });

  describe("페이지 그룹 표시", () => {
    it("displayPages 기본값 10으로 첫 그룹이 표시된다", () => {
      const { getByText, queryByText } = render(() => <Pagination page={0} totalPages={25} />);
      expect(getByText("1")).toBeTruthy();
      expect(getByText("10")).toBeTruthy();
      expect(queryByText("11")).toBeNull();
    });

    it("displayPages=5로 설정하면 5개씩 표시된다", () => {
      const { getByText, queryByText } = render(() => <Pagination page={0} totalPages={25} displayPages={5} />);
      expect(getByText("1")).toBeTruthy();
      expect(getByText("5")).toBeTruthy();
      expect(queryByText("6")).toBeNull();
    });

    it("page가 다음 그룹에 속하면 해당 그룹이 표시된다", () => {
      const { getByText, queryByText } = render(() => <Pagination page={12} totalPages={25} displayPages={5} />);
      expect(getByText("11")).toBeTruthy();
      expect(getByText("15")).toBeTruthy();
      expect(queryByText("10")).toBeNull();
    });
  });

  describe("페이지 클릭", () => {
    it("페이지 번호 클릭 시 onPageChange가 호출된다", () => {
      const handler = vi.fn();
      const { getByText } = render(() => <Pagination page={0} totalPages={10} onPageChange={handler} />);
      fireEvent.click(getByText("3"));
      expect(handler).toHaveBeenCalledWith(2);
    });
  });

  describe("네비게이션 버튼", () => {
    it("첫 그룹일 때 이전/첫 페이지 버튼이 disabled된다", () => {
      const { container } = render(() => <Pagination page={0} totalPages={25} />);
      const buttons = container.querySelectorAll("[data-button]");
      expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
      expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
    });

    it("마지막 그룹일 때 다음/마지막 페이지 버튼이 disabled된다", () => {
      const { container } = render(() => <Pagination page={20} totalPages={25} />);
      const buttons = container.querySelectorAll("[data-button]");
      const lastIdx = buttons.length - 1;
      expect((buttons[lastIdx] as HTMLButtonElement).disabled).toBe(true);
      expect((buttons[lastIdx - 1] as HTMLButtonElement).disabled).toBe(true);
    });

    it("다음 그룹 버튼 클릭 시 다음 그룹 첫 페이지로 이동한다", () => {
      const handler = vi.fn();
      const { container } = render(() => (
        <Pagination page={0} totalPages={25} displayPages={10} onPageChange={handler} />
      ));
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 2]); // 다음 그룹 버튼
      expect(handler).toHaveBeenCalledWith(10);
    });

    it("이전 그룹 버튼 클릭 시 이전 그룹 마지막 페이지로 이동한다", () => {
      const handler = vi.fn();
      const { container } = render(() => (
        <Pagination page={12} totalPages={25} displayPages={10} onPageChange={handler} />
      ));
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[1]); // 이전 그룹 버튼
      expect(handler).toHaveBeenCalledWith(9);
    });

    it("첫 페이지 버튼 클릭 시 page=0으로 이동한다", () => {
      const handler = vi.fn();
      const { container } = render(() => <Pagination page={15} totalPages={25} onPageChange={handler} />);
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[0]); // 첫 페이지 버튼
      expect(handler).toHaveBeenCalledWith(0);
    });

    it("마지막 페이지 버튼 클릭 시 마지막 페이지로 이동한다", () => {
      const handler = vi.fn();
      const { container } = render(() => <Pagination page={0} totalPages={25} onPageChange={handler} />);
      const buttons = container.querySelectorAll("[data-button]");
      fireEvent.click(buttons[buttons.length - 1]); // 마지막 페이지 버튼
      expect(handler).toHaveBeenCalledWith(24);
    });
  });

  describe("현재 페이지 강조", () => {
    it("현재 페이지 버튼은 다른 버튼과 class가 다르다", () => {
      const { getByText } = render(() => <Pagination page={2} totalPages={10} />);
      const currentBtn = getByText("3"); // 0-based page=2 → 표시 "3"
      const otherBtn = getByText("1");
      expect(currentBtn.className).not.toBe(otherBtn.className);
    });
  });

  describe("class 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      // eslint-disable-next-line tailwindcss/no-custom-classname
      const { container } = render(() => <Pagination page={0} totalPages={10} class="my-pagination" />);
      const nav = container.firstChild as HTMLElement;
      expect(nav.classList.contains("my-pagination")).toBe(true);
    });
  });

  describe("HTML 속성 전달", () => {
    it("data-* 속성이 전달된다", () => {
      const { container } = render(() => <Pagination page={0} totalPages={10} data-testid="test-pagination" />);
      const nav = container.firstChild as HTMLElement;
      expect(nav.getAttribute("data-testid")).toBe("test-pagination");
    });
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/solid/tests/components/data/Pagination.spec.tsx --project=solid --run`
Expected: FAIL — 모듈 `../../../src/components/data/Pagination` 없음

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/data/Pagination.spec.tsx
git commit -m "test: Pagination 컴포넌트 테스트 작성"
```

---

### Task 2: Pagination 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/data/Pagination.tsx`
- Modify: `packages/solid/src/index.ts:33-36` — data 섹션에 export 추가

**Step 1: Pagination.tsx 작성**

```tsx
import { type Component, type JSX, splitProps } from "solid-js";
import { For } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-solidjs";
import { Button, type ButtonProps } from "../form-control/Button";
import { Icon } from "../display/Icon";

type PaginationSize = "sm" | "lg";

export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;
  totalPages: number;
  displayPages?: number;
  size?: PaginationSize;
}

const baseClass = clsx("inline-flex items-center");

const gapClasses: Record<PaginationSize | "default", string> = {
  default: "gap-1",
  sm: "gap-0.5",
  lg: "gap-1.5",
};

export const Pagination: Component<PaginationProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "page", "onPageChange", "totalPages", "displayPages", "size"]);

  const visibleCount = () => local.displayPages ?? 10;

  const pages = () => {
    const from = Math.floor(local.page / visibleCount()) * visibleCount();
    const to = Math.min(from + visibleCount(), local.totalPages);
    const result: number[] = [];
    for (let i = from; i < to; i++) {
      result.push(i);
    }
    return result;
  };

  const hasPrev = () => (pages()[0] ?? 0) > 0;
  const hasNext = () => (pages()[pages().length - 1] ?? 0) < local.totalPages - 1;

  const btnSize = (): ButtonProps["size"] => local.size;

  const getClassName = () => twMerge(baseClass, gapClasses[local.size ?? "default"], local.class);

  return (
    <nav {...rest} class={getClassName()}>
      <Button
        theme="base"
        variant="ghost"
        size={btnSize()}
        disabled={!hasPrev()}
        onClick={() => local.onPageChange?.(0)}
      >
        <Icon icon={IconChevronsLeft} size="1em" />
      </Button>
      <Button
        theme="base"
        variant="ghost"
        size={btnSize()}
        disabled={!hasPrev()}
        onClick={() => local.onPageChange?.((pages()[0] ?? 1) - 1)}
      >
        <Icon icon={IconChevronLeft} size="1em" />
      </Button>
      <For each={pages()}>
        {(p) => (
          <Button
            theme="base"
            variant={p === local.page ? "outline" : "ghost"}
            size={btnSize()}
            onClick={() => local.onPageChange?.(p)}
          >
            {p + 1}
          </Button>
        )}
      </For>
      <Button
        theme="base"
        variant="ghost"
        size={btnSize()}
        disabled={!hasNext()}
        onClick={() => local.onPageChange?.((pages()[pages().length - 1] ?? 0) + 1)}
      >
        <Icon icon={IconChevronRight} size="1em" />
      </Button>
      <Button
        theme="base"
        variant="ghost"
        size={btnSize()}
        disabled={!hasNext()}
        onClick={() => local.onPageChange?.(local.totalPages - 1)}
      >
        <Icon icon={IconChevronsRight} size="1em" />
      </Button>
    </nav>
  );
};
```

**Step 2: index.ts에 export 추가**

`packages/solid/src/index.ts`의 data 섹션(33행 부근)에 추가:

```typescript
export * from "./components/data/Pagination";
```

**Step 3: 테스트 실행하여 통과 확인**

Run: `pnpm vitest packages/solid/tests/components/data/Pagination.spec.tsx --project=solid --run`
Expected: PASS (전체 테스트 통과)

**Step 4: 타입체크 확인**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 5: 린트 확인**

Run: `pnpm lint packages/solid/src/components/data/Pagination.tsx`
Expected: 에러 없음

**Step 6: 커밋**

```bash
git add packages/solid/src/components/data/Pagination.tsx packages/solid/src/index.ts
git commit -m "feat: Pagination 컴포넌트 구현"
```

---

### Task 3: 데모 페이지 및 라우팅

**Files:**

- Create: `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- Modify: `packages/solid-demo/src/pages/Home.tsx:45` — Data 메뉴에 Pagination 추가
- Modify: `packages/solid-demo/src/main.tsx:31` — 라우트 추가

**Step 1: PaginationPage.tsx 작성**

```tsx
import { createSignal } from "solid-js";
import { Pagination, Topbar, TopbarContainer } from "@simplysm/solid";

export default function PaginationPage() {
  const [page1, setPage1] = createSignal(0);
  const [pageSm, setPageSm] = createSignal(0);
  const [pageMd, setPageMd] = createSignal(0);
  const [pageLg, setPageLg] = createSignal(0);
  const [pageCustom, setPageCustom] = createSignal(0);
  const [pageDisabled, setPageDisabled] = createSignal(0);

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Pagination</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본</h2>
            <p class="mb-2 text-sm text-base-500">page: {page1()}</p>
            <Pagination page={page1()} onPageChange={setPage1} totalPages={20} />
          </section>

          <section>
            <h2 class="mb-4 text-xl font-semibold">Size</h2>
            <div class="space-y-4">
              <div>
                <p class="mb-2 text-sm text-base-500">sm (page: {pageSm()})</p>
                <Pagination page={pageSm()} onPageChange={setPageSm} totalPages={20} size="sm" />
              </div>
              <div>
                <p class="mb-2 text-sm text-base-500">기본 (page: {pageMd()})</p>
                <Pagination page={pageMd()} onPageChange={setPageMd} totalPages={20} />
              </div>
              <div>
                <p class="mb-2 text-sm text-base-500">lg (page: {pageLg()})</p>
                <Pagination page={pageLg()} onPageChange={setPageLg} totalPages={20} size="lg" />
              </div>
            </div>
          </section>

          <section>
            <h2 class="mb-4 text-xl font-semibold">displayPages 커스텀 (5개씩)</h2>
            <p class="mb-2 text-sm text-base-500">page: {pageCustom()}</p>
            <Pagination page={pageCustom()} onPageChange={setPageCustom} totalPages={25} displayPages={5} />
          </section>

          <section>
            <h2 class="mb-4 text-xl font-semibold">Disabled (totalPages=0)</h2>
            <Pagination page={pageDisabled()} onPageChange={setPageDisabled} totalPages={0} />
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
```

**Step 2: Home.tsx 수정**

`packages/solid-demo/src/pages/Home.tsx`의 Data children 배열(44행 부근)에 추가:

```typescript
{ title: "Pagination", href: "/home/data/pagination" },
```

**Step 3: main.tsx 수정**

`packages/solid-demo/src/main.tsx`의 data 라우트 섹션(31행 부근)에 추가:

```typescript
<Route path="/home/data/pagination" component={lazy(() => import("./pages/data/PaginationPage"))} />
```

**Step 4: 타입체크 확인**

Run: `pnpm typecheck packages/solid-demo`
Expected: 에러 없음

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/data/PaginationPage.tsx packages/solid-demo/src/pages/Home.tsx packages/solid-demo/src/main.tsx
git commit -m "feat: Pagination 데모 페이지 및 라우팅 추가"
```

---

### Task 4: 전체 검증

**Step 1: 전체 solid 테스트 실행**

Run: `pnpm vitest --project=solid --run`
Expected: 전체 PASS (기존 475 + 새 테스트)

**Step 2: 린트 전체 확인**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: 에러 없음

**Step 3: 타입체크 전체 확인**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: 에러 없음
