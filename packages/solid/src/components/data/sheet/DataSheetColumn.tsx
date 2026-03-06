import type { JSX } from "solid-js";
import { createSlots } from "../../../helpers/createSlots";
import type { DataSheetColumnProps } from "./DataSheet.types";

const [SlotComponent, createColumnSlotsAccessor] = createSlots<DataSheetColumnProps<any>>();

function DataSheetColumn<TItem>(props: DataSheetColumnProps<TItem>): JSX.Element {
  return SlotComponent(props as DataSheetColumnProps<any>);
}

export { DataSheetColumn, createColumnSlotsAccessor };
