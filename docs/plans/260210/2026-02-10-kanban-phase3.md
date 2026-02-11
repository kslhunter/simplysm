# Kanban Phase 3: 레인 부가 기능 (접기/펼치기 + Busy) 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kanban Lane에 접기/펼치기(collapsible/collapsed)와 Busy 상태(BusyContainer) 기능을 추가한다.

**Architecture:** `KanbanLaneProps`에 `collapsible`, `collapsed`, `onCollapsedChange`, `busy` props를 추가한다. `collapsed` 상태는 `createPropSignal`로 controlled/uncontrolled 모두 지원한다. 접기 버튼은 헤더 왼쪽 끝에 눈 아이콘으로 배치하고, `BusyContainer`는 lane 전체를 래핑하여 접힌 상태에서도 로딩 바가 표시되도록 한다.

**Tech Stack:** SolidJS, Tailwind CSS, @tabler/icons-solidjs, createPropSignal

---

## 작업 디렉토리

- Kanban 컴포넌트: `.worktrees/kanban-redesign/packages/solid/src/components/layout/kanban/`
- 데모 페이지: `.worktrees/kanban-redesign/packages/solid-demo/src/pages/data/KanbanPage.tsx`

## Phase 3 범위 (플랜 원문 참조)

| #   | 기능        | 설명                                                              |
| --- | ----------- | ----------------------------------------------------------------- |
| 18  | 접기/펼치기 | `collapsible`/`collapsed` — 접으면 카드 목록 숨김, 눈 아이콘 토글 |
| 19  | Busy 상태   | `busy` prop — BusyContainer 래핑, bar 타입 로딩 표시              |

---

### Task 1: KanbanLaneProps 확장

**Files:**

- Modify: `.worktrees/kanban-redesign/packages/solid/src/components/layout/kanban/Kanban.tsx:144-147`

**Step 1: KanbanLaneProps에 새 props 추가**

`KanbanLaneProps` 인터페이스를 다음과 같이 확장한다:

```typescript
export interface KanbanLaneProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: unknown;
  busy?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: JSX.Element;
}
```

**Step 2: splitProps에 새 props 추가**

`KanbanLane` 컴포넌트의 `splitProps` 호출을 업데이트한다 (현재 라인 185-189):

```typescript
const [local, rest] = splitProps(props, [
  "children",
  "class",
  "value",
  "busy",
  "collapsible",
  "collapsed",
  "onCollapsedChange",
]);
```

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS (새 props는 optional이므로 기존 사용 코드에 영향 없음)

**Step 4: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): KanbanLaneProps에 collapsible/collapsed/busy props 추가"
```

---

### Task 2: 접기/펼치기 기능 구현

**Files:**

- Modify: `.worktrees/kanban-redesign/packages/solid/src/components/layout/kanban/Kanban.tsx`

**Step 1: import 추가**

파일 상단 import에 추가할 항목들:

```typescript
// solid-js에서 추가 (기존 import에 병합)
import { ..., Show } from "solid-js";  // Show는 이미 있음

// 새 import 추가
import { IconEye, IconEyeOff } from "@tabler/icons-solidjs";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Icon } from "../../display/Icon";
```

**Step 2: KanbanLane 내부에 collapsed signal 추가**

`KanbanLane` 컴포넌트 내부, `splitProps` 직후에 `createPropSignal` 추가:

```typescript
const [collapsed, setCollapsed] = createPropSignal({
  value: () => local.collapsed ?? false,
  onChange: () => local.onCollapsedChange,
});
```

**Step 3: 헤더 표시 조건 업데이트**

`LaneInner` 내부의 `hasHeader` 조건을 수정한다. 기존:

```typescript
const hasHeader = () => slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;
```

변경:

```typescript
const hasHeader = () => local.collapsible || slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;
```

**Step 4: 헤더 JSX에 접기 버튼 추가**

헤더 div 내부, LaneTitle 앞에 접기/펼치기 버튼을 삽입한다. 현재 헤더 JSX (라인 296-303):

```tsx
<Show when={hasHeader()}>
  <div class={laneHeaderBaseClass}>
    <div class="flex-1">{slots().kanbanLaneTitle}</div>
    <Show when={slots().kanbanLaneTools.length > 0}>
      <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
    </Show>
  </div>
</Show>
```

변경:

```tsx
<Show when={hasHeader()}>
  <div class={laneHeaderBaseClass}>
    <Show when={local.collapsible}>
      <button type="button" class={collapseButtonClass} onClick={() => setCollapsed((prev) => !prev)}>
        <Icon icon={collapsed() ? IconEyeOff : IconEye} size="1em" />
      </button>
    </Show>
    <div class="flex-1">{slots().kanbanLaneTitle}</div>
    <Show when={slots().kanbanLaneTools.length > 0}>
      <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
    </Show>
  </div>
</Show>
```

**Step 5: 접기 버튼 스타일 클래스 추가**

파일의 클래스 상수 영역(laneHeaderBaseClass 근처)에 추가:

```typescript
const collapseButtonClass = clsx(
  "flex items-center justify-center",
  "size-6 rounded",
  "text-base-500",
  "hover:text-primary-500 hover:bg-base-200",
  "dark:hover:bg-base-800",
  "transition-colors duration-150",
  "cursor-pointer",
);
```

**Step 6: body 영역을 Show로 감싸기**

현재 body div (라인 304-306):

```tsx
<div ref={bodyRef} class={laneBodyBaseClass}>
  {content()}
</div>
```

변경:

```tsx
<Show when={!collapsed()}>
  <div ref={bodyRef} class={laneBodyBaseClass}>
    {content()}
  </div>
</Show>
```

**주의:** `bodyRef`는 placeholder DOM 조작에 사용되므로, collapsed 상태에서 bodyRef가 없어지는 것에 대한 처리가 필요하다. placeholder 관련 `createEffect` 내에서 `bodyRef`가 없을 때(=접힌 상태)에는 placeholder를 제거하도록 한다:

현재 placeholder createEffect (라인 251-277):

```typescript
createEffect(() => {
  const target = dropTarget();
  const dc = boardCtx.dragCard();

  if (!target || !dc) {
    if (placeholderEl.parentNode) {
      placeholderEl.remove();
    }
    return;
  }
  // ... 삽입 로직
});
```

`bodyRef` 존재 여부 체크를 기존 guard 조건에 추가한다. `let bodyRef!: HTMLDivElement;`를 `let bodyRef: HTMLDivElement | undefined;`로 변경하고:

```typescript
createEffect(() => {
  const target = dropTarget();
  const dc = boardCtx.dragCard();

  if (!target || !dc || !bodyRef) {
    if (placeholderEl.parentNode) {
      placeholderEl.remove();
    }
    return;
  }

  placeholderEl.style.height = `${dc.heightOnDrag}px`;

  const referenceNode = target.position === "before" ? target.element : target.element.nextElementSibling;

  if (placeholderEl.parentNode === bodyRef && placeholderEl.nextSibling === referenceNode) {
    return;
  }

  bodyRef.insertBefore(placeholderEl, referenceNode);
});
```

그리고 bodyRef 할당 부분은 `<div ref={(el) => { bodyRef = el; }} ...>` 패턴으로 변경하거나, 기존 `ref={bodyRef}` 그대로 유지 (SolidJS의 `ref=`는 `Show` 내부에서도 마운트 시 할당됨). 단, `Show`에서 언마운트되면 `bodyRef`가 DOM에서 분리되므로, `bodyRef?.isConnected` 체크가 더 안전하다. 실질적으로는 collapsed 시 dropTarget도 없을 것이므로 `!bodyRef` 체크로 충분하다.

**Step 7: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 8: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban.Lane 접기/펼치기 기능 구현"
```

---

### Task 3: Busy 상태 구현

**Files:**

- Modify: `.worktrees/kanban-redesign/packages/solid/src/components/layout/kanban/Kanban.tsx`

**Step 1: BusyContainer import 추가**

```typescript
import { BusyContainer } from "../../feedback/busy/BusyContainer";
```

**Step 2: Lane 전체를 BusyContainer로 래핑**

`LaneInner`의 return JSX를 `BusyContainer`로 감싼다. 현재 (Task 2 적용 후):

```tsx
return (
  <div
    {...rest}
    data-kanban-lane
    class={twMerge(laneBaseClass, isDragOverLane() && laneDragOverClass, local.class)}
    onDragEnter={handleLaneDragEnter}
    onDragLeave={handleLaneDragLeave}
    onDragOver={handleLaneDragOver}
    onDrop={handleLaneDrop}
  >
    {/* 헤더 */}
    {/* body */}
  </div>
);
```

변경:

```tsx
return (
  <BusyContainer busy={local.busy} variant="bar">
    <div
      {...rest}
      data-kanban-lane
      class={twMerge(laneBaseClass, isDragOverLane() && laneDragOverClass, local.class)}
      onDragEnter={handleLaneDragEnter}
      onDragLeave={handleLaneDragLeave}
      onDragOver={handleLaneDragOver}
      onDrop={handleLaneDrop}
    >
      {/* 헤더 */}
      {/* body */}
    </div>
  </BusyContainer>
);
```

**Step 3: 타입체크**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/layout/kanban/Kanban.tsx
git commit -m "feat(solid): Kanban.Lane busy 상태 (BusyContainer bar) 구현"
```

---

### Task 4: 데모 페이지 확장

**Files:**

- Modify: `.worktrees/kanban-redesign/packages/solid-demo/src/pages/data/KanbanPage.tsx`

**Step 1: import 추가**

기존 import에 `createSignal` 등 필요한 것은 이미 있으므로, `CheckBox`가 필요하면 추가한다. 여기서는 단순 토글 버튼으로 시연:

```typescript
import { Button, Icon, Kanban, type KanbanDropInfo, Topbar } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";
// ↑ 기존 import 그대로 유지
```

**Step 2: 데모 섹션 추가**

기존 "draggable 제어" 섹션 뒤에 "접기/펼치기 + Busy" 섹션을 추가한다:

```tsx
<section>
  <h2 class="mb-4 text-xl font-semibold">접기/펼치기 + Busy</h2>
  <div class="h-[400px]">
    <Kanban onDrop={handleDrop}>
      <Kanban.Lane value="collapsible-lane" collapsible>
        <Kanban.LaneTitle>접을 수 있는 레인</Kanban.LaneTitle>
        <Kanban.LaneTools>
          <Button size="sm" theme="primary" variant="ghost" class="size-8">
            <Icon icon={IconPlus} />
          </Button>
        </Kanban.LaneTools>
        <Kanban.Card value={200} contentClass="p-2">
          카드 A
        </Kanban.Card>
        <Kanban.Card value={201} contentClass="p-2">
          카드 B
        </Kanban.Card>
      </Kanban.Lane>

      <Kanban.Lane value="busy-lane" busy>
        <Kanban.LaneTitle>Busy 레인</Kanban.LaneTitle>
        <Kanban.Card value={210} contentClass="p-2">
          로딩 중...
        </Kanban.Card>
      </Kanban.Lane>

      <Kanban.Lane value="both-lane" collapsible busy>
        <Kanban.LaneTitle>접기 + Busy</Kanban.LaneTitle>
        <Kanban.Card value={220} contentClass="p-2">
          접어도 로딩 바가 보임
        </Kanban.Card>
      </Kanban.Lane>
    </Kanban>
  </div>
</section>
```

**Step 3: 타입체크 + 린트**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

Run: `pnpm lint packages/solid-demo`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid-demo/src/pages/data/KanbanPage.tsx
git commit -m "feat(solid-demo): Kanban Phase 3 데모 (접기/펼치기 + Busy) 추가"
```

---

### Task 5: 시각 검증

**Step 1: dev 서버 실행**

Run: `pnpm dev` (이미 실행 중이면 생략)
주소: 출력된 URL 확인

**Step 2: 브라우저에서 Kanban 데모 페이지로 이동**

Playwright MCP로 다음을 검증:

1. **접기/펼치기 레인**: 눈 아이콘 클릭 시 카드가 숨겨지고, 다시 클릭하면 나타남
2. **Busy 레인**: 상단에 bar 타입 로딩 애니메이션이 표시됨
3. **접기 + Busy 레인**: 접힌 상태에서도 로딩 바가 보임
4. **기존 DnD**: 기존 레인의 드래그 앤 드롭이 정상 작동함

**Step 3: 문제 발견 시 수정 후 재검증**

---

## 완료 기준

- [ ] `collapsible` prop 설정 시 눈 아이콘 토글 버튼이 헤더 왼쪽에 표시됨
- [ ] 접힌 상태에서 카드 목록이 숨겨짐, 펼치면 다시 표시됨
- [ ] `collapsed`/`onCollapsedChange` 없이도 내부 상태로 동작 (uncontrolled)
- [ ] `collapsed`/`onCollapsedChange` 제공 시 외부 제어 (controlled)
- [ ] `busy` prop 설정 시 BusyContainer bar가 lane 위에 표시됨
- [ ] 접힌 + busy 상태에서도 로딩 바가 보임
- [ ] 기존 DnD 기능이 정상 작동함
- [ ] 타입체크/린트 통과
