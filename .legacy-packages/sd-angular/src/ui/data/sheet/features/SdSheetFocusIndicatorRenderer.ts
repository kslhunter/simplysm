import type { SdSheetDomAccessor } from "./SdSheetDomAccessor";

export class SdSheetFocusIndicatorRenderer {
  constructor(
    private readonly _options: {
      domAccessor: SdSheetDomAccessor;
    },
  ) {}

  redraw() {
    const containerEl = this._options.domAccessor.getContainer();
    const rowIndicatorEl = this._options.domAccessor.getFocusRowIndicator();
    const cellIndicatorEl = this._options.domAccessor.getFocusCellIndicator();

    const focusedEl = document.activeElement;
    if (!(focusedEl instanceof HTMLElement) || !focusedEl.findParent(containerEl)) {
      cellIndicatorEl.style.display = "none";
      rowIndicatorEl.style.display = "none";
      return;
    }

    const tdEl = focusedEl.tagName.toLowerCase() === "td" ? focusedEl : focusedEl.findParent("td");
    if (!(tdEl instanceof HTMLTableCellElement)) {
      cellIndicatorEl.style.display = "none";
      rowIndicatorEl.style.display = "none";
      return;
    }

    //-- cell indicator
    const fixedScrollLeft = tdEl.classList.contains("_fixed") ? containerEl.scrollLeft : 0;
    const cellRect = {
      left: tdEl.offsetLeft - fixedScrollLeft,
      width: tdEl.offsetWidth,
      height: tdEl.offsetHeight,
    };
    Object.assign(cellIndicatorEl.style, {
      display: focusedEl.tagName.toLowerCase() === "td" ? "block" : "none",
      position: tdEl.classList.contains("_fixed") ? "sticky" : "absolute",
      left: cellRect.left - 2 + "px",
      width: cellRect.width + 3 + "px",
      height: cellRect.height + 3 + "px",
      opacity: "1",
    });

    //-- row indicator
    const trEl = tdEl.parentElement!;
    const rowRect = {
      top: trEl.offsetTop,
      left: trEl.offsetLeft,
      width: trEl.offsetWidth,
      height: trEl.offsetHeight,
    };
    Object.assign(rowIndicatorEl.style, {
      display: "block",
      top: rowRect.top - 2 + "px",
      left: rowRect.left + "px",
      width: rowRect.width + "px",
      height: rowRect.height + 3 + "px",
    });

    //-- Cell indicator opacity

    if (!(focusedEl instanceof HTMLTableCellElement)) return;
    if (focusedEl.classList.contains("_fixed")) return;

    const theadEl = this._options.domAccessor.getTHead();
    const lastDepthFixedHeaderEls = this._options.domAccessor.getLastDepthFixedHeaders();

    const noneFixedPosition = {
      top: theadEl.offsetHeight,
      left: lastDepthFixedHeaderEls.sum((item) => item.offsetWidth),
    };
    const indicatorPosition = {
      top: rowIndicatorEl.offsetTop - containerEl.scrollTop + 2,
      left: cellIndicatorEl.offsetLeft - containerEl.scrollLeft + 2,
    };

    if (
      indicatorPosition.top < noneFixedPosition.top ||
      indicatorPosition.left < noneFixedPosition.left - 1
    ) {
      cellIndicatorEl.style.opacity = ".3";
    } else {
      cellIndicatorEl.style.opacity = "1";
    }
  }
}
