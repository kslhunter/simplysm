import type { JSX } from "solid-js";
import type { CrudDetailAfterDef } from "./types";

export function isCrudDetailAfterDef(value: unknown): value is CrudDetailAfterDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-after"
  );
}

/* eslint-disable solid/reactivity -- plain object return pattern does not require reactive context */
export function CrudDetailAfter(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-detail-after",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
