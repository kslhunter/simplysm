import { signal } from "@angular/core";
import type { useSheetDomAccessor } from "./useSheetDomAccessor";

export function useSheetCellAgent(options: {
  domAccessor: ReturnType<typeof useSheetDomAccessor>;
}) {
  const editModeCellAddr = signal<{ r: number; c: number } | undefined>(undefined);
  let _isTransitioning = false;

  function isCellEditMode(addr: { r: number; c: number }): boolean {
    const current = editModeCellAddr();
    if (current == null) return false;
    return current.r === addr.r && current.c === addr.c;
  }

  function getCellAddr(el: HTMLTableCellElement): { r: number; c: number } {
    const r = parseInt(el.getAttribute("data-r") ?? "-1", 10);
    const c = parseInt(el.getAttribute("data-c") ?? "-1", 10);
    return { r, c };
  }

  function _enterEditMode(r: number, c: number): void {
    editModeCellAddr.set({ r, c });
    // Re-query DOM inside queueMicrotask to avoid stale reference after Angular re-render
    queueMicrotask(() => {
      const cell = options.domAccessor.getCell(r, c);
      if (cell == null) return;
      const focusable = cell.findFirstFocusableChild();
      if (focusable !== undefined) {
        focusable.focus();
      }
    });
  }

  function _exitEditMode(): void {
    editModeCellAddr.set(undefined);
  }

  function _getClosestDataCell(el: Element): HTMLTableCellElement | null {
    return el.closest<HTMLTableCellElement>("td[data-c]");
  }

  function _moveToCell(r: number, c: number, enterEdit: boolean): void {
    const cell = options.domAccessor.getCell(r, c);
    if (cell == null) return;
    _isTransitioning = true;
    _exitEditMode();
    if (enterEdit) {
      editModeCellAddr.set({ r, c });
      queueMicrotask(() => {
        _isTransitioning = false;
        const targetCell = options.domAccessor.getCell(r, c);
        if (targetCell == null) return;
        const focusable = targetCell.findFirstFocusableChild();
        if (focusable !== undefined) {
          focusable.focus();
        }
      });
    } else {
      _isTransitioning = false;
      cell.focus();
    }
  }

  function _isMultiLineElement(el: Element): boolean {
    return (
      el.tagName === "TEXTAREA" ||
      (el as HTMLElement).isContentEditable === true
    );
  }

  async function handleKeydownCapture(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLElement;

    // F2 to enter edit mode
    if (event.key === "F2") {
      const td = _getClosestDataCell(target);
      if (td == null) return;
      const addr = getCellAddr(td);
      if (!isCellEditMode(addr)) {
        event.preventDefault();
        _enterEditMode(addr.r, addr.c);
        return;
      }
    }

    // Escape to exit edit mode
    if (event.key === "Escape") {
      const currentAddr = editModeCellAddr();
      if (currentAddr != null) {
        event.preventDefault();
        const cell = options.domAccessor.getCell(currentAddr.r, currentAddr.c);
        _exitEditMode();
        cell?.focus();
        return;
      }
    }

    // Enter handling
    if (event.key === "Enter") {
      const currentAddr = editModeCellAddr();
      if (currentAddr != null) {
        const isMultiLine = _isMultiLineElement(target);
        if (isMultiLine) {
          // In multiline, only Ctrl+Alt+Enter moves to next row
          if (event.ctrlKey && event.altKey) {
            event.preventDefault();
            _moveToCell(currentAddr.r + 1, currentAddr.c, true);
            return;
          }
          // Otherwise, default behavior (newline)
          return;
        }
        // Normal input: Enter moves to next row
        event.preventDefault();
        _moveToCell(currentAddr.r + 1, currentAddr.c, true);
        return;
      }
    }

    // Arrow key handling (non-edit mode, on td)
    if (
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight") &&
      editModeCellAddr() == null
    ) {
      const td = _getClosestDataCell(target);
      if (td == null) return;
      if (td !== target) return; // Only handle when td itself is focused
      const addr = getCellAddr(td);

      event.preventDefault();
      switch (event.key) {
        case "ArrowDown":
          _moveToCell(addr.r + 1, addr.c, false);
          break;
        case "ArrowUp":
          _moveToCell(addr.r - 1, addr.c, false);
          break;
        case "ArrowRight":
          _moveToCell(addr.r, addr.c + 1, false);
          break;
        case "ArrowLeft":
          _moveToCell(addr.r, addr.c - 1, false);
          break;
      }
      return;
    }

    // Ctrl+Alt+Arrow in edit mode
    if (
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight") &&
      event.ctrlKey &&
      event.altKey
    ) {
      const currentAddr = editModeCellAddr();
      if (currentAddr != null) {
        event.preventDefault();
        switch (event.key) {
          case "ArrowDown":
            _moveToCell(currentAddr.r + 1, currentAddr.c, true);
            break;
          case "ArrowUp":
            _moveToCell(currentAddr.r - 1, currentAddr.c, true);
            break;
          case "ArrowRight":
            _moveToCell(currentAddr.r, currentAddr.c + 1, true);
            break;
          case "ArrowLeft":
            _moveToCell(currentAddr.r, currentAddr.c - 1, true);
            break;
        }
        return;
      }
    }

    // Ctrl+C (copy)
    if (event.key === "c" && event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (!("clipboard" in navigator)) return;
      const td = _getClosestDataCell(target);
      if (td == null) return;
      if (td !== target) return; // Only when td itself is focused

      const selection = window.getSelection();
      if (selection != null && selection.toString() !== "") {
        // Text selected — let browser handle it
        return;
      }

      event.preventDefault();
      await navigator.clipboard.writeText(td.textContent);
      return;
    }

    // Ctrl+V (paste)
    if (event.key === "v" && event.ctrlKey && !event.altKey && !event.shiftKey) {
      if (!("clipboard" in navigator)) return;
      const td = _getClosestDataCell(target);
      if (td == null) return;
      if (td !== target) return; // Only when td itself is focused

      event.preventDefault();
      const text = await navigator.clipboard.readText();
      // Enter edit mode and paste
      const addr = getCellAddr(td);
      _enterEditMode(addr.r, addr.c);

      // Wait for edit mode to render, then paste
      queueMicrotask(() => {
        const cell = options.domAccessor.getCell(addr.r, addr.c);
        if (cell == null) return;
        const inputEl = cell.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          "input, textarea",
        );
        if (inputEl != null) {
          inputEl.value = text;
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      return;
    }
  }

  function handleCellDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const td = _getClosestDataCell(target);
    if (td == null) return;
    const addr = getCellAddr(td);
    _enterEditMode(addr.r, addr.c);
  }

  function handleBlurCapture(event: FocusEvent): void {
    if (_isTransitioning) return;
    const currentAddr = editModeCellAddr();
    if (currentAddr == null) return;

    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (relatedTarget == null) {
      _exitEditMode();
      return;
    }

    // Check if the new focus target is still within the same cell
    const cell = options.domAccessor.getCell(currentAddr.r, currentAddr.c);
    if (cell == null) {
      _exitEditMode();
      return;
    }

    if (!cell.contains(relatedTarget)) {
      _exitEditMode();
    }
  }

  return {
    editModeCellAddr,
    isCellEditMode,
    getCellAddr,
    handleKeydownCapture,
    handleCellDoubleClick,
    handleBlurCapture,
  };
}
