import { signal } from "@angular/core";
import { injectElementRef } from "../../utils/dom/element-ref.injector";
import { NumberUtils, ObjectUtils } from "@simplysm/sd-core-common";

export function useSdSheetCellAgent() {
  const elRef = injectElementRef();

  const editModeCellAddr = signal<{ r: number; c: number } | undefined>(undefined);

  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLTableCellElement) {
      if (event.key === "F2") {
        event.preventDefault();

        editModeCellAddr.set(getCellAddr(event.target));

        requestAnimationFrame(() => {
          const focusableEl = (event.target as HTMLElement).findFocusableFirst();
          if (focusableEl) focusableEl.focus();
        });
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
          event.target.findFirst("sd-textfield")
            ?.dispatchEvent(new CustomEvent("sd-sheet-cell-copy"));
        }
      }
      else if (event.ctrlKey && event.key === "v") {
        event.preventDefault();
        event.target.findFirst("sd-textfield")
          ?.dispatchEvent(new CustomEvent("sd-sheet-cell-paste"));
      }
    }
    else if (event.target instanceof HTMLElement) {
      const tdEl = event.target.findParent("td") as HTMLTableCellElement | undefined;
      if (!tdEl) return;
      if (event.key === "Escape") {
        event.preventDefault();
        tdEl.focus();

        editModeCellAddr.set(undefined);
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

  function handleCellDoubleClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) return;

    const tdEl = (event.target.tagName === "TD"
      ? event.target
      : event.target.findParent("td")!) as HTMLTableCellElement;

    const tdAddr = getCellAddr(tdEl);
    editModeCellAddr.set(tdAddr);

    requestAnimationFrame(() => {
      const focusableEl = tdEl.findFocusableFirst();
      if (focusableEl) focusableEl.focus();
    });
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

  function getIsCellEditMode(addr: { r: number, c: number }): boolean {
    return ObjectUtils.equal(editModeCellAddr(), addr);
  }

  function moveCellIfExists(
    el: HTMLTableCellElement,
    offsetR: number,
    offsetC: number,
    isEditMode: boolean,
  ): boolean {
    const elAddr = getCellAddr(el);
    const targetAddr = { r: elAddr.r + offsetR, c: elAddr.c + offsetC };

    const targetEl = getCellEl(targetAddr);
    if (!targetEl) return false;

    targetEl.focus();
    if (isEditMode) {
      editModeCellAddr.set(targetAddr);
      requestAnimationFrame(() => {
        const focusableEl = targetEl.findFocusableFirst();
        if (focusableEl) focusableEl.focus();
      });
    }
    else {
      editModeCellAddr.set(undefined);
    }
    return true;
  }

  function getCellEl(addr: { r: number, c: number }) {
    const sheetContainerEl = elRef.nativeElement
      .findFirst<HTMLDivElement>("._sheet-container")!;

    return sheetContainerEl.findFirst<HTMLTableCellElement>(
      `> table > tbody > tr[r='${addr.r}'] > td[r='${addr.r}'][c='${addr.c}']`,
    );
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
    getIsCellEditMode,
    handleBlur,
    getCellEl,
    getCellAddr
  };
}