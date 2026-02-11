# Kanban Phase 4: 선택 시스템 설계

> 작성일: 2026-02-10
> 기반: `2026-02-10-kanban-redesign.md` Phase 4 명세

---

## 1. 개요

Kanban 컴포넌트에 카드 선택 기능을 추가한다:

- Shift+Click으로 개별 카드 선택/해제 토글
- Board 레벨에서 `selectedValues` controlled 패턴 관리
- 선택된 카드에 ring 시각 피드백
- 레인별 전체 선택 체크박스 (selectable 카드 존재 시 자동 표시)

---

## 2. Context 변경

### 2.1 KanbanContext (Board 레벨)

```typescript
export interface KanbanContextValue<L = unknown, T = unknown> {
  // 기존 DnD
  dragCard: Accessor<KanbanCardRef<L, T> | undefined>;
  setDragCard: Setter<KanbanCardRef<L, T> | undefined>;
  onDropTo: (
    targetLaneValue: L | undefined,
    targetCardValue: T | undefined,
    position: "before" | "after" | undefined,
  ) => void;

  // Phase 4 추가
  selectedValues: Accessor<T[]>;
  setSelectedValues: Setter<T[]>;
  toggleSelection: (value: T) => void;
}
```

- `selectedValues`: 현재 선택된 카드 value 배열
- `setSelectedValues`: Setter 노출 (Lane에서 전체 선택/해제 시 직접 사용)
- `toggleSelection`: 단일 카드 선택 토글 (Card에서 Shift+Click 시 호출)

### 2.2 KanbanLaneContext (Lane 레벨)

```typescript
export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  // 기존
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;

  // Phase 4 추가
  registerCard: (id: string, info: { value: T | undefined; selectable: boolean }) => void;
  unregisterCard: (id: string) => void;
}
```

- Card가 mount 시 `registerCard`, unmount 시 `unregisterCard` 호출
- Lane이 등록된 카드 목록으로 전체 선택 상태 계산

---

## 3. Card 변경

### 3.1 Props 추가

```typescript
export interface KanbanCardProps {
  // 기존
  value?: unknown;
  draggable?: boolean;
  contentClass?: string;
  children?: JSX.Element;

  // Phase 4 추가
  selectable?: boolean; // 기본값 false
}
```

### 3.2 Context 등록/해제

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

`createEffect` 사용으로 `value`나 `selectable`이 변경되면 자동 재등록.

### 3.3 Shift+Click 선택 토글

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

### 3.4 선택 시각 피드백

```typescript
const isSelected = () =>
  local.value != null && boardCtx.selectedValues().includes(local.value);

// Card 래핑 시 조건부 ring 클래스
<Card class={twMerge(
  cardContentClass,
  isSelected() && "ring-2 ring-primary-500",
  local.contentClass,
)}>
```

---

## 4. Lane 변경

### 4.1 카드 등록 저장소

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

### 4.2 파생 상태

```typescript
const selectableCards = () => [...registeredCards().values()].filter((c) => c.selectable && c.value != null);

const hasSelectableCards = () => selectableCards().length > 0;

const isAllSelected = () => {
  const cards = selectableCards();
  if (cards.length === 0) return false;
  return cards.every((c) => boardCtx.selectedValues().includes(c.value));
};
```

### 4.3 전체 선택/해제 핸들러

```typescript
const handleSelectAll = (checked: boolean) => {
  const laneCardValues = selectableCards().map((c) => c.value!);
  boardCtx.setSelectedValues((prev) => {
    if (checked) {
      const toAdd = laneCardValues.filter((v) => !prev.includes(v));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    } else {
      const toRemove = new Set(laneCardValues);
      const next = prev.filter((v) => !toRemove.has(v as never));
      return next.length === prev.length ? prev : next;
    }
  });
};
```

### 4.4 헤더 UI 변경

기존 헤더에 전체 선택 체크박스 추가:

```
Lane 헤더
├── [collapsible] 접기 버튼
├── [hasSelectableCards] CheckBox (inline, theme="white")
├── LaneTitle (flex-1)
└── LaneTools
```

`hasHeader` 조건을 확장하여 `hasSelectableCards()`도 포함.

---

## 5. Board 변경

### 5.1 Props 추가

```typescript
export interface KanbanProps {
  // 기존
  onDrop?: (info: KanbanDropInfo) => void;
  children?: JSX.Element;

  // Phase 4 추가
  selectedValues?: unknown[];
  onSelectedValuesChange?: (values: unknown[]) => void;
}
```

### 5.2 상태 관리

```typescript
const [selectedValues, setSelectedValues] = createPropSignal({
  value: () => local.selectedValues ?? [],
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

### 5.3 Context 확장

```typescript
const contextValue: KanbanContextValue = {
  // 기존
  dragCard,
  setDragCard,
  onDropTo,
  // Phase 4 추가
  selectedValues,
  setSelectedValues,
  toggleSelection,
};
```

---

## 6. 데모 페이지 확장

기존 섹션 아래에 "선택" 섹션 추가:

- `selectedValues`/`onSelectedValuesChange` 연결
- 카드에 `selectable` prop 적용
- 선택된 카드 value 목록 화면에 표시
- selectable이 false인 카드도 포함하여 혼합 테스트

---

## 7. 변경 파일 목록

| 파일                 | 변경 내용                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `KanbanContext.ts`   | `selectedValues`, `setSelectedValues`, `toggleSelection` (Board Context). `registerCard`, `unregisterCard` (Lane Context) |
| `Kanban.tsx` — Board | `selectedValues`/`onSelectedValuesChange` props, `createPropSignal`, Context 확장                                         |
| `Kanban.tsx` — Lane  | 카드 등록 저장소, 전체 선택 체크박스, `isAllSelected` 계산                                                                |
| `Kanban.tsx` — Card  | `selectable` prop, `onClick` Shift 핸들러, ring 피드백, `registerCard`/`unregisterCard`                                   |
| `KanbanPage.tsx`     | 선택 데모 섹션 추가                                                                                                       |
