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
     * 이 함수는 요소의 위치를 부모 요소 기준으로 계산하되, `window.scrollX/Y`를 포함하여
     * CSS `top`/`left` 속성에 직접 사용할 수 있는 문서 기준 좌표를 반환한다.
     *
     * 주요 사용 사례:
     * - 드롭다운, 팝업 등을 `document.body`에 append 후 위치 지정
     * - 스크롤된 페이지에서도 올바르게 동작
     *
     * 계산에 포함되는 요소:
     * - 뷰포트 기준 위치 (getBoundingClientRect)
     * - 문서 스크롤 위치 (window.scrollX/Y)
     * - 부모 요소 내부 스크롤 (parentEl.scrollTop/Left)
     * - 중간 요소들의 border 두께
     * - CSS transform 변환
     *
     * @param parent - 기준이 될 부모 요소 또는 셀렉터 (예: document.body, ".container")
     * @returns CSS top/left 속성에 사용할 수 있는 좌표
     * @throws {ArgumentError} 부모 요소를 찾을 수 없는 경우
     */
    getRelativeOffset(parent: HTMLElement | string): { top: number; left: number };

    /**
     * 대상이 offset 영역(고정 헤더/고정 열 등)에 가려진 경우, 보이도록 스크롤
     *
     * @remarks
     * 이 함수는 대상이 스크롤 영역의 위쪽/왼쪽 경계를 벗어난 경우만 처리한다.
     * 아래쪽/오른쪽으로 스크롤이 필요한 경우는 브라우저의 기본 포커스 스크롤 동작에 의존한다.
     * 주로 고정 헤더나 고정 열이 있는 테이블에서 포커스 이벤트와 함께 사용된다.
     *
     * @param target - 대상의 컨테이너 내 위치 (offsetTop, offsetLeft)
     * @param offset - 가려지면 안 되는 영역 크기 (예: 고정 헤더 높이, 고정 열 너비)
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
