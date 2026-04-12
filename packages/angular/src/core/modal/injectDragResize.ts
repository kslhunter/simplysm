import { type Signal, inject, DestroyRef } from "@angular/core";

interface DragResizeOptions {
  getDialogEl: () => HTMLElement | null;
  minWidthPx: Signal<number | undefined>;
  minHeightPx: Signal<number | undefined>;
  onEnd: () => void;
}

export function injectDragResize(opt: DragResizeOptions): {
  startDrag: (event: MouseEvent) => void;
  startResize: (event: MouseEvent, dir: string) => void;
} {
  const destroyRef = inject(DestroyRef);

  let dragState:
    | { startX: number; startY: number; startLeft: number; startTop: number }
    | undefined;

  let resizeState:
    | {
        dir: string;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
        startLeft: number;
        startTop: number;
      }
    | undefined;

  function applyDrag(event: MouseEvent): void {
    if (dragState === undefined) return;

    const dialogEl = opt.getDialogEl();
    if (dialogEl === null) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    dialogEl.style.left = `${dragState.startLeft + dx}px`;
    dialogEl.style.top = `${dragState.startTop + dy}px`;
  }

  function applyResize(event: MouseEvent): void {
    if (resizeState === undefined) return;

    const dialogEl = opt.getDialogEl();
    if (dialogEl === null) return;

    const dx = event.clientX - resizeState.startX;
    const dy = event.clientY - resizeState.startY;
    const minW = opt.minWidthPx() ?? 0;
    const minH = opt.minHeightPx() ?? 0;

    let newWidth = resizeState.startWidth;
    let newHeight = resizeState.startHeight;
    let newLeft = resizeState.startLeft;
    let newTop = resizeState.startTop;

    if (resizeState.dir.includes("right")) {
      newWidth = Math.max(resizeState.startWidth + dx, minW);
    }
    if (resizeState.dir.includes("left")) {
      const proposed = resizeState.startWidth - dx;
      if (proposed >= minW) {
        newWidth = proposed;
        newLeft = resizeState.startLeft + dx;
      }
    }
    if (resizeState.dir.includes("bottom")) {
      newHeight = Math.max(resizeState.startHeight + dy, minH);
    }
    if (resizeState.dir.includes("top")) {
      const proposed = resizeState.startHeight - dy;
      if (proposed >= minH) {
        newHeight = proposed;
        newTop = resizeState.startTop + dy;
      }
    }

    dialogEl.style.width = `${newWidth}px`;
    dialogEl.style.height = `${newHeight}px`;
    dialogEl.style.left = `${newLeft}px`;
    dialogEl.style.top = `${newTop}px`;
  }

  function onDocumentMouseMove(event: MouseEvent): void {
    if (resizeState !== undefined) {
      applyResize(event);
    }
    if (dragState !== undefined) {
      applyDrag(event);
    }
  }

  function onDocumentMouseUp(): void {
    const hadState = resizeState !== undefined || dragState !== undefined;
    resizeState = undefined;
    dragState = undefined;
    document.removeEventListener("mousemove", onDocumentMouseMove);
    document.removeEventListener("mouseup", onDocumentMouseUp);
    if (hadState) {
      opt.onEnd();
    }
  }

  function getParentRect(dialogEl: HTMLElement): { left: number; top: number } {
    return (dialogEl.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
    };
  }

  function startDrag(event: MouseEvent): void {
    const dialogEl = opt.getDialogEl();
    if (dialogEl === null) return;

    const dialogRect = dialogEl.getBoundingClientRect();
    const parentRect = getParentRect(dialogEl);

    dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: dialogRect.left - parentRect.left,
      startTop: dialogRect.top - parentRect.top,
    };
    document.addEventListener("mousemove", onDocumentMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp);
  }

  function startResize(event: MouseEvent, dir: string): void {
    const dialogEl = opt.getDialogEl();
    if (dialogEl === null) return;

    const dialogRect = dialogEl.getBoundingClientRect();
    const parentRect = getParentRect(dialogEl);

    resizeState = {
      dir,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: dialogEl.offsetWidth,
      startHeight: dialogEl.offsetHeight,
      startLeft: dialogRect.left - parentRect.left,
      startTop: dialogRect.top - parentRect.top,
    };
    document.addEventListener("mousemove", onDocumentMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp);
  }

  destroyRef.onDestroy(() => {
    document.removeEventListener("mousemove", onDocumentMouseMove);
    document.removeEventListener("mouseup", onDocumentMouseUp);
  });

  return { startDrag, startResize };
}
