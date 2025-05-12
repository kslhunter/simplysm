import { signal } from "@angular/core";
import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";
import { useSdSheetDomAccessor } from "./use-sd-sheet-dom-accessor";

export function useSdSheetCellAgent() {
  const dom = useSdSheetDomAccessor();

  const editModeCellAddr = signal<{ r: number; c: number } | undefined>(undefined);

  function getIsCellEditMode(addr: { r: number, c: number }): boolean {
    return ObjectUtils.equal(editModeCellAddr(), addr);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLTableCellElement) {
      if (event.key === "F2") {
        event.preventDefault();
        enterEditMode(event.target);
      }
      else if (event.key === "ArrowDown") {
        if (moveCellIfExists(event.target, 1, 0, false)) {
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowUp") {
        if (moveCellIfExists(event.target, -1, 0, false)) {
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowRight") {
        if (moveCellIfExists(event.target, 0, 1, false)) {
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowLeft") {
        if (moveCellIfExists(event.target, 0, -1, false)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "c") {
        if (!document.getSelection()) {
          event.preventDefault();
          _dispatchCustomEvent(event.target, "sd-sheet-cell-copy");
        }
      }
      else if (event.ctrlKey && event.key === "v") {
        event.preventDefault();
        _dispatchCustomEvent(event.target, "sd-sheet-cell-paste");
      }
    }
    else if (event.target instanceof HTMLElement) {
      const tdEl = event.target.findParent("td") as HTMLTableCellElement | undefined;
      if (!tdEl) return;
      if (event.key === "Escape") {
        event.preventDefault();
        exitEditMode(tdEl);
      }
      else if (event.key === "Enter") {
        if (event.target.tagName === "TEXTAREA" || event.target.hasAttribute("contenteditable")) {
          if (event.ctrlKey) {
            event.preventDefault();
            moveCellIfExists(tdEl, 1, 0, true);
          }
        }
        else {
          event.preventDefault();
          moveCellIfExists(tdEl, 1, 0, true);
        }
      }
      else if (event.ctrlKey && event.key === "ArrowDown") {
        if (moveCellIfExists(tdEl, 1, 0, true)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowUp") {
        if (moveCellIfExists(tdEl, -1, 0, true)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowRight") {
        if (moveCellIfExists(tdEl, 0, 1, true)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        if (moveCellIfExists(tdEl, 0, -1, true)) {
          event.preventDefault();
        }
      }
    }
  }

  function _dispatchCustomEvent(tdEl: HTMLTableCellElement, name: string) {
    tdEl.findFirst("sd-textfield")?.dispatchEvent(new CustomEvent(name));
  }

  function handleCellDoubleClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) return;

    const tdEl = (event.target.tagName === "TD"
      ? event.target
      : event.target.findParent("td")!) as HTMLTableCellElement;

    enterEditMode(tdEl);
  }

  function handleBlur(event: FocusEvent) {
    if (
      editModeCellAddr() &&
      !(
        event.target instanceof HTMLElement &&
        event.relatedTarget instanceof HTMLElement &&
        (event.target.findParent("td") ?? event.target) === event.relatedTarget.findParent("td")
      )
    ) {
      editModeCellAddr.set(undefined);
    }
  }

  function enterEditMode(tdEl: HTMLTableCellElement) {
    const addr = getCellAddr(tdEl);
    editModeCellAddr.set(addr);
    requestAnimationFrame(() => tdEl.findFocusableFirst()?.focus());
  }

  function exitEditMode(tdEl: HTMLTableCellElement) {
    tdEl.focus();
    editModeCellAddr.set(undefined);
  }

  function moveCellIfExists(
    fromEl: HTMLTableCellElement,
    offsetR: number,
    offsetC: number,
    isEditMode: boolean,
  ): boolean {
    const fromAddr = getCellAddr(fromEl);
    const toAddr = { r: fromAddr.r + offsetR, c: fromAddr.c + offsetC };

    const tdEl = dom.getCell(toAddr.r, toAddr.c);
    if (!tdEl) return false;

    tdEl.focus();
    if (isEditMode) {
      editModeCellAddr.set(toAddr);
      requestAnimationFrame(() => tdEl.findFocusableFirst()?.focus());
    }
    else {
      editModeCellAddr.set(undefined);
    }
    return true;
  }

  function getCellAddr(el: HTMLTableCellElement) {
    return {
      r: NumberUtils.parseInt(el.getAttribute("r"))!,
      c: NumberUtils.parseInt(el.getAttribute("c"))!,
    };
  }

  return {
    handleKeydown,
    handleCellDoubleClick,
    handleBlur,
    getIsCellEditMode,
    getCellAddr,
  };
}