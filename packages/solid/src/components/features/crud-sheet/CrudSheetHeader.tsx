import type { JSX } from "solid-js";
import { createSlot } from "../../../helpers/createSlot";

const [CrudSheetHeader, createCrudSheetHeaderSlotAccessor] = createSlot<{ children: JSX.Element }>();

export { CrudSheetHeader, createCrudSheetHeaderSlotAccessor };
