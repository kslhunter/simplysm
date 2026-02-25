import type { JSX } from "solid-js";
import type { CrudDetailBeforeDef } from "./types";

export function isCrudDetailBeforeDef(value: unknown): value is CrudDetailBeforeDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-before"
  );
}

/* eslint-disable solid/reactivity -- plain object return pattern does not require reactive context */
export function CrudDetailBefore(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-detail-before",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
