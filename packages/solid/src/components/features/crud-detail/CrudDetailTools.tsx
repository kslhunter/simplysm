import type { JSX } from "solid-js";
import { createSlot } from "../../../helpers/createSlot";

const [CrudDetailTools, createCrudDetailToolsSlotAccessor] = createSlot<{ children: JSX.Element }>();

export { CrudDetailTools, createCrudDetailToolsSlotAccessor };
