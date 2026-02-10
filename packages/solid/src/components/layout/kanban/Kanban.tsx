import {
  children,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Card } from "../../display/Card";
import { splitSlots } from "../../../utils/splitSlots";
import {
  KanbanContext,
  KanbanLaneContext,
  useKanbanContext,
  type KanbanCardRef,
  type KanbanContextValue,
  type KanbanDropInfo,
  type KanbanDropTarget,
  type KanbanLaneContextValue,
} from "./KanbanContext";

// ─── KanbanLaneTitle ─────────────────────────────────────────────

const KanbanLaneTitle: ParentComponent = (props) => (
  <div data-kanban-lane-title>{props.children}</div>
);

// ─── KanbanLaneTools ─────────────────────────────────────────────

const KanbanLaneTools: ParentComponent = (props) => (
  <div data-kanban-lane-tools>{props.children}</div>
);

// ─── KanbanCard ──────────────────────────────────────────────────

export interface KanbanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: unknown;
  contentClass?: string;
  children?: JSX.Element;
}

const cardHostClass = clsx(
  "relative block",
);

const cardContentClass = clsx(
  "select-none whitespace-normal",
);

const KanbanCard: ParentComponent<KanbanCardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "contentClass"]);

  return (
    <div
      {...rest}
      data-kanban-card
      class={twMerge(cardHostClass, local.class)}
    >
      <Card class={twMerge(cardContentClass, local.contentClass)}>
        {local.children}
      </Card>
    </div>
  );
};

// ─── KanbanLane ──────────────────────────────────────────────────

export interface KanbanLaneProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  value?: unknown;
  children?: JSX.Element;
}

const laneBaseClass = clsx(
  "flex flex-col",
  "w-72 min-w-72",
  "bg-base-100 dark:bg-base-900",
  "rounded-lg",
  "overflow-hidden",
);

const laneHeaderBaseClass = clsx(
  "flex items-center gap-2",
  "px-3 py-2",
  "font-semibold",
  "text-base-700 dark:text-base-200",
  "select-none",
);

const laneBodyBaseClass = clsx(
  "flex-1",
  "flex flex-col gap-2",
  "p-2",
  "overflow-y-auto",
);

const placeholderBaseClass = clsx(
  "rounded-lg",
  "bg-black/10 dark:bg-white/10",
);

const KanbanLane: ParentComponent<KanbanLaneProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
  ]);

  const boardCtx = useKanbanContext();
  const [dropTarget, setDropTarget] = createSignal<KanbanDropTarget>();

  // dragCard가 리셋되면 dropTarget도 초기화
  createEffect(() => {
    if (!boardCtx.dragCard()) {
      dragEnterCount = 0;
      setDropTarget(undefined);
    }
  });

  // Lane 이탈 감지: dragenter/dragleave 카운터
  let dragEnterCount = 0;

  const handleLaneDragEnter = () => {
    dragEnterCount++;
  };

  const handleLaneDragLeave = () => {
    dragEnterCount--;
    if (dragEnterCount === 0) {
      setDropTarget(undefined);
    }
  };

  // 빈 영역 dragover (카드가 없거나 카드 아래 영역)
  const handleLaneDragOver = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
  };

  // 빈 영역 drop
  const handleLaneDrop = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
    boardCtx.onDropTo(local.value, undefined, undefined);
  };

  const laneContextValue: KanbanLaneContextValue = {
    value: () => local.value,
    dropTarget,
    setDropTarget,
  };

  // Provider 안에서 children을 resolve해야 splitSlots가 올바르게 동작
  const LaneInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, content] = splitSlots(resolved, ["kanbanLaneTitle", "kanbanLaneTools"] as const);

    const hasHeader = () =>
      slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;

    // placeholder div (Lane이 소유, DOM 직접 제어)
    let bodyRef!: HTMLDivElement;
    const placeholderEl = document.createElement("div");
    placeholderEl.className = placeholderBaseClass;

    createEffect(() => {
      const target = dropTarget();
      const dc = boardCtx.dragCard();

      if (!target || !dc) {
        if (placeholderEl.parentNode) {
          placeholderEl.remove();
        }
        return;
      }

      // placeholder 높이 설정
      placeholderEl.style.height = `${dc.heightOnDrag}px`;

      // 삽입 위치 계산
      const referenceNode = target.position === "before"
        ? target.element
        : target.element.nextElementSibling;

      // 이미 올바른 위치면 DOM 조작 생략
      if (placeholderEl.parentNode === bodyRef
          && placeholderEl.nextSibling === referenceNode) {
        return;
      }

      bodyRef.insertBefore(placeholderEl, referenceNode);
    });

    // placeholder cleanup
    onCleanup(() => {
      if (placeholderEl.parentNode) {
        placeholderEl.remove();
      }
    });

    return (
      <div
        {...rest}
        data-kanban-lane
        class={twMerge(laneBaseClass, local.class)}
        onDragEnter={handleLaneDragEnter}
        onDragLeave={handleLaneDragLeave}
        onDragOver={handleLaneDragOver}
        onDrop={handleLaneDrop}
      >
        <Show when={hasHeader()}>
          <div class={laneHeaderBaseClass}>
            <div class="flex-1">{slots().kanbanLaneTitle}</div>
            <Show when={slots().kanbanLaneTools.length > 0}>
              <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
            </Show>
          </div>
        </Show>
        <div ref={bodyRef} class={laneBodyBaseClass}>
          {content()}
        </div>
      </div>
    );
  };

  return (
    <KanbanLaneContext.Provider value={laneContextValue}>
      <LaneInner>{local.children}</LaneInner>
    </KanbanLaneContext.Provider>
  );
};

// ─── Kanban (Board) ──────────────────────────────────────────────

export interface KanbanProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onDrop"> {
  onDrop?: (info: KanbanDropInfo) => void;
  children?: JSX.Element;
}

const boardBaseClass = clsx(
  "inline-flex flex-nowrap",
  "h-full",
  "gap-4",
);

interface KanbanComponent {
  (props: KanbanProps): JSX.Element;
  Lane: typeof KanbanLane;
  Card: typeof KanbanCard;
  LaneTitle: typeof KanbanLaneTitle;
  LaneTools: typeof KanbanLaneTools;
}

const KanbanBase = (props: KanbanProps) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "onDrop",
  ]);

  const [dragCard, setDragCard] = createSignal<KanbanCardRef>();

  const onDropTo = (
    targetLaneValue: unknown | undefined,
    targetCardValue: unknown | undefined,
    position: "before" | "after" | undefined,
  ) => {
    const source = dragCard();
    if (!source) return;

    local.onDrop?.({
      sourceValue: source.value,
      targetLaneValue,
      targetCardValue,
      position,
    });

    setDragCard(undefined);
  };

  onMount(() => {
    const handleDragEnd = () => {
      setDragCard(undefined);
    };
    document.addEventListener("dragend", handleDragEnd);
    onCleanup(() => document.removeEventListener("dragend", handleDragEnd));
  });

  const contextValue: KanbanContextValue = {
    dragCard,
    setDragCard,
    onDropTo,
  };

  return (
    <KanbanContext.Provider value={contextValue}>
      <div
        {...rest}
        data-kanban
        class={twMerge(boardBaseClass, local.class)}
      >
        {local.children}
      </div>
    </KanbanContext.Provider>
  );
};

export const Kanban = KanbanBase as KanbanComponent;
Kanban.Lane = KanbanLane;
Kanban.Card = KanbanCard;
Kanban.LaneTitle = KanbanLaneTitle;
Kanban.LaneTools = KanbanLaneTools;
