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
  key = input<string>();
  position = input<"top" | "bottom" | "right" | "left">("top");
  resizable = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string \| undefined` | `undefined` | 리사이즈 설정 저장 키 |
| `position` | `"top" \| "bottom" \| "right" \| "left"` | `"top"` | 도킹 위치 |
| `resizable` | `boolean` | `false` | 크기 조절 가능 여부 |

### 사용 패턴

필터·도구 바는 `[position]="'top'"` (기본값이므로 생략 가능), 하단 액션 바는 `[position]="'bottom'"`으로 배치한다.

```html
<sd-dock-container>
  <sd-dock>
    <!-- 상단 필터/도구 바 (기본 position="top") -->
  </sd-dock>
  <!-- 메인 콘텐츠 (시트, 폼 등) -->
  <sd-dock [position]="'bottom'">
    <!-- 하단 액션 바 (확인/취소 버튼 등) -->
  </sd-dock>
</sd-dock-container>
```

> **CRITICAL — modal 하단 바에 `[position]="'bottom'"` 반드시 명시**
> 기본값은 `"top"`이다. modal 하단 액션 바(선택 해제·확인, 삭제·복구 등)에 `[position]`을 누락하면 상단에 렌더링되어 레이아웃이 깨진다. modal 뷰에서 `<sd-dock>`을 사용할 때는 **항상 `[position]="'bottom'"`을 명시**한다.

### 실사용 예

- [crud-list.md §3 최소 뼈대: 조회 전용 page](./recipes/crud-list.md#3-최소-뼈대-조회-전용-page) — 상단 필터 dock
- [crud-list.md §8 확장 D: 선택 모달 전환](./recipes/crud-list.md#8-확장-d-선택-모달-전환) — modal 하단 바 `[position]="'bottom'"`
- [crud-detail.md §7 확장 C: modal 뷰](./recipes/crud-detail.md#7-확장-c-modal-뷰) — modal 하단 액션 바
- [crud-detail.md §8 확장 D: control 뷰](./recipes/crud-detail.md#8-확장-d-control-뷰) — control 상단 도구 바

## `SdGap`

간격(gap) 컴포넌트. 요소 사이에 공간을 추가한다.

```typescript
@Component({ selector: "sd-gap" })
class SdGap { }
```

## `SdKanbanBoard`

칸반 보드 컨테이너. 드래그앤드롭을 지원한다.

```typescript
@Component({ selector: "sd-kanban-board" })
class SdKanbanBoard<L, T> {
  selectedValues = model<T[]>([]);
  drop = output<SdKanbanBoardDropInfo<L, T>>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `selectedValues` | `T[]` | `[]` | 선택된 칸반 아이템 값 배열 (two-way) |

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

## `SdKanbanLane`

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
