import type { Signal } from "@angular/core";
import { afterEveryRender } from "@angular/core";
import { html, NumberUtils } from "@simplysm/sd-core-common";
import type { SdSheetDomAccessor } from "./SdSheetDomAccessor";

export class SdSheetSelectRowIndicatorRenderer<T> {
  constructor(
    private readonly _options: {
      domAccessor: SdSheetDomAccessor;
      selectedItems: Signal<T[]>;
      displayItems: Signal<T[]>;
    },
  ) {
    afterEveryRender(() => {
      const selectRowIndicatorContainerEl =
        this._options.domAccessor.getSelectRowIndicatorContainer();

      if (this._options.selectedItems().length <= 0) {
        selectRowIndicatorContainerEl.innerHTML = "";
        selectRowIndicatorContainerEl.style.display = "none";
        return;
      }

      const selectedTrInfos = this._options
        .selectedItems()
        .map((item) => {
          const r = this._options.displayItems().indexOf(item);
          return this._getTrInfo(r);
        })
        .filterExists();

      let indicatorHtml = "";
      for (const selectedTrInfo of selectedTrInfos) {
        let styleText = `top: ${selectedTrInfo.top}px;`;
        styleText += `height: ${selectedTrInfo.height - 1}px;`;
        styleText += `width: ${selectedTrInfo.width - 1}px;`;

        indicatorHtml += html`
          <div class="_select-row-indicator" style="${styleText}" r="${selectedTrInfo.r}"></div>
        `.trim();
      }
      selectRowIndicatorContainerEl.innerHTML = indicatorHtml;
      selectRowIndicatorContainerEl.style.display = "block";
    });
  }

  redraw() {
    const selectRowIndicatorEls = this._options.domAccessor.getSelectRowIndicators();

    //-- row indicators
    for (const selectRowIndicatorEl of selectRowIndicatorEls) {
      const r = NumberUtils.parseInt(selectRowIndicatorEl.getAttribute("data-r"))!;

      const trInfo = this._getTrInfo(r);
      if (!trInfo) return;

      Object.assign(selectRowIndicatorEl.style, {
        top: trInfo.top + "px",
        width: trInfo.width + "px",
        height: trInfo.height + "px",
      });
    }
  }

  private _getTrInfo(r: number) {
    const trEl = this._options.domAccessor.getRow(r);
    if (!trEl) return undefined;

    return {
      r,
      top: trEl.offsetTop,
      width: trEl.offsetWidth,
      height: trEl.offsetHeight,
    };
  }
}
