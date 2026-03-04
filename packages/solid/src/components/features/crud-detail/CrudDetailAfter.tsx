import type { JSX } from "solid-js";
import type { CrudDetailAfterDef } from "./types";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isCrudDetailAfterDef(value: unknown): value is CrudDetailAfterDef {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-detail-after"
  );
}

export const CrudDetailAfter = createDefComponent<CrudDetailAfterDef>(
  (props: { children: JSX.Element }) => ({
    __type: "crud-detail-after",
    children: props.children,
  }),
);
