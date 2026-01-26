import { ArgumentError, TimeoutError } from "@simplysm/core-common";

export namespace HtmlElementUtils {
  /**
   * 강제 리페인트 (reflow 트리거)
   *
   * @param el - 리페인트할 대상 요소
   */
  export function repaint(el: HTMLElement): void {
    // offsetHeight 접근 시 브라우저는 동기적 레이아웃 계산(forced synchronous layout)을 수행하며,
    // 이로 인해 현재 배치된 스타일 변경사항이 즉시 적용되어 리페인트가 트리거된다.
    void el.offsetHeight;
  }

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
  export function getRelativeOffset(
    el: HTMLElement,
    parent: HTMLElement | string,
  ): { top: number; left: number } {
    const parentEl = typeof parent === "string" ? el.closest(parent) : parent;

    if (!(parentEl instanceof HTMLElement)) {
      throw new ArgumentError({ parent });
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
      const style = getComputedStyle(currentEl);
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
   * 대상이 offset 영역(고정 헤더/고정 열 등)에 가려진 경우, 보이도록 스크롤
   *
   * @remarks
   * 이 함수는 대상이 스크롤 영역의 위쪽/왼쪽 경계를 벗어난 경우만 처리한다.
   * 아래쪽/오른쪽으로 스크롤이 필요한 경우는 브라우저의 기본 포커스 스크롤 동작에 의존한다.
   * 주로 고정 헤더나 고정 열이 있는 테이블에서 포커스 이벤트와 함께 사용된다.
   *
   * @param container - 스크롤 컨테이너 요소
   * @param target - 대상의 컨테이너 내 위치 (offsetTop, offsetLeft)
   * @param offset - 가려지면 안 되는 영역 크기 (예: 고정 헤더 높이, 고정 열 너비)
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
    /** 측정 대상 요소 */
    target: HTMLElement;
    /** 뷰포트 기준 상단 위치 */
    top: number;
    /** 뷰포트 기준 왼쪽 위치 */
    left: number;
    /** 요소 너비 */
    width: number;
    /** 요소 높이 */
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
    // 중복 제거 및 입력 순서대로 결과를 정렬하기 위한 인덱스 맵
    const indexMap = new Map(els.map((el, i) => [el, i] as const));
    if (indexMap.size === 0) {
      return [];
    }

    // 정렬 성능 최적화를 위한 인덱스 맵
    const sortIndexMap = new Map(els.map((el, i) => [el, i] as const));

    let observer: IntersectionObserver | undefined;

    try {
      return await Promise.race([
        new Promise<ElementBounds[]>((resolve) => {
          const results: ElementBounds[] = [];

          observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
              const target = entry.target as HTMLElement;
              if (indexMap.has(target)) {
                indexMap.delete(target);
                results.push({
                  target,
                  top: entry.boundingClientRect.top,
                  left: entry.boundingClientRect.left,
                  width: entry.boundingClientRect.width,
                  height: entry.boundingClientRect.height,
                });
              }
            }

            if (indexMap.size === 0) {
              observer?.disconnect();
              // 입력 순서대로 정렬
              resolve(results.sort((a, b) => sortIndexMap.get(a.target)! - sortIndexMap.get(b.target)!));
            }
          });

          for (const el of indexMap.keys()) {
            observer.observe(el);
          }
        }),
        new Promise<ElementBounds[]>((_, reject) =>
          setTimeout(() => reject(new TimeoutError(timeout)), timeout),
        ),
      ]);
    } finally {
      observer?.disconnect();
    }
  }
}
