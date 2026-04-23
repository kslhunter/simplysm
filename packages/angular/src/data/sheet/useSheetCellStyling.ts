import { computed, type Signal } from "@angular/core";
import type { SdSheetColumnDef, SdSheetHeaderDef } from "./types";
import type { ExpandItemDef } from "../../core/selection/useExpandingManager";

export function useSheetCellStyling<T>(options: {
  columnDefs: Signal<SdSheetColumnDef[]>;
  fixedLeftMap: Signal<Map<number, number>>;
  getItemCellStyleFn: Signal<((item: T, colKey: string) => string | undefined) | undefined>;
  getItemCellClassFn: Signal<((item: T, colKey: string) => string) | undefined>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  expandingDef: (item: T) => ExpandItemDef<T>;
  isCellEditMode: (addr: { r: number; c: number }) => boolean;
}) {
  function getColDefStyle(colDef: { width: string | undefined; collapse: boolean }): string | null {
    if (colDef.collapse) {
      return "padding: 0; width: 0; min-width: 0; max-width: 0; overflow: hidden; border: none";
    }
    if (colDef.width != null) {
      return `width: ${colDef.width}; min-width: ${colDef.width}; max-width: ${colDef.width}`;
    }
    return null;
  }

  function getFixedLeftStyle(colIdx: number): string | null {
    const leftValue = options.fixedLeftMap().get(colIdx);
    if (leftValue == null) return null;

    return `left: ${leftValue}px`;
  }

  const headerColumnStyles = computed(() => {
    const map = new Map<string, string | null>();
    const defs = options.columnDefs();
    for (let i = 0; i < defs.length; i++) {
      const colDef = defs[i];
      const parts: string[] = [];
      const colStyle = getColDefStyle(colDef);
      if (colStyle != null) parts.push(colStyle);
      if (colDef.fixed) {
        const fixedStyle = getFixedLeftStyle(i);
        if (fixedStyle != null) parts.push(fixedStyle);
      }
      map.set(colDef.key, parts.length > 0 ? parts.join("; ") : null);
    }
    return map;
  });

  const dataColumnBaseStyles = computed(() => {
    const map = new Map<string, string | null>();
    const defs = options.columnDefs();
    for (let i = 0; i < defs.length; i++) {
      const colDef = defs[i];
      const parts: string[] = [];
      const colStyle = getColDefStyle(colDef);
      if (colStyle != null) parts.push(colStyle);
      if (colDef.fixed) {
        const fixedStyle = getFixedLeftStyle(i);
        if (fixedStyle != null) parts.push(fixedStyle);
      }
      map.set(colDef.key, parts.length > 0 ? parts.join("; ") : null);
    }
    return map;
  });

  function getHeaderCellStyle(cell: SdSheetHeaderDef): string | null {
    if (cell.colDef == null) return null;
    const parts: string[] = [];
    const baseStyle = headerColumnStyles().get(cell.colDef.key);
    if (baseStyle != null) parts.push(baseStyle);
    if (cell.colDef.headerStyle != null) parts.push(cell.colDef.headerStyle);
    return parts.length > 0 ? parts.join("; ") : null;
  }

  function getCellStyle(item: T, colDef: SdSheetColumnDef): string | null {
    const baseStyle = dataColumnBaseStyles().get(colDef.key) ?? null;
    const styleFn = options.getItemCellStyleFn();
    const customStyle = styleFn != null ? styleFn(item, colDef.key) : undefined;
    if (baseStyle != null && customStyle != null) return `${baseStyle}; ${customStyle}`;
    return customStyle ?? baseStyle ?? null;
  }

  function getFixedCellStyle(colIdx: number): string | null {
    return getFixedLeftStyle(colIdx);
  }

  function getCellStyleWithIndent(item: T, colDef: SdSheetColumnDef, colIdx: number): string | null {
    const parts: string[] = [];
    const cellStyle = getCellStyle(item, colDef);
    if (cellStyle != null) {
      parts.push(cellStyle);
    }
    if (colIdx === 0 && options.getChildrenFn() != null) {
      const itemDef = options.expandingDef(item);
      if (itemDef.depth > 0) {
        parts.push(`padding-left: calc(var(--gap-default) + ${itemDef.depth}em)`);
      }
    }
    return parts.length > 0 ? parts.join("; ") : null;
  }

  function getDataCellClass(item: T, colDef: SdSheetColumnDef, r: number, c: number): string | null {
    const parts: string[] = [];
    const classFn = options.getItemCellClassFn();
    const customClass = classFn != null ? classFn(item, colDef.key) : undefined;
    if (customClass != null) {
      parts.push(customClass);
    }
    if (options.isCellEditMode({ r, c })) {
      parts.push("_edit-mode");
    }
    return parts.length > 0 ? parts.join(" ") : null;
  }

  return {
    getHeaderCellStyle,
    getCellStyle,
    getFixedCellStyle,
    getCellStyleWithIndent,
    getDataCellClass,
  };
}
