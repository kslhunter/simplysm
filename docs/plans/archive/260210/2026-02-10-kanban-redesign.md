# Kanban 컴포넌트 재설계

> 작성일: 2026-02-10
> Angular `sd-kanban-board` / `sd-kanban-lane` / `sd-kanban` → SolidJS `Kanban` 컴파운드 컴포넌트

## 0. 작업 방침

기존에 구현된 `Kanban.tsx` / `KanbanContext.ts`를 **폐기하고 처음부터 재작성**한다.
Phase별로 기능을 나눠 점진적으로 구현하며, 각 Phase 완료 시 동작 검증을 거친다.

---

## 1. 컴포넌트 구조

```
Kanban            (Board 루트, KanbanContext Provider)
├── Kanban.Lane       (레인/컬럼, KanbanLaneContext Provider)
│   ├── Kanban.LaneTitle  (슬롯: 레인 제목)
│   ├── Kanban.LaneTools  (슬롯: 도구 영역)
│   └── Kanban.Card       (카드, 반복)
└── ... (Lane 반복)
```

---

## 2. 전체 기능 목록

### DnD (드래그 앤 드롭)

| #   | 기능              | 설명                                                                         | Phase |
| --- | ----------------- | ---------------------------------------------------------------------------- | ----- |
| 1   | 카드 레인 간 이동 | 카드를 다른 레인으로 드래그하여 이동                                         | 2     |
| 2   | 카드 순서 변경    | 같은 레인 내에서 카드 위에 드롭 = "이 카드 앞에 삽입"                        | 2     |
| 3   | 빈 레인에 드롭    | 레인 하단 빈 영역에 드롭 = "레인 맨 끝에 추가"                               | 2     |
| 4   | 드래그 소스 숨김  | 드래그 중 원본 카드 `display: none` 처리                                     | 2     |
| 5   | 드롭 미리보기     | 드롭 위치에 placeholder 표시 (드래그 소스 높이, 0.1s 애니메이션)             | 2     |
| 6   | 오버레이 패턴     | `_drag-position` 투명 오버레이로 pointer-events 전환 (dragleave 깜빡임 방지) | 2     |
| 7   | 드래그 취소 처리  | ESC/외부 드롭 시 `document:dragend`로 상태 초기화                            | 2     |
| 8   | 드롭 후 정리      | `document:drop.capture`로 모든 카드의 dragOvered 리셋                        | 2     |
| 9   | draggable 제어    | `draggable` prop이 false인 카드는 드래그 불가                                | 2     |

### 선택 (Selection)

| #   | 기능                | 설명                                                               | Phase |
| --- | ------------------- | ------------------------------------------------------------------ | ----- |
| 10  | Shift+Click 선택    | Shift+Click으로 개별 카드 선택/해제 토글                           | 4     |
| 11  | selectable 제어     | `selectable` prop이 false인 카드는 선택 불가                       | 4     |
| 12  | 레인별 전체 선택    | selectable 카드가 1개 이상인 레인에 CheckBox 자동 표시             | 4     |
| 13  | 레인 독립 선택      | 전체 선택/해제는 해당 레인 카드만 조작 (다른 레인 유지)            | 4     |
| 14  | selectedValues 관리 | Board 레벨에서 `selectedValues` 배열로 선택 상태 관리 (controlled) | 4     |
| 15  | 선택 시각 피드백    | 선택된 카드에 강조 스타일 표시 (ring)                              | 4     |

### 레인 기능

| #   | 기능        | 설명                                                              | Phase |
| --- | ----------- | ----------------------------------------------------------------- | ----- |
| 16  | 제목 슬롯   | `Kanban.LaneTitle`로 커스텀 제목 렌더링                           | 1     |
| 17  | 도구 슬롯   | `Kanban.LaneTools`로 커스텀 도구 버튼 영역                        | 1     |
| 18  | 접기/펼치기 | `collapsible`/`collapsed` — 접으면 카드 목록 숨김, 눈 아이콘 토글 | 3     |
| 19  | Busy 상태   | `busy` prop — BusyContainer 래핑, bar 타입 로딩 표시              | 3     |

### 카드 기능

| #   | 기능         | 설명                                                           | Phase |
| --- | ------------ | -------------------------------------------------------------- | ----- |
| 20  | Card 래핑    | 내부적으로 Card 컴포넌트 래핑 (그림자, 둥근 모서리, 호버 효과) | 1     |
| 21  | contentClass | 카드에 커스텀 클래스 추가                                      | 1     |
| 22  | value        | 카드 식별값 (DnD/선택에서 사용)                                | 1     |

### 레이아웃

| #   | 기능           | 설명                                                                                                                      | Phase |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------- | ----- |
| 23  | Board 레이아웃 | `inline-flex flex-nowrap whitespace-nowrap`, 가로 스크롤, `height: 100%`, 레인 간 `gap`                                   | 1     |
| 24  | Lane 레이아웃  | 세로 `flex-column`, 배경색 (연한 회색), 둥근 모서리, 외부 패딩+간격                                                       | 1     |
| 25  | Card 스타일    | `user-select: none`, `whitespace-normal` (Board nowrap 복원), 카드 간 간격 (`mb-2`), `position: relative` (오버레이 기준) | 1     |

---

## 3. Phase 분리

### Phase 1: UI 기본 (기능 16, 17, 20~25)

> Board/Lane/Card 렌더링과 레이아웃이 동작하는 최소 MVP

**구현 범위:**

- KanbanContext / KanbanLaneContext
- Kanban (Board) — Context Provider, `inline-flex` 가로 레이아웃
- Kanban.Lane — 레인 컨테이너 (배경/레이아웃), LaneContext Provider
- Kanban.LaneTitle / Kanban.LaneTools — splitSlots로 children에서 분리
- Kanban.Card — Card 래핑, `value`, `contentClass`
- index.ts export, 데모 페이지 (기본 렌더링)

**완료 기준:** Board에 여러 Lane이 가로 배치, Lane 안에 Card가 세로 배치. 제목/도구 슬롯 동작. contentClass 적용.

### Phase 2: DnD (기능 1~9)

> 드래그 앤 드롭 기능 추가

**구현 범위:**

- Kanban (Board) — `document:dragend` 정리, `onDrop` 발행
- Kanban.Lane — 빈 레인 드롭 (dragover/dragleave/drop)
- Kanban.Card — `_drag-position` 오버레이, `_drop-position` 미리보기, DnD 이벤트 체인, `draggable` 제어
- 데모 페이지 확장 (DnD)

**완료 기준:** 카드를 레인 간/내에서 드래그하여 이동. 카드 위 드롭 + 빈 레인 드롭 모두 동작.

### Phase 3: 레인 부가 기능 (기능 18, 19)

> 접기/펼치기, Busy 상태

**구현 범위:**

- 접기/펼치기 — `collapsible`/`collapsed` props, 눈 아이콘
- Busy 상태 — BusyContainer 래핑
- 데모 페이지 확장

**완료 기준:** 접기/펼치기, 로딩 표시 동작.

### Phase 4: 선택 시스템 (기능 10~15)

> Shift+Click 선택 + 전체 선택 + 시각 피드백

**구현 범위:**

- Shift+Click 토글 — `selectable` prop, stopPropagation
- selectedValues 관리 — Board의 `selectedValues`/`onSelectedValuesChange` (createPropSignal)
- 선택 시각 피드백 — 선택된 카드에 `ring-2 ring-primary-500` 등
- 레인별 전체 선택 체크박스 — selectable 카드 수 계산, CheckBox 자동 표시, 레인 독립 선택/해제
- 데모 페이지 확장

**완료 기준:** Shift+Click 선택/해제, 전체 선택/해제, 시각 피드백, 다른 레인 영향 없음.

### 의존 관계

```
Phase 1 (UI 기본) → Phase 2 (DnD) → Phase 3 (레인 부가) → Phase 4 (선택)
```

Phase 1 → 2: 기본 렌더링이 있어야 DnD 오버레이를 얹을 수 있음.
Phase 3 → 4: 도구 슬롯(`Kanban.LaneTools`) 구조가 있어야 Phase 4의 전체 선택 체크박스를 도구 영역 옆에 배치할 수 있음. (슬롯은 Phase 1에서 구현되므로 Phase 3~4는 독립적으로도 가능)

---

## 4. API 설계

### 4.1 타입 정의

```typescript
// KanbanContext.ts

export interface KanbanDropInfo<L = unknown, T = unknown> {
  sourceValue?: T; // 드래그한 카드의 value
  targetLaneValue?: L; // 드롭 대상 레인의 value
  targetCardValue?: T; // 드롭 대상 카드의 value (카드 위 드롭 시, 빈 레인이면 undefined)
}

export interface KanbanContextValue<L = unknown, T = unknown> {
  dragCard: Accessor<KanbanCardRef<L, T> | undefined>;
  setDragCard: Setter<KanbanCardRef<L, T> | undefined>;
  selectedValues: Accessor<T[]>;
  toggleSelection: (value: T) => void;
  selectAllInLane: (laneCards: { value: T | undefined; selectable: boolean }[]) => void;
  deselectAllInLane: (laneCards: { value: T | undefined; selectable: boolean }[]) => void;
  onDropTo: (targetLaneValue: L | undefined, targetCardValue: T | undefined) => void;
}

// 드래그 중인 카드의 참조 정보
export interface KanbanCardRef<L = unknown, T = unknown> {
  value: T | undefined;
  laneValue: L | undefined;
  heightOnDrag: number;
}

export interface KanbanLaneContextValue<L = unknown> {
  value: Accessor<L | undefined>;
}
```

### 4.2 컴포넌트 Props

```typescript
// --- Kanban (Board) ---
export interface KanbanProps<L = unknown, T = unknown> extends JSX.HTMLAttributes<HTMLDivElement> {
  selectedValues?: T[];
  onSelectedValuesChange?: (values: T[]) => void;
  onDrop?: (info: KanbanDropInfo<L, T>) => void;
}

// --- Kanban.Lane ---
export interface KanbanLaneProps<L = unknown> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: L;
  busy?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: JSX.Element;
}

// --- Kanban.Card ---
export interface KanbanCardProps<T = unknown> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: T;
  selectable?: boolean;
  draggable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}

// --- 슬롯 컴포넌트 ---
// Kanban.LaneTitle, Kanban.LaneTools: ParentComponent (data 속성 마커만)
```

### 4.3 Compound Component 인터페이스

```typescript
interface KanbanComponent {
  <L = unknown, T = unknown>(props: KanbanProps<L, T>): JSX.Element;
  Lane: typeof KanbanLane;
  Card: typeof KanbanCard;
  LaneTitle: typeof KanbanLaneTitle;
  LaneTools: typeof KanbanLaneTools;
}
```

---

## 5. DnD 구현 상세

### 5.1 카드 DOM 구조

```
div.kanban-card (호스트, position: relative)
  ├── div._drag-position   (position: absolute, 투명 오버레이)
  ├── div._drop-position   (드롭 미리보기 슬롯)
  └── Card                 (실제 카드 콘텐츠)
```

### 5.2 `_drag-position` 오버레이 패턴

- `position: absolute; top:0; left:0; right:0`으로 카드 위에 겹침
- 높이: `cardHeight` = Card의 `offsetHeight` + 간격 (ResizeObserver로 실시간 계산)
- **평상시**: `pointer-events: none` → 아래 Card가 정상 클릭 가능
- **드래그 중**: `pointer-events: auto` → dragover/dragleave/drop 수신, Card는 `pointer-events: none`
- **설계 의도**: 자식 요소가 없는 빈 div이므로 dragleave 깜빡임 문제가 구조적으로 발생하지 않음

### 5.3 `_drop-position` 미리보기

- 드래그 미발생: `display: none` (높이 0)
- 드래그 발생, 이 카드 위 아닌 경우: `display: block` (높이 0, `visibility: hidden`, `margin-bottom: 0`)
- 이 카드 위로 드래그 오버: `height → heightOnDrag`, `margin-bottom → gap 크기`, `visibility → visible` (0.1s linear transition)
- 배경: 반투명 회색, 둥근 모서리
- 시각적 효과: "여기에 놓을 것" 미리보기 슬롯

### 5.4 높이 계산

| 값             | 계산                                | 용도                           | 갱신 시점                                                                                                       |
| -------------- | ----------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `cardHeight`   | `Card.offsetHeight + margin-bottom` | `_drag-position` 오버레이 높이 | ResizeObserver (실시간). Tailwind gap 사용 시 margin이 없으므로, Card에 `mb-2` 등을 적용하고 이를 포함하여 계산 |
| `heightOnDrag` | 카드 호스트의 `offsetHeight`        | `_drop-position` 미리보기 높이 | dragstart 시 캡처                                                                                               |

`heightOnDrag`는 dragstart 직후 캡처해야 함 — 이후 `display: none`이 되어 높이를 읽을 수 없음.

### 5.5 이벤트 흐름

```
1. [dragstart on Card]
   → heightOnDrag = 호스트.offsetHeight 캡처
   → Context.setDragCard({ value, laneValue, heightOnDrag })
   → 모든 카드: 드래그 중 스타일 적용 (pointer-events 전환)
   → 드래그 소스: display:none

2. [dragover on _drag-position]
   → setDragOvered(true)
   → _drop-position: 높이 → heightOnDrag, 보임 (0.1s transition)

3. [dragleave on _drag-position]
   → setDragOvered(false)
   → _drop-position: 높이 → 0, 숨김 (0.1s transition)

4a. [drop on _drag-position] (카드 위 드롭)
    → Context.onDropTo(laneValue, cardValue)
    → onDrop emit: { sourceValue, targetLaneValue, targetCardValue }

4b. [drop on Lane] (빈 레인 드롭)
    → Context.onDropTo(laneValue, undefined)
    → onDrop emit: { sourceValue, targetLaneValue, targetCardValue: undefined }

5. [document:drop capture] (모든 카드)
   → 모든 dragOvered = false (안전장치)

6. [document:dragend] (Board)
   → setDragCard(undefined) → 전체 리셋
```

### 5.6 Tailwind 클래스 전략

**카드 호스트:**

```typescript
const kanbanCardClass = clsx(
  "relative block", // _drag-position(absolute)의 기준 + block 레벨
);
```

**드래그 소스 숨김:** `dragCard()?.value === local.value` 일 때 `hidden` 클래스 적용

**`_drag-position`:**

```typescript
const dragPositionClass = clsx(
  "absolute top-0 left-0 right-0",
  "pointer-events-none", // 기본
);
// 드래그 중: pointer-events-auto 동적 추가
```

**`_drop-position`:**

```typescript
const dropPositionClass = clsx(
  "rounded-lg",
  "bg-black/10 dark:bg-white/10",
  "transition-[height,margin-bottom,visibility] duration-100",
);
// dragOvered 시: height → heightOnDrag, margin-bottom → gap 크기, visibility → visible
// 평상시: height → 0, margin-bottom → 0, visibility → hidden
```

**Card 내부:**

```typescript
// Card 컴포넌트에 whitespace-normal 적용 (Board의 inline-flex가 nowrap이므로 복원 필요)
<Card class={clsx("whitespace-normal select-none", props.contentClass)}>
```

---

## 6. 선택 시스템 상세 (Phase 3)

### 6.1 Shift+Click 선택 토글

- 카드 호스트의 `onClick` 이벤트에서 `event.shiftKey` 확인
- Shift 없는 일반 클릭은 카드 내부 콘텐츠의 기본 동작 유지
- `selectable` prop + `value` 존재 여부 이중 체크
- `event.preventDefault()` (텍스트 선택 방지) + `event.stopPropagation()` (버블링 차단)
- Context의 `toggleSelection(value)` 호출

### 6.2 selectedValues 관리

- Board의 `selectedValues`/`onSelectedValuesChange`로 controlled 패턴 (createPropSignal)
- `toggleSelection`: 배열에 있으면 제거, 없으면 추가
- 변경 없으면 원래 배열 참조 반환 (불필요한 시그널 업데이트 방지)

### 6.3 선택 시각 피드백

- 선택된 카드: `ring-2 ring-primary-500` 적용
- Card 컴포넌트의 class에 조건부 추가

### 6.4 레인별 전체 선택 체크박스

**표시 조건:** 레인 내 `selectable` 카드가 1개 이상일 때

**체크 상태 계산:** 레인 내 모든 selectable 카드가 `selectedValues`에 포함되어 있는지

**전체 선택 (체크):**

- 이 레인의 미선택 카드만 `selectedValues`에 추가
- 다른 레인의 선택 상태 유지

**전체 해제 (언체크):**

- 이 레인의 선택된 카드만 `selectedValues`에서 제거
- 다른 레인의 선택 상태 유지

**배치:** 도구 슬롯(`Kanban.LaneTools`) 옆, `float: left` 또는 flex 정렬

**SolidJS 구현 과제:** Angular의 `contentChildren`에 대응하는 메커니즘 필요. 카드의 selectable/value 정보를 Lane이 알아야 함.

**접근 방식:** Lane Context에 카드 등록/해제 메서드를 두고, 각 Card가 마운트/언마운트 시 자신의 정보를 등록/해제하는 패턴 사용.

```typescript
// KanbanLaneContext 확장
export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  value: Accessor<L | undefined>;
  registerCard: (id: string, info: { value: T | undefined; selectable: boolean }) => void;
  unregisterCard: (id: string) => void;
}
```

---

## 7. 레인 기능 상세 (Phase 2)

### 7.1 슬롯 시스템 (splitSlots)

`Kanban.LaneTitle`과 `Kanban.LaneTools`는 `data-*` 속성 마커를 가진 슬롯 컴포넌트:

```typescript
const KanbanLaneTitle: ParentComponent = (props) => (
  <div data-kanban-lane-title>{props.children}</div>
);

const KanbanLaneTools: ParentComponent = (props) => (
  <div data-kanban-lane-tools>{props.children}</div>
);
```

Lane에서 `splitSlots`로 분리:

```typescript
const resolved = children(() => props.children);
const [slots, content] = splitSlots(resolved, ["kanbanLaneTitle", "kanbanLaneTools"] as const);
```

### 7.2 접기/펼치기

- `collapsible` prop이 true일 때 접기 버튼 표시
- `collapsed`/`onCollapsedChange`로 controlled 패턴 (createPropSignal)
- 접힌 상태: 카드 목록(`content`) 미렌더링 (`<Show when={!collapsed()}>`)
- 아이콘: `IconEye` (펼침) / `IconEyeOff` (접힘)

### 7.3 Busy 상태

- `BusyContainer` 래핑, `variant="bar"`
- Lane 콘텐츠 영역 전체를 감싸 로딩 바 표시
- `min-height: 3em` 적용 — 빈 레인에서도 드롭 가능 영역 최소 크기 확보

### 7.4 Lane 스타일

```typescript
// 레인 기본 스타일 (외부: 패딩 + 간격)
const laneBaseClass = clsx("flex flex-col", "p-2 gap-2");

// 레인 콘텐츠 영역
const laneContentClass = clsx(
  "flex-1",
  "rounded-lg",
  "bg-base-100 dark:bg-base-900",
  "p-3",
  "overflow-y-auto",
  "flex flex-col gap-2",
);
```

### 7.5 Lane 헤더 구조

**조건부 렌더링:** `collapsible || LaneTitle 슬롯 존재` 일 때만 헤더 div 렌더링

```
Lane 헤더 (Show when={collapsible || hasLaneTitle})
├── [collapsible일 때] 접기/펼치기 버튼 (Icon)
├── LaneTitle 슬롯
└── LaneTools 슬롯 (ml-auto)

Lane 콘텐츠 (BusyContainer 래핑)
├── [Phase 3: 전체 선택 체크박스 + LaneTools]
├── [collapsed가 아닐 때] content (카드 목록)
└── _drop-position (빈 레인 드롭용)
```

---

## 8. 사용 예시

```tsx
function KanbanDemo() {
  const [lanes, setLanes] = createSignal([
    {
      id: "todo",
      name: "할 일",
      cards: [
        { id: 1, title: "카드 1" },
        { id: 2, title: "카드 2" },
      ],
    },
    { id: "progress", name: "진행 중", cards: [{ id: 3, title: "카드 3" }] },
    { id: "done", name: "완료", cards: [] },
  ]);

  const [selected, setSelected] = createSignal<number[]>([]);

  const handleDrop = (info: KanbanDropInfo<string, number>) => {
    setLanes((prev) => {
      // sourceValue 카드를 소스 레인에서 제거
      // targetLaneValue 레인에 삽입
      // targetCardValue가 있으면 그 카드 앞에, 없으면 맨 끝에
    });
  };

  return (
    <Kanban selectedValues={selected()} onSelectedValuesChange={setSelected} onDrop={handleDrop}>
      <For each={lanes()}>
        {(lane) => (
          <Kanban.Lane value={lane.id} collapsible busy={false}>
            <Kanban.LaneTitle>
              {lane.name} ({lane.cards.length})
            </Kanban.LaneTitle>
            <Kanban.LaneTools>
              <button>+ 추가</button>
            </Kanban.LaneTools>
            <For each={lane.cards}>
              {(card) => (
                <Kanban.Card value={card.id} selectable draggable>
                  <div class="p-3">{card.title}</div>
                </Kanban.Card>
              )}
            </For>
          </Kanban.Lane>
        )}
      </For>
    </Kanban>
  );
}
```

---

## 9. 파일 구조

```
packages/solid/src/components/layout/kanban/
├── KanbanContext.ts       — Context 정의, 타입 export
└── Kanban.tsx             — Board, Lane, Card, LaneTitle, LaneTools 모두 포함

packages/solid/src/index.ts
└── export * from "./components/layout/kanban/Kanban"
    export * from "./components/layout/kanban/KanbanContext"

packages/solid-demo/src/pages/data/
└── KanbanPage.tsx         — 데모 페이지
```

---

## 10. Angular → Solid 매핑 요약

| Angular                        | Solid                                   | 비고                |
| ------------------------------ | --------------------------------------- | ------------------- |
| `SdKanbanBoardControl`         | `Kanban`                                | Board 루트          |
| `SdKanbanLaneControl`          | `Kanban.Lane`                           | 레인 컨테이너       |
| `SdKanbanControl`              | `Kanban.Card`                           | 카드                |
| `inject(SdKanbanBoardControl)` | `useKanbanContext()`                    | Context hook        |
| `inject(SdKanbanLaneControl)`  | `useKanbanLaneContext()`                | Context hook        |
| `model()` (two-way)            | `createPropSignal`                      | controlled 패턴     |
| `contentChildren(descendants)` | Lane Context 등록/해제 패턴             | Phase 3             |
| `$signal` / `$computed`        | `createSignal` / `createMemo`           | 반응성              |
| `SdCardDirective` (card class) | `Card` 컴포넌트 래핑                    | 스타일 재사용       |
| `#titleTpl` / `#toolTpl`       | `splitSlots` + `Kanban.LaneTitle/Tools` | 슬롯                |
| `data-sd-*` 속성 + SCSS        | Tailwind 조건부 클래스                  | 상태 스타일링       |
| `SdBusyContainerControl`       | `BusyContainer`                         | Phase 2             |
| `SdCheckboxControl`            | `CheckBox`                              | Phase 3 전체 선택   |
| `SdEventsDirective` (sdResize) | `ResizeObserver` 직접 사용              | cardHeight 계산     |
| SCSS `--gap-lg` (8px) 등       | Tailwind `gap-2` (8px) 등               | CSS 변수 → 유틸리티 |
