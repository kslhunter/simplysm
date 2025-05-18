import { Signal } from "@angular/core";
import { $effect } from "../../../utils/bindings/$effect";
import { SdSheetDomAccessor } from "./sd-sheet-dom-accessor";

export class SdSheetSelectRowIndicatorRenderer<T> {
  constructor(private _options: {
    domAccessor:  SdSheetDomAccessor
    selectedItems: Signal<T[]>;
    displayItems: Signal<T[]>;
  }) {
    $effect(() => {
      const selectRowIndicatorContainerEl = this._options.domAccessor.getSelectRowIndicatorContainer();

      if (this._options.selectedItems().length <= 0) {
        selectRowIndicatorContainerEl.innerHTML = "";
        selectRowIndicatorContainerEl.style.display = "none";
        return;
      }

      const selectedTrRects = this._options.selectedItems()
        .map((item) => {
          const r = this._options.displayItems().indexOf(item);
          const trEl = this._options.domAccessor.getRow(r);
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
  }

  redraw() {
    const selectRowIndicatorEls = this._options.domAccessor.getSelectRowIndicators();
    const tableEl = this._options.domAccessor.getTable();

    //-- row indicators
    for (const selectRowIndicatorEl of selectRowIndicatorEls) {
      Object.assign(selectRowIndicatorEl.style, {
        width: tableEl.offsetWidth + "px",
      });
    }
  }
}