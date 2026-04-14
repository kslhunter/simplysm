import type { injectSheetDomAccessor } from "./injectSheetDomAccessor";

export function useSheetFocusIndicator(options: {
  domAccessor: ReturnType<typeof injectSheetDomAccessor>;
}) {
  function redraw(): void {
    const containerEl = options.domAccessor.getContainer();
    const rowIndicatorEl = options.domAccessor.getFocusRowIndicator();
    const cellIndicatorEl = options.domAccessor.getFocusCellIndicator();

    const focusedEl = document.activeElement;
    if (!(focusedEl instanceof HTMLElement) || !containerEl.contains(focusedEl)) {
      cellIndicatorEl.style.display = "none";
      rowIndicatorEl.style.display = "none";
      return;
    }

    const tdEl =
      focusedEl.tagName.toLowerCase() === "td" ? focusedEl : focusedEl.closest("td");
    if (!(tdEl instanceof HTMLTableCellElement)) {
      cellIndicatorEl.style.display = "none";
      rowIndicatorEl.style.display = "none";
      return;
    }

    // Cell indicator
    const isFixed = tdEl.classList.contains("_fixed");
    const fixedScrollLeft = isFixed ? containerEl.scrollLeft : 0;
    Object.assign(cellIndicatorEl.style, {
      display: focusedEl.tagName.toLowerCase() === "td" ? "block" : "none",
      position: isFixed ? "sticky" : "absolute",
      left: tdEl.offsetLeft - fixedScrollLeft - 2 + "px",
      width: tdEl.offsetWidth + 3 + "px",
      height: tdEl.offsetHeight + 3 + "px",
      opacity: "1",
    });

    // Row indicator
    const trEl = tdEl.parentElement!;
    Object.assign(rowIndicatorEl.style, {
      display: "block",
      top: trEl.offsetTop - 2 + "px",
      left: trEl.offsetLeft + "px",
      width: trEl.offsetWidth + "px",
      height: trEl.offsetHeight + 3 + "px",
    });

    // Dim cell indicator when behind sticky header or fixed columns
    if (!(focusedEl instanceof HTMLTableCellElement)) return;
    if (focusedEl.classList.contains("_fixed")) return;

    const theadEl = options.domAccessor.getTHead();
    const fixedHeaderEls = options.domAccessor.getLastDepthFixedHeaders();

    const fixedAreaTop = theadEl.offsetHeight;
    const fixedAreaLeft = fixedHeaderEls.reduce((sum, el) => sum + el.offsetWidth, 0);

    const indicatorTop = rowIndicatorEl.offsetTop - containerEl.scrollTop + 2;
    const indicatorLeft = cellIndicatorEl.offsetLeft - containerEl.scrollLeft + 2;

    cellIndicatorEl.style.opacity =
      indicatorTop < fixedAreaTop || indicatorLeft < fixedAreaLeft - 1 ? ".3" : "1";
  }

  return { redraw };
}
