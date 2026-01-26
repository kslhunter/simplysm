/**
 * Map 유틸리티 함수
 *
 * @remarks
 * - purry 패턴으로 data-first/data-last 모두 지원
 * - 기존 Map.prototype 확장 메서드를 순수 함수로 대체
 */

//#region mapGetOrCreate

/**
 * Map에서 키에 해당하는 값을 가져오거나, 없으면 새 값을 설정하고 반환
 *
 * @param map 대상 Map
 * @param key 키
 * @param defaultValue 기본값 또는 기본값을 반환하는 팩토리 함수
 * @returns 기존 값 또는 새로 설정된 값
 *
 * @remarks
 * **주의**: V 타입이 함수인 경우(예: `Map<string, () => void>`),
 * 세 번째 인자로 함수를 직접 전달하면 팩토리로 인식되어 호출됩니다.
 * 함수 자체를 값으로 저장하려면 팩토리로 감싸세요.
 *
 * @example
 * ```typescript
 * // data-first
 * mapGetOrCreate(map, "key", 0);
 * mapGetOrCreate(map, "key", []);
 * mapGetOrCreate(map, "key", () => expensiveComputation());
 *
 * // data-last (pipe 호환)
 * pipe(map, mapGetOrCreate("key", []));
 *
 * // 함수를 값으로 저장하는 경우
 * const fnMap = new Map<string, () => void>();
 * const myFn = () => console.log("hello");
 * mapGetOrCreate(fnMap, "key", () => myFn);  // 팩토리로 감싸기
 * ```
 */
// data-first 오버로드
export function mapGetOrCreate<K, V>(map: Map<K, V>, key: K, defaultValue: V | (() => V)): V;
// data-last 오버로드
export function mapGetOrCreate<K, V>(key: K, defaultValue: V | (() => V)): (map: Map<K, V>) => V;
// 구현
export function mapGetOrCreate<K, V>(
  mapOrKey: Map<K, V> | K,
  keyOrDefaultValue: K | V | (() => V),
  defaultValue?: V | (() => V),
): V | ((map: Map<K, V>) => V) {
  if (mapOrKey instanceof Map) {
    // data-first
    // keyOrDefaultValue는 K 타입, defaultValue는 반드시 존재
    return mapGetOrCreateImpl(mapOrKey, keyOrDefaultValue as K, defaultValue as V | (() => V));
  }
  // data-last
  // mapOrKey는 instanceof Map이 아니므로 K 타입으로 좁혀짐
  // keyOrDefaultValue는 V | (() => V) 타입
  return (map: Map<K, V>) =>
    mapGetOrCreateImpl(map, mapOrKey, keyOrDefaultValue as V | (() => V));
}

function mapGetOrCreateImpl<K, V>(map: Map<K, V>, key: K, defaultValue: V | (() => V)): V {
  if (!map.has(key)) {
    if (typeof defaultValue === "function") {
      map.set(key, (defaultValue as () => V)());
    } else {
      map.set(key, defaultValue);
    }
  }
  // 위에서 값이 설정되었으므로 반드시 존재함
  const result = map.get(key);
  return result as V;
}

//#endregion

//#region mapUpdate

/**
 * Map의 키에 해당하는 값을 함수로 업데이트
 *
 * @param map 대상 Map
 * @param key 업데이트할 키
 * @param updateFn 현재 값을 받아 새 값을 반환하는 함수 (키가 없으면 undefined 전달)
 *
 * @remarks
 * 키가 존재하지 않아도 updateFn이 호출되어 새 값이 설정된다.
 * 기존 값 기반 계산이 필요한 경우 (카운터 증가, 배열에 추가 등) 유용하다.
 *
 * @example
 * ```typescript
 * const countMap = new Map<string, number>();
 *
 * // data-first - 카운터 증가
 * mapUpdate(countMap, "key", (v) => (v ?? 0) + 1);
 *
 * // data-last (pipe 호환) - 배열에 항목 추가
 * pipe(arrayMap, mapUpdate("key", (v) => [...(v ?? []), "item"]));
 * ```
 */
// data-first 오버로드
export function mapUpdate<K, V>(map: Map<K, V>, key: K, updateFn: (v: V | undefined) => V): void;
// data-last 오버로드
export function mapUpdate<K, V>(
  key: K,
  updateFn: (v: V | undefined) => V,
): (map: Map<K, V>) => void;
// 구현
export function mapUpdate<K, V>(
  mapOrKey: Map<K, V> | K,
  keyOrUpdateFn: K | ((v: V | undefined) => V),
  updateFn?: (v: V | undefined) => V,
): void | ((map: Map<K, V>) => void) {
  if (mapOrKey instanceof Map) {
    // data-first
    // keyOrUpdateFn은 K 타입, updateFn은 반드시 존재
    mapUpdateImpl(mapOrKey, keyOrUpdateFn as K, updateFn as (v: V | undefined) => V);
    return;
  }
  // data-last
  // mapOrKey는 instanceof Map이 아니므로 K 타입으로 좁혀짐
  // keyOrUpdateFn은 함수 타입
  return (map: Map<K, V>) =>
    mapUpdateImpl(map, mapOrKey, keyOrUpdateFn as (v: V | undefined) => V);
}

function mapUpdateImpl<K, V>(map: Map<K, V>, key: K, updateFn: (v: V | undefined) => V): void {
  const val = map.get(key);
  const res = updateFn(val);
  map.set(key, res);
}

//#endregion
