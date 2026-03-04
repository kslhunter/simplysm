import type { JSX } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createSlot } from "../../../helpers/createSlot";

export interface CrudSheetFilterSlotProps<TFilter> {
  children: (filter: TFilter, setFilter: SetStoreFunction<TFilter>) => JSX.Element;
}

const [CrudSheetFilterBase, createCrudSheetFilterSlotAccessor] = createSlot<
  CrudSheetFilterSlotProps<any>
>();

function CrudSheetFilter<TFilter>(props: CrudSheetFilterSlotProps<TFilter>): JSX.Element {
  return CrudSheetFilterBase(props as CrudSheetFilterSlotProps<any>);
}

export { CrudSheetFilter, createCrudSheetFilterSlotAccessor };
