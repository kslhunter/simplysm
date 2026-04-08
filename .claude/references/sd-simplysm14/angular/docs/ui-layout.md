# UI - Layout

## `SdDockContainer`

도킹 레이아웃 컨테이너. `SdDock`과 함께 사용하여 상/하/좌/우 고정 영역을 만든다.

```typescript
@Component({ selector: "sd-dock-container" })
class SdDockContainer { }
```

## `SdDock`

도킹 영역 컴포넌트. `SdDockContainer` 내부에서 사용.

```typescript
@Component({ selector: "sd-dock" })
class SdDock {
  resizable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `resizable` | `boolean` | `false` | 크기 조절 가능 여부 |

## `SdPane`

스크롤 가능 패널 디렉티브.

```typescript
@Directive({ selector: "[sdPane]" })
class SdPane { }
```

## `SdGap`

간격(gap) 컴포넌트. 요소 사이에 공간을 추가한다.

```typescript
@Component({ selector: "sd-gap" })
class SdGap { }
```

## `SdView`

탭 뷰 전환 래퍼. `SdViewItem`과 함께 사용.

```typescript
@Component({ selector: "sd-view" })
class SdView {
  fill = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `fill` | `boolean` | `false` | 전체 높이 채우기 |

## `SdViewItem`

탭 뷰 항목.

```typescript
@Component({ selector: "sd-view-item" })
class SdViewItem { }
```

## `SdCard`

카드 스타일 디렉티브. `[sdCard]` 속성으로 적용.

```typescript
@Directive({ selector: "[sdCard]" })
class SdCard { }
```

## `SdKanbanBoard`

칸반 보드 컨테이너. 드래그앤드롭을 지원한다.

```typescript
@Component({ selector: "sd-kanban-board" })
class SdKanbanBoard {
  drop = output<SdKanbanBoardDropInfo>();
}
```

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
| `targetKanbanValue` | `T \| undefined` | 드롭 대상 칸반 아이템의 값 (칸반 위에 드롭 시) |

### `SdKanbanDragRef`

```typescript
interface SdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value()` | `T \| undefined` | 드래그 중인 칸반 아이템의 값 |
| `heightOnDrag()` | `number` | 드래그 시작 시점의 요소 높이 |

### `SdKanbanDropTarget`

```typescript
interface SdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `targetLaneValue()` | `L \| undefined` | 드롭 대상 레인의 값 |
| `targetKanbanValue?()` | `T \| undefined` | 드롭 대상 칸반 아이템의 값 (optional) |

## `SdKanban`

칸반 아이템 컴포넌트.

```typescript
@Component({ selector: "sd-kanban" })
class SdKanban {
  selectable = input(false, { transform: booleanAttribute });
  draggable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `selectable` | `boolean` | `false` | 선택 가능 여부 |
| `draggable` | `boolean` | `false` | 드래그 가능 여부 |

## `SdKanbanLane`

칸반 레인 컴포넌트.

```typescript
@Component({ selector: "sd-kanban-lane" })
class SdKanbanLane {
  busy = input(false, { transform: booleanAttribute });
  useCollapse = input(false, { transform: booleanAttribute });
  collapse = model(false);
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `busy` | `boolean` | `false` | busy 상태 |
| `useCollapse` | `boolean` | `false` | 접기 기능 사용 |
| `collapse` | `boolean` | `false` | 접힘 상태 (two-way) |
