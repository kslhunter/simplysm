import type { JSX } from "solid-js";
import type { CrudSheetFilterDef } from "./types";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudSheetFilterDef(value: unknown): value is CrudSheetFilterDef<any> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-filter"
  );
}

export const CrudSheetFilter = createDefComponent<CrudSheetFilterDef<any>>(
  (props: { children: (filter: any, setFilter: any) => JSX.Element }) => ({
    __type: "crud-sheet-filter",
    children: props.children,
  }),
);
