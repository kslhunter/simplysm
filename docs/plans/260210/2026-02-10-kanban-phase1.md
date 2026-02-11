# Kanban Phase 1 (UI 기본) 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kanban 컴파운드 컴포넌트의 UI 기본 구조(Board/Lane/Card/슬롯)를 Phase 1 스펙에 맞춰 재작성한다.

**Architecture:** 기존 `Kanban.tsx`와 `KanbanContext.ts`를 삭제하고 처음부터 작성한다. Phase 1에서는 DnD, 선택, 접기/펼치기, Busy 등을 **모두 제외**하고 순수 렌더링과 레이아웃만 구현한다. Context는 이후 Phase를 위한 최소 껍데기만 제공한다.

**Tech Stack:** SolidJS, Tailwind CSS, `clsx`/`twMerge`, `splitSlots` 유틸리티, 기존 `Card` 컴포넌트 래핑

**작업 디렉토리:** `/home/kslhunter/projects/simplysm/.worktrees/kanban-redesign`

---

## Task 1: KanbanContext.ts 재작성

**Files:**

- Rewrite: `packages/solid/src/components/layout/kanban/KanbanContext.ts`

**Step 1: Context 파일 작성**

Phase 1에서는 Board Context가 비어있고, Lane Context만 `value` accessor를 제공한다.

```typescript
import { createContext, useContext, type Accessor } from "solid-js";

// ── Board Context ──────────────────────────────────────────────
// Phase 1에서는 빈 Context. Phase 2+에서 DnD/선택 등을 추가한다.

export interface KanbanContextValue {}

export const KanbanContext = createContext<KanbanContextValue>();

export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext must be used within Kanban");
  }
  return context;
}

// ── Lane Context ───────────────────────────────────────────────

export interface KanbanLaneContextValue<L = unknown> {
  value: Accessor<L | undefined>;
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

**Step 2: 린트/타입 검사**

Run: `pnpm lint packages/solid/src/components/layout/kanban/KanbanContext.ts`
Run: `pnpm typecheck packages/solid`

**Step 3: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/KanbanContext.ts
git commit -m "feat(solid): Kanban Phase 1 — KanbanContext 재작성 (최소 껍데기)"
```

---

## Task 2: Kanban.tsx 재작성 — 슬롯 컴포넌트 + Card

**Files:**

- Rewrite: `packages/solid/src/components/layout/kanban/Kanban.tsx`

**Step 1: Kanban.tsx 작성 — 슬롯 + Card + Lane + Board**

전체 파일을 한 번에 작성한다. 핵심 포인트:

- **KanbanLaneTitle / KanbanLaneTools**: `data-*` 마커 슬롯 컴포넌트
- **KanbanCard**: 기존 `Card` 컴포넌트 래핑, `value`/`contentClass` props, `select-none whitespace-normal`
- **KanbanLane**: 세로 `flex-col`, 배경색, `splitSlots`로 헤더 분리, 콘텐츠 영역
- **Kanban (Board)**: `inline-flex flex-nowrap h-full gap-4`, KanbanContext Provider

```typescript
import {
  children,
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Card } from "../../display/Card";
import { splitSlots } from "../../../utils/splitSlots";
import {
  KanbanContext,
  KanbanLaneContext,
  type KanbanContextValue,
  type KanbanLaneContextValue,
} from "./KanbanContext";

// ─── KanbanLaneTitle ─────────────────────────────────────────────

const KanbanLaneTitle: ParentComponent = (props) => (
  <div data-kanban-lane-title>{props.children}</div>
);

// ─── KanbanLaneTools ─────────────────────────────────────────────

const KanbanLaneTools: ParentComponent = (props) => (
  <div data-kanban-lane-tools>{props.children}</div>
);

// ─── KanbanCard ──────────────────────────────────────────────────

export interface KanbanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: unknown;
  contentClass?: string;
  children?: JSX.Element;
}

const cardHostClass = clsx(
  "relative block",
);

const cardContentClass = clsx(
  "whitespace-normal select-none",
);

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

// ─── KanbanLane ──────────────────────────────────────────────────

export interface KanbanLaneProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: unknown;
  children?: JSX.Element;
}

const laneBaseClass = clsx(
  "flex flex-col",
  "w-72 min-w-72",
  "bg-base-50 dark:bg-base-900",
  "rounded-lg",
  "overflow-hidden",
);

const laneHeaderBaseClass = clsx(
  "flex items-center gap-2",
  "px-3 py-2",
  "font-semibold",
  "text-base-700 dark:text-base-200",
  "border-b border-base-200 dark:border-base-700",
  "select-none",
);

const laneBodyBaseClass = clsx(
  "flex-1",
  "flex flex-col gap-2",
  "p-2",
  "overflow-y-auto",
);

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

// ─── Kanban (Board) ──────────────────────────────────────────────

export interface KanbanProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: JSX.Element;
}

const boardBaseClass = clsx(
  "inline-flex flex-nowrap",
  "h-full",
  "gap-4",
);

interface KanbanComponent {
  (props: KanbanProps): JSX.Element;
  Lane: typeof KanbanLane;
  Card: typeof KanbanCard;
  LaneTitle: typeof KanbanLaneTitle;
  LaneTools: typeof KanbanLaneTools;
}

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

export const Kanban = KanbanBase as KanbanComponent;
Kanban.Lane = KanbanLane;
Kanban.Card = KanbanCard;
Kanban.LaneTitle = KanbanLaneTitle;
Kanban.LaneTools = KanbanLaneTools;
```

**Step 2: 린트/타입 검사**

Run: `pnpm lint packages/solid/src/components/layout/kanban/Kanban.tsx`
Run: `pnpm typecheck packages/solid`

**Step 3: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Phase 1 — Board/Lane/Card/슬롯 재작성"
```

---

## Task 3: 데모 페이지 재작성

**Files:**

- Rewrite: `packages/solid-demo/src/pages/data/KanbanPage.tsx`

**Step 1: Phase 1 전용 데모 페이지 작성**

Phase 1에서는 DnD/선택/접기가 없으므로, 기본 렌더링과 `contentClass` 동작만 데모한다.

```typescript
import { For } from "solid-js";
import { Kanban, Topbar } from "@simplysm/solid";

interface Card {
  id: number;
  title: string;
  description?: string;
}

interface Lane {
  id: string;
  title: string;
  cards: Card[];
}

const sampleLanes: Lane[] = [
  {
    id: "todo",
    title: "할 일",
    cards: [
      { id: 1, title: "프로젝트 기획서 작성", description: "프로젝트 범위와 일정을 정리합니다." },
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
  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Kanban</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* Section 1: 기본 렌더링 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 렌더링</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              Board에 여러 Lane이 가로 배치되고, Lane 안에 Card가 세로로 나열됩니다.
            </p>
            <div class="h-[500px]">
              <Kanban>
                <For each={sampleLanes}>
                  {(lane) => (
                    <Kanban.Lane value={lane.id}>
                      <Kanban.LaneTitle>{lane.title} ({lane.cards.length})</Kanban.LaneTitle>
                      <Kanban.LaneTools>
                        <button
                          type="button"
                          class="text-sm text-primary-500 hover:text-primary-700"
                        >
                          + 추가
                        </button>
                      </Kanban.LaneTools>
                      <For each={lane.cards}>
                        {(card) => (
                          <Kanban.Card value={card.id} contentClass="p-3">
                            <div class="font-medium">{card.title}</div>
                            {card.description && (
                              <div class="mt-1 text-sm text-base-500 dark:text-base-400">
                                {card.description}
                              </div>
                            )}
                          </Kanban.Card>
                        )}
                      </For>
                    </Kanban.Lane>
                  )}
                </For>
              </Kanban>
            </div>
          </section>

          {/* Section 2: 빈 Lane */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">빈 Lane</h2>
            <p class="mb-4 text-sm text-base-600 dark:text-base-400">
              카드가 없는 빈 Lane도 올바르게 렌더링됩니다.
            </p>
            <div class="h-[300px]">
              <Kanban>
                <Kanban.Lane value="empty">
                  <Kanban.LaneTitle>빈 레인</Kanban.LaneTitle>
                </Kanban.Lane>
                <Kanban.Lane value="with-cards">
                  <Kanban.LaneTitle>카드 있음</Kanban.LaneTitle>
                  <Kanban.Card value={1} contentClass="p-3">
                    카드 1
                  </Kanban.Card>
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

**Step 2: 린트 검사**

Run: `pnpm lint packages/solid-demo/src/pages/data/KanbanPage.tsx`

**Step 3: 커밋**

```bash
git add packages/solid-demo/src/pages/data/KanbanPage.tsx
git commit -m "feat(solid-demo): Kanban Phase 1 데모 페이지 재작성"
```

---

## Task 4: 시각 검증

**Step 1: dev 서버 실행 및 확인**

Run: `pnpm dev` (worktree 안에서)

브라우저에서 Kanban 데모 페이지로 이동하여 확인:

- Board에 3개 Lane이 가로로 배치되는가
- Lane 안에 Card가 세로로 나열되는가
- LaneTitle 슬롯이 헤더에 표시되는가
- LaneTools 슬롯이 헤더 우측에 표시되는가
- Card에 `contentClass`가 적용되는가 (패딩)
- Card에 그림자/둥근 모서리/호버 효과가 있는가
- 빈 Lane 섹션이 올바르게 렌더링되는가
- 다크 모드에서 색상이 올바른가

문제 발견 시 수정 후 재확인.

---

## 의존 관계

```
Task 1 → Task 2 → Task 3 → Task 4
```

각 Task는 이전 Task에 의존한다.
