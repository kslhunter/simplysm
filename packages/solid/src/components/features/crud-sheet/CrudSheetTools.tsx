import type { JSX } from "solid-js";
import type { CrudSheetToolsDef } from "./types";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudSheetToolsDef(value: unknown): value is CrudSheetToolsDef<any> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-tools"
  );
}

export const CrudSheetTools = createDefComponent<CrudSheetToolsDef<any>>(
  (props: { children: (ctx: any) => JSX.Element }) => ({
    __type: "crud-sheet-tools",
    children: props.children,
  }),
);
