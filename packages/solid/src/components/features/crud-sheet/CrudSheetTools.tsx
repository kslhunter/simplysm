import type { JSX } from "solid-js";
import type { CrudSheetContext } from "./types";
import { createSlot } from "../../../helpers/createSlot";

export interface CrudSheetToolsSlotProps<TItem> {
  children: (ctx: CrudSheetContext<TItem>) => JSX.Element;
}

const [CrudSheetToolsBase, createCrudSheetToolsSlotAccessor] = createSlot<
  CrudSheetToolsSlotProps<any>
>();

function CrudSheetTools<TItem>(props: CrudSheetToolsSlotProps<TItem>): JSX.Element {
  return CrudSheetToolsBase(props as CrudSheetToolsSlotProps<any>);
}

export { CrudSheetTools, createCrudSheetToolsSlotAccessor };
