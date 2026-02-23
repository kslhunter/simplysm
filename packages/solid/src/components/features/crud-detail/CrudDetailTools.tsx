import type { JSX } from "solid-js";
import type { CrudDetailToolsDef } from "./types";

export function isCrudDetailToolsDef(value: unknown): value is CrudDetailToolsDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-tools"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudDetailTools(props: { children: JSX.Element }): JSX.Element {
  return {
    __type: "crud-detail-tools",
    children: props.children,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
