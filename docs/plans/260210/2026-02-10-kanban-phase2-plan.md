# Kanban Phase 2: DnD 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kanban 컴포넌트에 네이티브 HTML5 드래그 앤 드롭 기능을 추가한다.

**Architecture:** Board Context에 `dragCard` 시그널을 두고, Card가 dragover 시 자기 DOM 요소 + value + position(before/after)을 Lane Context에 전달한다. Lane이 단일 placeholder div를 소유하고, `insertBefore`로 DOM 위치를 직접 제어한다. Lane 이탈 감지는 `dragenter`/`dragleave` 카운터 패턴으로 처리한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, 네이티브 HTML5 DnD API

**설계 문서:** `docs/plans/2026-02-10-kanban-phase2-design.md`

---

### Task 1: Context 타입 확장

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/KanbanContext.ts`

**Step 1: KanbanContext.ts에 타입과 인터페이스 추가**

기존 파일 전체를 아래로 교체:

```typescript
import { createContext, useContext, type Accessor, type Setter } from "solid-js";

// ── 타입 ──────────────────────────────────────────────────────

export interface KanbanCardRef<L = unknown, T = unknown> {
  value: T | undefined;
  laneValue: L | undefined;
  heightOnDrag: number;
}

export interface KanbanDropInfo<L = unknown, T = unknown> {
  sourceValue?: T;
  targetLaneValue?: L;
  targetCardValue?: T;
  position?: "before" | "after";
}

export interface KanbanDropTarget<T = unknown> {
  element: HTMLElement;
  value: T | undefined;
  position: "before" | "after";
}

// ── Board Context ──────────────────────────────────────────────

export interface KanbanContextValue<L = unknown, T = unknown> {
  dragCard: Accessor<KanbanCardRef<L, T> | undefined>;
  setDragCard: Setter<KanbanCardRef<L, T> | undefined>;
  onDropTo: (
    targetLaneValue: L | undefined,
    targetCardValue: T | undefined,
    position: "before" | "after" | undefined,
  ) => void;
}

export const KanbanContext = createContext<KanbanContextValue>();

export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext must be used within Kanban");
  }
  return context;
}

// ── Lane Context ───────────────────────────────────────────────

export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;
}

export const KanbanLaneContext = createContext<KanbanLaneContextValue>();

export function useKanbanLaneContext(): KanbanLaneContextValue {
  const context = useContext(KanbanLaneContext);
  if (!context) {
    throw new Error("useKanbanLaneContext must be used within Kanban.Lane");
  }
  return context;
}
```

**Step 2: typecheck 실행**

Run: `pnpm typecheck packages/solid`
Expected: KanbanContextValue 인터페이스가 변경되어 Kanban.tsx에서 타입 에러 발생 (정상 — Task 2에서 해결)

**Step 3: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/KanbanContext.ts
git commit -m "feat(solid): Kanban DnD Context 타입 확장"
```

---

### Task 2: Board (Kanban) 확장

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (Board 부분: KanbanProps, KanbanBase)

**Step 1: import 수정**

기존:

```typescript
import { children, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
```

변경:

```typescript
import { children, createSignal, type JSX, onCleanup, onMount, type ParentComponent, Show, splitProps } from "solid-js";
```

기존:

```typescript
import {
  KanbanContext,
  KanbanLaneContext,
  type KanbanContextValue,
  type KanbanLaneContextValue,
} from "./KanbanContext";
```

변경:

```typescript
import {
  KanbanContext,
  KanbanLaneContext,
  type KanbanCardRef,
  type KanbanContextValue,
  type KanbanDropInfo,
  type KanbanLaneContextValue,
} from "./KanbanContext";
```

**Step 2: KanbanProps 인터페이스 확장**

기존:

```typescript
export interface KanbanProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: JSX.Element;
}
```

변경:

```typescript
export interface KanbanProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  onDrop?: (info: KanbanDropInfo) => void;
  children?: JSX.Element;
}
```

**Step 3: KanbanBase 구현체 확장**

기존:

```typescript
const KanbanBase = (props: KanbanProps) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
  ]);

  const contextValue: KanbanContextValue = {};

  return (
    <KanbanContext.Provider value={contextValue}>
      <div
        {...rest}
        data-kanban
        class={twMerge(boardBaseClass, local.class)}
      >
        {local.children}
      </div>
    </KanbanContext.Provider>
  );
};
```

변경:

```typescript
const KanbanBase = (props: KanbanProps) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "onDrop",
  ]);

  const [dragCard, setDragCard] = createSignal<KanbanCardRef>();

  const onDropTo = (
    targetLaneValue: unknown | undefined,
    targetCardValue: unknown | undefined,
    position: "before" | "after" | undefined,
  ) => {
    const source = dragCard();
    if (!source) return;

    local.onDrop?.({
      sourceValue: source.value,
      targetLaneValue,
      targetCardValue,
      position,
    });

    setDragCard(undefined);
  };

  onMount(() => {
    const handleDragEnd = () => {
      setDragCard(undefined);
    };
    document.addEventListener("dragend", handleDragEnd);
    onCleanup(() => document.removeEventListener("dragend", handleDragEnd));
  });

  const contextValue: KanbanContextValue = {
    dragCard,
    setDragCard,
    onDropTo,
  };

  return (
    <KanbanContext.Provider value={contextValue}>
      <div
        {...rest}
        data-kanban
        class={twMerge(boardBaseClass, local.class)}
      >
        {local.children}
      </div>
    </KanbanContext.Provider>
  );
};
```

**Step 4: typecheck 실행**

Run: `pnpm typecheck packages/solid`
Expected: Board 부분 통과. Lane/Card에서 아직 에러 가능 (Task 3, 4에서 해결)

**Step 5: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Board에 DnD 상태 관리 추가"
```

---

### Task 3: Lane 확장 (placeholder + 카운터)

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (Lane 부분: KanbanLane, LaneInner)

**Step 1: Lane에 createSignal, createEffect import 추가**

Step 2의 import에서 `createEffect`를 추가:

기존 (Task 2 이후):

```typescript
import { children, createSignal, type JSX, onCleanup, onMount, type ParentComponent, Show, splitProps } from "solid-js";
```

변경:

```typescript
import {
  children,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
```

import에 `KanbanDropTarget` 타입 추가:

기존 (Task 2 이후):

```typescript
import {
  KanbanContext,
  KanbanLaneContext,
  type KanbanCardRef,
  type KanbanContextValue,
  type KanbanDropInfo,
  type KanbanLaneContextValue,
} from "./KanbanContext";
```

변경:

```typescript
import {
  KanbanContext,
  KanbanLaneContext,
  type KanbanCardRef,
  type KanbanContextValue,
  type KanbanDropInfo,
  type KanbanDropTarget,
  type KanbanLaneContextValue,
} from "./KanbanContext";
```

**Step 2: placeholder 스타일 상수 추가**

`laneBodyBaseClass` 아래에 추가:

```typescript
const placeholderBaseClass = clsx("rounded-lg", "bg-black/10 dark:bg-white/10");
```

**Step 3: KanbanLane 구현체 확장**

기존:

```typescript
const KanbanLane: ParentComponent<KanbanLaneProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
  ]);

  const laneContextValue: KanbanLaneContextValue = {
    value: () => local.value,
  };

  // Provider 안에서 children을 resolve해야 splitSlots가 올바르게 동작
  const LaneInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, content] = splitSlots(resolved, ["kanbanLaneTitle", "kanbanLaneTools"] as const);

    const hasHeader = () =>
      slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;

    return (
      <div
        {...rest}
        data-kanban-lane
        class={twMerge(laneBaseClass, local.class)}
      >
        <Show when={hasHeader()}>
          <div class={laneHeaderBaseClass}>
            <div class="flex-1">{slots().kanbanLaneTitle}</div>
            <Show when={slots().kanbanLaneTools.length > 0}>
              <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
            </Show>
          </div>
        </Show>
        <div class={laneBodyBaseClass}>
          {content()}
        </div>
      </div>
    );
  };

  return (
    <KanbanLaneContext.Provider value={laneContextValue}>
      <LaneInner>{local.children}</LaneInner>
    </KanbanLaneContext.Provider>
  );
};
```

변경:

```typescript
const KanbanLane: ParentComponent<KanbanLaneProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
  ]);

  const boardCtx = useKanbanContext();
  const [dropTarget, setDropTarget] = createSignal<KanbanDropTarget>();

  // dragCard가 리셋되면 dropTarget도 초기화
  createEffect(() => {
    if (!boardCtx.dragCard()) {
      dragEnterCount = 0;
      setDropTarget(undefined);
    }
  });

  // Lane 이탈 감지: dragenter/dragleave 카운터
  let dragEnterCount = 0;

  const handleLaneDragEnter = () => {
    dragEnterCount++;
  };

  const handleLaneDragLeave = () => {
    dragEnterCount--;
    if (dragEnterCount === 0) {
      setDropTarget(undefined);
    }
  };

  // 빈 영역 dragover (카드가 없거나 카드 아래 영역)
  const handleLaneDragOver = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
  };

  // 빈 영역 drop
  const handleLaneDrop = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
    boardCtx.onDropTo(local.value, undefined, undefined);
  };

  const laneContextValue: KanbanLaneContextValue = {
    value: () => local.value,
    dropTarget,
    setDropTarget,
  };

  // Provider 안에서 children을 resolve해야 splitSlots가 올바르게 동작
  const LaneInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, content] = splitSlots(resolved, ["kanbanLaneTitle", "kanbanLaneTools"] as const);

    const hasHeader = () =>
      slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;

    // placeholder div (Lane이 소유, DOM 직접 제어)
    let bodyRef!: HTMLDivElement;
    const placeholderEl = document.createElement("div");
    placeholderEl.className = placeholderBaseClass;

    createEffect(() => {
      const target = dropTarget();
      const dc = boardCtx.dragCard();

      if (!target || !dc) {
        if (placeholderEl.parentNode) {
          placeholderEl.remove();
        }
        return;
      }

      // placeholder 높이 설정
      placeholderEl.style.height = `${dc.heightOnDrag}px`;

      // 삽입 위치 계산
      const referenceNode = target.position === "before"
        ? target.element
        : target.element.nextElementSibling;

      // 이미 올바른 위치면 DOM 조작 생략
      if (placeholderEl.parentNode === bodyRef
          && placeholderEl.nextSibling === referenceNode) {
        return;
      }

      bodyRef.insertBefore(placeholderEl, referenceNode);
    });

    // placeholder cleanup
    onCleanup(() => {
      if (placeholderEl.parentNode) {
        placeholderEl.remove();
      }
    });

    return (
      <div
        {...rest}
        data-kanban-lane
        class={twMerge(laneBaseClass, local.class)}
        onDragEnter={handleLaneDragEnter}
        onDragLeave={handleLaneDragLeave}
        onDragOver={handleLaneDragOver}
        onDrop={handleLaneDrop}
      >
        <Show when={hasHeader()}>
          <div class={laneHeaderBaseClass}>
            <div class="flex-1">{slots().kanbanLaneTitle}</div>
            <Show when={slots().kanbanLaneTools.length > 0}>
              <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
            </Show>
          </div>
        </Show>
        <div ref={bodyRef} class={laneBodyBaseClass}>
          {content()}
        </div>
      </div>
    );
  };

  return (
    <KanbanLaneContext.Provider value={laneContextValue}>
      <LaneInner>{local.children}</LaneInner>
    </KanbanLaneContext.Provider>
  );
};
```

**Step 4: typecheck 실행**

Run: `pnpm typecheck packages/solid`
Expected: Lane 부분 통과. Card에서 아직 에러 가능.

**Step 5: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Lane에 DnD placeholder 및 카운터 추가"
```

---

### Task 4: Card 확장 (dragstart, dragover, drop, hidden)

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx` (Card 부분: KanbanCardProps, KanbanCard)

**Step 1: KanbanCardProps 확장**

기존:

```typescript
export interface KanbanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: unknown;
  contentClass?: string;
  children?: JSX.Element;
}
```

변경:

```typescript
export interface KanbanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "draggable"> {
  value?: unknown;
  draggable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}
```

**Step 2: KanbanCard 구현체 확장**

기존:

```typescript
const KanbanCard: ParentComponent<KanbanCardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "contentClass"]);

  return (
    <div
      {...rest}
      data-kanban-card
      class={twMerge(cardHostClass, local.class)}
    >
      <Card class={twMerge(cardContentClass, local.contentClass)}>
        {local.children}
      </Card>
    </div>
  );
};
```

변경:

```typescript
const KanbanCard: ParentComponent<KanbanCardProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
    "draggable",
    "contentClass",
  ]);

  const boardCtx = useKanbanContext();
  const laneCtx = useKanbanLaneContext();

  let hostRef!: HTMLDivElement;

  const isDraggable = () => local.draggable !== false;

  const isDragSource = () => {
    const dc = boardCtx.dragCard();
    return dc != null && dc.value != null && dc.value === local.value;
  };

  const handleDragStart = (e: DragEvent) => {
    if (!isDraggable()) {
      e.preventDefault();
      return;
    }
    const heightOnDrag = hostRef.offsetHeight;
    boardCtx.setDragCard({
      value: local.value,
      laneValue: laneCtx.value(),
      heightOnDrag,
    });
  };

  const handleDragOver = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = hostRef.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";

    const current = laneCtx.dropTarget();
    if (current?.element === hostRef && current?.position === position) {
      return; // 동일 위치 → 불필요한 시그널 업데이트 방지
    }

    laneCtx.setDropTarget({ element: hostRef, value: local.value, position });
  };

  const handleDrop = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
    e.stopPropagation();

    const current = laneCtx.dropTarget();
    boardCtx.onDropTo(laneCtx.value(), local.value, current?.position ?? "before");
  };

  return (
    <div
      {...rest}
      ref={hostRef}
      data-kanban-card
      draggable={isDraggable()}
      class={twMerge(cardHostClass, isDragSource() && "hidden", local.class)}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Card class={twMerge(cardContentClass, local.contentClass)}>
        {local.children}
      </Card>
    </div>
  );
};
```

**Step 3: typecheck 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS — 모든 타입 에러 해결

**Step 4: lint 실행**

Run: `pnpm lint packages/solid/src/components/layout/kanban`
Expected: PASS (또는 자동 수정 가능한 경고만)

**Step 5: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Card에 DnD 이벤트 핸들링 추가"
```

---

### Task 5: 데모 페이지에 DnD 동작 연결

**Files:**

- Modify: `packages/solid-demo/src/pages/data/KanbanPage.tsx`

**Step 1: 데모 페이지를 DnD 동작하는 형태로 수정**

기존 전체를 아래로 교체:

```typescript
import { createSignal, For } from "solid-js";
import { Button, Icon, Kanban, type KanbanDropInfo, Topbar } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

interface CardData {
  id: number;
  title: string;
}

interface LaneData {
  id: string;
  title: string;
  cards: CardData[];
}

const initialLanes: LaneData[] = [
  {
    id: "todo",
    title: "할 일",
    cards: [
      { id: 1, title: "프로젝트 기획서 작성" },
      { id: 2, title: "디자인 시안 검토" },
      { id: 3, title: "API 스펙 정의" },
    ],
  },
  {
    id: "in-progress",
    title: "진행 중",
    cards: [
      { id: 4, title: "로그인 페이지 개발" },
      { id: 5, title: "DB 스키마 설계" },
    ],
  },
  {
    id: "done",
    title: "완료",
    cards: [
      { id: 6, title: "환경 설정" },
      { id: 7, title: "Git 저장소 생성" },
    ],
  },
];

export default function KanbanPage() {
  const [lanes, setLanes] = createSignal<LaneData[]>(initialLanes);

  const handleDrop = (info: KanbanDropInfo<string, number>) => {
    setLanes((prev) => {
      // 소스 카드 찾기 및 제거
      let sourceCard: CardData | undefined;
      const withoutSource = prev.map((lane) => ({
        ...lane,
        cards: lane.cards.filter((card) => {
          if (card.id === info.sourceValue) {
            sourceCard = card;
            return false;
          }
          return true;
        }),
      }));

      if (!sourceCard) return prev;

      // 대상 레인에 삽입
      return withoutSource.map((lane) => {
        if (lane.id !== info.targetLaneValue) return lane;

        const newCards = [...lane.cards];

        if (info.targetCardValue == null) {
          // 빈 영역 드롭 → 맨 끝에 추가
          newCards.push(sourceCard!);
        } else {
          // 특정 카드 앞/뒤에 삽입
          const targetIdx = newCards.findIndex((c) => c.id === info.targetCardValue);
          if (targetIdx < 0) {
            newCards.push(sourceCard!);
          } else {
            const insertIdx = info.position === "after" ? targetIdx + 1 : targetIdx;
            newCards.splice(insertIdx, 0, sourceCard!);
          }
        }

        return { ...lane, cards: newCards };
      });
    });
  };

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Kanban</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          <section>
            <h2 class="mb-4 text-xl font-semibold">DnD</h2>
            <div class="h-[500px]">
              <Kanban onDrop={handleDrop}>
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
                          <Kanban.Card value={card.id} contentClass="p-2">
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

          <section>
            <h2 class="mb-4 text-xl font-semibold">draggable 제어</h2>
            <div class="h-[300px]">
              <Kanban onDrop={handleDrop}>
                <Kanban.Lane value="mixed">
                  <Kanban.LaneTitle>드래그 혼합</Kanban.LaneTitle>
                  <Kanban.Card value={100} contentClass="p-2">
                    드래그 가능 (기본)
                  </Kanban.Card>
                  <Kanban.Card value={101} draggable={false} contentClass="p-2">
                    드래그 불가
                  </Kanban.Card>
                </Kanban.Lane>
                <Kanban.Lane value="empty">
                  <Kanban.LaneTitle>빈 레인</Kanban.LaneTitle>
                </Kanban.Lane>
              </Kanban>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: typecheck 실행**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

주의: `KanbanDropInfo`가 `@simplysm/solid`에서 export되는지 확인. 현재 `index.ts`에 `export * from "./components/layout/kanban/KanbanContext"`가 있으므로 자동 export됨.

**Step 3: 커밋**

```bash
git add packages/solid-demo/src/pages/data/KanbanPage.tsx
git commit -m "feat(solid-demo): Kanban 데모에 DnD 동작 연결"
```

---

### Task 6: 검증 — typecheck + lint + 브라우저 동작 확인

**Step 1: 전체 typecheck**

Run: `pnpm typecheck packages/solid packages/solid-demo`
Expected: PASS

**Step 2: 전체 lint**

Run: `pnpm lint packages/solid/src/components/layout/kanban packages/solid-demo/src/pages/data/KanbanPage.tsx`
Expected: PASS (에러 있으면 `--fix`로 자동 수정)

**Step 3: dev 서버 실행 및 브라우저 확인**

Run: `pnpm dev`

브라우저에서 Kanban 데모 페이지로 이동하여 확인:

1. **카드 드래그 시작**: 카드를 드래그하면 원본이 숨겨지는지
2. **placeholder 표시**: 다른 카드 위로 드래그 시 반투명 placeholder가 나타나는지
3. **before/after 판정**: 카드 상단/하단에 따라 placeholder 위치가 변하는지
4. **같은 위치 최적화**: "카드 A 뒤" → "카드 B 앞" 전환 시 placeholder가 깜빡이지 않는지
5. **레인 간 이동**: 다른 레인으로 드래그하여 카드가 이동하는지
6. **빈 레인 드롭**: 빈 레인에 카드를 드롭할 수 있는지
7. **드래그 취소**: ESC 키 또는 외부에 드롭 시 원상복구되는지
8. **draggable=false**: "드래그 불가" 카드가 드래그되지 않는지

**Step 4: 최종 커밋 (필요시)**

lint 자동 수정이 있었다면:

```bash
git add -A
git commit -m "fix(solid): lint 자동 수정 적용"
```
