import type { JSX } from "solid-js";
import { createSlot } from "../../../helpers/createSlot";

const [CrudDetailAfter, createCrudDetailAfterSlotAccessor] = createSlot<{ children: JSX.Element }>();

export { CrudDetailAfter, createCrudDetailAfterSlotAccessor };
