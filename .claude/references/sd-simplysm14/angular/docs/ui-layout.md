# UI - Layout

## `SdDockContainerControl`

도킹 레이아웃 컨테이너. `SdDockControl`과 함께 사용하여 상/하/좌/우 고정 영역을 만든다.

```typescript
@Component({ selector: "sd-dock-container" })
class SdDockContainerControl { }
```

## `SdDockControl`

도킹 영역 컴포넌트. `SdDockContainerControl` 내부에서 사용.

```typescript
@Component({ selector: "sd-dock" })
class SdDockControl {
  resizable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `resizable` | `boolean` | `false` | 크기 조절 가능 여부 |

## `SdPaneDirective`

스크롤 가능 패널 디렉티브.

```typescript
@Directive({ selector: "[sd-pane]" })
class SdPaneDirective { }
```

## `SdGapControl`

간격(gap) 컴포넌트. 요소 사이에 공간을 추가한다.

```typescript
@Component({ selector: "sd-gap" })
class SdGapControl { }
```

## `SdViewControl`

탭 뷰 전환 래퍼. `SdViewItemControl`과 함께 사용.

```typescript
@Component({ selector: "sd-view" })
class SdViewControl {
  fill = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `fill` | `boolean` | `false` | 전체 높이 채우기 |

## `SdViewItemControl`

탭 뷰 항목.

```typescript
@Component({ selector: "sd-view-item" })
class SdViewItemControl { }
```

## `SdCardDirective`

카드 스타일 디렉티브. `[sd-card]` 속성으로 적용.

```typescript
@Directive({ selector: "[sd-card]" })
class SdCardDirective { }
```

## `SdKanbanBoardControl`

칸반 보드 컨테이너. 드래그앤드롭을 지원한다.

```typescript
@Component({ selector: "sd-kanban-board" })
class SdKanbanBoardControl {
  drop = output<ISdKanbanBoardDropInfo>();
}
```

### `ISdKanbanBoardDropInfo`

```typescript
interface ISdKanbanBoardDropInfo {
  sourceItem: any;
  sourceLane: any;
  targetLane: any;
  targetIndex: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sourceItem` | `any` | 드래그한 아이템 |
| `sourceLane` | `any` | 출발 레인 |
| `targetLane` | `any` | 도착 레인 |
| `targetIndex` | `number` | 도착 위치 인덱스 |

### `ISdKanbanDragRef`

```typescript
interface ISdKanbanDragRef {
  element: HTMLElement;
  item: any;
  lane: any;
}
```

### `ISdKanbanDropTarget`

```typescript
interface ISdKanbanDropTarget {
  element: HTMLElement;
  lane: any;
}
```

## `SdKanbanControl`

칸반 아이템 컴포넌트.

```typescript
@Component({ selector: "sd-kanban" })
class SdKanbanControl {
  selectable = input(false, { transform: booleanAttribute });
  draggable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `selectable` | `boolean` | `false` | 선택 가능 여부 |
| `draggable` | `boolean` | `false` | 드래그 가능 여부 |

## `SdKanbanLaneControl`

칸반 레인 컴포넌트.

```typescript
@Component({ selector: "sd-kanban-lane" })
class SdKanbanLaneControl {
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
