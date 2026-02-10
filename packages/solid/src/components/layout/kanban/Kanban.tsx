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
import { IconEye, IconEyeOff } from "@tabler/icons-solidjs";
import { Card } from "../../display/Card";
import { Icon } from "../../display/Icon";
import { createPropSignal } from "../../../utils/createPropSignal";
import { splitSlots } from "../../../utils/splitSlots";
import "./Kanban.css";
import {
  KanbanContext,
  KanbanLaneContext,
  useKanbanContext,
  useKanbanLaneContext,
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

export interface KanbanCardProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "draggable"> {
  value?: unknown;
  draggable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}

const cardHostClass = clsx(
  "relative block",
  "transition-opacity duration-200",
);

const cardContentClass = clsx(
  "select-none whitespace-normal",
  "animate-none transition-none",
);

const KanbanCard: ParentComponent<KanbanCardProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
    "draggable",
    "contentClass",
  ]);

  const boardCtx = useKanbanContext();
  const laneCtx = useKanbanLaneContext();

  let hostRef!: HTMLDivElement;

  const isDraggable = () => local.draggable !== false;

  const isDragSource = () => {
    const dc = boardCtx.dragCard();
    return dc != null && dc.value != null && dc.value === local.value;
  };

  const handleDragStart = (e: DragEvent) => {
    if (!isDraggable()) {
      e.preventDefault();
      return;
    }
    e.dataTransfer?.setData("text/plain", "");
    const heightOnDrag = hostRef.offsetHeight;
    // 브라우저가 드래그 고스트 이미지를 캡처한 뒤 숨기기 위해 한 프레임 지연
    requestAnimationFrame(() => {
      boardCtx.setDragCard({
        value: local.value,
        laneValue: laneCtx.value(),
        heightOnDrag,
      });
    });
  };

  const handleDragOver = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = hostRef.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";

    const current = laneCtx.dropTarget();
    if (current?.element === hostRef && current.position === position) {
      return;
    }

    laneCtx.setDropTarget({ element: hostRef, value: local.value, position });
  };

  const handleDrop = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();
    e.stopPropagation();

    const current = laneCtx.dropTarget();
    boardCtx.onDropTo(laneCtx.value(), local.value, current?.position ?? "before");
  };

  return (
    <div
      {...rest}
      ref={hostRef}
      data-kanban-card
      draggable={isDraggable()}
      class={twMerge(cardHostClass, isDraggable() && "cursor-grab", isDragSource() && "opacity-30", local.class)}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
  busy?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children?: JSX.Element;
}

const laneBaseClass = clsx(
  "flex flex-col",
  "w-72 min-w-72",
  "bg-base-100 dark:bg-base-900",
  "rounded-lg",
  "overflow-hidden",
  "transition-[background-color,box-shadow] duration-200"
);

const laneDragOverClass = clsx(
  "bg-primary-50 dark:bg-primary-950"
);

const laneHeaderBaseClass = clsx(
  "flex items-center gap-2",
  "px-3 py-2",
  "font-semibold",
  "text-base-700 dark:text-base-200",
  "select-none",
);

const collapseButtonClass = clsx(
  "flex items-center justify-center",
  "size-6 rounded",
  "text-base-500",
  "hover:text-primary-500 hover:bg-base-200",
  "dark:hover:bg-base-800",
  "transition-colors duration-150",
  "cursor-pointer",
);

const laneBodyBaseClass = clsx(
  "flex-1",
  "flex flex-col gap-2",
  "p-2",
  "overflow-y-auto",
);

const placeholderBaseClass = clsx(
  "rounded-lg",
  "bg-primary-100/60 dark:bg-primary-900/30",
  "origin-top",
  "animate-[kanban-ph-in_200ms_ease-out]",
);

const KanbanLane: ParentComponent<KanbanLaneProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
    "busy",
    "collapsible",
    "collapsed",
    "onCollapsedChange",
  ]);

  const [collapsed, setCollapsed] = createPropSignal({
    value: () => local.collapsed ?? false,
    onChange: () => local.onCollapsedChange,
  });

  const boardCtx = useKanbanContext();
  const [dropTarget, setDropTarget] = createSignal<KanbanDropTarget>();
  const [dragEnterCount, setDragEnterCount] = createSignal(0);

  // 드래그 오버 상태: 카운터 > 0 && 드래그 중
  const isDragOverLane = () => dragEnterCount() > 0 && boardCtx.dragCard() != null;

  // dragCard가 리셋되면 dropTarget, 카운터도 초기화
  createEffect(() => {
    if (!boardCtx.dragCard()) {
      setDragEnterCount(0);
      setDropTarget(undefined);
    }
  });

  // Lane 이탈 감지: dragenter/dragleave 카운터
  const handleLaneDragEnter = () => {
    setDragEnterCount((c) => c + 1);
  };

  const handleLaneDragLeave = () => {
    const next = dragEnterCount() - 1;
    setDragEnterCount(next);
    if (next === 0) {
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
      local.collapsible || slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;

    // placeholder div (Lane이 소유, DOM 직접 제어)
    let bodyRef: HTMLDivElement | undefined;
    const placeholderEl = document.createElement("div");
    placeholderEl.className = placeholderBaseClass;

    createEffect(() => {
      const target = dropTarget();
      const dc = boardCtx.dragCard();

      if (!target || !dc || !bodyRef) {
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
        class={twMerge(laneBaseClass, isDragOverLane() && laneDragOverClass, local.class)}
        onDragEnter={handleLaneDragEnter}
        onDragLeave={handleLaneDragLeave}
        onDragOver={handleLaneDragOver}
        onDrop={handleLaneDrop}
      >
        <Show when={hasHeader()}>
          <div class={laneHeaderBaseClass}>
            <Show when={local.collapsible}>
              <button
                type="button"
                class={collapseButtonClass}
                onClick={() => setCollapsed((prev) => !prev)}
              >
                <Icon icon={collapsed() ? IconEyeOff : IconEye} size="1em" />
              </button>
            </Show>
            <div class="flex-1">{slots().kanbanLaneTitle}</div>
            <Show when={slots().kanbanLaneTools.length > 0}>
              <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
            </Show>
          </div>
        </Show>
        <Show when={!collapsed()}>
          <div ref={bodyRef} class={laneBodyBaseClass}>
            {content()}
          </div>
        </Show>
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
