/**
 * Map 확장 메서드
 */

declare global {
  interface Map<K, V> {
    /**
     * key에 해당하는 값이 없으면 새 값을 설정하고 반환
     *
     * @remarks
     * **주의**: V 타입이 함수인 경우 (예: `Map<string, () => void>`),
     * 함수를 두 번째 인자로 직접 전달하면 팩토리로 인식되어 호출됨.
     * 함수 자체를 값으로 저장하려면 팩토리로 감싸야 함.
     *
     * @example
     * ```typescript
     * // 일반 값
     * map.getOrCreate("key", 0);
     * map.getOrCreate("key", []);
     *
     * // 팩토리 함수 (비용이 큰 연산에 사용)
     * map.getOrCreate("key", () => expensiveComputation());
     *
     * // 함수를 값으로 저장
     * const fnMap = new Map<string, () => void>();
     * const myFn = () => console.log("hello");
     * fnMap.getOrCreate("key", () => myFn);  // 팩토리로 감싸기
     * ```
     */
    getOrCreate(key: K, newValue: V): V;
    getOrCreate(key: K, newValueFn: () => V): V;

    /**
     * 함수를 사용하여 key의 값을 업데이트
     *
     * @param key 업데이트할 key
     * @param updateFn 현재 값을 받아 새 값을 반환하는 함수 (key가 없으면 undefined)
     *
     * @remarks
     * key가 존재하지 않아도 updateFn이 호출되어 새 값이 설정됨.
     * 기존 값 기반 계산(카운터 증가, array에 추가 등)에 유용함.
     *
     * @example
     * ```typescript
     * const countMap = new Map<string, number>();
     *
     * // 카운터 증가
     * countMap.update("key", (v) => (v ?? 0) + 1);
     *
     * // array에 항목 추가
     * const arrayMap = new Map<string, string[]>();
     * arrayMap.update("key", (v) => [...(v ?? []), "item"]);
     * ```
     */
    update(key: K, updateFn: (v: V | undefined) => V): void;
  }
}

Object.defineProperty(Map.prototype, "getOrCreate", {
  value: function <TKey, TValue>(this: Map<TKey, TValue>, key: TKey, newValue: TValue | (() => TValue)): TValue {
    if (!this.has(key)) {
      if (typeof newValue === "function") {
        this.set(key, (newValue as () => TValue)());
      } else {
        this.set(key, newValue);
      }
    }
    return this.get(key)!;
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

Object.defineProperty(Map.prototype, "update", {
  value: function <TKey, TValue>(this: Map<TKey, TValue>, key: TKey, updateFn: (v: TValue | undefined) => TValue): void {
    const val = this.get(key);
    const res = updateFn(val);
    this.set(key, res);
  },
  enumerable: false,
  writable: true,
  configurable: true,
});

export {};
