import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";
import { $signal } from "../../../utils/bindings/$signal";
import { SdSheetDomAccessor } from "./SdSheetDomAccessor";

export class SdSheetCellAgent {
  constructor(private readonly _options: { domAccessor: SdSheetDomAccessor }) {}

  #editModeCellAddr = $signal<{ r: number; c: number } | undefined>(undefined);

  getIsCellEditMode(addr: { r: number; c: number }): boolean {
    return ObjectUtils.equal(this.#editModeCellAddr(), addr);
  }

  getCellAddr(el: HTMLTableCellElement) {
    return {
      r: NumberUtils.parseInt(el.getAttribute("data-r"))!,
      c: NumberUtils.parseInt(el.getAttribute("data-c"))!,
    };
  }

  async handleKeydownCaptureAsync(event: KeyboardEvent) {
    if (event.target instanceof HTMLTableCellElement) {
      const el = event.target;

      if (event.key === "F2") {
        event.preventDefault();
        this.#enterEditMode(el);
      } else if (event.key === "ArrowDown") {
        if (this.#moveCellIfExists(el, 1, 0, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowUp") {
        if (this.#moveCellIfExists(el, -1, 0, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowRight") {
        if (this.#moveCellIfExists(el, 0, 1, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowLeft") {
        if (this.#moveCellIfExists(el, 0, -1, false)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "c") {
        if (!document.getSelection()) {
          event.preventDefault();
          await el.copyAsync();
        }
      } else if (event.ctrlKey && event.key === "v") {
        event.preventDefault();
        await el.pasteAsync();
      }
    } else if (event.target instanceof HTMLElement) {
      const tdEl = event.target.findParent("td") as HTMLTableCellElement | undefined;
      if (!tdEl) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.#exitEditMode(tdEl);
      } else if (event.key === "Enter") {
        if (event.target.tagName === "TEXTAREA" || event.target.hasAttribute("contenteditable")) {
          if (event.ctrlKey) {
            event.preventDefault();
            this.#moveCellIfExists(tdEl, 1, 0, true);
          }
        } else {
          event.preventDefault();
          this.#moveCellIfExists(tdEl, 1, 0, true);
        }
      } else if (event.ctrlKey && event.key === "ArrowDown") {
        if (this.#moveCellIfExists(tdEl, 1, 0, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "ArrowUp") {
        if (this.#moveCellIfExists(tdEl, -1, 0, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "ArrowRight") {
        if (this.#moveCellIfExists(tdEl, 0, 1, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "ArrowLeft") {
        if (this.#moveCellIfExists(tdEl, 0, -1, true)) {
          event.preventDefault();
        }
      }
    }
  }

  handleCellDoubleClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) return;

    const tdEl = (
      event.target.tagName === "TD" ? event.target : event.target.findParent("td")!
    ) as HTMLTableCellElement;

    this.#enterEditMode(tdEl);
  }

  handleBlurCapture(event: FocusEvent) {
    if (
      this.#editModeCellAddr() &&
      !(
        event.target instanceof HTMLElement &&
        event.relatedTarget instanceof HTMLElement &&
        (event.target.findParent("td") ?? event.target) === event.relatedTarget.findParent("td")
      )
    ) {
      this.#editModeCellAddr.set(undefined);
    }
  }

  #enterEditMode(tdEl: HTMLTableCellElement) {
    const addr = this.getCellAddr(tdEl);
    this.#editModeCellAddr.set(addr);
    requestAnimationFrame(() => tdEl.findFocusableFirst()?.focus());
  }

  #exitEditMode(tdEl: HTMLTableCellElement) {
    tdEl.focus();
    this.#editModeCellAddr.set(undefined);
  }

  #moveCellIfExists(
    fromEl: HTMLTableCellElement,
    offsetR: number,
    offsetC: number,
    isEditMode: boolean,
  ): boolean {
    const fromAddr = this.getCellAddr(fromEl);
    const toAddr = { r: fromAddr.r + offsetR, c: fromAddr.c + offsetC };

    const tdEl = this._options.domAccessor.getCell(toAddr.r, toAddr.c);
    if (!tdEl) return false;

    tdEl.focus();
    if (isEditMode) {
      this.#editModeCellAddr.set(toAddr);
      requestAnimationFrame(() => tdEl.findFocusableFirst()?.focus());
    } else {
      this.#editModeCellAddr.set(undefined);
    }
    return true;
  }
}
