/**
 * Dialog z-index 레지스트리
 *
 * 열린 Dialog의 z-index를 관리하여 무한 증가를 방지한다.
 * 기본 시작값 2000 (tailwind z-modal과 동일), 최대 열린 Dialog 수만큼만 사용.
 */

const BASE_Z = 2000;

// 열린 Dialog wrapper 요소 목록 (순서 = z-index 순서)
const stack: HTMLElement[] = [];

/** Dialog 등록 — 스택 최상위에 추가하고 z-index 할당 */
export function registerDialog(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx >= 0) return; // 이미 등록됨
  stack.push(el);
  el.style.zIndex = (BASE_Z + stack.length - 1).toString();
}

/** Dialog 해제 — 스택에서 제거하고 나머지 재정렬 */
export function unregisterDialog(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx < 0) return;
  stack.splice(idx, 1);
  reindex();
}

/** Dialog를 최상위로 올림 (포커스 시) */
export function bringToFront(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx < 0 || idx === stack.length - 1) return; // 이미 최상위
  stack.splice(idx, 1);
  stack.push(el);
  reindex();
}

/** 스택 순서대로 z-index 재할당 */
function reindex(): void {
  for (let i = 0; i < stack.length; i++) {
    stack[i].style.zIndex = (BASE_Z + i).toString();
  }
}

/** 해당 Dialog가 스택 최상위인지 확인 */
export function isTopmost(el: HTMLElement): boolean {
  return stack.length > 0 && stack[stack.length - 1] === el;
}
