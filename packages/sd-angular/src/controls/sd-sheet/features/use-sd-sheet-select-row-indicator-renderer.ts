import { effect, Signal } from "@angular/core";
import { useSdSheetDomAccessor } from "./use-sd-sheet-dom-accessor";

export function useSdSheetSelectRowIndicatorRenderer<T>(binding: {
  selectedItems: Signal<T[]>;
  displayItems: Signal<T[]>;
}) {
  const dom = useSdSheetDomAccessor();

  effect(() => {
    const selectRowIndicatorContainerEl = dom.getSelectRowIndicatorContainer();

    if (binding.selectedItems().length <= 0) {
      selectRowIndicatorContainerEl.innerHTML = "";
      selectRowIndicatorContainerEl.style.display = "none";
      return;
    }

    const selectedTrRects = binding.selectedItems()
      .map((item) => {
        const r = binding.displayItems().indexOf(item);
        const trEl = dom.getRow(r);
        if (!trEl) return undefined;

        return {
          top: trEl.offsetTop,
          width: trEl.offsetWidth,
          height: trEl.offsetHeight,
        };
      })
      .filterExists();

    let html = "";
    for (const selectedTrRect of selectedTrRects) {
      let styleText = `top: ${selectedTrRect.top}px;`;
      styleText += `height: ${selectedTrRect.height - 1}px;`;
      styleText += `width: ${selectedTrRect.width - 1}px;`;

      html += /* language="HTML" */ `
          <div class='_select-row-indicator' style="${styleText}"></div>`.trim();
    }
    selectRowIndicatorContainerEl.innerHTML = html;
    selectRowIndicatorContainerEl.style.display = "block";
  });

  function handleTableResize() {
    const selectRowIndicatorEls = dom.getSelectRowIndicators();
    const tableEl = dom.getTable();

    //-- row indicators
    for (const selectRowIndicatorEl of selectRowIndicatorEls) {
      Object.assign(selectRowIndicatorEl.style, {
        width: tableEl.offsetWidth + "px",
      });
    }
  }


  return {
    handleTableResize,
  };
}