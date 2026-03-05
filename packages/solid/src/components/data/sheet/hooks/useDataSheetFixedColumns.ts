import { createMemo, createSignal, type Accessor } from "solid-js";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import type { DataSheetColumnDef } from "../types";

export interface UseDataSheetFixedColumnsProps<TItem> {
  itemChildren?: (item: TItem, index: number) => TItem[] | undefined;
  selectionMode?: "single" | "multiple";
  onItemsReorder?: (event: any) => void;
}

export function useDataSheetFixedColumns<TItem>(
  props: UseDataSheetFixedColumnsProps<TItem>,
  effectiveColumns: Accessor<DataSheetColumnDef<TItem>[]>
) {
  // Feature column presence checks
  const hasExpandFeature = () => props.itemChildren != null;
  const hasSelectFeature = () => props.selectionMode != null;
  const hasReorderFeature = () => props.onItemsReorder != null;

  // Feature column width tracking helper
  function createTrackedWidth(): [() => number, (el: HTMLElement) => void] {
    const [width, setWidth] = createSignal(0);
    const register = (el: HTMLElement) => {
      createResizeObserver(el, () => {
        setWidth(el.offsetWidth);
      });
    };
    return [width, register];
  }

  const [expandColWidth, registerExpandColRef] = createTrackedWidth();
  const [selectColWidth, registerSelectColRef] = createTrackedWidth();
  const [reorderColWidth, registerReorderColRef] = createTrackedWidth();

  // Feature column left position (used in select/reorder column style)
  const selectColLeft = createMemo(() => (hasExpandFeature() ? `${expandColWidth()}px` : "0"));

  const reorderColLeft = createMemo(() => {
    let left = 0;
    if (hasExpandFeature()) left += expandColWidth();
    if (hasSelectFeature()) left += selectColWidth();
    return `${left}px`;
  });

  // Column cell refs — for width measurement
  const columnRefs = new Map<number, HTMLElement>();

  // Measured width of each column
  const [columnWidths, setColumnWidths] = createSignal<Map<number, number>>(new Map());

  // Total width of feature columns (expand, etc.) — used for fixed column left offset
  const featureColTotalWidth = createMemo(() => {
    let w = 0;
    if (hasExpandFeature()) w += expandColWidth();
    if (hasSelectFeature()) w += selectColWidth();
    if (hasReorderFeature()) w += reorderColWidth();
    return w;
  });

  // Calculate left position of fixed columns
  const fixedLeftMap = createMemo(() => {
    const map = new Map<number, number>();
    const cols = effectiveColumns();
    const widths = columnWidths();
    let left = featureColTotalWidth();
    for (let c = 0; c < cols.length; c++) {
      if (!cols[c].fixed) break; // Fixed columns are placed continuously at front
      map.set(c, left);
      left += widths.get(c) ?? 0;
    }
    return map;
  });

  // Last fixed column index
  const lastFixedIndex = createMemo(() => {
    const cols = effectiveColumns();
    let last = -1;
    for (let c = 0; c < cols.length; c++) {
      if (cols[c].fixed) last = c;
      else break;
    }
    return last;
  });

  function getFixedStyle(colIndex: number): string | undefined {
    const leftVal = fixedLeftMap().get(colIndex);
    if (leftVal == null) return undefined;
    return `left: ${leftVal}px`;
  }

  function isLastFixed(colIndex: number): boolean {
    return colIndex === lastFixedIndex();
  }

  // Register ResizeObserver for fixed column cells
  function registerColumnRef(colIndex: number, el: HTMLElement): void {
    columnRefs.set(colIndex, el);
    createResizeObserver(el, () => {
      setColumnWidths((prev) => {
        const next = new Map(prev);
        next.set(colIndex, el.offsetWidth);
        return next;
      });
    });
  }

  return {
    // Feature column tracking
    hasExpandFeature,
    hasSelectFeature,
    hasReorderFeature,
    expandColWidth,
    selectColWidth,
    reorderColWidth,
    registerExpandColRef,
    registerSelectColRef,
    registerReorderColRef,
    selectColLeft,
    reorderColLeft,

    // Fixed columns
    columnRefs,
    columnWidths,
    featureColTotalWidth,
    fixedLeftMap,
    lastFixedIndex,
    getFixedStyle,
    isLastFixed,
    registerColumnRef,
  };
}
