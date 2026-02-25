import type { JSX } from "solid-js";
import type { CrudSheetToolsDef } from "./types";

export function isCrudSheetToolsDef(value: unknown): value is CrudSheetToolsDef<any> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-tools"
  );
}

/* eslint-disable solid/reactivity -- plain object return pattern does not require reactive context */
export function CrudSheetTools<_TItem>(props: {
  children: (ctx: any) => JSX.Element;
}): JSX.Element {
  return {
    __type: "crud-sheet-tools",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
