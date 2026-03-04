import type { JSX } from "solid-js";
import { createSlot } from "../../../helpers/createSlot";

const [CrudDetailBefore, createCrudDetailBeforeSlotAccessor] = createSlot<{ children: JSX.Element }>();

export { CrudDetailBefore, createCrudDetailBeforeSlotAccessor };
