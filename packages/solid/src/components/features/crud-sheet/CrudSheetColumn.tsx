import type { JSX } from "solid-js";
import { createSlots } from "../../../helpers/createSlots";
import type { CrudSheetColumnProps } from "./types";

const [SlotComponent, createCrudSheetColumnSlotsAccessor] = createSlots<CrudSheetColumnProps<any>>();

function CrudSheetColumn<TItem>(props: CrudSheetColumnProps<TItem>): JSX.Element {
  return SlotComponent(props as CrudSheetColumnProps<any>);
}

export { CrudSheetColumn, createCrudSheetColumnSlotsAccessor };
