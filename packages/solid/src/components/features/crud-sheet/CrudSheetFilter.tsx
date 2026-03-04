import type { JSX } from "solid-js";
import type { CrudSheetFilterDef } from "./types";

export function isCrudSheetFilterDef(value: unknown): value is CrudSheetFilterDef<any> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-filter"
  );
}

export function CrudSheetFilter<TFilter>(props: {
  children: (filter: TFilter, setFilter: any) => JSX.Element;
}): JSX.Element {
  return {
    __type: "crud-sheet-filter",
    children: props.children,
  } as unknown as JSX.Element;
}
