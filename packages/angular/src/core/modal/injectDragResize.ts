import { type Signal, inject, DestroyRef } from "@angular/core";

interface DragResizeOptions {
  getDialogEl: () => HTMLElement | null;
  minWidthPx: Signal<number | undefined>;
  minHeightPx: Signal<number | undefined>;
  onEnd: () => void;
}

type SizeStyleProp = "width" | "height" | "maxWidth" | "maxHeight";

/** `auto`, `none` 등 길이가 아닌 값은 하한 없음(0)으로 본다. */
function parseCssMinPx(value: string): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function shiftPercentSize(
  dialogStyle: CSSStyleDeclaration,
  prop: SizeStyleProp,
  padPx: number,
): void {
  if (padPx === 0) return;

  const value = dialogStyle[prop];
  if (!value.includes("%")) return;

  dialogStyle[prop] = `calc(${value} - ${padPx}px)`;
}

/**
 * `._dialog` 는 평소 CSS 로 중앙 정렬(`position: relative` + `margin: 0 auto`)되어 있어
 * `left`/`top` 이 "정상 배치 위치 대비 상대 offset" 으로 해석된다.
 * 드래그, 리사이즈는 절대 좌표로 계산하므로 시작 시점에 절대 좌표계로 전환한다.
 * 전환만으로는 위치, 크기가 변하지 않으며, 이미 전환된 요소에 다시 적용해도 결과가 같다.
 */
export function pinDialogAbsolute(dialogEl: HTMLElement): { left: number; top: number } {
  const wasRelative = getComputedStyle(dialogEl).position === "relative";
  const parentEl = dialogEl.offsetParent as HTMLElement | null;
  const beforeRect = dialogEl.getBoundingClientRect();
  const roundedLeft = dialogEl.offsetLeft;
  const roundedTop = dialogEl.offsetTop;

  dialogEl.style.position = "absolute";
  dialogEl.style.margin = "0";
  dialogEl.style.right = "auto";
  dialogEl.style.bottom = "auto";
  dialogEl.style.left = `${roundedLeft}px`;
  dialogEl.style.top = `${roundedTop}px`;

  if (wasRelative && parentEl != null) {
    // 백분율 크기의 기준 박스가 부모 content box 에서 offsetParent padding box 로 바뀐다.
    const parentStyle = getComputedStyle(parentEl);
    const padX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
    const padY = parseFloat(parentStyle.paddingTop) + parseFloat(parentStyle.paddingBottom);
    shiftPercentSize(dialogEl.style, "width", padX);
    shiftPercentSize(dialogEl.style, "maxWidth", padX);
    shiftPercentSize(dialogEl.style, "height", padY);
    shiftPercentSize(dialogEl.style, "maxHeight", padY);
  }

  // offsetLeft/offsetTop 은 정수로 반올림되므로, 전환 전후 실제 위치 차이만큼 되돌린다.
  const afterRect = dialogEl.getBoundingClientRect();
  const pinnedLeft = roundedLeft - (afterRect.left - beforeRect.left);
  const pinnedTop = roundedTop - (afterRect.top - beforeRect.top);
  dialogEl.style.left = `${pinnedLeft}px`;
  dialogEl.style.top = `${pinnedTop}px`;

  return { left: pinnedLeft, top: pinnedTop };
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
        minWidth: number;
        minHeight: number;
      }
    | undefined;

  function applyDrag(event: MouseEvent): void {
    if (dragState == null) return;

    const dialogEl = opt.getDialogEl();
    if (dialogEl == null) return;

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    dialogEl.style.left = `${dragState.startLeft + dx}px`;
    dialogEl.style.top = `${dragState.startTop + dy}px`;
  }

  function applyResize(event: MouseEvent): void {
    if (resizeState == null) return;

    const dialogEl = opt.getDialogEl();
    if (dialogEl == null) return;

    const dx = event.clientX - resizeState.startX;
    const dy = event.clientY - resizeState.startY;
    const minW = resizeState.minWidth;
    const minH = resizeState.minHeight;

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
    if (resizeState != null) {
      applyResize(event);
    }
    if (dragState != null) {
      applyDrag(event);
    }
  }

  function onDocumentMouseUp(): void {
    const hadState = resizeState != null || dragState != null;
    resizeState = undefined;
    dragState = undefined;
    document.removeEventListener("mousemove", onDocumentMouseMove);
    document.removeEventListener("mouseup", onDocumentMouseUp);
    if (hadState) {
      opt.onEnd();
    }
  }

  function startDrag(event: MouseEvent): void {
    const dialogEl = opt.getDialogEl();
    if (dialogEl == null) return;

    const pinned = pinDialogAbsolute(dialogEl);

    dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: pinned.left,
      startTop: pinned.top,
    };
    document.addEventListener("mousemove", onDocumentMouseMove);
    document.addEventListener("mouseup", onDocumentMouseUp);
  }

  function startResize(event: MouseEvent, dir: string): void {
    const dialogEl = opt.getDialogEl();
    if (dialogEl == null) return;

    const pinned = pinDialogAbsolute(dialogEl);
    const dialogStyle = getComputedStyle(dialogEl);

    resizeState = {
      dir,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: dialogEl.offsetWidth,
      startHeight: dialogEl.offsetHeight,
      startLeft: pinned.left,
      startTop: pinned.top,
      // CSS 하한을 넘겨 줄이면 실제 크기는 안 줄고 반대쪽 변만 밀려나므로, 실제 제약을 하한으로 삼는다.
      minWidth: Math.max(opt.minWidthPx() ?? 0, parseCssMinPx(dialogStyle.minWidth)),
      minHeight: Math.max(opt.minHeightPx() ?? 0, parseCssMinPx(dialogStyle.minHeight)),
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
