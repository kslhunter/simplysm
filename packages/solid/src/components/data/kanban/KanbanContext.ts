import { createContext, useContext, type Accessor, type JSX, type Setter } from "solid-js";

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
  onDropTo: (
    targetLaneValue: L | undefined,
    targetCardValue: T | undefined,
    position: "before" | "after" | undefined,
  ) => void;

  // Selection (Phase 4)
  selectedValues: Accessor<T[]>;
  setSelectedValues: (updater: T[] | ((prev: T[]) => T[])) => void;
  toggleSelection: (value: T) => void;
}

export const KanbanContext = createContext<KanbanContextValue>();

export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext는 Kanban 내부에서만 사용할 수 있습니다");
  }
  return context;
}

// ── Lane Context ───────────────────────────────────────────────

type SlotAccessor = (() => JSX.Element) | undefined;

export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;

  // Card registration (Phase 4)
  registerCard: (id: string, info: { value: T | undefined; selectable: boolean }) => void;
  unregisterCard: (id: string) => void;

  // Slot registration
  setTitle: (content: SlotAccessor) => void;
  setTools: (content: SlotAccessor) => void;
}

export const KanbanLaneContext = createContext<KanbanLaneContextValue>();

export function useKanbanLaneContext(): KanbanLaneContextValue {
  const context = useContext(KanbanLaneContext);
  if (!context) {
    throw new Error("useKanbanLaneContext는 Kanban.Lane 내부에서만 사용할 수 있습니다");
  }
  return context;
}
