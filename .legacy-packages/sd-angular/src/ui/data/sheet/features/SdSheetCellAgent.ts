import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";
import { $signal } from "../../../../core/utils/bindings/$signal";
import type { SdSheetDomAccessor } from "./SdSheetDomAccessor";

export class SdSheetCellAgent {
  constructor(private readonly _options: { domAccessor: SdSheetDomAccessor }) {}

  private readonly _editModeCellAddr = $signal<{ r: number; c: number } | undefined>(undefined);

  getIsCellEditMode(addr: { r: number; c: number }): boolean {
    return ObjectUtils.equal(this._editModeCellAddr(), addr);
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
        this._enterEditMode(el);
      } else if (event.key === "ArrowDown") {
        if (this._moveCellIfExists(el, 1, 0, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowUp") {
        if (this._moveCellIfExists(el, -1, 0, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowRight") {
        if (this._moveCellIfExists(el, 0, 1, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowLeft") {
        if (this._moveCellIfExists(el, 0, -1, false)) {
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
        this._exitEditMode(tdEl);
      } else if (event.key === "Enter") {
        if (event.target.tagName === "TEXTAREA" || event.target.hasAttribute("contenteditable")) {
          if (event.ctrlKey && event.altKey) {
            event.preventDefault();
            this._moveCellIfExists(tdEl, 1, 0, true);
          }
        } else {
          event.preventDefault();
          this._moveCellIfExists(tdEl, 1, 0, true);
        }
      } else if (event.ctrlKey && event.altKey && event.key === "ArrowDown") {
        if (this._moveCellIfExists(tdEl, 1, 0, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.altKey && event.key === "ArrowUp") {
        if (this._moveCellIfExists(tdEl, -1, 0, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.altKey && event.key === "ArrowRight") {
        if (this._moveCellIfExists(tdEl, 0, 1, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.altKey && event.key === "ArrowLeft") {
        if (this._moveCellIfExists(tdEl, 0, -1, true)) {
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

    this._enterEditMode(tdEl);
  }

  handleBlurCapture(event: FocusEvent) {
    if (
      this._editModeCellAddr() &&
      !(
        event.target instanceof HTMLElement &&
        event.relatedTarget instanceof HTMLElement &&
        (event.target.findParent("td") ?? event.target) === event.relatedTarget.findParent("td")
      )
    ) {
      this._editModeCellAddr.set(undefined);
    }
  }

  private _enterEditMode(tdEl: HTMLTableCellElement) {
    const addr = this.getCellAddr(tdEl);
    this._editModeCellAddr.set(addr);
    requestAnimationFrame(() => tdEl.findFocusableFirst()?.focus());
  }

  private _exitEditMode(tdEl: HTMLTableCellElement) {
    tdEl.focus();
    this._editModeCellAddr.set(undefined);
  }

  private _moveCellIfExists(
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
      this._editModeCellAddr.set(toAddr);
      requestAnimationFrame(() => tdEl.findFocusableFirst()?.focus());
    } else {
      this._editModeCellAddr.set(undefined);
    }
    return true;
  }
}
