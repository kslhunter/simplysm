import {
  children,
  type JSX,
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
  type KanbanContextValue,
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
  "bg-base-50 dark:bg-base-900",
  "rounded-lg",
  "overflow-hidden",
);

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

const KanbanLane: ParentComponent<KanbanLaneProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "value",
  ]);

  const laneContextValue: KanbanLaneContextValue = {
    value: () => local.value,
  };

  // Provider 안에서 children을 resolve해야 splitSlots가 올바르게 동작
  const LaneInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, content] = splitSlots(resolved, ["kanbanLaneTitle", "kanbanLaneTools"] as const);

    const hasHeader = () =>
      slots().kanbanLaneTitle.length > 0 || slots().kanbanLaneTools.length > 0;

    return (
      <div
        {...rest}
        data-kanban-lane
        class={twMerge(laneBaseClass, local.class)}
      >
        <Show when={hasHeader()}>
          <div class={laneHeaderBaseClass}>
            <div class="flex-1">{slots().kanbanLaneTitle}</div>
            <Show when={slots().kanbanLaneTools.length > 0}>
              <div class="flex items-center gap-1">{slots().kanbanLaneTools}</div>
            </Show>
          </div>
        </Show>
        <div class={laneBodyBaseClass}>
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

export interface KanbanProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
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
  ]);

  const contextValue: KanbanContextValue = {};

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
