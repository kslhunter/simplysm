import { createEffect } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import type { SetStoreFunction } from "solid-js/store";
import { objClone } from "@simplysm/core-common";

/**
 * Controlled/Uncontrolled 패턴을 지원하는 store hook
 *
 * @remarks
 * - `onChange`가 제공되면 controlled 모드: setter 호출 시 onChange로 변경 알림
 * - `onChange`가 없으면 uncontrolled 모드: 내부 store만 사용
 * - SetStoreFunction의 모든 overload 지원 (path 기반, produce, reconcile 등)
 *
 * @example
 * ```tsx
 * // Controlled 모드 (onItemsChange 제공)
 * const [items, setItems] = createControllableStore<Item[]>({
 *   value: () => props.items ?? [],
 *   onChange: () => props.onItemsChange,
 * });
 *
 * // Uncontrolled 모드 (onItemsChange 미제공)
 * const [items, setItems] = createControllableStore<Item[]>({
 *   value: () => [],
 *   onChange: () => undefined,
 * });
 * ```
 */
export function createControllableStore<TValue extends object>(options: {
  value: () => TValue;
  onChange: () => ((value: TValue) => void) | undefined;
}): [TValue, SetStoreFunction<TValue>] {
  const [store, rawSet] = createStore<TValue>(objClone(options.value()));

  // 외부 value 변경 → 내부 store 동기화
  createEffect(() => {
    rawSet(reconcile(options.value()) as any);
  });

  // 함수 래퍼로 setter 감싸서 onChange 알림 추가
  const wrappedSet = ((...args: any[]) => {
    (rawSet as any)(...args);
    options.onChange()?.(objClone(unwrap(store)));
  }) as SetStoreFunction<TValue>;

  return [store, wrappedSet];
}
