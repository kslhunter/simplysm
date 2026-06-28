import type { WritableSignal } from "@angular/core";

/**
 * WritableSignal의 값이 in-place mutation된 후 소비자에게 변경을 알린다.
 * shallow copy로 새 참조를 생성하여 signal을 업데이트한다.
 */
export function mark<T extends object | undefined>(sig: WritableSignal<T>): void {
  sig.update((v) => {
    // undefined는 복제할 대상이 없다 — 그대로 둔다(통지할 변경 없음).
    if (v == null) return v;
    return (Array.isArray(v) ? [...(v as unknown[])] : { ...v }) as T;
  });
}
