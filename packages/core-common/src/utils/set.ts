/**
 * Set 유틸리티 함수
 *
 * @remarks
 * - purry 패턴으로 data-first/data-last 모두 지원
 * - 기존 Set.prototype 확장 메서드를 순수 함수로 대체
 */

//#region setAdds

/**
 * Set에 여러 값을 한 번에 추가
 *
 * @param set 대상 Set
 * @param values 추가할 값들
 * @returns 원본 Set (메서드 체이닝 가능)
 *
 * @example
 * ```typescript
 * // data-first
 * setAdds(set, 1, 2, 3);
 *
 * // data-last (pipe 호환)
 * pipe(set, setAdds(4, 5, 6));
 * ```
 */
// data-first 오버로드
export function setAdds<T>(set: Set<T>, ...values: T[]): Set<T>;
// data-last 오버로드
export function setAdds<T>(...values: T[]): (set: Set<T>) => Set<T>;
// 구현
export function setAdds<T>(
  setOrFirstValue: Set<T> | T,
  ...restValues: T[]
): Set<T> | ((set: Set<T>) => Set<T>) {
  if (setOrFirstValue instanceof Set) {
    // data-first
    return setAddsImpl(setOrFirstValue, restValues);
  }
  // data-last - 첫 번째 인자도 값에 포함
  // setOrFirstValue는 instanceof Set이 아니므로 T 타입
  const allValues = [setOrFirstValue, ...restValues] as T[];
  return (set: Set<T>) => setAddsImpl(set, allValues);
}

function setAddsImpl<T>(set: Set<T>, values: T[]): Set<T> {
  for (const val of values) {
    set.add(val);
  }
  return set;
}

//#endregion

//#region setToggle

/**
 * Set의 값을 토글 (있으면 제거, 없으면 추가)
 *
 * @param set 대상 Set
 * @param value 토글할 값
 * @param addOrDel 강제로 추가("add") 또는 제거("del") 지정 (생략 시 자동 토글)
 * @returns 원본 Set (메서드 체이닝 가능)
 *
 * @remarks
 * addOrDel 파라미터로 조건부 추가/제거를 간결하게 표현할 수 있다.
 *
 * @example
 * ```typescript
 * const set = new Set<number>([1, 2, 3]);
 *
 * // data-first
 * setToggle(set, 2);  // 2가 있으므로 제거 → {1, 3}
 * setToggle(set, 4);  // 4가 없으므로 추가 → {1, 3, 4}
 *
 * // 조건부 토글
 * const isAdmin = true;
 * setToggle(set, 5, isAdmin ? "add" : "del");  // 강제 추가
 *
 * // data-last (pipe 호환)
 * pipe(set, setToggle(value, "add"));
 * ```
 */
// data-first 오버로드
export function setToggle<T>(set: Set<T>, value: T, addOrDel?: "add" | "del"): Set<T>;
// data-last 오버로드
export function setToggle<T>(value: T, addOrDel?: "add" | "del"): (set: Set<T>) => Set<T>;
// 구현
export function setToggle<T>(
  setOrValue: Set<T> | T,
  valueOrAddOrDel?: T | "add" | "del",
  addOrDel?: "add" | "del",
): Set<T> | ((set: Set<T>) => Set<T>) {
  if (setOrValue instanceof Set) {
    // data-first
    return setToggleImpl(setOrValue, valueOrAddOrDel as T, addOrDel);
  }
  // data-last
  // setOrValue는 instanceof Set이 아니므로 T 타입
  const mode = valueOrAddOrDel as "add" | "del" | undefined;
  return (set: Set<T>) => setToggleImpl(set, setOrValue, mode);
}

function setToggleImpl<T>(set: Set<T>, value: T, addOrDel?: "add" | "del"): Set<T> {
  if (addOrDel === "add") {
    set.add(value);
  } else if (addOrDel === "del") {
    set.delete(value);
  } else if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  return set;
}

//#endregion
