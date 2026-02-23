declare interface HTMLElement {
  repaint(): void;

  getRelativeOffset(parentElement: HTMLElement): { top: number; left: number };

  getRelativeOffset(parentSelector: string): { top: number; left: number };

  scrollIntoViewIfNeeded(
    target: { top: number; left: number },
    offset?: { top: number; left: number },
  ): void;
}

HTMLElement.prototype.repaint = function (this: HTMLElement): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  this.offsetHeight;
};

HTMLElement.prototype.getRelativeOffset = function (parent: HTMLElement | string): {
  top: number;
  left: number;
} {
  // 1. parent 요소 찾기
  const parentEl = typeof parent === "string" ? this.closest(parent) : parent;

  if (!(parentEl instanceof HTMLElement)) {
    throw new Error("Parent element not found");
  }

  // 2. getBoundingClientRect()를 사용하여 더 정확한 위치 계산
  const elementRect = this.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();

  // 3. 스크롤 위치 고려
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // 4. 부모 요소와의 상대적 위치 계산 (스크롤 위치 반영)
  const relativeOffset = {
    top: elementRect.top - parentRect.top + scrollTop + (parentEl.scrollTop || 0),
    left: elementRect.left - parentRect.left + scrollLeft + (parentEl.scrollLeft || 0),
  };

  // 5. 부모 요소들의 border와 padding 고려
  let currentEl = this.parentElement;
  while (currentEl && currentEl !== parentEl) {
    const style = window.getComputedStyle(currentEl);
    relativeOffset.top += parseFloat(style.borderTopWidth) || 0;
    relativeOffset.left += parseFloat(style.borderLeftWidth) || 0;

    currentEl = currentEl.parentElement;
  }

  // 6. transform, rotation 등의 CSS 변환 고려
  if (this.style.transform || parentEl.style.transform) {
    const elementMatrix = new DOMMatrix(window.getComputedStyle(this).transform);
    const parentMatrix = new DOMMatrix(window.getComputedStyle(parentEl).transform);

    // transform이 적용된 경우 매트릭스 연산으로 보정
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
