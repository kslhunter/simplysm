/**
 * 포커스 가능한 요소 타입
 */
export type FocusableElement = Element & HTMLOrSVGElement;

/**
 * 포커스 가능 요소 셀렉터 목록
 */
const FOCUSABLE_SELECTORS = [
  "a[href]:not([hidden])",
  "button:not([disabled])",
  "area[href]:not([hidden])",
  "input:not([disabled]):not([hidden])",
  "select:not([disabled]):not([hidden])",
  "textarea:not([disabled]):not([hidden])",
  "iframe:not([hidden])",
  "object:not([hidden])",
  "embed:not([hidden])",
  "*[tabindex]:not([hidden])",
  "*[contenteditable]:not([hidden])",
];

/**
 * 요소를 첫 번째 자식으로 삽입
 * @param parent 부모 요소
 * @param child 삽입할 자식 요소
 * @returns 삽입된 자식 요소
 */
export function prependChild<T extends Element>(parent: Element, child: T): T {
  return parent.insertBefore(child, parent.children.item(0));
}

/**
 * 셀렉터로 하위 요소 전체 검색 (:scope 자동 적용)
 * @param el 검색 기준 요소
 * @param selector CSS 셀렉터
 * @returns 매칭된 요소 배열
 */
export function findAll<T extends Element = Element>(el: Element, selector: string): T[] {
  const scopedSelector = selector
    .split(",")
    .map((item) => `:scope ${item.trim()}`)
    .join(",");
  return Array.from(el.querySelectorAll<T>(scopedSelector));
}

/**
 * 셀렉터로 첫 번째 하위 요소 검색 (:scope 자동 적용)
 * @param el 검색 기준 요소
 * @param selector CSS 셀렉터
 * @returns 매칭된 첫 번째 요소 또는 undefined
 */
export function findFirst<T extends Element = Element>(
  el: Element,
  selector: string,
): T | undefined {
  const scopedSelector = selector
    .split(",")
    .map((item) => `:scope ${item.trim()}`)
    .join(",");
  return el.querySelector<T>(scopedSelector) ?? undefined;
}

/**
 * 모든 부모 요소 목록 반환
 * @param el 기준 요소
 * @returns 부모 요소 배열 (가까운 순서)
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
 * 요소가 포커스 가능한지 확인
 * @param el 확인할 요소
 * @returns 포커스 가능 여부
 */
export function isFocusable(el: Element): boolean {
  return el.matches(FOCUSABLE_SELECTORS.join(","));
}

/**
 * 하위의 모든 포커스 가능 요소 검색
 * @param el 검색 기준 요소
 * @returns 포커스 가능 요소 배열
 */
export function findFocusableAll(el: Element): FocusableElement[] {
  const scopedSelector = FOCUSABLE_SELECTORS.map((item) => `:scope ${item}`).join(",");
  return Array.from(el.querySelectorAll<Element & HTMLOrSVGElement>(scopedSelector));
}

/**
 * 첫 번째 포커스 가능 하위 요소 검색
 * @param el 검색 기준 요소
 * @returns 첫 번째 포커스 가능 요소 또는 undefined
 */
export function findFocusableFirst(el: Element): FocusableElement | undefined {
  const scopedSelector = FOCUSABLE_SELECTORS.map((item) => `:scope ${item}`).join(",");
  return el.querySelector<Element & HTMLOrSVGElement>(scopedSelector) ?? undefined;
}

/**
 * 부모 중 첫 번째 포커스 가능 요소 검색
 * @param el 기준 요소
 * @returns 포커스 가능한 부모 요소 또는 undefined
 */
export function findFocusableParent(el: Element): FocusableElement | undefined {
  let parentEl = el.parentElement;
  while (parentEl !== null) {
    if (parentEl.matches(FOCUSABLE_SELECTORS.join(","))) {
      return parentEl as FocusableElement;
    }
    parentEl = parentEl.parentElement;
  }
  return undefined;
}

/**
 * 요소가 offset 기준 요소인지 확인 (position: relative/absolute/fixed/sticky)
 * @param el 확인할 요소
 * @returns offset 요소 여부
 */
export function isOffsetElement(el: Element): boolean {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(el).position);
}

/**
 * 요소가 화면에 보이는지 확인
 * @param el 확인할 요소
 * @returns 가시성 여부
 */
export function isVisible(el: Element): boolean {
  const style = getComputedStyle(el);
  return el.getClientRects().length > 0 && style.visibility !== "hidden" && style.opacity !== "0";
}

/**
 * 요소 내용을 클립보드에 복사 (copy 이벤트 핸들러에서 사용)
 * input/textarea가 있으면 value를 복사, 없으면 기본 동작 유지
 * @param event ClipboardEvent (copy 이벤트)
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
  // input/textarea가 없으면 기본 동작 유지
}

/**
 * 클립보드 내용을 요소에 붙여넣기 (paste 이벤트 핸들러에서 사용)
 * @param event ClipboardEvent (paste 이벤트)
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
