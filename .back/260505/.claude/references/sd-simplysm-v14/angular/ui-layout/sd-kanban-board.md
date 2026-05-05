# `SdKanbanBoard`

> **읽어야 하는 상황**: 칸반 보드(드래그앤드롭)를 구성할 때.

칸반 보드 컨테이너. 드래그앤드롭을 지원한다.

```typescript
@Component({ selector: "sd-kanban-board" })
class SdKanbanBoard<L, T> {
  selectedValues = model<T[]>([]);
  drop = output<SdKanbanBoardDropInfo<L, T>>();
}
```

## Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `selectedValues` | model | `T[]` | `[]` | 선택된 칸반 아이템 값 배열 (two-way) |
| `drop` | output | `SdKanbanBoardDropInfo<L, T>` | - | 드롭 완료 시 발생 |

## Related Types

### `SdKanban`

칸반 아이템 컴포넌트.

```typescript
@Component({ selector: "sd-kanban" })
class SdKanban<L, T> {
  value = input<T>();
  selectable = input(false, { transform: booleanAttribute });
  draggable = input(false, { transform: booleanAttribute });
  contentClass = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `T \| undefined` | `undefined` | 칸반 아이템의 값 |
| `selectable` | `boolean` | `false` | 선택 가능 여부 |
| `draggable` | `boolean` | `false` | 드래그 가능 여부 |
| `contentClass` | `string \| undefined` | `undefined` | 컨텐츠 CSS 클래스 |

### `SdKanbanLane`

칸반 레인 컴포넌트.

```typescript
@Component({ selector: "sd-kanban-lane" })
class SdKanbanLane<L, T> {
  busy = input(false, { transform: booleanAttribute });
  useCollapse = input(false, { transform: booleanAttribute });
  collapse = model(false);
  value = input<L>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `busy` | `boolean` | `false` | busy 상태 |
| `useCollapse` | `boolean` | `false` | 접기 기능 사용 |
| `collapse` | `boolean` | `false` | 접힘 상태 (two-way) |
| `value` | `L \| undefined` | `undefined` | 레인의 값 |

### `SdKanbanBoardDropInfo`

```typescript
interface SdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sourceKanbanValue` | `T \| undefined` | 드래그한 칸반 아이템의 값 |
| `targetLaneValue` | `L \| undefined` | 드롭 대상 레인의 값 |
| `targetKanbanValue` | `T \| undefined` | 드롭 대상 칸반 아이템의 값 |

### `SdKanbanDragRef`

```typescript
interface SdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}
```

### `SdKanbanDropTarget`

```typescript
interface SdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
```
