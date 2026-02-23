/**
 * Sets up pointer capture and manages pointermove/pointerup lifecycle on a target element.
 *
 * @param target - Element to capture pointer on
 * @param pointerId - Pointer ID from the initiating PointerEvent
 * @param options.onMove - Called on each pointermove
 * @param options.onEnd - Called on pointerup or pointercancel (after listener cleanup)
 */
export function startPointerDrag(
  target: HTMLElement,
  pointerId: number,
  options: {
    onMove: (e: PointerEvent) => void;
    onEnd: (e: PointerEvent) => void;
  },
): void {
  target.setPointerCapture(pointerId);

  const cleanup = (e: PointerEvent) => {
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", cleanup);
    target.removeEventListener("pointercancel", cleanup);
    options.onEnd(e);
  };

  const onPointerMove = (e: PointerEvent) => options.onMove(e);

  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", cleanup);
  target.addEventListener("pointercancel", cleanup);
}
