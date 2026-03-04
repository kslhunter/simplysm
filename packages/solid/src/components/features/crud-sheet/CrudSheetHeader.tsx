import type { JSX } from "solid-js";
import type { CrudSheetHeaderDef } from "./types";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudSheetHeaderDef(value: unknown): value is CrudSheetHeaderDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-header"
  );
}

export const CrudSheetHeader = createDefComponent<CrudSheetHeaderDef>(
  (props: { children: JSX.Element }) => ({
    __type: "crud-sheet-header",
    children: props.children,
  }),
);
