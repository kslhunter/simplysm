import "@simplysm/core-common";
import { type Accessor, createMemo } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";

/**
 * children을 slot 키 기준으로 분리하여 반환합니다.
 * SolidJS의 splitProps와 유사한 패턴으로 동작합니다.
 *
 * @param resolved - children(() => props.children)으로 생성된 resolved children
 * @param keys - 분리할 slot 키 배열 (camelCase, data 속성과 매칭)
 * @returns [slots, content] - slots는 각 키별 HTMLElement[], content는 나머지 JSX.Element[]
 *
 * @example
 * ```tsx
 * const resolved = children(() => props.children);
 * const [slots, content] = splitSlots(resolved, ["selectHeader", "selectAction"] as const);
 *
 * // JSX에서 사용
 * <div>{slots().selectHeader.single()}</div>
 * <div>{content()}</div>
 * ```
 */
export function splitSlots<K extends string>(
  resolved: { toArray: () => unknown[] },
  keys: readonly K[],
): [Accessor<Record<K, HTMLElement[]>>, Accessor<JSX.Element[]>] {
  const memo = createMemo(() => {
    const arr = resolved.toArray();
    const result = Object.fromEntries(keys.map((k) => [k, []])) as unknown as Record<
      K,
      HTMLElement[]
    >;
    const content: JSX.Element[] = [];

    for (const c of arr) {
      if (c instanceof HTMLElement) {
        const matchedKey = keys.find((k) => k in c.dataset);
        if (matchedKey !== undefined) {
          result[matchedKey].push(c);
          continue;
        }
      }
      content.push(c as JSX.Element);
    }

    return { result, content };
  });

  // eslint-disable-next-line solid/reactivity -- 반환된 accessor는 JSX나 tracked scope에서 호출됨
  return [() => memo().result, () => memo().content];
}
