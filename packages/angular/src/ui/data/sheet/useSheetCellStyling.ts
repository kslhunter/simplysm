import { computed, type Signal } from "@angular/core";
import type { ISdSheetColumnDef, ISdSheetHeaderDef } from "./types";
import type { IExpandItemDef } from "../../../core/utils/useExpandingManager";

export function useSheetCellStyling<T>(options: {
  columnDefs: Signal<ISdSheetColumnDef[]>;
  fixedLeftMap: Signal<Map<string, number>>;
  getItemCellStyleFn: Signal<((item: T, colKey: string) => string | undefined) | undefined>;
  getItemCellClassFn: Signal<((item: T, colKey: string) => string) | undefined>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  expandingDef: (item: T) => IExpandItemDef<T>;
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

  function getFixedStyle(
    colDef: ISdSheetColumnDef,
    zIndex: number = 1,
    background: string = "var(--control-color)",
  ): string | null {
    const leftValue = options.fixedLeftMap().get(colDef.key);
    if (leftValue == null) return null;

    return `position: sticky; left: ${leftValue}px; z-index: ${zIndex}; background: ${background}`;
  }

  const headerColumnStyles = computed(() => {
    const map = new Map<string, string | null>();
    for (const colDef of options.columnDefs()) {
      const parts: string[] = [];
      const colStyle = getColDefStyle(colDef);
      if (colStyle != null) parts.push(colStyle);
      const fixedStyle = getFixedStyle(colDef, 3, "var(--theme-secondary-lightest)");
      if (fixedStyle != null) parts.push(fixedStyle);
      map.set(colDef.key, parts.length > 0 ? parts.join("; ") : null);
    }
    return map;
  });

  const dataColumnBaseStyles = computed(() => {
    const map = new Map<string, string | null>();
    for (const colDef of options.columnDefs()) {
      const parts: string[] = [];
      const colStyle = getColDefStyle(colDef);
      if (colStyle != null) parts.push(colStyle);
      const fixedStyle = getFixedStyle(colDef);
      if (fixedStyle != null) parts.push(fixedStyle);
      map.set(colDef.key, parts.length > 0 ? parts.join("; ") : null);
    }
    return map;
  });

  function getHeaderCellStyle(cell: ISdSheetHeaderDef): string | null {
    if (cell.colDef == null) return null;
    return headerColumnStyles().get(cell.colDef.key) ?? null;
  }

  function getCellStyle(item: T, colDef: ISdSheetColumnDef): string | null {
    const baseStyle = dataColumnBaseStyles().get(colDef.key) ?? null;
    const styleFn = options.getItemCellStyleFn();
    const customStyle = styleFn != null ? styleFn(item, colDef.key) : undefined;
    if (baseStyle != null && customStyle != null) return `${baseStyle}; ${customStyle}`;
    return customStyle ?? baseStyle ?? null;
  }

  function getFixedCellStyle(colDef: ISdSheetColumnDef): string | null {
    return getFixedStyle(colDef, 3);
  }

  function getCellStyleWithIndent(item: T, colDef: ISdSheetColumnDef, colIdx: number): string | null {
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

  function getDataCellClass(item: T, colDef: ISdSheetColumnDef, r: number, c: number): string | null {
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
