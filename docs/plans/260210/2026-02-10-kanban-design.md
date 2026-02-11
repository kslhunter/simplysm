# Kanban 컴포넌트 설계

> 작성일: 2026-02-10
> 마이그레이션 항목: #6 Kanban (Board + Lane)

## 컴포넌트 구조

```
Kanban (Board 루트)
├── Kanban.Lane (레인/열)
│   ├── Kanban.LaneTitle (슬롯: 레인 제목)
│   ├── Kanban.LaneTools (슬롯: 레인 도구 버튼)
│   ├── Kanban.Card (카드)
│   └── ...
└── ...
```

### 컴파운드 컴포넌트

| 컴포넌트           | 역할                                        |
| ------------------ | ------------------------------------------- |
| `Kanban`           | Board 루트. DnD/선택 상태 관리              |
| `Kanban.Lane`      | 레인(열). 접기/펼치기, busy, 카드 드롭 영역 |
| `Kanban.LaneTitle` | 레인 헤더 제목 슬롯                         |
| `Kanban.LaneTools` | 레인 헤더 도구 버튼 슬롯                    |
| `Kanban.Card`      | 개별 카드. 드래그/선택 가능                 |

### Context

- `KanbanContext` — Board가 제공. 드래그 중인 카드, 선택 값 목록, drop 핸들러
- `KanbanLaneContext` — Lane이 제공. 레인의 value

## Props

```typescript
// Kanban (Board)
interface KanbanProps<L, T> {
  value?: T[];
  onValueChange?: (values: T[]) => void;
  onDrop?: (info: KanbanDropInfo<L, T>) => void;
  children: JSX.Element;
  class?: string;
}

interface KanbanDropInfo<L, T> {
  sourceValue?: T;
  targetLaneValue?: L;
  targetCardValue?: T;
}

// Kanban.Lane
interface KanbanLaneProps<L> {
  value?: L;
  busy?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
  children: JSX.Element;
  class?: string;
}

// Kanban.Card
interface KanbanCardProps<T> {
  value?: T;
  draggable?: boolean; // 기본 true
  children: JSX.Element;
  class?: string;
}
```

## DnD 동작

HTML 표준 Drag API (`draggable`, `dragstart`, `dragover`, `drop`) 직접 사용. 외부 의존성 없음.

### 흐름

1. 카드 드래그 시작 → `KanbanContext`에 드래그 중인 카드 값 저장
2. 다른 레인/카드 위로 드래그 → 드롭 위치 시각적 피드백
3. 드롭 → `onDrop({ sourceValue, targetLaneValue, targetCardValue })` 호출
4. 데이터 이동은 사용자가 `onDrop` 핸들러에서 처리

### 시각적 피드백

- 드래그 중인 카드: `opacity-50`
- 드롭 가능 위치: 카드 사이에 `border-primary-500` 라인
- 빈 레인: 점선 테두리

## 선택 기능

- Shift+Click으로 카드 선택/해제 토글
- 선택된 카드: `ring-2 ring-primary-500`
- `value`/`onValueChange`로 외부 제어 (controlled)

## 레인 기능

- `collapsible` 활성화 시 접기/펼치기 토글 버튼 표시
- 접힌 상태: 제목만 표시, 카드 숨김
- `busy` 상태: BusyContainer로 로딩 표시
- `LaneTitle`/`LaneTools` 슬롯: splitSlots로 분리

## 사용 예시

```tsx
<Kanban onDrop={(info) => handleDrop(info)} value={selectedCards()} onValueChange={setSelectedCards}>
  <For each={lanes()}>
    {(lane) => (
      <Kanban.Lane value={lane.id} collapsible>
        <Kanban.LaneTitle>
          {lane.name} ({lane.cards.length})
        </Kanban.LaneTitle>
        <Kanban.LaneTools>
          <Button size="sm" onClick={() => addCard(lane.id)}>
            +
          </Button>
        </Kanban.LaneTools>
        <For each={lane.cards}>
          {(card) => (
            <Kanban.Card value={card.id}>
              <div>{card.title}</div>
            </Kanban.Card>
          )}
        </For>
      </Kanban.Lane>
    )}
  </For>
</Kanban>
```

## 파일 구조

```
packages/solid/src/components/layout/kanban/
├── Kanban.tsx          # Board + Card + Lane + 슬롯 컴포넌트
├── KanbanContext.ts    # KanbanContext, KanbanLaneContext
└── (index.ts에 export 추가)
```
