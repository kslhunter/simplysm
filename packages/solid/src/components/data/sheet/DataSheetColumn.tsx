import type { JSX } from "solid-js";
import type { DataSheetColumnDef, DataSheetColumnProps } from "./types";
import { normalizeHeader } from "./sheetUtils";
import { createDefComponent } from "../../../helpers/createDefComponent";

export function isDataSheetColumnDef(value: unknown): value is DataSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "sheet-column"
  );
}

export const DataSheetColumn = createDefComponent<DataSheetColumnDef<any>>(
  (props: DataSheetColumnProps<any>) => ({
    __type: "sheet-column",
    key: props.key,
    header: normalizeHeader(props.header),
    headerContent: props.headerContent,
    headerStyle: props.headerStyle,
    summary: props.summary,
    tooltip: props.tooltip,
    cell: props.children,
    class: props.class,
    fixed: props.fixed ?? false,
    hidden: props.hidden ?? false,
    collapse: props.collapse ?? false,
    width: props.width,
    sortable: props.sortable ?? true,
    resizable: props.resizable ?? true,
  }),
);
