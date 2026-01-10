import { TimeoutError } from "@simplysm/core-common";

export namespace HtmlElementUtils {
  /**
   * 강제 리페인트 (reflow 트리거)
   */
  export function repaint(el: HTMLElement): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
  }

  /**
   * 부모 요소 기준 상대 위치 계산
   */
  export function getRelativeOffset(
    el: HTMLElement,
    parent: HTMLElement | string,
  ): { top: number; left: number } {
    const parentEl = typeof parent === "string" ? el.closest(parent) : parent;

    if (!(parentEl instanceof HTMLElement)) {
      throw new Error("Parent element not found");
    }

    const elementRect = el.getBoundingClientRect();
    const parentRect = parentEl.getBoundingClientRect();

    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;

    const relativeOffset = {
      top: elementRect.top - parentRect.top + scrollTop + (parentEl.scrollTop || 0),
      left: elementRect.left - parentRect.left + scrollLeft + (parentEl.scrollLeft || 0),
    };

    let currentEl = el.parentElement;
    while (currentEl !== null && currentEl !== parentEl) {
      const style = window.getComputedStyle(currentEl);
      relativeOffset.top += parseFloat(style.borderTopWidth) || 0;
      relativeOffset.left += parseFloat(style.borderLeftWidth) || 0;
      currentEl = currentEl.parentElement;
    }

    const elTransform = getComputedStyle(el).transform;
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
  }

  /**
   * 필요시 스크롤하여 대상 위치를 보이게 함
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
   * 요소 bounds 정보 타입
   */
  export interface ElementBounds {
    target: HTMLElement;
    top: number;
    left: number;
    width: number;
    height: number;
  }

  /**
   * IntersectionObserver를 사용하여 요소들의 bounds 정보 조회
   *
   * @param els - 대상 요소 배열
   * @param timeout - 타임아웃 (밀리초, 기본: 5000)
   * @throws {TimeoutError} 타임아웃 시간 내에 응답이 없을 경우
   */
  export async function getBoundsAsync(
    els: HTMLElement[],
    timeout: number = 5000,
  ): Promise<ElementBounds[]> {
    if (els.length === 0) {
      return [];
    }

    return await Promise.race([
      new Promise<ElementBounds[]>((resolve) => {
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
      }),
      new Promise<ElementBounds[]>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(timeout)), timeout),
      ),
    ]);
  }
}
