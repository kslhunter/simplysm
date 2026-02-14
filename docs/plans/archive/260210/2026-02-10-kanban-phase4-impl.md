# Kanban Phase 4: 선택 시스템 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kanban 컴포넌트에 Shift+Click 개별 선택, ring 피드백, 레인별 전체 선택 체크박스를 추가한다.

**Architecture:** Board Context에 `selectedValues`/`toggleSelection`/`setSelectedValues`를 추가하고, Lane Context에 `registerCard`/`unregisterCard`를 추가한다. Card는 mount/unmount 시 Lane에 등록하며, Shift+Click 시 Board의 selection을 토글한다. Lane은 등록된 카드 목록으로 전체 선택 상태를 계산하여 CheckBox를 렌더링한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, `@solidjs/testing-library`, Vitest (Playwright browser)

**Worktree:** `/home/kslhunter/projects/simplysm/.worktrees/kanban-redesign/`

**참고 파일:**

- 설계: `docs/plans/2026-02-10-kanban-phase4-selection-design.md`
- 원본 계획: `docs/plans/2026-02-10-kanban-redesign.md` (Phase 4 섹션)

---

## Task 1: KanbanContext 타입 확장

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/KanbanContext.ts`

**Step 1: KanbanContextValue에 selection 필드 추가**

`KanbanContext.ts`를 열고, `KanbanContextValue` 인터페이스에 3개 필드를 추가한다:

```typescript
export interface KanbanContextValue<L = unknown, T = unknown> {
  dragCard: Accessor<KanbanCardRef<L, T> | undefined>;
  setDragCard: Setter<KanbanCardRef<L, T> | undefined>;
  onDropTo: (
    targetLaneValue: L | undefined,
    targetCardValue: T | undefined,
    position: "before" | "after" | undefined,
  ) => void;

  // Selection (Phase 4)
  selectedValues: Accessor<T[]>;
  setSelectedValues: (updater: T[] | ((prev: T[]) => T[])) => void;
  toggleSelection: (value: T) => void;
}
```

**Step 2: KanbanLaneContextValue에 card 등록 필드 추가**

`KanbanLaneContextValue` 인터페이스에 2개 필드를 추가한다:

```typescript
export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;

  // Card registration (Phase 4)
  registerCard: (id: string, info: { value: T | undefined; selectable: boolean }) => void;
  unregisterCard: (id: string) => void;
}
```

**Step 3: 타입체크 실행**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm typecheck packages/solid`
Expected: 타입 에러 발생 (Kanban.tsx에서 Context 값 생성 시 새 필드 미구현). 이건 정상 — Task 2~4에서 해결.

**Step 4: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add packages/solid/src/components/layout/kanban/KanbanContext.ts
git commit -m "feat(solid): KanbanContext에 selection/card-registration 타입 추가"
```

---

## Task 2: Board(Kanban)에 selection 상태 추가

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (KanbanProps, KanbanBase 함수)

**Step 1: KanbanProps 확장**

`KanbanProps` 인터페이스에 selection props 추가:

```typescript
export interface KanbanProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onDrop"> {
  onDrop?: (info: KanbanDropInfo) => void;
  selectedValues?: unknown[];
  onSelectedValuesChange?: (values: unknown[]) => void;
  children?: JSX.Element;
}
```

**Step 2: KanbanBase에 selection 로직 구현**

`KanbanBase` 함수 내부를 수정한다.

`splitProps`의 키 목록에 `"selectedValues"`, `"onSelectedValuesChange"` 추가:

```typescript
const [local, rest] = splitProps(props, ["children", "class", "onDrop", "selectedValues", "onSelectedValuesChange"]);
```

`createPropSignal`로 selection 상태 생성 (기존 `dragCard` signal 아래에 추가):

```typescript
const [selectedValues, setSelectedValues] = createPropSignal({
  value: () => local.selectedValues ?? ([] as unknown[]),
  onChange: () => local.onSelectedValuesChange,
});

const toggleSelection = (value: unknown) => {
  setSelectedValues((prev) => {
    const idx = prev.indexOf(value);
    if (idx >= 0) {
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    }
    return [...prev, value];
  });
};
```

`contextValue`에 selection 필드 추가:

```typescript
const contextValue: KanbanContextValue = {
  dragCard,
  setDragCard,
  onDropTo,
  selectedValues,
  setSelectedValues,
  toggleSelection,
};
```

**Step 3: 타입체크 실행**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm typecheck packages/solid`
Expected: Lane과 Card에서 아직 에러 (Lane Context에 registerCard/unregisterCard 미구현). 정상.

**Step 4: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Board에 selectedValues/toggleSelection 상태 추가"
```

---

## Task 3: Lane에 카드 등록 + 전체 선택 체크박스

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (KanbanLane 함수, import)

**Step 1: import 추가**

파일 상단의 solid-js import에 `createMemo` 추가:

```typescript
import {
  children,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
```

`CheckBox` import 추가 (기존 import 블록 근처에):

```typescript
import { CheckBox } from "../../form-control/checkbox/CheckBox";
```

**Step 2: KanbanLane에 카드 등록 저장소 추가**

`KanbanLane` 함수 내부에서, 기존 `const boardCtx = useKanbanContext();` 아래에 카드 등록 로직 추가:

```typescript
const [registeredCards, setRegisteredCards] = createSignal<Map<string, { value: unknown; selectable: boolean }>>(
  new Map(),
);

const registerCard = (id: string, info: { value: unknown; selectable: boolean }) => {
  setRegisteredCards((prev) => new Map(prev).set(id, info));
};

const unregisterCard = (id: string) => {
  setRegisteredCards((prev) => {
    const next = new Map(prev);
    next.delete(id);
    return next;
  });
};
```

**Step 3: 파생 상태 추가**

카드 등록 저장소 아래에 파생 상태 추가:

```typescript
const selectableCards = createMemo(() =>
  [...registeredCards().values()].filter((c) => c.selectable && c.value != null),
);

const hasSelectableCards = () => selectableCards().length > 0;

const isAllSelected = () => {
  const cards = selectableCards();
  if (cards.length === 0) return false;
  return cards.every((c) => boardCtx.selectedValues().includes(c.value));
};
```

**Step 4: 전체 선택/해제 핸들러**

```typescript
const handleSelectAll = (checked: boolean) => {
  const laneCardValues = selectableCards().map((c) => c.value!);
  boardCtx.setSelectedValues((prev: unknown[]) => {
    if (checked) {
      const toAdd = laneCardValues.filter((v) => !prev.includes(v));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    } else {
      const toRemove = new Set(laneCardValues);
      const next = prev.filter((v) => !toRemove.has(v));
      return next.length === prev.length ? prev : next;
    }
  });
};
```

**Step 5: laneContextValue에 등록 필드 추가**

기존 `laneContextValue` 객체를 확장:

```typescript
const laneContextValue: KanbanLaneContextValue = {
  value: () => local.value,
  dropTarget,
  setDropTarget,
  registerCard,
  unregisterCard,
};
```

**Step 6: 헤더에 전체 선택 체크박스 UI 추가**

`LaneInner` 컴포넌트 내부에서 `hasHeader` 조건을 확장:

```typescript
const hasHeader = () =>
  local.collapsible || hasSelectableCards() || slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;
```

헤더 JSX에서, 접기 버튼(`<Show when={local.collapsible}>`) 바로 아래에 전체 선택 체크박스 추가:

```tsx
<Show when={hasSelectableCards()}>
  <CheckBox value={isAllSelected()} onValueChange={handleSelectAll} inline theme="white" />
</Show>
```

전체 헤더 JSX:

```tsx
<Show when={hasHeader()}>
  <div class={laneHeaderBaseClass}>
    <Show when={local.collapsible}>
      <button type="button" class={collapseButtonClass} onClick={() => setCollapsed((prev) => !prev)}>
        <Icon icon={collapsed() ? IconEyeOff : IconEye} size="1em" />
      </button>
    </Show>
    <Show when={hasSelectableCards()}>
      <CheckBox value={isAllSelected()} onValueChange={handleSelectAll} inline theme="white" />
    </Show>
    <div class="flex-1">{slots().kanbanLaneTitle}</div>
    <Show when={slots().kanbanLaneTools.length > 0}>
      <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
    </Show>
  </div>
</Show>
```

**Step 7: 타입체크 실행**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm typecheck packages/solid`
Expected: Card에서 아직 타입 에러 가능 (selectable prop 미추가). Task 4에서 해결.

**Step 8: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Lane에 카드 등록 저장소 및 전체 선택 체크박스 추가"
```

---

## Task 4: Card에 selection 기능 추가

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (KanbanCardProps, KanbanCard 함수)

**Step 1: KanbanCardProps에 selectable 추가**

```typescript
export interface KanbanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "draggable"> {
  value?: unknown;
  draggable?: boolean;
  selectable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}
```

**Step 2: splitProps에 selectable 추가**

```typescript
const [local, rest] = splitProps(props, ["children", "class", "value", "draggable", "selectable", "contentClass"]);
```

**Step 3: Card에 Context 등록/해제 추가**

기존 `let hostRef!: HTMLDivElement;` 아래에:

```typescript
const cardId = crypto.randomUUID();

createEffect(() => {
  laneCtx.registerCard(cardId, {
    value: local.value,
    selectable: local.selectable ?? false,
  });
});

onCleanup(() => {
  laneCtx.unregisterCard(cardId);
});
```

**주의:** `onCleanup` import는 이미 존재한다 (파일 상단의 solid-js import).

**Step 4: Shift+Click 핸들러 추가**

기존 `handleDrop` 함수 아래에:

```typescript
const handleClick = (e: MouseEvent) => {
  if (!e.shiftKey) return;
  if (!local.selectable) return;
  if (local.value == null) return;
  e.preventDefault();
  e.stopPropagation();
  boardCtx.toggleSelection(local.value);
};
```

**Step 5: 선택 상태 파생값 추가**

```typescript
const isSelected = () => local.value != null && boardCtx.selectedValues().includes(local.value);
```

**Step 6: JSX 업데이트 — onClick 및 ring 피드백**

Card 호스트 div에 `onClick` 추가:

```tsx
<div
  {...rest}
  ref={hostRef}
  data-kanban-card
  draggable={isDraggable()}
  class={twMerge(cardHostClass, isDraggable() && "cursor-grab", isDragSource() && "opacity-30", local.class)}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onClick={handleClick}
>
```

Card 래핑에 ring 피드백 추가:

```tsx
<Card class={twMerge(cardContentClass, isSelected() && "ring-2 ring-primary-500", local.contentClass)}>
  {local.children}
</Card>
```

**Step 7: 타입체크 + 린트 실행**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm typecheck packages/solid && pnpm lint packages/solid/src/components/layout/kanban`
Expected: PASS (모든 타입 에러 해결)

**Step 8: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Card에 selectable prop, Shift+Click 선택, ring 피드백 추가"
```

---

## Task 5: 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/layout/kanban/Kanban.selection.spec.tsx`

**Step 1: 테스트 파일 작성**

테스트 패턴은 `packages/solid/tests/components/form-control/checkbox/CheckBox.spec.tsx`를 따른다.

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal, For } from "solid-js";
import { Kanban } from "../../../../src/components/layout/kanban/Kanban";

describe("Kanban 선택 시스템", () => {
  // 테스트 헬퍼: 기본 Kanban 렌더링
  function renderKanban(options?: {
    selectedValues?: unknown[];
    onSelectedValuesChange?: (v: unknown[]) => void;
    selectable?: boolean;
  }) {
    return render(() => (
      <Kanban
        selectedValues={options?.selectedValues}
        onSelectedValuesChange={options?.onSelectedValuesChange}
        class="h-[400px]"
      >
        <Kanban.Lane value="lane-1">
          <Kanban.LaneTitle>Lane 1</Kanban.LaneTitle>
          <Kanban.Card value={1} selectable={options?.selectable ?? true} contentClass="p-2">
            Card 1
          </Kanban.Card>
          <Kanban.Card value={2} selectable={options?.selectable ?? true} contentClass="p-2">
            Card 2
          </Kanban.Card>
          <Kanban.Card value={3} selectable={false} contentClass="p-2">
            Card 3 (not selectable)
          </Kanban.Card>
        </Kanban.Lane>
        <Kanban.Lane value="lane-2">
          <Kanban.LaneTitle>Lane 2</Kanban.LaneTitle>
          <Kanban.Card value={4} selectable contentClass="p-2">
            Card 4
          </Kanban.Card>
        </Kanban.Lane>
      </Kanban>
    ));
  }

  describe("Shift+Click 선택", () => {
    it("Shift+Click으로 카드가 선택된다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });

      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });

      expect(handleChange).toHaveBeenCalledWith([1]);
    });

    it("이미 선택된 카드를 Shift+Click하면 선택 해제된다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [1],
        onSelectedValuesChange: handleChange,
      });

      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });

      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it("Shift 없는 클릭은 선택을 변경하지 않는다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });

      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it("selectable=false인 카드는 Shift+Click해도 선택되지 않는다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });

      const card3 = getByText("Card 3 (not selectable)").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card3, { shiftKey: true });

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("선택 시각 피드백", () => {
    it("선택된 카드에 ring 클래스가 적용된다", () => {
      const { getByText } = renderKanban({ selectedValues: [1] });

      const card1Content = getByText("Card 1").closest("[data-card]") as HTMLElement;
      expect(card1Content.classList.contains("ring-2")).toBe(true);
      expect(card1Content.classList.contains("ring-primary-500")).toBe(true);
    });

    it("선택되지 않은 카드에는 ring 클래스가 없다", () => {
      const { getByText } = renderKanban({ selectedValues: [1] });

      const card2Content = getByText("Card 2").closest("[data-card]") as HTMLElement;
      expect(card2Content.classList.contains("ring-2")).toBe(false);
    });
  });

  describe("레인별 전체 선택 체크박스", () => {
    it("selectable 카드가 있는 레인에 전체 선택 체크박스가 표시된다", () => {
      const { container } = renderKanban({ selectedValues: [] });

      const checkboxes = container.querySelectorAll("[role='checkbox']");
      // lane-1에 selectable 카드 2개, lane-2에 selectable 카드 1개 → 체크박스 2개
      expect(checkboxes.length).toBe(2);
    });

    it("전체 선택 체크박스 클릭 시 레인 내 모든 selectable 카드가 선택된다", () => {
      const handleChange = vi.fn();
      const { container } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });

      // 첫 번째 레인의 체크박스 클릭
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      fireEvent.click(checkbox);

      // lane-1의 selectable 카드는 value 1, 2 (3은 selectable=false)
      expect(handleChange).toHaveBeenCalledWith([1, 2]);
    });

    it("전체 선택 상태에서 체크박스 클릭 시 레인 내 카드만 선택 해제된다", () => {
      const handleChange = vi.fn();
      const { container } = renderKanban({
        selectedValues: [1, 2, 4],
        onSelectedValuesChange: handleChange,
      });

      // 첫 번째 레인의 체크박스 클릭 (모두 선택 → 해제)
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      fireEvent.click(checkbox);

      // lane-1의 카드(1, 2)만 제거, lane-2의 카드(4)는 유지
      expect(handleChange).toHaveBeenCalledWith([4]);
    });

    it("모든 selectable 카드가 선택되면 체크박스가 체크 상태이다", () => {
      const { container } = renderKanban({ selectedValues: [1, 2] });

      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      expect(checkbox.getAttribute("aria-checked")).toBe("true");
    });

    it("일부만 선택되면 체크박스가 미체크 상태이다", () => {
      const { container } = renderKanban({ selectedValues: [1] });

      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("Uncontrolled 모드", () => {
    it("onSelectedValuesChange 없이도 Shift+Click 선택이 동작한다", () => {
      const { getByText } = renderKanban();

      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });

      const card1Content = getByText("Card 1").closest("[data-card]") as HTMLElement;
      expect(card1Content.classList.contains("ring-2")).toBe(true);
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm vitest packages/solid/tests/components/layout/kanban/Kanban.selection.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

**Step 3: 실패하는 테스트가 있으면 수정**

테스트가 실패하면 구현 코드 또는 테스트 코드를 수정하여 통과시킨다. 실패 메시지를 확인하고 원인을 파악한 후 수정.

**Step 4: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add packages/solid/tests/components/layout/kanban/Kanban.selection.spec.tsx
git commit -m "test(solid): Kanban 선택 시스템 단위 테스트 추가"
```

---

## Task 6: 데모 페이지 확장

**Files:**

- Modify: `packages/solid-demo/src/pages/data/KanbanPage.tsx`

**Step 1: 데모 페이지에 선택 섹션 추가**

파일 상단 import에서 `createSignal`은 이미 존재. `Label`은 사용하지 않으므로 추가 import 불필요.

`KanbanPage` 함수 내부에 선택 상태 시그널 추가 (기존 `lanes` 시그널 아래에):

```typescript
const [selected, setSelected] = createSignal<number[]>([]);
```

기존 마지막 `</section>` 아래에 새 섹션 추가:

```tsx
<section>
  <h2 class="mb-4 text-xl font-semibold">선택</h2>
  <p class="mb-2 text-sm text-base-500">Shift+Click으로 카드 선택/해제. 레인 헤더의 체크박스로 전체 선택.</p>
  <div class="mb-2 text-sm">선택된 카드: {selected().length > 0 ? selected().join(", ") : "(없음)"}</div>
  <div class="h-[500px]">
    <Kanban selectedValues={selected()} onSelectedValuesChange={setSelected} onDrop={handleDrop}>
      <For each={lanes()}>
        {(lane) => (
          <Kanban.Lane value={lane.id}>
            <Kanban.LaneTitle>
              {lane.title} ({lane.cards.length})
            </Kanban.LaneTitle>
            <Kanban.LaneTools>
              <Button size="sm" theme="primary" variant="ghost" class="size-8">
                <Icon icon={IconPlus} />
              </Button>
            </Kanban.LaneTools>
            <For each={lane.cards}>
              {(card) => (
                <Kanban.Card value={card.id} selectable draggable contentClass="p-2">
                  {card.title}
                </Kanban.Card>
              )}
            </For>
          </Kanban.Lane>
        )}
      </For>
    </Kanban>
  </div>
</section>
```

**Step 2: 타입체크 + 린트**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm typecheck packages/solid-demo && pnpm lint packages/solid-demo/src/pages/data/KanbanPage.tsx`
Expected: PASS

**Step 3: 커밋**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add packages/solid-demo/src/pages/data/KanbanPage.tsx
git commit -m "feat(solid-demo): Kanban 선택 데모 섹션 추가"
```

---

## Task 7: Playwright 데모 검증

**Step 1: dev 서버 실행**

Run (background): `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm dev`
서버가 시작되면 출력에서 URL 확인 (보통 `http://localhost:포트`).

**Step 2: Playwright로 데모 페이지 열기**

`browser_navigate`로 Kanban 데모 페이지를 연다. URL 패턴은 `http://localhost:{포트}/data/kanban`.

**Step 3: 선택 섹션으로 스크롤**

`browser_snapshot`으로 현재 상태를 확인하고, "선택" 섹션이 보이는지 확인한다. 필요시 스크롤.

**Step 4: 시각적 확인 사항**

1. 레인 헤더에 전체 선택 체크박스가 보이는지 확인 (스냅샷에서 checkbox role 확인)
2. Shift+Click 시 카드에 ring 테두리가 보이는지 확인 (스크린샷 촬영)
3. 전체 선택 체크박스 클릭 시 모든 카드가 선택되는지 확인
4. "선택된 카드" 텍스트가 업데이트되는지 확인

**Step 5: dev 서버 종료**

dev 서버 프로세스를 종료한다.

**Step 6: 문제 발견 시 수정**

시각적 또는 기능적 문제가 발견되면 해당 코드를 수정하고 다시 확인한다.

---

## Task 8: 최종 검증 + 커밋

**Step 1: 전체 테스트 실행**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm vitest --project=solid --run`
Expected: 모든 테스트 PASS

**Step 2: 타입체크 + 린트**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign && pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 3: 문제 해결**

린트/타입체크/테스트에서 에러가 발견되면 수정 후 재실행.

**Step 4: 최종 커밋 (수정 사항이 있는 경우)**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/kanban-redesign
git add -A
git commit -m "fix(solid): Kanban Phase 4 최종 검증 수정"
```
