import { ElementRef, inject } from "@angular/core";

export function injectSheetDomAccessor() {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  function getHostEl(): HTMLElement {
    return elRef.nativeElement;
  }

  function getContainer(): HTMLElement {
    return elRef.nativeElement.querySelector("._container")!;
  }

  function getTable(): HTMLTableElement {
    return elRef.nativeElement.querySelector("table")!;
  }

  function getTHead(): HTMLTableSectionElement {
    return getTable().querySelector("thead")!;
  }

  function getRow(r: number): HTMLTableRowElement | null {
    const tbody = getTable().querySelector("tbody");
    if (tbody == null) return null;
    const rows = tbody.querySelectorAll<HTMLTableRowElement>("tr");
    return rows[r] ?? null;
  }

  function getCell(r: number, c: number): HTMLTableCellElement | null {
    const row = getRow(r);
    if (row == null) return null;
    const cells = row.querySelectorAll<HTMLTableCellElement>("td[data-c]");
    for (const cell of cells) {
      if (cell.getAttribute("data-c") === String(c)) {
        return cell;
      }
    }
    return null;
  }

  function getColumnResizeIndicator(): HTMLElement {
    return elRef.nativeElement.querySelector("._resize-indicator")!;
  }

  function getLastDepthFixedHeaders(): HTMLElement[] {
    const thead = getTHead();
    const lastRow = thead.querySelector("tr:last-child");
    if (lastRow == null) return [];
    return Array.from(lastRow.querySelectorAll<HTMLElement>("th[style*='sticky']"));
  }

  return {
    getHostEl,
    getContainer,
    getTable,
    getTHead,
    getRow,
    getCell,
    getColumnResizeIndicator,
    getLastDepthFixedHeaders,
  };
}
