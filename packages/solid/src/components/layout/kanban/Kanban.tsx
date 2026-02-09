import {
  children,
  createSignal,
  type JSX,
  onCleanup,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronRight } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { splitSlots } from "../../../utils/splitSlots";
import { createPropSignal } from "../../../utils/createPropSignal";
import {
  KanbanContext,
  KanbanLaneContext,
  useKanbanContext,
  useKanbanLaneContext,
  type KanbanContextValue,
  type KanbanDropInfo,
  type KanbanLaneContextValue,
} from "./KanbanContext";

// ─── KanbanLaneTitle ─────────────────────────────────────────────

/**
 * Lane 헤더의 제목 슬롯 컴포넌트
 */
const KanbanLaneTitle: ParentComponent = (props) => (
  <div data-kanban-lane-title>{props.children}</div>
);

// ─── KanbanLaneTools ─────────────────────────────────────────────

/**
 * Lane 헤더의 도구 슬롯 컴포넌트
 */
const KanbanLaneTools: ParentComponent = (props) => (
  <div data-kanban-lane-tools>{props.children}</div>
);

// ─── KanbanCard ──────────────────────────────────────────────────

export interface KanbanCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** 카드의 고유 값 */
  value?: unknown;
  /** 드래그 가능 여부 */
  draggable?: boolean;
}

const cardBaseClass = clsx(
  "rounded-lg",
  "bg-white dark:bg-base-800",
  "shadow-sm hover:shadow-md",
  "dark:shadow-black/20",
  "transition-all duration-200",
  "cursor-default",
);

const cardDraggableClass = clsx("cursor-grab active:cursor-grabbing");

const cardSelectedClass = clsx("ring-2 ring-primary-500 dark:ring-primary-400");

const cardDraggingClass = clsx("opacity-50");

const cardDragOverClass = clsx("border-t-2 border-primary-500 dark:border-primary-400");

const KanbanCard: ParentComponent<KanbanCardProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "draggable"]);

  const ctx = useKanbanContext();
  const laneCtx = useKanbanLaneContext();

  const [dragOvered, setDragOvered] = createSignal(false);

  const isSelected = () =>
    local.value != null && ctx.selectedValues().includes(local.value);

  const isDragging = () =>
    local.value != null && ctx.dragValue() === local.value;

  const handleDragStart = (e: DragEvent) => {
    if (!local.draggable) return;
    if (local.value == null) return;

    // 드래그 데이터 설정 (Firefox 호환)
    e.dataTransfer?.setData("text/plain", "");

    const val = local.value;
    ctx.setDragValue(() => val);
  };

  const handleDragOver = (e: DragEvent) => {
    if (ctx.dragValue() == null) return;

    e.preventDefault();
    e.stopPropagation();
    setDragOvered(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOvered(false);
  };

  const handleDrop = (e: DragEvent) => {
    if (ctx.dragValue() == null) return;

    setDragOvered(false);
    e.preventDefault();
    e.stopPropagation();

    ctx.onDropTo(laneCtx.value(), local.value);
  };

  const handleClick = (e: MouseEvent) => {
    if (e.shiftKey) {
      if (local.value == null) return;

      e.preventDefault();
      e.stopPropagation();
      ctx.toggleSelection(local.value);
    }
  };

  const getClassName = () =>
    twMerge(
      cardBaseClass,
      local.draggable && cardDraggableClass,
      isSelected() && cardSelectedClass,
      isDragging() && cardDraggingClass,
      dragOvered() && cardDragOverClass,
      local.class,
    );

  return (
    <div
      {...rest}
      data-kanban-card
      class={getClassName()}
      draggable={local.draggable}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {local.children}
    </div>
  );
};

// ─── KanbanLane ──────────────────────────────────────────────────

export interface KanbanLaneProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Lane의 고유 값 */
  value?: unknown;
  /** 로딩 중 표시 */
  busy?: boolean;
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 접힘 상태 (controlled) */
  collapsed?: boolean;
  /** 접힘 상태 변경 콜백 */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** 자식 요소 */
  children?: JSX.Element;
}

const laneBaseClass = clsx(
  "flex flex-col",
  "w-72 min-w-72",
  "bg-base-50 dark:bg-base-900",
  "rounded-lg",
  "overflow-hidden",
);

const laneCollapsedClass = clsx("w-12 min-w-12");

const laneHeaderBaseClass = clsx(
  "flex items-center gap-2",
  "px-3 py-2",
  "font-semibold",
  "text-base-700 dark:text-base-200",
  "border-b border-base-200 dark:border-base-700",
  "select-none",
);

const laneBodyBaseClass = clsx(
  "flex-1",
  "flex flex-col gap-2",
  "p-2",
  "overflow-y-auto",
);

const laneDragOverClass = clsx(
  "outline-dashed outline-2 outline-primary-400 dark:outline-primary-500",
  "-outline-offset-2",
);

const laneCollapsedBodyClass = clsx(
  "flex-1",
  "flex items-center justify-center",
);

const laneCollapsedTitleClass = clsx(
  "font-semibold",
  "text-base-700 dark:text-base-200",
  "whitespace-nowrap",
  "select-none",
  "cursor-pointer",
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

  const ctx = useKanbanContext();

  const [collapsed, setCollapsed] = createPropSignal({
    value: () => local.collapsed ?? false,
    onChange: () => local.onCollapsedChange,
  });

  const [dragOvered, setDragOvered] = createSignal(false);

  const laneContextValue: KanbanLaneContextValue = {
    value: () => local.value,
  };

  const handleDragOver = (e: DragEvent) => {
    if (ctx.dragValue() == null) return;

    e.preventDefault();
    e.stopPropagation();
    setDragOvered(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOvered(false);
  };

  const handleDrop = (e: DragEvent) => {
    if (ctx.dragValue() == null) return;

    setDragOvered(false);
    e.preventDefault();
    e.stopPropagation();
    ctx.onDropTo(local.value, undefined);
  };

  const handleToggleCollapse = () => {
    if (!local.collapsible) return;
    setCollapsed((prev) => !prev);
  };

  // 내부 컴포넌트: Provider 안에서 children을 resolve
  const LaneInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, content] = splitSlots(resolved, ["kanbanLaneTitle", "kanbanLaneTools"] as const);

    return (
      <Show
        when={!collapsed()}
        fallback={
          <div
            {...rest}
            data-kanban-lane
            class={twMerge(laneBaseClass, laneCollapsedClass, dragOvered() && laneDragOverClass, local.class)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div class={laneCollapsedBodyClass} onClick={handleToggleCollapse}>
              <span
                class={laneCollapsedTitleClass}
                style={{ "writing-mode": "vertical-rl" }}
              >
                {slots().kanbanLaneTitle}
              </span>
            </div>
          </div>
        }
      >
        <div
          {...rest}
          data-kanban-lane
          class={twMerge(laneBaseClass, dragOvered() && laneDragOverClass, local.class)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div class={laneHeaderBaseClass}>
            <Show when={local.collapsible}>
              <button
                type="button"
                class={clsx(
                  "flex items-center justify-center",
                  "rounded p-0.5",
                  "hover:bg-base-200 dark:hover:bg-base-700",
                  "transition-colors",
                )}
                onClick={handleToggleCollapse}
              >
                <Icon icon={IconChevronRight} size="1em" />
              </button>
            </Show>
            <div class="flex-1">{slots().kanbanLaneTitle}</div>
            <Show when={slots().kanbanLaneTools.length > 0}>
              <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
            </Show>
          </div>
          <BusyContainer busy={local.busy}>
            <div class={laneBodyBaseClass}>
              {content()}
            </div>
          </BusyContainer>
        </div>
      </Show>
    );
  };

  return (
    <KanbanLaneContext.Provider value={laneContextValue}>
      <LaneInner>{local.children}</LaneInner>
    </KanbanLaneContext.Provider>
  );
};

// ─── Kanban (Board) ──────────────────────────────────────────────

export interface KanbanProps<L = unknown, T = unknown>
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 선택된 카드 값 목록 */
  value?: T[];
  /** 선택된 카드 값 변경 콜백 */
  onValueChange?: (value: T[]) => void;
  /** 카드 드롭 이벤트 콜백 */
  onCardDrop?: (info: KanbanDropInfo<L, T>) => void;
  /** 자식 요소 */
  children?: JSX.Element;
}

const boardBaseClass = clsx(
  "inline-flex flex-nowrap",
  "h-full",
  "gap-4",
);

interface KanbanComponent {
  <L = unknown, T = unknown>(props: KanbanProps<L, T>): JSX.Element;
  Lane: typeof KanbanLane;
  Card: typeof KanbanCard;
  LaneTitle: typeof KanbanLaneTitle;
  LaneTools: typeof KanbanLaneTools;
}

const KanbanBase = <L, T>(props: KanbanProps<L, T>) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
    "onValueChange",
    "onCardDrop",
  ]);

  const [dragValue, setDragValue] = createSignal<T | undefined>(undefined);

  // 선택된 값 관리 (controlled/uncontrolled)
  const [selectedValues, setSelectedValues] = createPropSignal<T[]>({
    value: () => local.value ?? [],
    onChange: () => local.onValueChange,
  });

  const toggleSelection = (value: T) => {
    setSelectedValues((prev) => {
      const idx = prev.indexOf(value);
      if (idx >= 0) {
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      return [...prev, value];
    });
  };

  const onDropTo = (targetLaneValue: L, targetCardValue?: T) => {
    const sourceValue = dragValue();
    if (sourceValue == null) return;

    local.onCardDrop?.({
      sourceCardValue: sourceValue,
      targetLaneValue,
      targetCardValue,
    });

    setDragValue(() => undefined);
  };

  // document dragend 리스너: 드래그가 취소된 경우 상태 초기화
  const handleDocumentDragEnd = () => {
    setDragValue(() => undefined);
  };

  document.addEventListener("dragend", handleDocumentDragEnd);
  onCleanup(() => {
    document.removeEventListener("dragend", handleDocumentDragEnd);
  });

  const contextValue = {
    dragValue,
    setDragValue,
    selectedValues,
    toggleSelection,
    onDropTo,
  } as KanbanContextValue;

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
