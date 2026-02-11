# Kanban 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular 레거시의 Kanban Board/Lane/Card를 SolidJS 컴파운드 컴포넌트로 마이그레이션

**Architecture:** Kanban(Board) → Kanban.Lane → Kanban.Card 구조. KanbanContext로 드래그/선택 상태 공유, KanbanLaneContext로 레인 정보 전달. HTML Drag API 직접 사용. splitSlots로 LaneTitle/LaneTools 슬롯 분리.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge, splitSlots

---

### Task 1: KanbanContext 생성

**Files:**

- Create: `packages/solid/src/components/layout/kanban/KanbanContext.ts`

**참조:** `packages/solid/src/components/layout/sidebar/SidebarContext.ts` 패턴

**Step 1: KanbanContext 파일 작성**

```typescript
import { createContext, useContext, type Accessor, type Setter } from "solid-js";

export interface KanbanDropInfo<L = unknown, T = unknown> {
  sourceValue?: T;
  targetLaneValue?: L;
  targetCardValue?: T;
}

export interface KanbanContextValue<L = unknown, T = unknown> {
  dragValue: Accessor<T | undefined>;
  setDragValue: Setter<T | undefined>;
  selectedValues: Accessor<T[]>;
  toggleSelection: (value: T) => void;
  onDropTo: (targetLaneValue: L | undefined, targetCardValue: T | undefined) => void;
}

export const KanbanContext = createContext<KanbanContextValue>();

export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext must be used within Kanban");
  }
  return context;
}

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

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/KanbanContext.ts
git commit -m "feat(solid): KanbanContext, KanbanLaneContext 추가"
```

---

### Task 2: Kanban (Board) 컴포넌트

**Files:**

- Create: `packages/solid/src/components/layout/kanban/Kanban.tsx`

**참조 패턴:**

- `packages/solid/src/components/layout/sidebar/Sidebar.tsx` — compound component interface
- `packages/solid/src/components/display/Card.tsx` — 기본 스타일 패턴
- `.legacy-packages/sd-angular/src/ui/layout/kanban/sd-kanban-board.control.ts` — 로직

**Step 1: Kanban.tsx 기본 구조 작성**

Kanban 컴포넌트(Board 루트)를 작성한다. 이 단계에서는 Board만 구현하고, Lane/Card는 placeholder로 둔다.

핵심 구현 사항:

- `KanbanContext.Provider`로 드래그/선택 상태 공유
- `document:dragend` 이벤트에서 드래그 상태 초기화
- `onCleanup`으로 이벤트 리스너 정리
- `interface KanbanComponent` 정의 (Lane, Card, LaneTitle, LaneTools)
- 스타일: `inline-flex flex-nowrap h-full gap-4`

```typescript
// Kanban 컴포넌트 핵심 로직
const [dragValue, setDragValue] = createSignal<T>();

const contextValue: KanbanContextValue<L, T> = {
  dragValue,
  setDragValue,
  selectedValues: () => local.value ?? [],
  toggleSelection: (val: T) => {
    local.onValueChange?.(/* toggle logic */);
  },
  onDropTo: (targetLaneValue, targetCardValue) => {
    const source = dragValue();
    setDragValue(undefined);
    local.onDrop?.({ sourceValue: source, targetLaneValue, targetCardValue });
  },
};

// document dragend 리스너로 드래그 취소 처리
onMount(() => {
  const handler = () => setDragValue(undefined);
  document.addEventListener("dragend", handler);
  onCleanup(() => document.removeEventListener("dragend", handler));
});
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban Board 컴포넌트 추가"
```

---

### Task 3: Kanban.Card 구현

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx`

**참조:**

- `.legacy-packages/sd-angular/src/ui/layout/kanban/sd-kanban.control.ts` — DnD/선택 로직
- `packages/solid/src/components/display/Card.tsx` — Card 스타일

**Step 1: KanbanCard 컴포넌트 구현**

핵심 구현 사항:

- HTML `draggable` 속성 + `dragstart` 이벤트
- `dragover`/`dragleave`/`drop` 이벤트로 드롭 위치 피드백
- Shift+Click으로 선택 토글
- 드래그 중인 카드: `opacity-50`
- 드롭 위치: 카드 위에 `border-t-2 border-primary-500` 표시
- 선택된 카드: `ring-2 ring-primary-500`

```typescript
// 카드 기본 스타일
const cardBaseClass = clsx(
  "block",
  "bg-white dark:bg-base-800",
  "rounded-lg",
  "shadow-md",
  "p-3",
  "cursor-grab",
  "select-none",
  "transition-opacity duration-150",
);

// 드래그 시작
onDragStart={() => {
  kanbanCtx.setDragValue(local.value);
}}

// Shift+Click 선택
onClick={(e) => {
  if (e.shiftKey && local.value != null) {
    e.preventDefault();
    kanbanCtx.toggleSelection(local.value);
  }
}}

// 드래그 오버 (드롭 위치 표시)
onDragOver={(e) => {
  if (kanbanCtx.dragValue() == null) return;
  e.preventDefault();
  e.stopPropagation();
  setDragOvered(true);
}}
```

**Step 2: Kanban에 Card 서브컴포넌트 할당**

```typescript
Kanban.Card = KanbanCard;
```

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban.Card 컴포넌트 구현 (DnD + 선택)"
```

---

### Task 4: Kanban.Lane 구현

**Files:**

- Modify: `packages/solid/src/components/layout/kanban/Kanban.tsx`

**참조:**

- `.legacy-packages/sd-angular/src/ui/layout/kanban/sd-kanban-lane.control.ts` — 레인 로직
- `packages/solid/src/utils/splitSlots.ts` — splitSlots 사용법
- `packages/solid/src/components/feedback/busy/BusyContainer.tsx` — busy 상태

**Step 1: KanbanLaneTitle, KanbanLaneTools 슬롯 컴포넌트 작성**

```typescript
const KanbanLaneTitle: ParentComponent = (props) => (
  <div data-kanban-lane-title>{props.children}</div>
);

const KanbanLaneTools: ParentComponent = (props) => (
  <div data-kanban-lane-tools>{props.children}</div>
);
```

**Step 2: KanbanLane 컴포넌트 구현**

핵심 구현 사항:

- `splitSlots`로 LaneTitle/LaneTools 분리
- `KanbanLaneContext.Provider`로 레인 value 제공
- `collapsible`/`collapsed` 접기 기능
- `BusyContainer`로 busy 상태 표시
- 빈 레인에 드래그 시 점선 테두리 (`border-2 border-dashed border-primary-300`)
- `dragover`/`drop` 이벤트 처리

```typescript
// 레인 기본 스타일
const laneBaseClass = clsx(
  "flex flex-col",
  "min-w-[250px] w-[300px]",
  "flex-shrink-0",
  "gap-2",
);

// 레인 콘텐츠 영역 스타일
const laneContentClass = clsx(
  "flex-1",
  "rounded-lg",
  "bg-base-100 dark:bg-base-900",
  "p-3",
  "overflow-y-auto",
  "flex flex-col gap-2",
);

// 레인 헤더 (제목 + 도구)
<div class={laneHeaderClass}>
  <Show when={local.collapsible}>
    <button onClick={toggleCollapse}>
      <Icon icon={collapsed() ? IconEyeOff : IconEye} />
    </button>
  </Show>
  <Show when={titleSlot}>{titleSlot}</Show>
  <div class="ml-auto">
    <Show when={toolsSlot}>{toolsSlot}</Show>
  </div>
</div>
```

**Step 3: Kanban에 Lane 서브컴포넌트 할당**

```typescript
Kanban.Lane = KanbanLane;
Kanban.LaneTitle = KanbanLaneTitle;
Kanban.LaneTools = KanbanLaneTools;
```

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban.Lane 컴포넌트 구현 (접기/busy/DnD)"
```

---

### Task 5: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`// layout` 섹션에 추가:

```typescript
export * from "./components/layout/kanban/Kanban";
export * from "./components/layout/kanban/KanbanContext";
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Kanban export 추가"
```

---

### Task 6: 데모 페이지 작성

**Files:**

- Create: `packages/solid-demo/src/pages/data/KanbanPage.tsx`
- Modify: `packages/solid-demo/src/main.tsx` — 라우트 추가
- Modify: `packages/solid-demo/src/pages/Home.tsx` — 메뉴 추가

**참조:** `packages/solid-demo/src/pages/layout/FormGroupPage.tsx` 패턴

**Step 1: KanbanPage.tsx 작성**

데모 페이지에 다음 섹션을 포함:

1. **기본 Kanban** — 3개 레인 + 카드 DnD
2. **접기/펼치기** — collapsible 레인 데모
3. **Shift+Click 선택** — 선택 상태 표시

```typescript
export default function KanbanPage() {
  const [lanes, setLanes] = createSignal([
    { id: "todo", name: "할 일", cards: [{ id: 1, title: "카드 1" }, ...] },
    { id: "progress", name: "진행 중", cards: [...] },
    { id: "done", name: "완료", cards: [...] },
  ]);

  const handleDrop = (info: KanbanDropInfo<string, number>) => {
    // 카드를 소스 레인에서 제거 → 타겟 레인에 추가
  };

  return (
    <Topbar.Container>
      <Topbar><h1>Kanban</h1></Topbar>
      <div class="flex-1 overflow-auto p-6">
        <Kanban onDrop={handleDrop}>
          <For each={lanes()}>
            {(lane) => (
              <Kanban.Lane value={lane.id} collapsible>
                <Kanban.LaneTitle>{lane.name} ({lane.cards.length})</Kanban.LaneTitle>
                <For each={lane.cards}>
                  {(card) => (
                    <Kanban.Card value={card.id}>
                      {card.title}
                    </Kanban.Card>
                  )}
                </For>
              </Kanban.Lane>
            )}
          </For>
        </Kanban>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: main.tsx에 라우트 추가**

```typescript
<Route path="/home/data/kanban" component={lazy(() => import("./pages/data/KanbanPage"))} />
```

**Step 3: Home.tsx에 메뉴 추가**

Data 섹션에 `{ title: "Kanban", href: "/home/data/kanban" }` 추가

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/data/KanbanPage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Kanban 데모 페이지 추가"
```

---

### Task 7: 린트 + 타입체크 전체 검증

**Step 1: 린트 실행**

Run: `pnpm lint packages/solid packages/solid-demo`
Expected: PASS (또는 자동 수정 가능한 경고만)

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid packages/solid-demo`
Expected: PASS

**Step 3: 린트 에러 수정 (있을 경우)**

Run: `pnpm lint --fix packages/solid packages/solid-demo`

**Step 4: 커밋 (수정 있을 경우)**

```bash
git add -A
git commit -m "fix(solid): lint 에러 수정"
```

---

### Task 8: 시각적 검증

**Step 1: dev 서버 실행**

Run: `pnpm dev`

**Step 2: 브라우저에서 확인**

- Kanban 데모 페이지 접속
- 카드 DnD 동작 확인
- 레인 접기/펼치기 확인
- Shift+Click 선택 확인
- 다크 모드 전환 시 스타일 확인

**Step 3: 문제 있으면 수정 후 커밋**
