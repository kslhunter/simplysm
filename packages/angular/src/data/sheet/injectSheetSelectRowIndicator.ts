import { afterEveryRender, type Signal } from "@angular/core";
import { obj } from "@simplysm/core-common";
import type { injectSheetDomAccessor } from "./injectSheetDomAccessor";

function isKeyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return obj.equal(a, b);
}

export function injectSheetSelectRowIndicator<TItem, TKey>(options: {
  domAccessor: ReturnType<typeof injectSheetDomAccessor>;
  selectedKeys: Signal<NonNullable<TKey>[]>;
  displayItems: Signal<TItem[]>;
  trackByFn: Signal<(item: TItem, index: number) => TKey>;
}) {
  afterEveryRender(() => {
    const containerEl = options.domAccessor.getSelectRowIndicatorContainer();

    if (options.selectedKeys().length <= 0) {
      containerEl.innerHTML = "";
      containerEl.style.display = "none";
      return;
    }

    const trackByFn = options.trackByFn();
    const displayItems = options.displayItems();

    const selectedTrInfos = options.selectedKeys()
      .map((key) => {
        const r = displayItems.findIndex((item, i) => isKeyEqual(trackByFn(item, i), key));
        return getTrInfo(r);
      })
      .filter((info): info is NonNullable<typeof info> => info != null);

    let indicatorHtml = "";
    for (const info of selectedTrInfos) {
      const style = `top: ${info.top}px; height: ${info.height - 1}px; width: ${info.width - 1}px;`;
      indicatorHtml += `<div class="_select-row-indicator" style="${style}" data-r="${info.r}"></div>`;
    }
    containerEl.innerHTML = indicatorHtml;
    containerEl.style.display = "block";
  });

  function getTrInfo(
    r: number,
  ): { r: number; top: number; width: number; height: number } | undefined {
    const trEl = options.domAccessor.getRow(r);
    if (trEl == null) return undefined;

    return {
      r,
      top: trEl.offsetTop,
      width: trEl.offsetWidth,
      height: trEl.offsetHeight,
    };
  }

  function redraw(): void {
    const selectRowIndicatorEls = options.domAccessor.getSelectRowIndicators();

    for (const el of selectRowIndicatorEls) {
      const rAttr = el.getAttribute("data-r");
      if (rAttr == null) continue;
      const r = parseInt(rAttr, 10);
      if (Number.isNaN(r)) continue;

      const trInfo = getTrInfo(r);
      if (trInfo == null) continue;

      Object.assign(el.style, {
        top: trInfo.top + "px",
        width: trInfo.width + "px",
        height: trInfo.height + "px",
      });
    }
  }

  return { redraw };
}
