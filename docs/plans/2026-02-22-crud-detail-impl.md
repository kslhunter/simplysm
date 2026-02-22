# CrudDetail Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** CrudSheet과 일관된 패턴으로 단건 CRUD 컴포넌트(CrudDetail)를 구현한다.

**Architecture:** CrudSheet의 compound component + plain object sub-component + createControllableStore 패턴을 그대로 따른다. 모드 자동 감지(page/modal/control)를 통해 하나의 컴포넌트로 모든 context에서 동작한다.

**Tech Stack:** SolidJS, Tailwind CSS, @tabler/icons-solidjs, @solid-primitives/event-listener, @simplysm/core-common

---

### Task 1: 타입 정의

**Files:**
- Create: `packages/solid/src/components/data/crud-detail/types.ts`

**Step 1: Write the failing test**

Create: `packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx`

```tsx
import { describe, it, expect } from "vitest";
import type { CrudDetailToolsDef, CrudDetailBeforeDef, CrudDetailAfterDef } from "../../../../src/components/data/crud-detail/types";

describe("CrudDetail types", () => {
  it("CrudDetailToolsDef 타입이 __type 필드를 가진다", () => {
    const def: CrudDetailToolsDef = {
      __type: "crud-detail-tools",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-tools");
  });

  it("CrudDetailBeforeDef 타입이 __type 필드를 가진다", () => {
    const def: CrudDetailBeforeDef = {
      __type: "crud-detail-before",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-before");
  });

  it("CrudDetailAfterDef 타입이 __type 필드를 가진다", () => {
    const def: CrudDetailAfterDef = {
      __type: "crud-detail-after",
      children: null as any,
    };
    expect(def.__type).toBe("crud-detail-after");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
import type { JSX } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import type { DateTime } from "@simplysm/core-common";

// ── Detail Info ──

export interface CrudDetailInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}

// ── Context ──

export interface CrudDetailContext<TData> {
  data: TData;
  setData: SetStoreFunction<TData>;
  info: () => CrudDetailInfo;
  busy: () => boolean;
  hasChanges: () => boolean;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ── Props ──

export interface CrudDetailProps<TData extends object> {
  load: () => Promise<{ data: TData; info: CrudDetailInfo }>;
  children: (ctx: CrudDetailContext<TData>) => JSX.Element;

  submit?: (data: TData) => Promise<boolean | undefined>;
  toggleDelete?: (del: boolean) => Promise<boolean | undefined>;
  canEdit?: () => boolean;

  data?: TData;
  onDataChange?: (data: TData) => void;

  class?: string;
}

// ── Sub-component Defs ──

export interface CrudDetailToolsDef {
  __type: "crud-detail-tools";
  children: JSX.Element;
}

export interface CrudDetailBeforeDef {
  __type: "crud-detail-before";
  children: JSX.Element;
}

export interface CrudDetailAfterDef {
  __type: "crud-detail-after";
  children: JSX.Element;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/crud-detail/types.ts packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx
git commit -m "feat(solid): add CrudDetail type definitions"
```

---

### Task 2: Sub-component 팩토리 + Type Guard

**Files:**
- Create: `packages/solid/src/components/data/crud-detail/CrudDetailTools.tsx`
- Create: `packages/solid/src/components/data/crud-detail/CrudDetailBefore.tsx`
- Create: `packages/solid/src/components/data/crud-detail/CrudDetailAfter.tsx`
- Modify: `packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx`

**Step 1: Write the failing tests**

Add to `CrudDetail.spec.tsx`:

```tsx
import {
  CrudDetailTools,
  isCrudDetailToolsDef,
} from "../../../../src/components/data/crud-detail/CrudDetailTools";
import {
  CrudDetailBefore,
  isCrudDetailBeforeDef,
} from "../../../../src/components/data/crud-detail/CrudDetailBefore";
import {
  CrudDetailAfter,
  isCrudDetailAfterDef,
} from "../../../../src/components/data/crud-detail/CrudDetailAfter";

describe("CrudDetail sub-components", () => {
  it("CrudDetailTools: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudDetailTools({
      children: <div>tools</div>,
    });

    expect(isCrudDetailToolsDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-tools");
  });

  it("CrudDetailBefore: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudDetailBefore({
      children: <div>before</div>,
    });

    expect(isCrudDetailBeforeDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-before");
  });

  it("CrudDetailAfter: plain object를 반환하고 type guard로 식별 가능하다", () => {
    const def = CrudDetailAfter({
      children: <div>after</div>,
    });

    expect(isCrudDetailAfterDef(def)).toBe(true);
    expect((def as any).__type).toBe("crud-detail-after");
  });

  it("type guard: 일반 객체는 false를 반환한다", () => {
    expect(isCrudDetailToolsDef({})).toBe(false);
    expect(isCrudDetailToolsDef(null)).toBe(false);
    expect(isCrudDetailBeforeDef("string")).toBe(false);
    expect(isCrudDetailAfterDef(42)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: FAIL — modules not found

**Step 3: Write implementation**

`CrudDetailTools.tsx`:
```tsx
import type { JSX } from "solid-js";
import type { CrudDetailToolsDef } from "./types";

export function isCrudDetailToolsDef(value: unknown): value is CrudDetailToolsDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-tools"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudDetailTools(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-detail-tools",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

`CrudDetailBefore.tsx`:
```tsx
import type { JSX } from "solid-js";
import type { CrudDetailBeforeDef } from "./types";

export function isCrudDetailBeforeDef(value: unknown): value is CrudDetailBeforeDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-before"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudDetailBefore(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-detail-before",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

`CrudDetailAfter.tsx`:
```tsx
import type { JSX } from "solid-js";
import type { CrudDetailAfterDef } from "./types";

export function isCrudDetailAfterDef(value: unknown): value is CrudDetailAfterDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-after"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudDetailAfter(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-detail-after",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/crud-detail/CrudDetailTools.tsx packages/solid/src/components/data/crud-detail/CrudDetailBefore.tsx packages/solid/src/components/data/crud-detail/CrudDetailAfter.tsx packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx
git commit -m "feat(solid): add CrudDetail sub-component factories and type guards"
```

---

### Task 3: CrudDetail 메인 컴포넌트

**Files:**
- Create: `packages/solid/src/components/data/crud-detail/CrudDetail.tsx`
- Modify: `packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx`

**Step 1: Write the failing tests**

Add to `CrudDetail.spec.tsx`:

```tsx
import type { JSX } from "solid-js";
import { render } from "@solidjs/testing-library";
import { CrudDetail } from "../../../../src/components/data/crud-detail/CrudDetail";
import { ConfigContext } from "../../../../src/providers/ConfigContext";
import { NotificationProvider } from "../../../../src/components/feedback/notification/NotificationProvider";

interface TestData {
  id?: number;
  name: string;
}

function TestWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>
      <NotificationProvider>{props.children}</NotificationProvider>
    </ConfigContext.Provider>
  );
}

describe("CrudDetail rendering", () => {
  it("기본 렌더링: load 후 children이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })}
        >
          {(ctx) => <div data-testid="name">{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("홍길동");
  });

  it("submit 제공 시 저장 버튼이 toolbar에 표시된다 (page/control 모드)", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })}
          submit={async () => true}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("저장");
  });

  it("submit 미제공 시 저장 버튼이 없다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
  });

  it("toggleDelete 제공 시 삭제 버튼이 toolbar에 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })}
          toggleDelete={async () => true}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("삭제");
  });

  it("새로고침 버튼이 항상 toolbar에 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("새로고침");
  });

  it("canEdit=false 시 toolbar이 표시되지 않는다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: { isNew: false, isDeleted: false },
          })}
          submit={async () => true}
          canEdit={() => false}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
    expect(container.textContent).not.toContain("새로고침");
  });

  it("lastModifiedAt/By가 있으면 수정 정보가 표시된다", async () => {
    const { DateTime } = await import("@simplysm/core-common");

    const { container } = render(() => (
      <TestWrapper>
        <CrudDetail<TestData>
          load={async () => ({
            data: { id: 1, name: "홍길동" },
            info: {
              isNew: false,
              isDeleted: false,
              lastModifiedAt: new DateTime(2026, 1, 15, 10, 30),
              lastModifiedBy: "관리자",
            },
          })}
        >
          {(ctx) => <div>{ctx.data.name}</div>}
        </CrudDetail>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("최종 수정");
    expect(container.textContent).toContain("관리자");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: FAIL — CrudDetail module not found

**Step 3: Write implementation**

```tsx
import {
  children,
  createMemo,
  createSignal,
  type JSX,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { reconcile, unwrap } from "solid-js/store";
import { createControllableStore } from "../../../hooks/createControllableStore";
import { objClone, objEqual } from "@simplysm/core-common";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { TopbarContext, createTopbarActions } from "../../layout/topbar/TopbarContext";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import { Dialog } from "../../disclosure/Dialog";
import { createEventListener } from "@solid-primitives/event-listener";
import clsx from "clsx";
import {
  IconDeviceFloppy,
  IconRefresh,
  IconTrash,
  IconTrashOff,
} from "@tabler/icons-solidjs";
import { isCrudDetailToolsDef, CrudDetailTools } from "./CrudDetailTools";
import { isCrudDetailBeforeDef, CrudDetailBefore } from "./CrudDetailBefore";
import { isCrudDetailAfterDef, CrudDetailAfter } from "./CrudDetailAfter";
import type {
  CrudDetailBeforeDef,
  CrudDetailAfterDef,
  CrudDetailContext,
  CrudDetailInfo,
  CrudDetailProps,
  CrudDetailToolsDef,
} from "./types";

interface CrudDetailComponent {
  <TData extends object>(props: CrudDetailProps<TData>): JSX.Element;
  Tools: typeof CrudDetailTools;
  Before: typeof CrudDetailBefore;
  After: typeof CrudDetailAfter;
}

const CrudDetailBase = <TData extends object>(props: CrudDetailProps<TData>) => {
  const [local, _rest] = splitProps(props, [
    "load",
    "children",
    "submit",
    "toggleDelete",
    "canEdit",
    "data",
    "onDataChange",
    "class",
  ]);

  const noti = useNotification();
  const topbarCtx = useContext(TopbarContext);
  const dialogInstance = useDialogInstance();

  const isModal = dialogInstance !== undefined;
  const isPage = !isModal && topbarCtx != null;

  const canEdit = () => local.canEdit?.() ?? true;

  // -- State --
  const [data, setData] = createControllableStore<TData>({
    value: () => local.data ?? ({} as TData),
    onChange: () => local.onDataChange,
  });
  let originalData: TData | undefined;

  const [info, setInfo] = createSignal<CrudDetailInfo>();
  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  let formRef: HTMLFormElement | undefined;

  // -- Load --
  async function doLoad() {
    setBusyCount((c) => c + 1);
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 호출
    await noti.try(async () => {
      const result = await local.load();
      setData(reconcile(result.data) as any);
      originalData = objClone(result.data);
      setInfo(result.info);
    }, "조회 실패");
    setBusyCount((c) => c - 1);
    setReady(true);
  }

  onMount(() => {
    void doLoad();
  });

  // -- Change Detection --
  /* eslint-disable solid/reactivity -- 이벤트 핸들러에서만 호출, store 즉시 읽기 */
  function hasChanges(): boolean {
    if (originalData == null) return false;
    return !objEqual(unwrap(data) as unknown, originalData as unknown);
  }
  /* eslint-enable solid/reactivity */

  // -- Refresh --
  async function handleRefresh() {
    if (hasChanges()) {
      if (!confirm("변경사항을 무시하시겠습니까?")) return;
    }
    await doLoad();
  }

  // -- Save --
  async function handleSave() {
    if (busyCount() > 0) return;
    if (!local.submit) return;

    const currentInfo = info();
    if (currentInfo && !currentInfo.isNew && !hasChanges()) {
      noti.info("안내", "변경사항이 없습니다.");
      return;
    }

    setBusyCount((c) => c + 1);
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 호출
    await noti.try(async () => {
      const result = await local.submit!(objClone(unwrap(data)) as TData);
      if (result) {
        noti.success("저장 완료", "저장되었습니다.");
        if (dialogInstance) {
          dialogInstance.close(true);
        } else {
          await doLoad();
        }
      }
    }, "저장 실패");
    setBusyCount((c) => c - 1);
  }

  async function handleFormSubmit(e: Event) {
    e.preventDefault();
    await handleSave();
  }

  // -- Toggle Delete --
  async function handleToggleDelete() {
    if (busyCount() > 0) return;
    if (!local.toggleDelete) return;

    const currentInfo = info();
    if (!currentInfo) return;

    const del = !currentInfo.isDeleted;

    setBusyCount((c) => c + 1);
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 호출
    await noti.try(async () => {
      const result = await local.toggleDelete!(del);
      if (result) {
        noti.success(del ? "삭제 완료" : "복구 완료", del ? "삭제되었습니다." : "복구되었습니다.");
        if (dialogInstance) {
          dialogInstance.close(true);
        } else {
          await doLoad();
        }
      }
    }, del ? "삭제 실패" : "복구 실패");
    setBusyCount((c) => c - 1);
  }

  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      void handleRefresh();
    }
  });

  // -- Topbar Actions (Page mode) --
  if (topbarCtx) {
    createTopbarActions(() => (
      <>
        <Show when={canEdit() && local.submit}>
          <Button
            size="lg"
            variant="ghost"
            theme="primary"
            onClick={() => formRef?.requestSubmit()}
          >
            <Icon icon={IconDeviceFloppy} class="mr-1" />
            저장
          </Button>
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={() => void handleRefresh()}>
          <Icon icon={IconRefresh} class="mr-1" />
          새로고침
        </Button>
      </>
    ));
  }

  // -- Context --
  const ctx: CrudDetailContext<TData> = {
    data,
    setData,
    info: () => info()!,
    busy: () => busyCount() > 0,
    hasChanges,
    save: handleSave,
    refresh: handleRefresh,
  };

  // -- Children Resolution --
  const rendered = children(() => local.children(ctx));
  const defs = createMemo(() => {
    const arr = rendered.toArray();
    return {
      tools: arr.find(isCrudDetailToolsDef) as CrudDetailToolsDef | undefined,
      before: arr.find(isCrudDetailBeforeDef) as CrudDetailBeforeDef | undefined,
      after: arr.find(isCrudDetailAfterDef) as CrudDetailAfterDef | undefined,
    };
  });

  const formContent = () =>
    rendered
      .toArray()
      .filter(
        (el) =>
          !isCrudDetailToolsDef(el) && !isCrudDetailBeforeDef(el) && !isCrudDetailAfterDef(el),
      );

  // -- Render --
  return (
    <>
      {/* Modal mode: Dialog.Action (refresh button in header) */}
      <Show when={isModal}>
        <Dialog.Action>
          <button
            class="flex items-center px-2 text-base-400 hover:text-base-600"
            onClick={() => void handleRefresh()}
          >
            <Icon icon={IconRefresh} />
          </button>
        </Dialog.Action>
      </Show>

      <BusyContainer
        ready={ready()}
        busy={busyCount() > 0}
        class={clsx("flex h-full flex-col", local.class)}
      >
        {/* Toolbar (page/control mode) */}
        <Show when={!isModal && canEdit()}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={local.submit}>
              <Button
                size="sm"
                theme="primary"
                variant="ghost"
                onClick={() => formRef?.requestSubmit()}
              >
                <Icon icon={IconDeviceFloppy} class="mr-1" />
                저장
              </Button>
            </Show>
            <Button
              size="sm"
              theme="info"
              variant="ghost"
              onClick={() => void handleRefresh()}
            >
              <Icon icon={IconRefresh} class="mr-1" />
              새로고침
            </Button>
            <Show when={local.toggleDelete && info()}>
              {(_) => (
                <Button
                  size="sm"
                  theme="danger"
                  variant="ghost"
                  onClick={() => void handleToggleDelete()}
                >
                  <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
                  {info()!.isDeleted ? "복구" : "삭제"}
                </Button>
              )}
            </Show>
            <Show when={defs().tools}>{(toolsDef) => toolsDef().children}</Show>
          </div>
        </Show>

        {/* Before (outside form) */}
        <Show when={defs().before}>{(beforeDef) => beforeDef().children}</Show>

        {/* Form */}
        <form ref={formRef} class="flex-1 overflow-auto p-2" onSubmit={handleFormSubmit}>
          {formContent()}
        </form>

        {/* Last modified info */}
        <Show when={info()?.lastModifiedAt}>
          {(_) => (
            <div class="px-2 pb-1 text-xs text-base-400">
              최종 수정: {info()!.lastModifiedAt!.toFormatString("yyyy-MM-dd HH:mm")}
              <Show when={info()?.lastModifiedBy}>
                {" "}
                ({info()!.lastModifiedBy})
              </Show>
            </div>
          )}
        </Show>

        {/* After (outside form) */}
        <Show when={defs().after}>{(afterDef) => afterDef().children}</Show>

        {/* Modal mode: bottom bar */}
        <Show when={isModal && canEdit()}>
          <div class="flex gap-2 border-t border-base-200 p-2">
            <div class="flex-1" />
            <Show when={local.toggleDelete && info()}>
              {(_) => (
                <Button
                  size="sm"
                  theme="danger"
                  onClick={() => void handleToggleDelete()}
                >
                  <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
                  {info()!.isDeleted ? "복구" : "삭제"}
                </Button>
              )}
            </Show>
            <Show when={local.submit}>
              <Button
                size="sm"
                theme="primary"
                onClick={() => formRef?.requestSubmit()}
              >
                확인
              </Button>
            </Show>
          </div>
        </Show>
      </BusyContainer>
    </>
  );
};

export const CrudDetail = CrudDetailBase as unknown as CrudDetailComponent;
CrudDetail.Tools = CrudDetailTools;
CrudDetail.Before = CrudDetailBefore;
CrudDetail.After = CrudDetailAfter;
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/components/data/crud-detail/CrudDetail.tsx packages/solid/tests/components/data/crud-detail/CrudDetail.spec.tsx
git commit -m "feat(solid): implement CrudDetail main component"
```

---

### Task 4: Export 등록

**Files:**
- Modify: `packages/solid/src/index.ts`

**Step 1: Write the failing test**

이 task는 export 등록이므로 typecheck로 검증한다.

**Step 2: Add exports**

`packages/solid/src/index.ts`의 data 컴포넌트 export 영역 (`crud-sheet` 아래)에 추가:

```typescript
export * from "./components/data/crud-detail/CrudDetail";
export * from "./components/data/crud-detail/types";
```

**Step 3: Run typecheck to verify**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): export CrudDetail from package index"
```

---

### Task 5: 전체 검증

**Step 1: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/solid/src/components/data/crud-detail`
Expected: PASS (또는 lint --fix로 수정)

**Step 3: Full test**

Run: `pnpm vitest packages/solid/tests/components/data/crud-detail/ --project=solid --run`
Expected: PASS

**Step 4: Commit (if any fixes)**

```bash
git add -A && git commit -m "fix(solid): lint fixes for CrudDetail"
```
