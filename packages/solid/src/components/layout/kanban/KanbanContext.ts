import { createContext, useContext, type Accessor, type Setter } from "solid-js";

/**
 * 칸반 카드 드롭 정보
 *
 * @typeParam L - Lane 값 타입
 * @typeParam T - Card 값 타입
 */
export interface KanbanDropInfo<L, T> {
  /** 드래그된 카드의 값 */
  sourceCardValue: T;
  /** 드롭 대상 Lane의 값 */
  targetLaneValue: L;
  /** 드롭 대상 카드의 값 (카드 위에 드롭한 경우) */
  targetCardValue: T | undefined;
}

/**
 * 칸반 보드 Context 값
 *
 * @typeParam L - Lane 값 타입
 * @typeParam T - Card 값 타입
 */
export interface KanbanContextValue<L = unknown, T = unknown> {
  /** 현재 드래그 중인 카드의 값 */
  dragValue: Accessor<T | undefined>;
  /** 드래그 중인 카드의 값 설정 */
  setDragValue: Setter<T | undefined>;
  /** 선택된 카드 값 목록 */
  selectedValues: Accessor<T[]>;
  /** 카드 선택 토글 */
  toggleSelection: (value: T) => void;
  /** 드롭 처리 */
  onDropTo: (targetLaneValue: L, targetCardValue?: T) => void;
}

export const KanbanContext = createContext<KanbanContextValue>();

export function useKanbanContext(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanbanContext must be used within Kanban");
  }
  return context;
}

/**
 * 칸반 Lane Context 값
 *
 * @typeParam L - Lane 값 타입
 */
export interface KanbanLaneContextValue<L = unknown> {
  /** Lane의 값 */
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
