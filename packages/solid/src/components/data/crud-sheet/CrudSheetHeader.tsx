import type { JSX } from "solid-js";
import type { CrudSheetHeaderDef } from "./types";

export function isCrudSheetHeaderDef(value: unknown): value is CrudSheetHeaderDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-header"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudSheetHeader(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-sheet-header",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
