import { createContext, useContext, type JSX, type ParentComponent, onCleanup } from "solid-js";
import { createSlotComponent } from "../../../helpers/createSlotComponent";
import type { SlotAccessor } from "../../../hooks/createSlotSignal";

// ─── Context ──────────────────────────────────────────────

export interface SharedDataSelectListContextValue {
  setItemTemplate: (fn: ((item: unknown, index: number) => JSX.Element) | undefined) => void;
  setFilter: (content: SlotAccessor) => void;
}

export const SharedDataSelectListContext = createContext<SharedDataSelectListContextValue>();

export function useSharedDataSelectListContext(): SharedDataSelectListContextValue {
  const context = useContext(SharedDataSelectListContext);
  if (!context) {
    throw new Error("useSharedDataSelectListContext can only be used inside SharedDataSelectList");
  }
  return context;
}

// ─── Sub-components ───────────────────────────────────────

/** ItemTemplate sub-component — registers item render function */
export const SharedDataSelectListItemTemplate = <TItem,>(props: {
  children: (item: TItem, index: number) => JSX.Element;
}) => {
  const ctx = useSharedDataSelectListContext();
  ctx.setItemTemplate(props.children as (item: unknown, index: number) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

/** Filter sub-component — registers custom filter UI slot */
export const SharedDataSelectListFilter: ParentComponent = createSlotComponent(
  SharedDataSelectListContext,
  (ctx) => ctx.setFilter,
);
