/**
 * Map 확장 메서드
 */

declare global {
  interface Map<K, V> {
    /**
     * 키에 해당하는 값이 없으면 새 값을 설정하고 반환
     */
    getOrCreate(key: K, newValue: V): V;
    getOrCreate(key: K, newValueFn: () => V): V;

    /**
     * 키에 해당하는 값을 업데이트
     */
    update(key: K, updateFn: (v: V | undefined) => V): void;
  }
}

Map.prototype.getOrCreate = function <K, V>(
  this: Map<K, V>,
  key: K,
  newValue: V | (() => V),
): V {
  if (!this.has(key)) {
    if (newValue instanceof Function) {
      this.set(key, newValue());
    } else {
      this.set(key, newValue);
    }
  }
  return this.get(key)!;
};

Map.prototype.update = function <K, V>(
  this: Map<K, V>,
  key: K,
  updateFn: (v: V | undefined) => V,
): void {
  const val = this.get(key);
  const res = updateFn(val);
  this.set(key, res);
};

export {};
