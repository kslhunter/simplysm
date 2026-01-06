/**
 * 강제 리페인트 (reflow 트리거)
 * @param el 리페인트할 요소
 */
export function repaint(el: HTMLElement): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetHeight;
}

/**
 * 부모 요소 기준 상대 위치 계산
 * @param el 대상 요소
 * @param parent 기준 부모 요소 또는 셀렉터
 * @returns 상대 위치 { top, left }
 */
export function getRelativeOffset(
  el: HTMLElement,
  parent: HTMLElement | string,
): { top: number; left: number } {
  // 1. parent 요소 찾기
  const parentEl = typeof parent === "string" ? el.closest(parent) : parent;

  if (!(parentEl instanceof HTMLElement)) {
    throw new Error("Parent element not found");
  }

  // 2. getBoundingClientRect()를 사용하여 위치 계산
  const elementRect = el.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();

  // 3. 스크롤 위치 고려
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // 4. 부모 요소와의 상대적 위치 계산 (스크롤 위치 반영)
  const relativeOffset = {
    top: elementRect.top - parentRect.top + scrollTop + (parentEl.scrollTop || 0),
    left: elementRect.left - parentRect.left + scrollLeft + (parentEl.scrollLeft || 0),
  };

  // 5. 부모 요소들의 border 고려
  let currentEl = el.parentElement;
  while (currentEl !== null && currentEl !== parentEl) {
    const style = window.getComputedStyle(currentEl);
    relativeOffset.top += parseFloat(style.borderTopWidth) || 0;
    relativeOffset.left += parseFloat(style.borderLeftWidth) || 0;
    currentEl = currentEl.parentElement;
  }

  // 6. transform, rotation 등의 CSS 변환 고려
  if (el.style.transform !== "" || parentEl.style.transform !== "") {
    const elementMatrix = new DOMMatrix(window.getComputedStyle(el).transform);
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
}

/**
 * 필요시 스크롤하여 대상 위치를 보이게 함
 * @param container 스크롤 컨테이너
 * @param target 대상 위치 { top, left }
 * @param offset 오프셋 { top, left } (기본값: 0, 0)
 */
export function scrollIntoViewIfNeeded(
  container: HTMLElement,
  target: { top: number; left: number },
  offset: { top: number; left: number } = { top: 0, left: 0 },
): void {
  const scroll = {
    top: container.scrollTop,
    left: container.scrollLeft,
  };

  if (target.top - scroll.top < offset.top) {
    container.scrollTop = target.top - offset.top;
  }
  if (target.left - scroll.left < offset.left) {
    container.scrollLeft = target.left - offset.left;
  }
}

/**
 * IntersectionObserver를 사용하여 요소들의 bounds 정보 조회
 * @param els 조회할 요소 배열
 * @returns bounds 정보 배열
 */
export async function getBoundsAsync(
  els: HTMLElement[],
): Promise<
  {
    target: HTMLElement;
    top: number;
    left: number;
    width: number;
    height: number;
  }[]
> {
  return await new Promise((resolve) => {
    const observer = new IntersectionObserver((entries) => {
      observer.disconnect();

      resolve(
        entries.map((entry) => ({
          target: entry.target as HTMLElement,
          top: entry.boundingClientRect.top,
          left: entry.boundingClientRect.left,
          width: entry.boundingClientRect.width,
          height: entry.boundingClientRect.height,
        })),
      );
    });

    for (const el of els) {
      observer.observe(el);
    }
  });
}
