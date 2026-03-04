import type { JSX } from "solid-js";
import type { CrudDetailToolsDef } from "./types";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudDetailToolsDef(value: unknown): value is CrudDetailToolsDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-tools"
  );
}

export const CrudDetailTools = createDefComponent<CrudDetailToolsDef>(
  (props: { children: JSX.Element }) => ({
    __type: "crud-detail-tools",
    children: props.children,
  }),
);
