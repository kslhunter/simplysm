import { isFocusable } from "tabbable";

/**
 * 셀렉터를 :scope 접두사가 붙은 형태로 정규화
 *
 * 콤마로 구분된 복수 셀렉터를 지원하며, 각 셀렉터에 :scope를 추가합니다.
 *
 * @example
 * normalizeScopedSelector(".item, .card") // ":scope .item,:scope .card"
 */
function normalizeScopedSelector(selector: string): string {
  return selector
    .split(",")
    .map((item) => `:scope ${item.trim()}`)
    .join(",");
}

export namespace ElementUtils {
  /**
   * 요소를 첫 번째 자식으로 삽입
   */
  export function prependChild<T extends Element>(parent: Element, child: T): T {
    return parent.insertBefore(child, parent.children.item(0));
  }

  /**
   * 셀렉터로 하위 요소 전체 검색 (:scope 자동 적용)
   */
  export function findAll<T extends Element = Element>(el: Element, selector: string): T[] {
    return Array.from(el.querySelectorAll<T>(normalizeScopedSelector(selector)));
  }

  /**
   * 셀렉터로 첫 번째 하위 요소 검색 (:scope 자동 적용)
   */
  export function findFirst<T extends Element = Element>(
    el: Element,
    selector: string,
  ): T | undefined {
    return el.querySelector<T>(normalizeScopedSelector(selector)) ?? undefined;
  }

  /**
   * 모든 부모 요소 목록 반환 (가까운 순서)
   */
  export function getParents(el: Element): HTMLElement[] {
    const result: HTMLElement[] = [];
    let cursor = el.parentElement;
    while (cursor !== null) {
      result.push(cursor);
      cursor = cursor.parentElement;
    }
    return result;
  }

  /**
   * 부모 중 첫 번째 포커스 가능 요소 검색 (tabbable 사용)
   */
  export function findFocusableParent(el: Element): HTMLElement | undefined {
    let parentEl = el.parentElement;
    while (parentEl !== null) {
      if (isFocusable(parentEl)) {
        return parentEl;
      }
      parentEl = parentEl.parentElement;
    }
    return undefined;
  }

  /**
   * 요소가 offset 기준 요소인지 확인 (position: relative/absolute/fixed/sticky)
   */
  export function isOffsetElement(el: Element): boolean {
    return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(el).position);
  }

  /**
   * 요소가 화면에 보이는지 확인
   */
  export function isVisible(el: Element): boolean {
    const style = getComputedStyle(el);
    return el.getClientRects().length > 0 && style.visibility !== "hidden" && style.opacity !== "0";
  }

  /**
   * 요소 내용을 클립보드에 복사 (copy 이벤트 핸들러에서 사용)
   */
  export function copyElement(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    const target = event.target;
    if (clipboardData == null || !(target instanceof Element)) return;

    const firstInputEl = findFirst<HTMLInputElement | HTMLTextAreaElement>(target, "input, textarea");
    if (firstInputEl !== undefined) {
      clipboardData.setData("text/plain", firstInputEl.value);
      event.preventDefault();
    }
  }

  /**
   * 클립보드 내용을 요소에 붙여넣기 (paste 이벤트 핸들러에서 사용)
   *
   * @remarks
   * 대상 요소 내의 첫 번째 input/textarea를 찾아 전체 값을 클립보드 내용으로 교체합니다.
   * 커서 위치나 선택 영역을 고려하지 않습니다.
   */
  export function pasteToElement(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    const target = event.target;
    if (clipboardData == null || !(target instanceof Element)) return;

    const contentText = clipboardData.getData("text/plain");

    const firstInputEl = findFirst<HTMLInputElement | HTMLTextAreaElement>(target, "input, textarea");
    if (firstInputEl !== undefined) {
      firstInputEl.value = contentText;
      event.preventDefault();
    }
  }
}
