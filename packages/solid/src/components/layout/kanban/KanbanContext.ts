import { createContext, useContext, type Accessor } from "solid-js";

// ── Board Context ──────────────────────────────────────────────
// Phase 1에서는 빈 Context. Phase 2+에서 DnD/선택 등을 추가한다.

export interface KanbanContextValue {
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

export interface KanbanLaneContextValue<L = unknown> {
  value: Accessor<L | undefined>;
}

export const KanbanLaneContext = createContext<KanbanLaneContextValue>();

export function useKanbanLaneContext(): KanbanLaneContextValue {
  const context = useContext(KanbanLaneContext);
  if (!context) {
    throw new Error("useKanbanLaneContext must be used within Kanban.Lane");
  }
  return context;
}
