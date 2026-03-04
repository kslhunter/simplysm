import type { JSX } from "solid-js";
import type { CrudDetailBeforeDef } from "./types";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudDetailBeforeDef(value: unknown): value is CrudDetailBeforeDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-before"
  );
}

export const CrudDetailBefore = createDefComponent<CrudDetailBeforeDef>(
  (props: { children: JSX.Element }) => ({
    __type: "crud-detail-before",
    children: props.children,
  }),
);
