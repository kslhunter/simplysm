import { ElementRef, inject } from "@angular/core";

export function injectSheetDomAccessor() {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  function getHostEl(): HTMLElement {
    return elRef.nativeElement;
  }

  function getContainer(): HTMLElement {
    return elRef.nativeElement.querySelector<HTMLElement>("._sheet-container")!;
  }

  function getTable(): HTMLTableElement {
    return elRef.nativeElement.querySelector<HTMLTableElement>("table")!;
  }

  function getTHead(): HTMLTableSectionElement {
    return getTable().querySelector<HTMLTableSectionElement>("thead")!;
  }

  function getLastDepthFixedHeaders(): HTMLElement[] {
    return Array.from(getTHead().querySelectorAll<HTMLElement>("tr > th._last-depth._fixed"));
  }

  function getFocusRowIndicator(): HTMLElement {
    return getContainer().querySelector<HTMLElement>("._focus-row-indicator")!;
  }

  function getFocusCellIndicator(): HTMLElement {
    return getFocusRowIndicator().firstElementChild as HTMLElement;
  }

  function getSelectRowIndicatorContainer(): HTMLElement {
    return getContainer().querySelector<HTMLElement>("._select-row-indicator-container")!;
  }

  function getSelectRowIndicators(): HTMLElement[] {
    return Array.from(
      getSelectRowIndicatorContainer().querySelectorAll<HTMLElement>("._select-row-indicator"),
    );
  }

  function getColumnResizeIndicator(): HTMLElement {
    return getContainer().querySelector<HTMLElement>("._resize-indicator")!;
  }

  function getRow(r: number): HTMLTableRowElement | null {
    const tbody = getTable().querySelector("tbody");
    if (tbody == null) return null;
    return tbody.querySelector<HTMLTableRowElement>(`tr[data-r='${r}']`);
  }

  function getRows(): HTMLTableRowElement[] {
    const tbody = getTable().querySelector("tbody");
    if (tbody == null) return [];
    return Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr[data-r]"));
  }

  function getCell(r: number, c: number): HTMLTableCellElement | null {
    const row = getRow(r);
    if (row == null) return null;
    return row.querySelector<HTMLTableCellElement>(`td[data-c='${c}']`);
  }

  return {
    getHostEl,
    getContainer,
    getTable,
    getTHead,
    getLastDepthFixedHeaders,
    getFocusRowIndicator,
    getFocusCellIndicator,
    getSelectRowIndicatorContainer,
    getSelectRowIndicators,
    getColumnResizeIndicator,
    getRow,
    getRows,
    getCell,
  };
}
