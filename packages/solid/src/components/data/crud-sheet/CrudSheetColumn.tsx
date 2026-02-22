import type { JSX } from "solid-js";
import type { CrudSheetColumnDef, CrudSheetColumnProps } from "./types";
import { normalizeHeader } from "../sheet/sheetUtils";

export function isCrudSheetColumnDef(value: unknown): value is CrudSheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "crud-sheet-column"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function CrudSheetColumn<TItem>(props: CrudSheetColumnProps<TItem>): JSX.Element {
  return {
    __type: "crud-sheet-column",
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
    editable: props.editable ?? false,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
