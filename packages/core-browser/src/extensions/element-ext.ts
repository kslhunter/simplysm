import { isFocusable } from "tabbable";
import { TimeoutError } from "@simplysm/core-common";

/**
 * 요소 경계 정보 타입
 */
export interface ElementBounds {
  /** 측정 대상 요소 */
  target: Element;
  /** 뷰포트 기준 상단 위치 */
  top: number;
  /** 뷰포트 기준 좌측 위치 */
  left: number;
  /** 요소 너비 */
  width: number;
  /** 요소 높이 */
  height: number;
}

declare global {
  interface Element {
    /**
     * 선택자와 일치하는 모든 하위 요소 검색
     *
     * @param selector - CSS 선택자
     * @returns 일치하는 요소 배열 (빈 선택자는 빈 배열 반환)
     */
    findAll<TEl extends Element = Element>(selector: string): TEl[];

    /**
     * 선택자와 일치하는 첫 번째 요소 검색
     *
     * @param selector - CSS 선택자
     * @returns 첫 번째 일치 요소 또는 undefined (빈 선택자는 undefined 반환)
     */
    findFirst<TEl extends Element = Element>(selector: string): TEl | undefined;

    /**
     * 요소를 첫 번째 자식으로 삽입
     *
     * @param child - 삽입할 자식 요소
     * @returns 삽입된 자식 요소
     */
    prependChild<TEl extends Element>(child: TEl): TEl;

    /**
     * 모든 부모 요소 조회 (가까운 순서)
     *
     * @returns 부모 요소 배열 (가장 가까운 것부터 먼 것 순)
     */
    getParents(): Element[];

    /**
     * 첫 번째 포커스 가능한 부모 요소 검색 (tabbable 사용)
     *
     * @returns 첫 번째 포커스 가능한 부모 요소 또는 undefined
     */
    findFocusableParent(): HTMLElement | undefined;

    /**
     * 첫 번째 포커스 가능한 자식 요소 검색 (tabbable 사용)
     *
     * @returns 첫 번째 포커스 가능한 자식 요소 또는 undefined
     */
    findFirstFocusableChild(): HTMLElement | undefined;

    /**
     * 요소가 offset parent인지 확인 (position: relative/absolute/fixed/sticky)
     *
     * @returns position 속성이 relative, absolute, fixed, sticky 중 하나이면 true
     */
    isOffsetElement(): boolean;

    /**
     * 요소가 화면에 보이는지 확인
     *
     * @remarks
     * clientRects 존재 여부, visibility: hidden, opacity: 0을 확인합니다.
     *
     * @returns 요소가 화면에 보이면 true
     */
    isVisible(): boolean;
  }
}

Element.prototype.findAll = function <TEl extends Element = Element>(selector: string): TEl[] {
  const trimmed = selector.trim();
  if (trimmed === "") return [];
  return Array.from(this.querySelectorAll<TEl>(trimmed));
};

Element.prototype.findFirst = function <TEl extends Element = Element>(
  selector: string,
): TEl | undefined {
  const trimmed = selector.trim();
  if (trimmed === "") return undefined;
  return this.querySelector<TEl>(trimmed) ?? undefined;
};

Element.prototype.prependChild = function <TEl extends Element>(child: TEl): TEl {
  return this.insertBefore(child, this.firstElementChild);
};

Element.prototype.getParents = function (): Element[] {
  const result: Element[] = [];
  let cursor = this.parentNode;
  while (cursor !== null && cursor instanceof Element) {
    result.push(cursor);
    cursor = cursor.parentNode;
  }
  return result;
};

Element.prototype.findFocusableParent = function (): HTMLElement | undefined {
  let parentEl = this.parentElement;
  while (parentEl !== null) {
    if (isFocusable(parentEl)) {
      return parentEl;
    }
    parentEl = parentEl.parentElement;
  }
  return undefined;
};

Element.prototype.findFirstFocusableChild = function (): HTMLElement | undefined {
  const walker = document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node !== null) {
    if (node instanceof HTMLElement && isFocusable(node)) {
      return node;
    }
    node = walker.nextNode();
  }
  return undefined;
};

Element.prototype.isOffsetElement = function (): boolean {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(this).position);
};

Element.prototype.isVisible = function (): boolean {
  const style = getComputedStyle(this);
  return this.getClientRects().length > 0 && style.visibility !== "hidden" && style.opacity !== "0";
};

// ============================================================================
// 정적 함수 (이벤트 핸들러 또는 다중 요소용)
// ============================================================================

/**
 * 요소 내용을 클립보드에 복사 (copy 이벤트 핸들러와 함께 사용)
 *
 * @param event - copy 이벤트 객체
 */
export function copyElement(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  const target = event.target;
  if (clipboardData == null || !(target instanceof Element)) return;

  const firstInputEl = target.findFirst<HTMLInputElement | HTMLTextAreaElement>(
    "input, textarea",
  );
  if (firstInputEl !== undefined) {
    clipboardData.setData("text/plain", firstInputEl.value);
    event.preventDefault();
  }
}

/**
 * 클립보드 내용을 요소에 붙여넣기 (paste 이벤트 핸들러와 함께 사용)
 *
 * @remarks
 * 대상 요소 내의 첫 번째 input/textarea를 찾아 전체 값을 클립보드 내용으로 교체합니다.
 * 커서 위치나 선택 영역은 고려하지 않습니다.
 *
 * @param event - paste 이벤트 객체
 */
export function pasteToElement(event: ClipboardEvent): void {
  const clipboardData = event.clipboardData;
  const target = event.target;
  if (clipboardData == null || !(target instanceof Element)) return;

  const contentText = clipboardData.getData("text/plain");

  const firstInputEl = target.findFirst<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
  if (firstInputEl !== undefined) {
    firstInputEl.value = contentText;
    firstInputEl.dispatchEvent(new Event("input", { bubbles: true }));
    event.preventDefault();
  }
}

/**
 * IntersectionObserver를 사용하여 요소의 경계 정보 조회
 *
 * @param els - 대상 요소 배열
 * @param timeout - 타임아웃 밀리초 (기본값: 5000)
 * @throws {TimeoutError} 타임아웃 시간 내에 응답이 없는 경우
 */
export async function getBounds(els: Element[], timeout: number = 5000): Promise<ElementBounds[]> {
  // 중복 제거 및 입력 순서대로 결과 정렬을 위한 인덱스 맵
  const indexMap = new Map(els.map((el, i) => [el, i] as const));
  if (indexMap.size === 0) {
    return [];
  }

  // 남은 요소를 추적하기 위한 Set
  const remaining = new Set(indexMap.keys());

  let observer: IntersectionObserver | undefined;

  try {
    return await Promise.race([
      new Promise<ElementBounds[]>((resolve) => {
        const results: ElementBounds[] = [];

        observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const target = entry.target;
            if (remaining.has(target)) {
              remaining.delete(target);
              results.push({
                target,
                top: entry.boundingClientRect.top,
                left: entry.boundingClientRect.left,
                width: entry.boundingClientRect.width,
                height: entry.boundingClientRect.height,
              });
            }
          }

          if (remaining.size === 0) {
            observer?.disconnect();
            // 입력 순서대로 정렬
            resolve(
              results.sort((a, b) => indexMap.get(a.target)! - indexMap.get(b.target)!),
            );
          }
        });

        for (const el of indexMap.keys()) {
          observer.observe(el);
        }
      }),
      new Promise<ElementBounds[]>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(undefined, `${timeout}ms timeout`)), timeout),
      ),
    ]);
  } finally {
    observer?.disconnect();
  }
}
