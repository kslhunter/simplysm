import type { JSX } from "solid-js";
import type { SheetColumnDef, SheetColumnProps } from "./types";
import { normalizeHeader } from "./sheetUtils";

export function isSheetColumnDef(value: unknown): value is SheetColumnDef<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["__type"] === "sheet-column"
  );
}

/* eslint-disable solid/reactivity -- plain object 반환 패턴으로 reactive context 불필요 */
export function SheetColumn<T>(props: SheetColumnProps<T>): JSX.Element {
  return {
    __type: "sheet-column",
    key: props.key,
    header: normalizeHeader(props.header),
    headerContent: props.headerContent,
    headerStyle: props.headerStyle,
    summary: props.summary,
    tooltip: props.tooltip,
    cell: props.children,
    fixed: props.fixed ?? false,
    hidden: props.hidden ?? false,
    collapse: props.collapse ?? false,
    width: props.width,
    disableSorting: props.disableSorting ?? false,
    disableResizing: props.disableResizing ?? false,
  } as unknown as JSX.Element;
}
/* eslint-enable solid/reactivity */
