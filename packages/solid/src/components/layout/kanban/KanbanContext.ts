import { createContext, useContext, type Accessor, type Setter } from "solid-js";

// ── 타입 ──────────────────────────────────────────────────────

export interface KanbanCardRef<L = unknown, T = unknown> {
  value: T | undefined;
  laneValue: L | undefined;
  heightOnDrag: number;
}

export interface KanbanDropInfo<L = unknown, T = unknown> {
  sourceValue?: T;
  targetLaneValue?: L;
  targetCardValue?: T;
  position?: "before" | "after";
}

export interface KanbanDropTarget<T = unknown> {
  element: HTMLElement;
  value: T | undefined;
  position: "before" | "after";
}

// ── Board Context ──────────────────────────────────────────────

export interface KanbanContextValue<L = unknown, T = unknown> {
  dragCard: Accessor<KanbanCardRef<L, T> | undefined>;
  setDragCard: Setter<KanbanCardRef<L, T> | undefined>;
  onDropTo: (targetLaneValue: L | undefined, targetCardValue: T | undefined, position: "before" | "after" | undefined) => void;
}

export const KanbanContext = createContext<KanbanContextValue>();

export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext must be used within Kanban");
  }
  return context;
}

// ── Lane Context ───────────────────────────────────────────────

export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;
}

export const KanbanLaneContext = createContext<KanbanLaneContextValue>();

export function useKanbanLaneContext(): KanbanLaneContextValue {
  const context = useContext(KanbanLaneContext);
  if (!context) {
    throw new Error("useKanbanLaneContext must be used within Kanban.Lane");
  }
  return context;
}
