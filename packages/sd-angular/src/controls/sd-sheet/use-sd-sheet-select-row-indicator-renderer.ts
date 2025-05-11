import { effect, Signal } from "@angular/core";
import { injectElementRef } from "../../utils/dom/element-ref.injector";

export function useSdSheetSelectRowIndicatorRenderer<T>(binding: {
  selectedItems: Signal<T[]>;
  displayItems: Signal<T[]>;
}) {
  const elRef = injectElementRef();

  function getRowEl(r: number) {
    const sheetContainerEl = elRef.nativeElement.findFirst<HTMLDivElement>(
      "._sheet-container",
    )!;

    return sheetContainerEl.findFirst<HTMLTableCellElement>(
      `> table > tbody > tr[r='${r}']`,
    );
  }

  effect(() => {
    const sheetContainerEl = elRef.nativeElement.findFirst<HTMLDivElement>(
      "._sheet-container",
    )!;
    const selectRowIndicatorContainerEl = sheetContainerEl.findFirst<HTMLDivElement>(
      "> ._select-row-indicator-container",
    )!;

    if (binding.selectedItems().length <= 0) {
      selectRowIndicatorContainerEl.innerHTML = "";
      selectRowIndicatorContainerEl.style.display = "none";
      return;
    }

    const selectedTrRects = binding.selectedItems()
      .map((item) => {
        const r = binding.displayItems().indexOf(item);
        const trEl = getRowEl(r);
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

  return {};
}