import type { JSX } from "solid-js";
import type { DataSheetColumnDef, DataSheetColumnProps } from "./types";
import { normalizeHeader } from "./sheetUtils";

export function isDataSheetColumnDef(value: unknown): value is DataSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "sheet-column"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function DataSheetColumn<TItem>(props: DataSheetColumnProps<TItem>): JSX.Element {
  return {
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
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
