import { ArgumentError } from "@simplysm/core-common";

declare global {
  interface HTMLElement {
    /**
     * 강제 리페인트 (reflow 트리거)
     */
    repaint(): void;

    /**
     * 부모 요소 기준 상대 위치 계산 (CSS 포지셔닝용)
     *
     * @remarks
     * 부모 요소 기준으로 요소 위치를 계산하며, CSS `top`/`left` 속성에 바로 사용할 수 있는 좌표를 반환합니다.
     *
     * 주요 사용 사례:
     * - position: relative/absolute 부모 내에서 드롭다운, 팝업 위치 지정
     * - 스크롤된 컨테이너에서도 정상 동작
     *
     * 계산에 포함되는 요소:
     * - 뷰포트 기준 위치 (getBoundingClientRect)
     * - 부모 요소 내부 스크롤 (parentEl.scrollTop/Left)
     * - 중간 요소의 border 두께
     * - CSS transform 변환
     *
     * @param parent - 기준이 되는 부모 요소 또는 선택자 (예: document.body, ".container")
     * @returns CSS top/left 속성에 사용 가능한 좌표
     * @throws {ArgumentError} 부모 요소를 찾을 수 없는 경우
     */
    getRelativeOffset(parent: HTMLElement | string): { top: number; left: number };

    /**
     * offset 영역(예: 고정 헤더/컬럼)에 가려진 경우 대상이 보이도록 스크롤
     *
     * @remarks
     * 대상이 스크롤 영역의 상단/좌측 경계를 벗어나는 경우만 처리합니다.
     * 하단/우측 방향 스크롤이 필요한 경우는 브라우저의 기본 포커스 스크롤 동작에 의존합니다.
     * 주로 고정 헤더나 컬럼이 있는 테이블의 포커스 이벤트에서 사용됩니다.
     *
     * @param target - 컨테이너 내 대상 위치 (offsetTop, offsetLeft)
     * @param offset - 가려지면 안 되는 영역의 크기 (예: 고정 헤더 높이, 고정 컬럼 너비)
     */
    scrollIntoViewIfNeeded(
      target: { top: number; left: number },
      offset?: { top: number; left: number },
    ): void;
  }
}

HTMLElement.prototype.repaint = function (): void {
  // offsetHeight에 접근하면 브라우저에서 강제 동기 레이아웃이 트리거되어,
  // 현재 레이아웃의 스타일 변경이 즉시 적용되고 리페인트가 발생합니다.
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

  const relativeOffset = {
    top: elementRect.top - parentRect.top + (parentEl.scrollTop || 0),
    left: elementRect.left - parentRect.left + (parentEl.scrollLeft || 0),
  };

  let currentEl = this.parentElement;
  while (currentEl != null && currentEl !== parentEl) {
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
