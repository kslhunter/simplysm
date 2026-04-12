import type { WritableSignal } from "@angular/core";

/**
 * WritableSignal의 값이 in-place mutation된 후 소비자에게 변경을 알린다.
 * shallow copy로 새 참조를 생성하여 signal을 업데이트한다.
 */
export function mark(sig: WritableSignal<any>): void {
  sig.update((v) => (Array.isArray(v) ? [...v] : { ...v }));
}
