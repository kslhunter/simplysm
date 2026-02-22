import {
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  type ParentComponent,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconEye, IconEyeOff } from "@tabler/icons-solidjs";
import { Card } from "../../display/Card";
import { Checkbox } from "../../form-control/checkbox/Checkbox";
import { Icon } from "../../display/Icon";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlotSignal } from "../../../hooks/createSlotSignal";
import "./Kanban.css";
import { iconButtonBase } from "../../../styles/patterns.styles";
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

const KanbanLaneTitle: ParentComponent = (props) => {
  const ctx = useContext(KanbanLaneContext)!;
  // eslint-disable-next-line solid/reactivity -- 슬롯 accessor로 저장, JSX tracked scope에서 호출됨
  ctx.setTitle(() => props.children);
  onCleanup(() => ctx.setTitle(undefined));
  return null;
};

// ─── KanbanLaneTools ─────────────────────────────────────────────

const KanbanLaneTools: ParentComponent = (props) => {
  const ctx = useContext(KanbanLaneContext)!;
  // eslint-disable-next-line solid/reactivity -- 슬롯 accessor로 저장, JSX tracked scope에서 호출됨
  ctx.setTools(() => props.children);
  onCleanup(() => ctx.setTools(undefined));
  return null;
};

// ─── KanbanCard ──────────────────────────────────────────────────

export interface KanbanCardProps<TCardValue = unknown> extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "children" | "draggable"
> {
  value?: TCardValue;
  draggable?: boolean;
  selectable?: boolean;
  contentClass?: string;
  children?: JSX.Element;
}

const cardHostClass = clsx("relative block", "transition-opacity duration-200");

const cardContentClass = clsx(
  "select-none whitespace-normal",
  "animate-none",
  "transition-shadow duration-200",
);

const cardSelectedClass = clsx("ring-2 ring-primary-500/50", "shadow-md dark:shadow-black/30");

const LONG_PRESS_MS = 500;

const KanbanCard: ParentComponent<KanbanCardProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
    "draggable",
    "selectable",
    "contentClass",
  ]);

  const boardCtx = useKanbanContext();
  const laneCtx = useKanbanLaneContext();

  let hostRef!: HTMLDivElement;

  const cardId = crypto.randomUUID();

  createEffect(() => {
    laneCtx.registerCard(cardId, {
      value: local.value,
      selectable: local.selectable ?? false,
    });
  });

  onCleanup(() => {
    laneCtx.unregisterCard(cardId);
  });

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

  // Shift+Click 다중 선택 토글
  const handleClick = (e: MouseEvent) => {
    if (longPressed) {
      e.preventDefault();
      e.stopPropagation();
      longPressed = false;
      return;
    }
    if (!e.shiftKey) return;
    if (!local.selectable) return;
    if (local.value == null) return;
    e.preventDefault();
    e.stopPropagation();
    boardCtx.toggleSelection(local.value);
  };

  // Long press → 해당 카드만 단독 선택 (다른 선택 모두 해제)
  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressed = false;

  const handlePointerDown = () => {
    if (!local.selectable) return;
    if (local.value == null) return;

    longPressed = false;
    longPressTimer = setTimeout(() => {
      longPressed = true;
      boardCtx.setSelectedValues([local.value!]);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  };

  const handlePointerCancel = () => {
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  };

  onCleanup(() => {
    clearTimeout(longPressTimer);
  });

  const isSelected = () => local.value != null && boardCtx.selectedValues().includes(local.value);

  return (
    <div
      {...rest}
      ref={hostRef}
      data-kanban-card
      draggable={isDraggable()}
      class={twMerge(
        cardHostClass,
        isDraggable() && "cursor-grab",
        isDragSource() && "opacity-30",
        local.class,
      )}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      <Card
        class={twMerge(cardContentClass, isSelected() && cardSelectedClass, local.contentClass)}
      >
        {local.children}
      </Card>
    </div>
  );
};

// ─── KanbanLane ──────────────────────────────────────────────────

export interface KanbanLaneProps<TLaneValue = unknown> extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  value?: TLaneValue;
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
  "transition-[background-color,box-shadow] duration-200",
);

const laneDragOverClass = clsx("bg-primary-50 dark:bg-primary-950");

const laneHeaderBaseClass = clsx(
  "flex items-center gap-2",
  "px-3 py-2",
  "font-bold",
  "text-base-700 dark:text-base-200",
  "select-none",
);

const collapseButtonClass = twMerge(iconButtonBase, "size-6", "hover:text-primary-500");

const laneToolsClass = clsx("flex items-center", "gap-1");

const laneBodyBaseClass = clsx("flex-1", "flex flex-col gap-2", "p-2", "overflow-y-auto");

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

  const [collapsed, setCollapsed] = createControllableSignal({
    value: () => local.collapsed ?? false,
    onChange: () => local.onCollapsedChange,
  });

  const boardCtx = useKanbanContext();

  const [registeredCards, setRegisteredCards] = createSignal<
    Map<string, { value: unknown; selectable: boolean }>
  >(new Map());

  const registerCard = (id: string, info: { value: unknown; selectable: boolean }) => {
    setRegisteredCards((prev) => new Map(prev).set(id, info));
  };

  const unregisterCard = (id: string) => {
    setRegisteredCards((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const selectableCards = createMemo(() =>
    [...registeredCards().values()].filter((c) => c.selectable && c.value != null),
  );

  const hasSelectableCards = () => selectableCards().length > 0;

  const isAllSelected = () => {
    const cards = selectableCards();
    if (cards.length === 0) return false;
    return cards.every((c) => boardCtx.selectedValues().includes(c.value));
  };

  const handleSelectAll = (checked: boolean) => {
    const laneCardValues = selectableCards().map((c) => c.value!);
    boardCtx.setSelectedValues((prev: unknown[]) => {
      if (checked) {
        const toAdd = laneCardValues.filter((v) => !prev.includes(v));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      } else {
        const toRemove = new Set<unknown>(laneCardValues);
        const next = prev.filter((v: unknown) => !toRemove.has(v));
        return next.length === prev.length ? prev : next;
      }
    });
  };

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

  // 빈 영역 또는 placeholder drop
  const handleLaneDrop = (e: DragEvent) => {
    if (!boardCtx.dragCard()) return;
    e.preventDefault();

    const current = dropTarget();
    if (current) {
      // placeholder나 카드 사이 gap에 drop된 경우 — dropTarget 위치 사용
      boardCtx.onDropTo(local.value, current.value, current.position);
    } else {
      // 빈 레인에 drop된 경우 — 끝에 추가
      boardCtx.onDropTo(local.value, undefined, undefined);
    }
  };

  // Slot signals
  const [title, setTitle] = createSlotSignal();
  const [tools, setTools] = createSlotSignal();

  const laneContextValue: KanbanLaneContextValue = {
    value: () => local.value,
    dropTarget,
    setDropTarget,
    registerCard,
    unregisterCard,
    setTitle,
    setTools,
  };

  const hasHeader = () =>
    local.collapsible || hasSelectableCards() || title() != null || tools() != null;

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
    const referenceNode =
      target.position === "before" ? target.element : target.element.nextElementSibling;

    // 이미 올바른 위치면 DOM 조작 생략
    if (placeholderEl.parentNode === bodyRef && placeholderEl.nextSibling === referenceNode) {
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
    <KanbanLaneContext.Provider value={laneContextValue}>
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
              <Show when={hasSelectableCards()}>
                <Checkbox value={isAllSelected()} onValueChange={handleSelectAll} inline />
              </Show>
              <div class="flex-1">
                <Show when={title()}>{title()!()}</Show>
              </div>
              <Show when={tools()}>
                <div class={laneToolsClass}>{tools()!()}</div>
              </Show>
            </div>
          </Show>
          <div
            ref={bodyRef}
            class={laneBodyBaseClass}
            style={{ display: collapsed() ? "none" : undefined }}
          >
            {local.children}
          </div>
        </div>
      </BusyContainer>
    </KanbanLaneContext.Provider>
  );
};

// ─── Kanban (Board) ──────────────────────────────────────────────

export interface KanbanProps<TCardValue = unknown, TLaneValue = unknown> extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  "children" | "onDrop"
> {
  onDrop?: (info: KanbanDropInfo<TLaneValue, TCardValue>) => void;
  selectedValues?: TCardValue[];
  onSelectedValuesChange?: (values: TCardValue[]) => void;
  children?: JSX.Element;
}

const boardBaseClass = clsx("inline-flex flex-nowrap", "h-full", "gap-4");

interface KanbanComponent {
  <TCardValue = unknown, TLaneValue = unknown>(
    props: KanbanProps<TCardValue, TLaneValue>,
  ): JSX.Element;
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
    "selectedValues",
    "onSelectedValuesChange",
  ]);

  const [dragCard, setDragCard] = createSignal<KanbanCardRef>();

  const [selectedValues, setSelectedValues] = createControllableSignal({
    value: () => local.selectedValues ?? ([] as unknown[]),
    onChange: () => local.onSelectedValuesChange,
  });

  const toggleSelection = (value: unknown) => {
    setSelectedValues((prev) => {
      const idx = prev.indexOf(value);
      if (idx >= 0) {
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      return [...prev, value];
    });
  };

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
    selectedValues,
    setSelectedValues,
    toggleSelection,
  };

  return (
    <KanbanContext.Provider value={contextValue}>
      <div {...rest} data-kanban class={twMerge(boardBaseClass, local.class)}>
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
