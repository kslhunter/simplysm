import { ArgumentError } from "@simplysm/core-common";

declare global {
  interface HTMLElement {
    /**
     * Force repaint (triggers reflow)
     */
    repaint(): void;

    /**
     * Calculate relative position based on parent element (for CSS positioning)
     *
     * @remarks
     * Calculates element position relative to parent element, returning document-based coordinates
     * including `window.scrollX/Y` that can be directly used in CSS `top`/`left` properties.
     *
     * Common use cases:
     * - Position dropdowns, popups after appending to `document.body`
     * - Works correctly on scrolled pages
     *
     * Factors included in calculation:
     * - Viewport-relative position (getBoundingClientRect)
     * - Document scroll position (window.scrollX/Y)
     * - Parent element internal scroll (parentEl.scrollTop/Left)
     * - Border thickness of intermediate elements
     * - CSS transform transformations
     *
     * @param parent - Parent element or selector to use as reference (e.g., document.body, ".container")
     * @returns Coordinates usable in CSS top/left properties
     * @throws {ArgumentError} If parent element cannot be found
     */
    getRelativeOffset(parent: HTMLElement | string): { top: number; left: number };

    /**
     * Scroll to make target visible if hidden by offset area (e.g., fixed header/column)
     *
     * @remarks
     * Only handles cases where target extends beyond top/left boundaries of scroll area.
     * For scrolling needed downward/rightward, relies on browser's default focus scroll behavior.
     * Typically used with focus events on tables with fixed headers or columns.
     *
     * @param target - Target position within container (offsetTop, offsetLeft)
     * @param offset - Size of area that must not be obscured (e.g., fixed header height, fixed column width)
     */
    scrollIntoViewIfNeeded(
      target: { top: number; left: number },
      offset?: { top: number; left: number },
    ): void;
  }
}

HTMLElement.prototype.repaint = function (): void {
  // offsetHeight 접근 시 브라우저는 동기적 레이아웃 계산(forced synchronous layout)을 수행하며,
  // 이로 인해 현재 배치된 스타일 변경사항이 즉시 적용되어 리페인트가 트리거된다.
  void this.offsetHeight;
};

HTMLElement.prototype.getRelativeOffset = function (parent: HTMLElement | string): {
  top: number;
  left: number;
} {
  const parentEl = typeof parent === "string" ? this.closest(parent) : parent;

  if (!(parentEl instanceof HTMLElement)) {
    throw new ArgumentError({ parent });
  }

  const elementRect = this.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();

  const scrollLeft = window.scrollX;
  const scrollTop = window.scrollY;

  const relativeOffset = {
    top: elementRect.top - parentRect.top + scrollTop + (parentEl.scrollTop || 0),
    left: elementRect.left - parentRect.left + scrollLeft + (parentEl.scrollLeft || 0),
  };

  let currentEl = this.parentElement;
  while (currentEl !== null && currentEl !== parentEl) {
    const style = getComputedStyle(currentEl);
    relativeOffset.top += parseFloat(style.borderTopWidth) || 0;
    relativeOffset.left += parseFloat(style.borderLeftWidth) || 0;
    currentEl = currentEl.parentElement;
  }

  const elTransform = getComputedStyle(this).transform;
  const parentTransform = getComputedStyle(parentEl).transform;

  if (elTransform !== "none" || parentTransform !== "none") {
    const elementMatrix = new DOMMatrix(elTransform);
    const parentMatrix = new DOMMatrix(parentTransform);

    if (!elementMatrix.isIdentity || !parentMatrix.isIdentity) {
      const transformedPoint = parentMatrix
        .inverse()
        .multiply(elementMatrix)
        .transformPoint(new DOMPoint(relativeOffset.left, relativeOffset.top));

      relativeOffset.left = transformedPoint.x;
      relativeOffset.top = transformedPoint.y;
    }
  }

  return relativeOffset;
};

HTMLElement.prototype.scrollIntoViewIfNeeded = function (
  target: { top: number; left: number },
  offset: { top: number; left: number } = { top: 0, left: 0 },
): void {
  const scroll = {
    top: this.scrollTop,
    left: this.scrollLeft,
  };

  if (target.top - scroll.top < offset.top) {
    this.scrollTop = target.top - offset.top;
  }
  if (target.left - scroll.left < offset.left) {
    this.scrollLeft = target.left - offset.left;
  }
};
