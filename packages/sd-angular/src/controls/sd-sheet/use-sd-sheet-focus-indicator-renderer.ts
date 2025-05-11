import { injectElementRef } from "../../utils/dom/element-ref.injector";

export function useSdSheetFocusIndicatorRenderer() {
  const elRef = injectElementRef();

  function handleFocus(event: FocusEvent) {
    if (!(event.target instanceof HTMLElement)) return;

    const sheetContainerEl = elRef.nativeElement.findFirst<HTMLElement>(
      "._sheet-container",
    )!;
    const focusRowIndicatorEl = sheetContainerEl.findFirst<HTMLElement>(
      "> ._focus-row-indicator",
    )!;
    const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

    //-- cell indicator
    const tdEl = event.target.tagName.toLowerCase() === "td"
      ? event.target
      : event.target.findParent("td");
    if (!(tdEl instanceof HTMLTableCellElement)) return;

    const cellRect = {
      left: tdEl.offsetLeft - (tdEl.classList.contains("_fixed")
        ? sheetContainerEl.scrollLeft
        : 0),
      width: tdEl.offsetWidth,
      height: tdEl.offsetHeight,
    };
    Object.assign(focusCellIndicatorEl.style, {
      display: event.target.tagName.toLowerCase() === "td" ? "block" : "none",
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
    Object.assign(focusRowIndicatorEl.style, {
      display: "block",
      top: rowRect.top - 2 + "px",
      left: rowRect.left + "px",
      width: rowRect.width + "px",
      height: rowRect.height + 3 + "px",
    });
  }

  function handleBlur(event: FocusEvent) {
    if (
      event.target instanceof HTMLTableCellElement &&
      !(
        event.relatedTarget
        instanceof HTMLTableCellElement
        && event.relatedTarget.findParent(elRef.nativeElement)
      )
    ) {
      const focusRowIndicatorEl = elRef.nativeElement.findFirst<HTMLDivElement>(
        "._focus-row-indicator",
      )!;
      const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

      //-- cell indicator
      focusCellIndicatorEl.style.display = "none";

      //-- row indicator
      if (!(event.relatedTarget instanceof HTMLElement)
        || !event.relatedTarget.findParent(event.target)) {
        focusRowIndicatorEl.style.display = "none";
      }
    }
  }

  function handleTableResize() {
    const sheetContainerEl = elRef.nativeElement.findFirst(
      "._sheet-container",
    )!;
    const focusRowIndicatorEl = sheetContainerEl.findFirst<HTMLDivElement>(
      "> ._focus-row-indicator",
    )!;
    const tableEl = sheetContainerEl.findFirst<HTMLElement>(
      "> table",
    )!;

    //-- row indicator
    Object.assign(focusRowIndicatorEl.style, {
      width: tableEl.offsetWidth + "px",
    });
  }

  function handleContainerScroll() {
    if (!(document.activeElement instanceof HTMLTableCellElement)) return;

    const sheetContainerEl = elRef.nativeElement.findFirst(
      "._sheet-container",
    )!;
    const focusRowIndicatorEl = sheetContainerEl.findFirst<HTMLDivElement>(
      "> ._focus-row-indicator",
    )!;

    const theadEl = sheetContainerEl.findFirst<HTMLTableSectionElement>("> table > thead")!;
    const fixedHeaderLastDepthEls = theadEl.findAll<HTMLTableCellElement>(
      "> tr > th._last-depth._fixed");

    const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

    const noneFixedPosition = {
      top: theadEl.offsetHeight,
      left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth),
    };
    const indicatorPosition = {
      top: focusRowIndicatorEl.offsetTop - sheetContainerEl.scrollTop + 2,
      left: focusCellIndicatorEl.offsetLeft - sheetContainerEl.scrollLeft + 2,
    };

    //-- cell indicator
    if (indicatorPosition.top < noneFixedPosition.top
      || indicatorPosition.left < noneFixedPosition.left) {
      focusCellIndicatorEl.style.opacity = ".3";
    }
    else {
      focusCellIndicatorEl.style.opacity = "1";
    }
  }

  return {
    handleFocus,
    handleBlur,
    handleTableResize,
    handleContainerScroll,
  };
}