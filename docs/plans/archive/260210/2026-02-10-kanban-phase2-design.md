# Kanban Phase 2: DnD 구현 설계

> 작성일: 2026-02-10
> 기반: `2026-02-10-kanban-redesign.md` Phase 2 (기능 1~9)

## 0. Angular Legacy와의 차이점

| 항목                      | Angular Legacy                  | Solid 재설계                                                |
| ------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `_drag-position` 오버레이 | 각 카드마다 absolute 오버레이   | **제거** — 카드 호스트에서 직접 dragover                    |
| Placeholder 위치          | 각 카드 내부에 `_drop-position` | **Lane이 단일 placeholder 관리**                            |
| 드롭 위치 판정            | 카드 위 드롭 = "이 카드 앞에"   | 마우스 Y 좌표로 **before/after 판정**                       |
| 위치 전달                 | Board에 카드 인스턴스 전달      | Card가 **element + value + position**을 Lane Context에 전달 |

---

## 1. Context 타입

### KanbanContext.ts

```typescript
// 드래그 중인 카드의 참조 정보
export interface KanbanCardRef<L = unknown, T = unknown> {
  value: T | undefined;
  laneValue: L | undefined;
  heightOnDrag: number; // dragstart 시 캡처한 호스트 높이
}

// 드롭 이벤트 정보
export interface KanbanDropInfo<L = unknown, T = unknown> {
  sourceValue?: T; // 드래그한 카드의 value
  targetLaneValue?: L; // 드롭 대상 레인의 value
  targetCardValue?: T; // 드롭 대상 카드의 value (빈 레인 끝이면 undefined)
  position?: "before" | "after"; // targetCard 기준 앞/뒤 (targetCardValue가 있을 때만)
}

// 드롭 타겟 정보 (Lane이 placeholder 배치에 사용)
export interface KanbanDropTarget<T = unknown> {
  element: HTMLElement; // 대상 카드의 DOM 요소
  value: T | undefined; // 대상 카드의 value
  position: "before" | "after"; // 앞/뒤
}

export interface KanbanContextValue<L = unknown, T = unknown> {
  dragCard: Accessor<KanbanCardRef<L, T> | undefined>;
  setDragCard: Setter<KanbanCardRef<L, T> | undefined>;
  onDropTo: (
    targetLaneValue: L | undefined,
    targetCardValue: T | undefined,
    position: "before" | "after" | undefined,
  ) => void;
}

export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;
}
```

---

## 2. 역할 분담

### Board (Kanban)

| 역할                 | 구현                                           |
| -------------------- | ---------------------------------------------- |
| `dragCard` 상태 관리 | `createSignal<KanbanCardRef>()` → Context 제공 |
| `onDropTo` 콜백      | `props.onDrop` 호출 + dragCard 초기화          |
| 드래그 종료 정리     | `document:dragend` → `setDragCard(undefined)`  |

### Lane (Kanban.Lane)

| 역할                   | 구현                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `dropTarget` 상태 관리 | `createSignal<KanbanDropTarget>()` → Lane Context 제공      |
| Placeholder 렌더링     | 단일 div, `insertBefore`로 DOM 배치                         |
| 같은 위치 최적화       | referenceNode가 동일하면 DOM 조작 생략                      |
| 빈 영역 드롭           | Lane 바닥 영역 dragover/drop 처리                           |
| Lane 이탈 감지         | `dragenter`/`dragleave` 카운터 패턴                         |
| dragCard 리셋 시 정리  | `createEffect`로 dragCard가 undefined되면 dropTarget 초기화 |

### Card (Kanban.Card)

| 역할             | 구현                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| 드래그 시작      | `dragstart` → heightOnDrag 캡처 → `setDragCard()`                              |
| 드래그 오버 감지 | `dragover` → midY 판정 → `laneCtx.setDropTarget({ element, value, position })` |
| 드롭 처리        | `drop` → `boardCtx.onDropTo(laneValue, cardValue, position)`                   |
| 드래그 소스 숨김 | `dragCard()?.value === local.value` → `hidden` 클래스                          |
| `draggable` 제어 | `draggable` prop (기본: true)                                                  |

---

## 3. 이벤트 흐름

```
1. [dragstart on Card]
   → heightOnDrag = hostRef.offsetHeight 캡처
   → boardCtx.setDragCard({ value, laneValue, heightOnDrag })
   → 드래그 소스 카드: hidden

2. [dragover on Card]
   → e.preventDefault()
   → midY 계산 → position = "before" | "after"
   → laneCtx.setDropTarget({ element: hostRef, value, position })

3. [Lane createEffect: dropTarget 변경]
   → referenceNode 계산 (before → element, after → element.nextSibling)
   → 현재 placeholder 위치와 동일하면 스킵
   → 다르면 containerRef.insertBefore(placeholderEl, referenceNode)

4a. [drop on Card]
    → boardCtx.onDropTo(laneValue, cardValue, position)
    → Board에서 props.onDrop 발행

4b. [drop on Lane 빈 영역]
    → boardCtx.onDropTo(laneValue, undefined, undefined)
    → Board에서 props.onDrop 발행 (targetCardValue: undefined)

5. [dragenter/dragleave on Lane] (카운터 패턴)
    → dragEnterCount++ / dragEnterCount--
    → 카운터가 0이면 Lane을 벗어남 → setDropTarget(undefined) → placeholder 제거

6. [document:dragend]
    → boardCtx.setDragCard(undefined)
    → 각 Lane의 createEffect에서 dragCard 감지 → dropTarget 초기화
    → 전체 리셋
```

---

## 4. Placeholder 상세

### 4.1 구조

- Lane이 소유하는 **단일 div 요소** (ref로 직접 관리)
- `createEffect`에서 `dropTarget` 변경 시 `insertBefore`로 위치 이동

### 4.2 before/after 판정

```typescript
// Card의 dragover
const rect = hostRef.getBoundingClientRect();
const midY = rect.top + rect.height / 2;
const position = e.clientY < midY ? "before" : "after";
```

### 4.3 같은 위치 최적화

"카드 A의 after" = "카드 B의 before" → 같은 DOM 위치

```typescript
// Lane의 createEffect
const target = dropTarget();
if (!target) {
  placeholderEl.remove();
  return;
}

const referenceNode = target.position === "before" ? target.element : target.element.nextElementSibling; // null이면 끝에 추가

// 이미 올바른 위치면 DOM 조작 생략
if (placeholderEl.parentNode === containerRef && placeholderEl.nextSibling === referenceNode) {
  return;
}

containerRef.insertBefore(placeholderEl, referenceNode);
```

### 4.4 스타일

```typescript
const placeholderClass = clsx("rounded-lg", "bg-black/10 dark:bg-white/10");
// height: boardCtx.dragCard()?.heightOnDrag + "px"
// transition은 불필요 (위치 이동이므로 즉시 반영)
```

---

## 5. Lane 이탈 감지 (dragenter/dragleave 카운터)

카드 내부의 자식 요소로 마우스가 이동하면 dragleave가 발생하지만,
이것은 Lane을 벗어난 것이 아님. 카운터 패턴으로 해결:

```typescript
let dragEnterCount = 0;

const handleDragEnter = () => {
  dragEnterCount++;
};

const handleDragLeave = () => {
  dragEnterCount--;
  if (dragEnterCount === 0) {
    setDropTarget(undefined); // 진짜로 Lane을 벗어남
  }
};

// dragCard가 리셋되면 카운터도 초기화
createEffect(() => {
  if (!boardCtx.dragCard()) {
    dragEnterCount = 0;
    setDropTarget(undefined);
  }
});
```

---

## 6. Props 확장

### Kanban (Board)

```typescript
export interface KanbanProps<L = unknown, T = unknown> extends JSX.HTMLAttributes<HTMLDivElement> {
  onDrop?: (info: KanbanDropInfo<L, T>) => void; // 추가
}
```

### Kanban.Card

```typescript
export interface KanbanCardProps<T = unknown> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: T;
  draggable?: boolean; // 추가 (기본: true)
  contentClass?: string;
  children?: JSX.Element;
}
```

### Kanban.Lane — 변경 없음

---

## 7. 드래그 소스 숨김

```typescript
// Card 내부
const isDragSource = () => {
  const dc = boardCtx.dragCard();
  return dc != null && dc.value === local.value;
};

// 호스트 div에 조건부 클래스
class={twMerge(cardHostClass, isDragSource() && "hidden", local.class)}
```

### 주의: value 동일성

`dragCard().value === local.value`로 비교하므로, 다른 레인에 같은 value를 가진 카드가 있으면
둘 다 숨겨질 수 있음. 이는 사용자가 유니크한 value를 제공해야 하는 책임.

---

## 8. Card의 pointer-events

Angular legacy에서는 드래그 중 `pointer-events: none`을 Card 콘텐츠에 적용했으나,
이 설계에서는 **`_drag-position` 오버레이가 없으므로** 다른 접근이 필요.

카드 호스트에서 직접 dragover를 받으므로, 자식 요소의 pointer-events를 제어할 필요 없음.
dragover 이벤트는 버블링되므로 자식에서 발생해도 카드 호스트에서 받을 수 있음.

다만 **dragleave 깜빡임은 Lane의 카운터 패턴으로 해결**되므로, 카드 레벨에서는
dragover만 처리하면 됨 (dragleave 무시).

---

## 9. 파일 수정 범위

| 파일                    | 변경 내용                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `KanbanContext.ts`      | `KanbanCardRef`, `KanbanDropInfo`, `KanbanDropTarget` 타입 추가. Context 인터페이스 확장.                                                      |
| `Kanban.tsx`            | Board: dragCard 시그널, onDropTo, document:dragend. Lane: dropTarget, placeholder, 카운터. Card: dragstart, dragover, drop, draggable, hidden. |
| `KanbanPage.tsx` (데모) | onDrop 핸들러 추가, DnD 동작 검증용 데이터 이동 로직.                                                                                          |

---

## 10. 구현 순서

1. **Context 타입 확장** — KanbanContext.ts에 새 타입/인터페이스 추가
2. **Board 확장** — dragCard 시그널, onDropTo, document:dragend, Props 확장
3. **Lane 확장** — dropTarget 시그널, placeholder div, insertBefore 로직, 카운터 패턴
4. **Card 확장** — dragstart, dragover, drop 핸들러, draggable prop, hidden 처리
5. **데모 페이지** — onDrop으로 카드 이동 로직, DnD 동작 검증
6. **검증** — typecheck + lint + 브라우저 동작 확인
